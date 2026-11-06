using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using HomeTools.API.Services.Irs.Models;

namespace HomeTools.API.Services.Irs.Data;

internal sealed class IrsScenarioConfiguration : IEntityTypeConfiguration<IrsScenario>
{
    public void Configure(EntityTypeBuilder<IrsScenario> builder)
    {
        builder.ToTable("irs_scenarios");
        builder.HasKey(scenario => scenario.Id);
        builder.Property(scenario => scenario.Name).HasMaxLength(80).IsRequired();
        builder.Property(scenario => scenario.InputJson).IsRequired();
        builder.Property(scenario => scenario.ResultJson).IsRequired();
        builder.HasIndex(scenario => new { scenario.OwnerId, scenario.UpdatedAt });
    }
}
