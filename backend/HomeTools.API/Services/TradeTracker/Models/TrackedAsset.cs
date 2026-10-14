namespace HomeTools.API.Services.TradeTracker.Models;

public sealed class TrackedAsset
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OwnerId { get; set; }
    public string Symbol { get; set; } = "";
    public string Name { get; set; } = "";
    public string Currency { get; set; } = "";
    public decimal? CurrentPrice { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public ICollection<Trade> Trades { get; set; } = new List<Trade>();
}
