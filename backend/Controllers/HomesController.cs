using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pantry.Api.Contracts;
using Pantry.Api.Data;
using Pantry.Api.Models;

namespace Pantry.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/homes")]
public sealed class HomesController(PantryDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<HomeDto>>> GetHomes()
    {
        var userId = CurrentUserId();
        var homes = await db.Homes
            .Where(home => home.Members.Any(member => member.UserId == userId))
            .OrderBy(home => home.CreatedAt)
            .Select(home => ToDto(home))
            .ToListAsync();
        return Ok(homes);
    }

    [HttpPost]
    public async Task<ActionResult<HomeDto>> CreateHome(CreateHomeRequest request)
    {
        var name = request.Name.Trim();
        if (string.IsNullOrWhiteSpace(name) || name.Length > 120)
        {
            return BadRequest(new { message = "Home name must be between 1 and 120 characters." });
        }

        var home = new Home
        {
            Name = name,
            InviteCode = await NewInviteCodeAsync(),
            CreatedBy = CurrentUserId(),
        };
        home.Members.Add(new HomeMember { Home = home, UserId = home.CreatedBy, Role = "owner" });
        db.Homes.Add(home);
        await db.SaveChangesAsync();
        return Ok(ToDto(home));
    }

    [HttpPost("join")]
    public async Task<ActionResult<Guid>> JoinHome(JoinHomeRequest request)
    {
        var code = request.Code.Trim().ToUpperInvariant();
        var home = await db.Homes.SingleOrDefaultAsync(value => value.InviteCode == code);
        if (home is null) return NotFound(new { message = "Invalid invite code." });

        var userId = CurrentUserId();
        if (!await db.HomeMembers.AnyAsync(member => member.HomeId == home.Id && member.UserId == userId))
        {
            db.HomeMembers.Add(new HomeMember { HomeId = home.Id, UserId = userId, Role = "member" });
            await db.SaveChangesAsync();
        }

        return Ok(home.Id);
    }

    [HttpGet("{homeId:guid}/members")]
    public async Task<ActionResult<IReadOnlyList<MemberDto>>> GetMembers(Guid homeId)
    {
        if (!await IsMemberAsync(homeId)) return NotFound();
        var members = await db.HomeMembers
            .Where(member => member.HomeId == homeId)
            .OrderBy(member => member.JoinedAt)
            .Select(member => new MemberDto(member.UserId, member.Role, member.User.DisplayName))
            .ToListAsync();
        return Ok(members);
    }

    [HttpDelete("{homeId:guid}/membership")]
    public async Task<IActionResult> LeaveHome(Guid homeId)
    {
        var userId = CurrentUserId();
        var membership = await db.HomeMembers.SingleOrDefaultAsync(member =>
            member.HomeId == homeId && member.UserId == userId);
        if (membership is null) return NotFound();
        db.HomeMembers.Remove(membership);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{homeId:guid}")]
    public async Task<IActionResult> DeleteHome(Guid homeId)
    {
        var home = await db.Homes.SingleOrDefaultAsync(value => value.Id == homeId);
        if (home is null) return NotFound();
        if (!await db.HomeMembers.AnyAsync(member =>
                member.HomeId == homeId && member.UserId == CurrentUserId() && member.Role == "owner"))
        {
            return Forbid();
        }

        db.Homes.Remove(home);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private Guid CurrentUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException("The authenticated token has no user ID."));

    private Task<bool> IsMemberAsync(Guid homeId) =>
        db.HomeMembers.AnyAsync(member => member.HomeId == homeId && member.UserId == CurrentUserId());

    private async Task<string> NewInviteCodeAsync()
    {
        const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        while (true)
        {
            var bytes = RandomNumberGenerator.GetBytes(8);
            var code = new string(bytes.Select(value => alphabet[value % alphabet.Length]).ToArray());
            if (!await db.Homes.AnyAsync(home => home.InviteCode == code)) return code;
        }
    }

    private static HomeDto ToDto(Home home) =>
        new(home.Id, home.Name, home.InviteCode, home.CreatedBy, home.CreatedAt);
}
