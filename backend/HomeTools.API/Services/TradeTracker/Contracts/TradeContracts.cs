namespace HomeTools.API.Services.TradeTracker.Contracts;

public sealed record CreateTradeRequest(
    string Symbol,
    string? Name,
    string Currency,
    string Side,
    decimal Quantity,
    decimal UnitPrice,
    decimal Fees,
    DateTimeOffset TradedAt,
    string? Notes);

public sealed record UpdateAssetPriceRequest(decimal CurrentPrice);

public sealed record TradeDto(
    Guid Id,
    Guid AssetId,
    string Symbol,
    string Name,
    string Currency,
    string Side,
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
    string Currency,
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
