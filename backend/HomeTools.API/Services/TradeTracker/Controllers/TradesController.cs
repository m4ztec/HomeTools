using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HomeTools.API.Data;
using HomeTools.API.Services.TradeTracker.Contracts;
using HomeTools.API.Services.TradeTracker.Models;

namespace HomeTools.API.Services.TradeTracker.Controllers;

[ApiController]
[Authorize]
[Route("api/trades")]
public sealed partial class TradesController(
    HomeToolsDbContext db,
    ILogger<TradesController> logger) : ControllerBase
{
    private const decimal MaximumAmount = 9_999_999_999m;

    [HttpGet]
    public async Task<ActionResult<TradeDashboardDto>> GetDashboard()
    {
        var assets = await db.TrackedAssets
            .AsNoTracking()
            .Include(asset => asset.Trades)
            .Where(asset => asset.OwnerId == CurrentUserId())
            .OrderBy(asset => asset.Symbol)
            .ToListAsync();

        return Ok(BuildDashboard(assets));
    }

    [HttpPost("assets")]
    public async Task<ActionResult<TrackedAssetDto>> CreateAsset(CreateTrackedAssetRequest request)
    {
        var validationError = Validate(request);
        if (validationError is not null) return BadRequest(new { message = validationError });

        var ownerId = CurrentUserId();
        var symbol = request.Symbol.Trim().ToUpperInvariant();
        var exists = await db.TrackedAssets
            .AnyAsync(asset => asset.OwnerId == ownerId && asset.Symbol == symbol);
        if (exists) return Conflict(new { message = $"You are already tracking {symbol}." });

        var asset = new TrackedAsset
        {
            OwnerId = ownerId,
            Symbol = symbol,
            Name = string.IsNullOrWhiteSpace(request.Name) ? symbol : request.Name.Trim(),
            Currency = request.Currency,
        };
        db.TrackedAssets.Add(asset);
        await db.SaveChangesAsync();

        var ledger = CalculateLedger([]);
        return CreatedAtAction(
            nameof(GetDashboard),
            ToAssetDto(asset, ledger));
    }

    [HttpPost]
    public async Task<ActionResult<TradeDto>> Create(CreateTradeRequest request)
    {
        var validationError = Validate(request);
        if (validationError is not null) return BadRequest(new { message = validationError });

        var asset = await db.TrackedAssets
            .Include(value => value.Trades)
            .SingleOrDefaultAsync(value =>
                value.Id == request.AssetId && value.OwnerId == CurrentUserId());
        if (asset is null) return NotFound(new { message = "Tracked asset not found." });

        var trade = new Trade
        {
            AssetId = asset.Id,
            Side = request.Side,
            Quantity = request.Quantity,
            UnitPrice = request.UnitPrice,
            Fees = request.Fees,
            TradedAt = request.TradedAt,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
        };

        var ledger = CalculateLedger(asset.Trades.Append(trade));
        if (ledger.Error is not null) return BadRequest(new { message = ledger.Error });

        db.Trades.Add(trade);
        try
        {
            asset.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException exception)
        {
            var entries = exception.Entries.Select(entry =>
            {
                var key = entry.Metadata.FindPrimaryKey();
                var keyValues = key is null
                    ? "unknown"
                    : string.Join(", ", key.Properties.Select(property =>
                        $"{property.Name}={entry.Property(property.Name).CurrentValue}"));
                return $"{entry.Metadata.ClrType.Name} ({entry.State}; {keyValues})";
            });
            logger.LogError(exception,
                "Trade creation concurrency failure for {Symbol}. Affected entries: {Entries}",
                asset.Symbol, string.Join("; ", entries));

            return Conflict(new
            {
                message = "The trade could not be saved because the tracked asset changed. Please retry.",
            });
        }

        return CreatedAtAction(nameof(GetDashboard), ToTradeDto(asset, trade, ledger.RealizedByTrade));
    }

    [HttpPost("import")]
    public async Task<ActionResult<ImportTradesResult>> Import(ImportTradesRequest request)
    {
        if (request.Trades.Count is < 1 or > 1000)
            return BadRequest(new { message = "Import between 1 and 1,000 trades at a time." });

        var ownerId = CurrentUserId();
        var assets = await db.TrackedAssets
            .Include(asset => asset.Trades)
            .Where(asset => asset.OwnerId == ownerId)
            .ToListAsync();
        var assetsBySymbol = assets.ToDictionary(asset => asset.Symbol, StringComparer.OrdinalIgnoreCase);
        var importedBySymbol = new Dictionary<string, List<Trade>>(StringComparer.OrdinalIgnoreCase);
        var newAssetsBySymbol = new Dictionary<string, TrackedAsset>(StringComparer.OrdinalIgnoreCase);
        var now = DateTimeOffset.UtcNow;

        for (var index = 0; index < request.Trades.Count; index++)
        {
            var imported = request.Trades[index];
            var row = index + 2;
            var symbol = imported.Symbol.Trim().ToUpperInvariant();
            var assetRequest = new CreateTrackedAssetRequest(symbol, imported.Name, imported.Currency);
            var assetError = Validate(assetRequest);
            if (assetError is not null)
                return BadRequest(new { message = $"Row {row}: {assetError}" });

            var tradeRequest = new CreateTradeRequest(
                Guid.NewGuid(),
                imported.Side,
                imported.Quantity,
                imported.UnitPrice,
                imported.Fees,
                imported.TradedAt,
                imported.Notes);
            var tradeError = Validate(tradeRequest);
            if (tradeError is not null)
                return BadRequest(new { message = $"Row {row}: {tradeError}" });

            TrackedAsset asset;
            if (assetsBySymbol.TryGetValue(symbol, out var existingAsset))
            {
                asset = existingAsset;
                if (asset.Currency != imported.Currency)
                    return BadRequest(new { message = $"Row {row}: {symbol} is already tracked in {asset.Currency}." });
            }
            else if (newAssetsBySymbol.TryGetValue(symbol, out var newAsset))
            {
                asset = newAsset;
                if (asset.Currency != imported.Currency)
                    return BadRequest(new { message = $"Row {row}: {symbol} has conflicting currencies in the CSV." });
                if (asset.Name == symbol && !string.IsNullOrWhiteSpace(imported.Name))
                    asset.Name = imported.Name.Trim();
            }
            else
            {
                asset = new TrackedAsset
                {
                    OwnerId = ownerId,
                    Symbol = symbol,
                    Name = string.IsNullOrWhiteSpace(imported.Name) ? symbol : imported.Name.Trim(),
                    Currency = imported.Currency,
                    UpdatedAt = now,
                };
                newAssetsBySymbol.Add(symbol, asset);
            }

            var trade = new Trade
            {
                Asset = asset,
                AssetId = asset.Id,
                Side = imported.Side,
                Quantity = imported.Quantity,
                UnitPrice = imported.UnitPrice,
                Fees = imported.Fees,
                TradedAt = imported.TradedAt,
                Notes = string.IsNullOrWhiteSpace(imported.Notes) ? null : imported.Notes.Trim(),
                CreatedAt = now.AddTicks(index),
            };
            if (!importedBySymbol.TryGetValue(symbol, out var assetTrades))
            {
                assetTrades = [];
                importedBySymbol.Add(symbol, assetTrades);
            }
            assetTrades.Add(trade);
        }

        foreach (var (symbol, importedTrades) in importedBySymbol)
        {
            var asset = assetsBySymbol.GetValueOrDefault(symbol) ?? newAssetsBySymbol[symbol];
            var ledger = CalculateLedger(asset.Trades.Concat(importedTrades));
            if (ledger.Error is not null)
            {
                return BadRequest(new { message = $"{symbol}: {ledger.Error}" });
            }
        }

        await using var transaction = await db.Database.BeginTransactionAsync();
        db.TrackedAssets.AddRange(newAssetsBySymbol.Values);
        foreach (var (symbol, importedTrades) in importedBySymbol)
        {
            var asset = assetsBySymbol.GetValueOrDefault(symbol) ?? newAssetsBySymbol[symbol];
            asset.UpdatedAt = now;
            db.Trades.AddRange(importedTrades);
        }
        await db.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(new ImportTradesResult(request.Trades.Count, newAssetsBySymbol.Count));
    }

    [HttpPut("assets/{id:guid}/price")]
    public async Task<ActionResult<TrackedAssetDto>> UpdatePrice(Guid id, UpdateAssetPriceRequest request)
    {
        if (request.CurrentPrice < 0 || request.CurrentPrice > MaximumAmount)
        {
            return BadRequest(new { message = "Current price cannot be negative or exceed the supported range." });
        }

        var asset = await db.TrackedAssets
            .SingleOrDefaultAsync(value => value.Id == id && value.OwnerId == CurrentUserId());
        if (asset is null) return NotFound();

        asset.CurrentPrice = request.CurrentPrice;
        asset.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();

        var ledger = CalculateLedger(await db.Trades
            .AsNoTracking()
            .Where(trade => trade.AssetId == asset.Id)
            .ToListAsync());
        if (ledger.Error is not null)
            throw new InvalidOperationException($"Stored trade ledger for {asset.Symbol} is invalid: {ledger.Error}");

        return Ok(ToAssetDto(asset, ledger));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var trade = await db.Trades
            .Include(value => value.Asset)
            .SingleOrDefaultAsync(value =>
                value.Id == id && value.Asset.OwnerId == CurrentUserId());
        if (trade is null) return NotFound();

        var remainingTrades = await db.Trades
            .AsNoTracking()
            .Where(value => value.AssetId == trade.AssetId && value.Id != trade.Id)
            .ToListAsync();
        var ledger = CalculateLedger(remainingTrades);
        if (ledger.Error is not null)
        {
            return BadRequest(new
            {
                message = "This trade cannot be deleted because later sales would exceed the remaining position. Delete or correct those sales first.",
            });
        }

        db.Trades.Remove(trade);
        trade.Asset.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static string? Validate(CreateTrackedAssetRequest request)
    {
        var symbol = request.Symbol.Trim().ToUpperInvariant();
        if (!SymbolPattern().IsMatch(symbol))
            return "Symbol may contain 1–20 letters, numbers, periods, underscores, or hyphens.";
        if (request.Name?.Trim().Length > 80) return "Asset name must be 80 characters or fewer.";
        if (request.Currency is not (TradeCurrency.EUR or TradeCurrency.USD))
            return "Currency must be EUR or USD.";
        return null;
    }

    private static string? Validate(CreateTradeRequest request)
    {
        if (request.AssetId == Guid.Empty) return "Choose a tracked asset.";
        if (request.Side is not (TradeSide.Buy or TradeSide.Sell)) return "Trade side must be Buy or Sell.";
        if (request.Quantity <= 0 || request.Quantity > MaximumAmount)
            return "Quantity must be greater than zero and within the supported range.";
        if (request.UnitPrice <= 0 || request.UnitPrice > MaximumAmount)
            return "Unit price must be greater than zero and within the supported range.";
        if (request.Fees < 0 || request.Fees > MaximumAmount)
            return "Fees cannot be negative or exceed the supported range.";
        if (request.TradedAt < new DateTimeOffset(1900, 1, 1, 0, 0, 0, TimeSpan.Zero)
            || request.TradedAt > DateTimeOffset.UtcNow.AddDays(1))
            return "Trade date must be between 1900 and tomorrow.";
        if (request.Notes?.Length > 240) return "Notes must be 240 characters or fewer.";
        return null;
    }

    private static TradeDashboardDto BuildDashboard(IReadOnlyList<TrackedAsset> assets)
    {
        var assetDtos = new List<TrackedAssetDto>(assets.Count);
        var trades = new List<TradeDto>();

        foreach (var asset in assets)
        {
            var ledger = CalculateLedger(asset.Trades);
            if (ledger.Error is not null)
                throw new InvalidOperationException($"Stored trade ledger for {asset.Symbol} is invalid: {ledger.Error}");

            assetDtos.Add(ToAssetDto(asset, ledger));
            trades.AddRange(asset.Trades.Select(trade => ToTradeDto(asset, trade, ledger.RealizedByTrade)));
        }

        return new TradeDashboardDto(
            assetDtos,
            trades.OrderByDescending(trade => trade.TradedAt).ThenByDescending(trade => trade.Id).ToArray());
    }

    private static TrackedAssetDto ToAssetDto(TrackedAsset asset, LedgerResult ledger)
    {
        var marketValue = asset.CurrentPrice is { } price ? ledger.Quantity * price : 0;
        var unrealizedProfitLoss = asset.CurrentPrice is null ? 0 : marketValue - ledger.CostBasis;
        return new TrackedAssetDto(
            asset.Id,
            asset.Symbol,
            asset.Name,
            asset.Currency,
            asset.CurrentPrice,
            ledger.Quantity,
            ledger.Quantity == 0 ? 0 : ledger.CostBasis / ledger.Quantity,
            ledger.CostBasis,
            marketValue,
            unrealizedProfitLoss,
            ledger.RealizedProfitLoss,
            asset.UpdatedAt);
    }

    private static TradeDto ToTradeDto(
        TrackedAsset asset,
        Trade trade,
        IReadOnlyDictionary<Guid, decimal> realizedByTrade)
    {
        decimal? realizedProfitLoss =
            trade.Side == TradeSide.Sell && realizedByTrade.TryGetValue(trade.Id, out var value)
                ? value
                : null;
        return new(
            trade.Id,
            asset.Id,
            asset.Symbol,
            asset.Name,
            asset.Currency,
            trade.Side,
            trade.Quantity,
            trade.UnitPrice,
            trade.Fees,
            trade.TradedAt,
            trade.Notes,
            realizedProfitLoss);
    }

    private static LedgerResult CalculateLedger(IEnumerable<Trade> trades)
    {
        decimal quantity = 0;
        decimal costBasis = 0;
        decimal realizedProfitLoss = 0;
        var realizedByTrade = new Dictionary<Guid, decimal>();

        foreach (var trade in trades
            .OrderBy(value => value.TradedAt)
            .ThenBy(value => value.CreatedAt)
            .ThenBy(value => value.Id))
        {
            if (trade.Side == TradeSide.Buy)
            {
                quantity += trade.Quantity;
                costBasis += trade.Quantity * trade.UnitPrice + trade.Fees;
                continue;
            }

            if (trade.Side != TradeSide.Sell)
                return LedgerResult.Invalid($"Trade {trade.Id} has an unsupported side.");
            if (trade.Quantity > quantity)
                return LedgerResult.Invalid($"A sale on {trade.TradedAt:yyyy-MM-dd} exceeds the position available at that time.");

            var averageCost = quantity == 0 ? 0 : costBasis / quantity;
            var allocatedCost = averageCost * trade.Quantity;
            var saleProfitLoss = trade.Quantity * trade.UnitPrice - trade.Fees - allocatedCost;
            quantity -= trade.Quantity;
            costBasis -= allocatedCost;
            if (quantity == 0) costBasis = 0;
            realizedProfitLoss += saleProfitLoss;
            realizedByTrade[trade.Id] = saleProfitLoss;
        }

        return new LedgerResult(quantity, costBasis, realizedProfitLoss, realizedByTrade, null);
    }

    private Guid CurrentUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException("The authenticated token has no user ID."));

    [GeneratedRegex("^[A-Z0-9.^_-]{1,20}$", RegexOptions.CultureInvariant)]
    private static partial Regex SymbolPattern();

    private sealed record LedgerResult(
        decimal Quantity,
        decimal CostBasis,
        decimal RealizedProfitLoss,
        IReadOnlyDictionary<Guid, decimal> RealizedByTrade,
        string? Error)
    {
        public static LedgerResult Invalid(string error) => new(0, 0, 0, new Dictionary<Guid, decimal>(), error);
    }
}
