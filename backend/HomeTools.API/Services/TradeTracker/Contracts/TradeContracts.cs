using HomeTools.API.Services.TradeTracker.Models;

namespace HomeTools.API.Services.TradeTracker.Contracts;

public sealed record CreateTrackedAssetRequest(string Symbol, string? Name, TradeCurrency Currency);

public sealed record CreateTradeRequest(
    Guid AssetId,
    TradeSide Side,
    decimal Quantity,
    decimal UnitPrice,
    decimal Fees,
    DateTimeOffset TradedAt,
    string? Notes);

public sealed record ImportTradeRequest(
    string Symbol,
    string? Name,
    TradeCurrency Currency,
    TradeSide Side,
    decimal Quantity,
    decimal UnitPrice,
    decimal Fees,
    DateTimeOffset TradedAt,
    string? Notes);

public sealed record ImportTradesRequest(IReadOnlyList<ImportTradeRequest> Trades);

public sealed record ImportTradesResult(int ImportedTrades, int CreatedAssets);

public sealed record UpdateAssetPriceRequest(decimal CurrentPrice);

public sealed record TradeDto(
    Guid Id,
    Guid AssetId,
    string Symbol,
    string Name,
    TradeCurrency Currency,
    TradeSide Side,
    decimal Quantity,
    decimal UnitPrice,
    decimal Fees,
    DateTimeOffset TradedAt,
    string? Notes,
    decimal? RealizedProfitLoss);

public sealed record TrackedAssetDto(
    Guid Id,
    string Symbol,
    string Name,
    TradeCurrency Currency,
    decimal? CurrentPrice,
    decimal Quantity,
    decimal AverageCost,
    decimal CostBasis,
    decimal MarketValue,
    decimal UnrealizedProfitLoss,
    decimal RealizedProfitLoss,
    DateTimeOffset UpdatedAt);

public sealed record TradeDashboardDto(
    IReadOnlyList<TrackedAssetDto> Assets,
    IReadOnlyList<TradeDto> Trades);
