namespace HomeTools.API.Services.TradeTracker.Models;

public enum TradeSide
{
    Buy = 1,
    Sell = 2,
}

public enum TradeCurrency
{
    EUR = 1,
    USD = 2,
}

public sealed class Trade
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AssetId { get; set; }
    public TradeSide Side { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Fees { get; set; }
    public DateTimeOffset TradedAt { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public TrackedAsset Asset { get; set; } = null!;
}
