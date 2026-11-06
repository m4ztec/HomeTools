using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using HomeTools.API.Services.Authentication;
using HomeTools.API.Services.Authentication.Data;
using HomeTools.API.Services.Irs.Models;
using HomeTools.API.Services.Irs.Data;
using HomeTools.API.Services.Pantry.Models;
using HomeTools.API.Services.Pantry.Data;
using HomeTools.API.Services.TradeTracker.Models;
using HomeTools.API.Services.TradeTracker.Data;

namespace HomeTools.API.Data;

public sealed class HomeToolsDbContext(DbContextOptions<HomeToolsDbContext> options)
    : IdentityDbContext<HomeToolsUser, IdentityRole<Guid>, Guid>(options)
{
    private static readonly ValueConverter<DateTimeOffset, long> DateTimeOffsetConverter = new(
        value => value.UtcDateTime.Ticks,
        value => new DateTimeOffset(value, TimeSpan.Zero));

    public DbSet<Home> Homes => Set<Home>();
    public DbSet<HomeInvitation> HomeInvitations => Set<HomeInvitation>();
    public DbSet<HomeMember> HomeMembers => Set<HomeMember>();
    public DbSet<Item> Items => Set<Item>();
    public DbSet<AppSettings> AppSettings => Set<AppSettings>();
    public DbSet<IrsScenario> IrsScenarios => Set<IrsScenario>();
    public DbSet<TrackedAsset> TrackedAssets => Set<TrackedAsset>();
    public DbSet<Trade> Trades => Set<Trade>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.ApplyConfiguration(new HomeToolsUserConfiguration());
        builder.ApplyConfiguration(new IdentityRoleConfiguration());
        builder.ApplyConfiguration(new IdentityUserRoleConfiguration());
        builder.ApplyConfiguration(new IdentityUserClaimConfiguration());
        builder.ApplyConfiguration(new IdentityUserLoginConfiguration());
        builder.ApplyConfiguration(new IdentityRoleClaimConfiguration());
        builder.ApplyConfiguration(new IdentityUserTokenConfiguration());
        builder.ApplyConfiguration(new PantryEntityConfiguration());
        builder.ApplyConfiguration(new HomeInvitationConfiguration());
        builder.ApplyConfiguration(new HomeMemberConfiguration());
        builder.ApplyConfiguration(new ItemConfiguration());
        builder.ApplyConfiguration(new AppSettingsConfiguration());
        builder.ApplyConfiguration(new IrsScenarioConfiguration());
        builder.ApplyConfiguration(new TrackedAssetConfiguration());
        builder.ApplyConfiguration(new TradeConfiguration());

        foreach (var property in builder.Model.GetEntityTypes().SelectMany(entity => entity.GetProperties()))
        {
            var propertyType = Nullable.GetUnderlyingType(property.ClrType) ?? property.ClrType;
            if (propertyType == typeof(DateTimeOffset))
            {
                property.SetValueConverter(DateTimeOffsetConverter);
            }
        }
    }
}
