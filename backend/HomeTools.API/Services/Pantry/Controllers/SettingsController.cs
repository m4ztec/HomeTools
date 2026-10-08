using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HomeTools.API.Services.Pantry.Contracts;
using HomeTools.API.Services.Pantry.Data;

namespace HomeTools.API.Services.Pantry.Controllers;

[ApiController]
[Authorize]
[Route("api/settings")]
public sealed class SettingsController(PantryDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<SettingsDto>> Get() =>
        Ok(SettingsDto.From(await db.AppSettings.SingleAsync()));

    [Authorize(Roles = "admin")]
    [HttpPut]
    public async Task<ActionResult<SettingsDto>> Update(SettingsDto settings)
    {
        if (settings.Categories.Length == 0 || settings.Units.Length == 0)
            return BadRequest(new { message = "At least one category and unit are required." });
        if (settings.ExpiringDays is < 0 or > 60)
            return BadRequest(new { message = "The expiry window must be between 0 and 60 days." });
        if (settings.Currency.Length != 3 || !settings.Currency.All(char.IsAsciiLetter))
            return BadRequest(new { message = "Currency must be a three-letter code." });

        var current = await db.AppSettings.SingleAsync();
        current.Categories = settings.Categories.Select(value => value.Trim()).Where(value => value.Length > 0).Distinct().ToArray();
        current.Units = settings.Units.Select(value => value.Trim()).Where(value => value.Length > 0).Distinct().ToArray();
        if (current.Categories.Length == 0 || current.Units.Length == 0)
            return BadRequest(new { message = "At least one category and unit are required." });
        current.Currency = settings.Currency.ToUpperInvariant();
        current.ExpiringDays = settings.ExpiringDays;
        current.SignupsEnabled = settings.SignupsEnabled;
        current.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        return Ok(SettingsDto.From(current));
    }
}
