using HomeTools.API.Services.Authentication;

namespace HomeTools.API.Services.Pantry.Models;

public sealed class Home
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = "";
    public string InviteCode { get; set; } = "";
    public Guid CreatedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public List<HomeMember> Members { get; set; } = [];
    public List<Item> Items { get; set; } = [];
}

public sealed class HomeMember
{
    public Guid HomeId { get; set; }
    public Guid UserId { get; set; }
    public string Role { get; set; } = "member";
    public DateTimeOffset JoinedAt { get; set; } = DateTimeOffset.UtcNow;
    public Home Home { get; set; } = null!;
    public HomeToolsUser User { get; set; } = null!;
}

public sealed class Item
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid HomeId { get; set; }
    public string Name { get; set; } = "";
    public string Category { get; set; } = "Pantry";
    public decimal Price { get; set; }
    public decimal Qty { get; set; }
    public decimal TargetQty { get; set; } = 1;
    public string Unit { get; set; } = "pcs";
    public DateOnly? ExpiresAt { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public Home Home { get; set; } = null!;
}

public sealed class AppSettings
{
    public bool Id { get; set; } = true;
    public string[] Categories { get; set; } = ["Dairy", "Pantry", "Produce", "Frozen", "Household", "Bathroom", "Other"];
    public string[] Units { get; set; } = ["pcs", "kg", "g", "L", "ml", "pack"];
    public string Currency { get; set; } = "EUR";
    public int ExpiringDays { get; set; } = 3;
    public bool SignupsEnabled { get; set; } = true;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public static AppSettings Default => new();
}
