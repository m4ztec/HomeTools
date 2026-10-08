using System.Text.Json;
using System.Text.Json.Serialization;
using HomeTools.API.Services.Pantry.Models;

namespace HomeTools.API.Services.Pantry.Contracts;

public sealed record CreateHomeRequest(string Name);
public sealed record JoinHomeRequest(string Code);
public sealed record HomeDto(
    Guid Id,
    string Name,
    [property: JsonPropertyName("invite_code")] string InviteCode,
    [property: JsonPropertyName("created_by")] Guid CreatedBy,
    [property: JsonPropertyName("created_at")] DateTimeOffset CreatedAt);
public sealed record MemberDto(
    [property: JsonPropertyName("user_id")] Guid UserId,
    string Role,
    [property: JsonPropertyName("display_name")] string DisplayName);
public sealed record ItemDto(
    Guid Id,
    [property: JsonPropertyName("home_id")] Guid HomeId,
    string Name,
    string Category,
    decimal Price,
    decimal Qty,
    [property: JsonPropertyName("target_qty")] decimal TargetQty,
    string Unit,
    [property: JsonPropertyName("expires_at")] DateOnly? ExpiresAt,
    [property: JsonPropertyName("created_by")] Guid? CreatedBy,
    [property: JsonPropertyName("created_at")] DateTimeOffset CreatedAt,
    [property: JsonPropertyName("updated_at")] DateTimeOffset UpdatedAt);
public sealed class ItemInput
{
    public string Name { get; set; } = "";
    public string Category { get; set; } = "Pantry";
    public decimal Price { get; set; }
    public string Unit { get; set; } = "pcs";
    public decimal Qty { get; set; }
    [JsonPropertyName("target_qty")]
    public decimal TargetQty { get; set; } = 1;
    [JsonPropertyName("expires_at")]
    public DateOnly? ExpiresAt { get; set; }
}
public sealed class ItemPatch
{
    public string? Name { get; set; }
    public string? Category { get; set; }
    public decimal? Price { get; set; }
    public string? Unit { get; set; }
    public decimal? Qty { get; set; }
    [JsonPropertyName("target_qty")]
    public decimal? TargetQty { get; set; }
    [JsonPropertyName("expires_at")]
    public JsonElement ExpiresAt { get; set; }
}
public sealed record SettingsDto(
    string[] Categories,
    string[] Units,
    string Currency,
    [property: JsonPropertyName("expiring_days")] int ExpiringDays,
    [property: JsonPropertyName("signups_enabled")] bool SignupsEnabled,
    [property: JsonPropertyName("updated_at")] DateTimeOffset UpdatedAt)
{
    public static SettingsDto From(AppSettings value) => new(
        value.Categories, value.Units, value.Currency, value.ExpiringDays, value.SignupsEnabled, value.UpdatedAt);
}
public sealed record AdminUserDto(
    Guid Id,
    string Email,
    [property: JsonPropertyName("display_name")] string DisplayName,
    [property: JsonPropertyName("created_at")] DateTimeOffset CreatedAt,
    [property: JsonPropertyName("home_count")] int HomeCount,
    [property: JsonPropertyName("is_admin")] bool IsAdmin);
public sealed record AdminHomeDto(
    Guid Id,
    string Name,
    [property: JsonPropertyName("created_at")] DateTimeOffset CreatedAt,
    [property: JsonPropertyName("owner_name")] string OwnerName,
    [property: JsonPropertyName("member_count")] int MemberCount,
    [property: JsonPropertyName("item_count")] int ItemCount);
