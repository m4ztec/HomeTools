using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Pantry.Api.Data;

public sealed class PantryDbContextFactory : IDesignTimeDbContextFactory<PantryDbContext>
{
    public PantryDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<PantryDbContext>()
            .UseSqlite("Data Source=:memory:")
            .Options;
        return new PantryDbContext(options);
    }
}
