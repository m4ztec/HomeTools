using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using HomeTools.API.Services.TradeTracker.Models;

namespace HomeTools.API.Services.TradeTracker.Data;

internal sealed class TrackedAssetConfiguration : IEntityTypeConfiguration<TrackedAsset>
{
    public void Configure(EntityTypeBuilder<TrackedAsset> builder)
    {
        builder.ToTable("tracked_assets");
        builder.HasKey(asset => asset.Id);
        builder.Property(asset => asset.Symbol).HasMaxLength(20).IsRequired();
        builder.Property(asset => asset.Name).HasMaxLength(80).IsRequired();
        builder.Property(asset => asset.Currency).HasConversion<string>().HasMaxLength(3).IsRequired();
        builder.Property(asset => asset.CurrentPrice).HasPrecision(18, 8);
        builder.HasIndex(asset => new { asset.OwnerId, asset.Symbol }).IsUnique();
        builder.HasMany(asset => asset.Trades)
            .WithOne(trade => trade.Asset)
            .HasForeignKey(trade => trade.AssetId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class TradeConfiguration : IEntityTypeConfiguration<Trade>
{
    public void Configure(EntityTypeBuilder<Trade> builder)
    {
        builder.ToTable("trades");
        builder.HasKey(trade => trade.Id);
        builder.Property(trade => trade.Side).HasConversion<string>().HasMaxLength(4).IsRequired();
        builder.Property(trade => trade.Quantity).HasPrecision(18, 8);
        builder.Property(trade => trade.UnitPrice).HasPrecision(18, 8);
        builder.Property(trade => trade.Fees).HasPrecision(18, 8);
        builder.Property(trade => trade.Notes).HasMaxLength(240);
        builder.HasIndex(trade => new { trade.AssetId, trade.TradedAt, trade.CreatedAt });
    }
}
