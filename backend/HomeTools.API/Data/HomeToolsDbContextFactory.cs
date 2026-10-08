using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace HomeTools.API.Data;

public sealed class HomeToolsDbContextFactory : IDesignTimeDbContextFactory<HomeToolsDbContext>
{
    public HomeToolsDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<HomeToolsDbContext>()
            .UseSqlite("Data Source=:memory:")
            .Options;
        return new HomeToolsDbContext(options);
    }
}
