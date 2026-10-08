using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Pantry.Api.Models;

namespace Pantry.Api.Data;

public sealed class PantryDbContext(DbContextOptions<PantryDbContext> options)
    : IdentityDbContext<PantryUser, IdentityRole<Guid>, Guid>(options)
{
    public DbSet<Home> Homes => Set<Home>();
    public DbSet<HomeMember> HomeMembers => Set<HomeMember>();
    public DbSet<Item> Items => Set<Item>();
    public DbSet<AppSettings> AppSettings => Set<AppSettings>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<PantryUser>(entity =>
        {
            entity.ToTable("users", "identity");
            entity.Property(user => user.DisplayName).HasMaxLength(60).IsRequired();
            entity.Property(user => user.CreatedAt).HasDefaultValueSql("now()");
        });
        builder.Entity<IdentityRole<Guid>>().ToTable("roles", "identity");
        builder.Entity<IdentityUserRole<Guid>>().ToTable("user_roles", "identity");
        builder.Entity<IdentityUserClaim<Guid>>().ToTable("user_claims", "identity");
        builder.Entity<IdentityUserLogin<Guid>>().ToTable("user_logins", "identity");
        builder.Entity<IdentityRoleClaim<Guid>>().ToTable("role_claims", "identity");
        builder.Entity<IdentityUserToken<Guid>>().ToTable("user_tokens", "identity");

        builder.Entity<Home>(entity =>
        {
            entity.ToTable("homes", "pantry");
            entity.HasKey(home => home.Id);
            entity.Property(home => home.Name).HasMaxLength(120).IsRequired();
            entity.Property(home => home.InviteCode).HasMaxLength(8).IsRequired();
            entity.HasIndex(home => home.InviteCode).IsUnique();
            entity.HasMany(home => home.Members).WithOne(member => member.Home).HasForeignKey(member => member.HomeId).OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(home => home.Items).WithOne(item => item.Home).HasForeignKey(item => item.HomeId).OnDelete(DeleteBehavior.Cascade);
        });
        builder.Entity<HomeMember>(entity =>
        {
            entity.ToTable("home_members", "pantry");
            entity.HasKey(member => new { member.HomeId, member.UserId });
            entity.Property(member => member.Role).HasMaxLength(16).IsRequired();
            entity.HasOne(member => member.User).WithMany().HasForeignKey(member => member.UserId).OnDelete(DeleteBehavior.Cascade);
        });
        builder.Entity<Item>(entity =>
        {
            entity.ToTable("items", "pantry");
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
            entity.ToTable("app_settings", "pantry");
            entity.HasKey(settings => settings.Id);
            entity.Property(settings => settings.Categories).HasColumnType("text[]");
            entity.Property(settings => settings.Units).HasColumnType("text[]");
            entity.Property(settings => settings.Currency).HasMaxLength(3).IsRequired();
            entity.Property(settings => settings.ExpiringDays).HasDefaultValue(3);
            entity.Property(settings => settings.SignupsEnabled).HasDefaultValue(true);
        });
    }
}
