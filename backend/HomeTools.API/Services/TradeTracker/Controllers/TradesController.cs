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

    [HttpPost]
    public async Task<ActionResult<TradeDto>> Create(CreateTradeRequest request)
    {
        var validationError = Validate(request);
        if (validationError is not null) return BadRequest(new { message = validationError });

        var ownerId = CurrentUserId();
        var symbol = request.Symbol.Trim().ToUpperInvariant();
        var currency = request.Currency.Trim().ToUpperInvariant();
        var asset = await db.TrackedAssets
            .Include(value => value.Trades)
            .SingleOrDefaultAsync(value => value.OwnerId == ownerId && value.Symbol == symbol);
        var isNewAsset = asset is null;

        if (asset is not null && asset.Currency != currency)
        {
            return BadRequest(new { message = $"The tracked currency for {symbol} is {asset.Currency}." });
        }

        asset ??= new TrackedAsset
        {
            OwnerId = ownerId,
            Symbol = symbol,
            Name = symbol,
            Currency = currency,
        };
        if (db.Entry(asset).State == EntityState.Detached) db.TrackedAssets.Add(asset);
        if (!string.IsNullOrWhiteSpace(request.Name)) asset.Name = request.Name.Trim();
        if (isNewAsset) asset.UpdatedAt = DateTimeOffset.UtcNow;

        var trade = new Trade
        {
            Asset = asset,
            Side = request.Side,
            Quantity = request.Quantity,
            UnitPrice = request.UnitPrice,
            Fees = request.Fees,
            TradedAt = request.TradedAt,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
        };

        var ledger = CalculateLedger(asset.Trades.Append(trade));
        if (ledger.Error is not null) return BadRequest(new { message = ledger.Error });

        asset.Trades.Add(trade);
        try
        {
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
                symbol, string.Join("; ", entries));

            return Conflict(new
            {
                message = "The trade could not be saved because the tracked asset changed. Please retry.",
            });
        }

        return CreatedAtAction(nameof(GetDashboard), ToTradeDto(asset, trade, ledger.RealizedByTrade));
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

    private static string? Validate(CreateTradeRequest request)
    {
        var symbol = request.Symbol.Trim().ToUpperInvariant();
        if (!SymbolPattern().IsMatch(symbol))
            return "Symbol may contain 1–20 letters, numbers, periods, underscores, or hyphens.";
        if (request.Name?.Trim().Length > 80) return "Asset name must be 80 characters or fewer.";
        if (request.Currency.Trim().Length != 3 || !request.Currency.Trim().All(char.IsAsciiLetter))
            return "Currency must be a three-letter code, such as EUR or USD.";
        if (request.Side is not ("Buy" or "Sell")) return "Trade side must be Buy or Sell.";
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
            trade.Side == "Sell" && realizedByTrade.TryGetValue(trade.Id, out var value)
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
            if (trade.Side == "Buy")
            {
                quantity += trade.Quantity;
                costBasis += trade.Quantity * trade.UnitPrice + trade.Fees;
                continue;
            }

            if (trade.Side != "Sell")
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
