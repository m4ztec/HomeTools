using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using HomeTools.API.Services.Authentication;
using HomeTools.API.Services.Irs.Models;
using HomeTools.API.Services.Pantry.Models;
using HomeTools.API.Services.TradeTracker.Models;

namespace HomeTools.API.Data;

public sealed class HomeToolsDbContext(DbContextOptions<HomeToolsDbContext> options)
    : IdentityDbContext<PantryUser, IdentityRole<Guid>, Guid>(options)
{
    private static readonly ValueConverter<DateTimeOffset, long> DateTimeOffsetConverter = new(
        value => value.UtcDateTime.Ticks,
        value => new DateTimeOffset(value, TimeSpan.Zero));
    private static readonly ValueConverter<string[], string> StringArrayConverter = new(
        value => JsonSerializer.Serialize(value, (JsonSerializerOptions?)null),
        value => JsonSerializer.Deserialize<string[]>(value, (JsonSerializerOptions?)null) ?? Array.Empty<string>());
    private static readonly ValueComparer<string[]> StringArrayComparer = new(
        (left, right) => left!.SequenceEqual(right!),
        value => value!.Aggregate(0, (hash, item) => HashCode.Combine(hash, item.GetHashCode())),
        value => value!.ToArray());

    public DbSet<Home> Homes => Set<Home>();
    public DbSet<HomeMember> HomeMembers => Set<HomeMember>();
    public DbSet<Item> Items => Set<Item>();
    public DbSet<AppSettings> AppSettings => Set<AppSettings>();
    public DbSet<IrsScenario> IrsScenarios => Set<IrsScenario>();
    public DbSet<TrackedAsset> TrackedAssets => Set<TrackedAsset>();
    public DbSet<Trade> Trades => Set<Trade>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        foreach (var property in builder.Model.GetEntityTypes().SelectMany(entity => entity.GetProperties()))
        {
            var propertyType = Nullable.GetUnderlyingType(property.ClrType) ?? property.ClrType;
            if (propertyType == typeof(DateTimeOffset))
            {
                property.SetValueConverter(DateTimeOffsetConverter);
            }
        }

        builder.Entity<PantryUser>(entity =>
        {
            entity.ToTable("users");
            entity.Property(user => user.DisplayName).HasMaxLength(60).IsRequired();
        });
        builder.Entity<IdentityRole<Guid>>().ToTable("roles");
        builder.Entity<IdentityUserRole<Guid>>().ToTable("user_roles");
        builder.Entity<IdentityUserClaim<Guid>>().ToTable("user_claims");
        builder.Entity<IdentityUserLogin<Guid>>().ToTable("user_logins");
        builder.Entity<IdentityRoleClaim<Guid>>().ToTable("role_claims");
        builder.Entity<IdentityUserToken<Guid>>().ToTable("user_tokens");

        builder.Entity<Home>(entity =>
        {
            entity.ToTable("homes");
            entity.HasKey(home => home.Id);
            entity.Property(home => home.Name).HasMaxLength(120).IsRequired();
            entity.Property(home => home.InviteCode).HasMaxLength(8).IsRequired();
            entity.HasIndex(home => home.InviteCode).IsUnique();
            entity.HasMany(home => home.Members).WithOne(member => member.Home).HasForeignKey(member => member.HomeId).OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(home => home.Items).WithOne(item => item.Home).HasForeignKey(item => item.HomeId).OnDelete(DeleteBehavior.Cascade);
        });
        builder.Entity<HomeMember>(entity =>
        {
            entity.ToTable("home_members");
            entity.HasKey(member => new { member.HomeId, member.UserId });
            entity.Property(member => member.Role).HasMaxLength(16).IsRequired();
            entity.HasOne(member => member.User).WithMany().HasForeignKey(member => member.UserId).OnDelete(DeleteBehavior.Cascade);
        });
        builder.Entity<Item>(entity =>
        {
            entity.ToTable("items");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Name).HasMaxLength(120).IsRequired();
            entity.Property(item => item.Category).HasMaxLength(60).IsRequired();
            entity.Property(item => item.Unit).HasMaxLength(20).IsRequired();
            entity.Property(item => item.Price).HasPrecision(10, 2);
            entity.Property(item => item.Qty).HasPrecision(10, 2);
            entity.Property(item => item.TargetQty).HasPrecision(10, 2);
            entity.HasIndex(item => item.HomeId);
        });
        builder.Entity<AppSettings>(entity =>
        {
            entity.ToTable("app_settings");
            entity.HasKey(settings => settings.Id);
            entity.Property(settings => settings.Categories)
                .HasConversion(StringArrayConverter)
                .Metadata.SetValueComparer(StringArrayComparer);
            entity.Property(settings => settings.Units)
                .HasConversion(StringArrayConverter)
                .Metadata.SetValueComparer(StringArrayComparer);
            entity.Property(settings => settings.Currency).HasMaxLength(3).IsRequired();
            entity.Property(settings => settings.ExpiringDays).HasDefaultValue(3);
            entity.Property(settings => settings.SignupsEnabled).HasDefaultValue(true);
        });
        builder.Entity<IrsScenario>(entity =>
        {
            entity.ToTable("irs_scenarios");
            entity.HasKey(scenario => scenario.Id);
            entity.Property(scenario => scenario.Name).HasMaxLength(80).IsRequired();
            entity.Property(scenario => scenario.InputJson).IsRequired();
            entity.Property(scenario => scenario.ResultJson).IsRequired();
            entity.HasIndex(scenario => new { scenario.OwnerId, scenario.UpdatedAt });
        });
        builder.Entity<TrackedAsset>(entity =>
        {
            entity.ToTable("tracked_assets");
            entity.HasKey(asset => asset.Id);
            entity.Property(asset => asset.Symbol).HasMaxLength(20).IsRequired();
            entity.Property(asset => asset.Name).HasMaxLength(80).IsRequired();
            entity.Property(asset => asset.Currency).HasMaxLength(3).IsRequired();
            entity.Property(asset => asset.CurrentPrice).HasPrecision(18, 8);
            entity.HasIndex(asset => new { asset.OwnerId, asset.Symbol }).IsUnique();
            entity.HasMany(asset => asset.Trades)
                .WithOne(trade => trade.Asset)
                .HasForeignKey(trade => trade.AssetId)
                .OnDelete(DeleteBehavior.Cascade);
        });
        builder.Entity<Trade>(entity =>
        {
            entity.ToTable("trades");
            entity.HasKey(trade => trade.Id);
            entity.Property(trade => trade.Side).HasMaxLength(4).IsRequired();
            entity.Property(trade => trade.Quantity).HasPrecision(18, 8);
            entity.Property(trade => trade.UnitPrice).HasPrecision(18, 8);
            entity.Property(trade => trade.Fees).HasPrecision(18, 8);
            entity.Property(trade => trade.Notes).HasMaxLength(240);
            entity.HasIndex(trade => new { trade.AssetId, trade.TradedAt, trade.CreatedAt });
        });
    }
}
