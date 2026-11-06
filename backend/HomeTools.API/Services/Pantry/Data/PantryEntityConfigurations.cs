using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using HomeTools.API.Services.Pantry.Models;

namespace HomeTools.API.Services.Pantry.Data;

internal sealed class PantryEntityConfiguration : IEntityTypeConfiguration<Home>
{
    public void Configure(EntityTypeBuilder<Home> builder)
    {
        builder.ToTable("homes");
        builder.HasKey(home => home.Id);
        builder.Property(home => home.Name).HasMaxLength(120).IsRequired();
        builder.HasMany(home => home.Members).WithOne(member => member.Home).HasForeignKey(member => member.HomeId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(home => home.Items).WithOne(item => item.Home).HasForeignKey(item => item.HomeId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class HomeInvitationConfiguration : IEntityTypeConfiguration<HomeInvitation>
{
    public void Configure(EntityTypeBuilder<HomeInvitation> builder)
    {
        builder.ToTable("home_invitations");
        builder.HasKey(invitation => invitation.Id);
        builder.Property(invitation => invitation.TokenHash).HasMaxLength(64).IsRequired();
        builder.HasIndex(invitation => invitation.TokenHash).IsUnique();
        builder.HasIndex(invitation => new { invitation.HomeId, invitation.InvitedUserId });
        builder.HasOne(invitation => invitation.Home)
            .WithMany(home => home.Invitations)
            .HasForeignKey(invitation => invitation.HomeId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(invitation => invitation.InvitedUser)
            .WithMany()
            .HasForeignKey(invitation => invitation.InvitedUserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class HomeMemberConfiguration : IEntityTypeConfiguration<HomeMember>
{
    private static readonly ValueConverter<HomeMemberRole, string> RoleConverter = new(
        role => HomeMemberRoleToString(role),
        value => HomeMemberRoleFromString(value));

    private static string HomeMemberRoleToString(HomeMemberRole role) => role switch
    {
        HomeMemberRole.Owner => "owner",
        HomeMemberRole.Member => "member",
        _ => throw new InvalidOperationException($"Unknown home member role '{role}'."),
    };

    private static HomeMemberRole HomeMemberRoleFromString(string value) => value switch
    {
        "owner" => HomeMemberRole.Owner,
        "member" => HomeMemberRole.Member,
        _ => throw new InvalidOperationException($"Unknown home member role '{value}'."),
    };

    public void Configure(EntityTypeBuilder<HomeMember> builder)
    {
        builder.ToTable("home_members");
        builder.HasKey(member => new { member.HomeId, member.UserId });
        builder.Property(member => member.Role)
            .HasConversion(RoleConverter)
            .HasMaxLength(16)
            .IsRequired();
        builder.HasOne(member => member.User).WithMany().HasForeignKey(member => member.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class ItemConfiguration : IEntityTypeConfiguration<Item>
{
    public void Configure(EntityTypeBuilder<Item> builder)
    {
        builder.ToTable("items");
        builder.HasKey(item => item.Id);
        builder.Property(item => item.Name).HasMaxLength(120).IsRequired();
        builder.Property(item => item.Category).HasMaxLength(60).IsRequired();
        builder.Property(item => item.Unit).HasMaxLength(20).IsRequired();
        builder.Property(item => item.Price).HasPrecision(10, 2);
        builder.Property(item => item.Qty).HasPrecision(10, 2);
        builder.Property(item => item.TargetQty).HasPrecision(10, 2);
        builder.HasIndex(item => item.HomeId);
    }
}

internal sealed class AppSettingsConfiguration : IEntityTypeConfiguration<AppSettings>
{
    private static readonly ValueConverter<string[], string> ArrayConverter = new(
        value => JsonSerializer.Serialize(value, (JsonSerializerOptions?)null),
        value => JsonSerializer.Deserialize<string[]>(value, (JsonSerializerOptions?)null) ?? Array.Empty<string>());
    private static readonly ValueComparer<string[]> ArrayComparer = new(
        (left, right) => left!.SequenceEqual(right!),
        value => value!.Aggregate(0, (hash, item) => HashCode.Combine(hash, item.GetHashCode())),
        value => value!.ToArray());

    public void Configure(EntityTypeBuilder<AppSettings> builder)
    {
        builder.ToTable("app_settings");
        builder.HasKey(settings => settings.Id);
        builder.Property(settings => settings.Categories)
            .HasConversion(ArrayConverter)
            .Metadata.SetValueComparer(ArrayComparer);
        builder.Property(settings => settings.Units)
            .HasConversion(ArrayConverter)
            .Metadata.SetValueComparer(ArrayComparer);
        builder.Property(settings => settings.Currency).HasMaxLength(3).IsRequired();
        builder.Property(settings => settings.ExpiringDays).HasDefaultValue(3);
        builder.Property(settings => settings.SignupsEnabled).HasDefaultValue(true);
    }
}
