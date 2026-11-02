using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HomeTools.API.Services.Authentication;
using HomeTools.API.Services.Pantry.Contracts;
using HomeTools.API.Data;
using HomeTools.API.Services.Pantry.Models;

namespace HomeTools.API.Services.Pantry.Controllers;

[ApiController]
[Authorize]
[Route("api/homes")]
public sealed class HomesController(
    HomeToolsDbContext db,
    UserManager<HomeToolsUser> users) : ControllerBase
{
    private static readonly TimeSpan InvitationLifetime = TimeSpan.FromDays(7);

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
            CreatedBy = CurrentUserId(),
        };
        home.Members.Add(new HomeMember { Home = home, UserId = home.CreatedBy, Role = "owner" });
        db.Homes.Add(home);
        await db.SaveChangesAsync();
        return Ok(ToDto(home));
    }

    [HttpPost("{homeId:guid}/invitations")]
    public async Task<ActionResult<CreatedHomeInvitationDto>> CreateInvitation(
        Guid homeId,
        CreateHomeInvitationRequest request)
    {
        var userId = CurrentUserId();
        var isOwner = await db.HomeMembers.AnyAsync(member =>
            member.HomeId == homeId && member.UserId == userId && member.Role == "owner");
        if (!isOwner) return NotFound();

        var email = request.Email.Trim();
        var invitedUser = await users.FindByEmailAsync(email);
        if (invitedUser is null)
        {
            return NotFound(new { message = "No Pantry account exists for that email address." });
        }

        var alreadyMember = await db.HomeMembers.AnyAsync(member =>
            member.HomeId == homeId && member.UserId == invitedUser.Id);
        if (alreadyMember)
        {
            return Conflict(new { message = "That account is already a member of this home." });
        }

        var now = DateTimeOffset.UtcNow;
        var token = NewInvitationToken();
        var invitation = new HomeInvitation
        {
            HomeId = homeId,
            InvitedUserId = invitedUser.Id,
            CreatedByUserId = userId,
            TokenHash = HashInvitationToken(token),
            CreatedAt = now,
            ExpiresAt = now.Add(InvitationLifetime),
        };

        await using var transaction = await db.Database.BeginTransactionAsync();
        await db.HomeInvitations
            .Where(value =>
                value.HomeId == homeId &&
                value.InvitedUserId == invitedUser.Id &&
                value.AcceptedAt == null &&
                value.RevokedAt == null &&
                value.ExpiresAt > now)
            .ExecuteUpdateAsync(update => update.SetProperty(value => value.RevokedAt, now));
        db.HomeInvitations.Add(invitation);
        await db.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(new CreatedHomeInvitationDto(
            invitation.Id,
            invitedUser.Email ?? email,
            token,
            invitation.ExpiresAt));
    }

    [HttpPost("invitations/preview")]
    public async Task<ActionResult<HomeInvitationPreviewDto>> PreviewInvitation(
        HomeInvitationTokenRequest request)
    {
        var invitation = await FindActiveInvitationAsync(request.Token, CurrentUserId());
        if (invitation is null) return NotFound(new { message = "This invitation is invalid or unavailable." });

        return Ok(new HomeInvitationPreviewDto(
            invitation.HomeId,
            invitation.Home.Name,
            invitation.InvitedUser.Email ?? "",
            invitation.ExpiresAt));
    }

    [HttpPost("invitations/accept")]
    public async Task<ActionResult<Guid>> AcceptInvitation(HomeInvitationTokenRequest request)
    {
        var userId = CurrentUserId();
        var tokenHash = HashInvitationToken(request.Token);
        var now = DateTimeOffset.UtcNow;

        await using var transaction = await db.Database.BeginTransactionAsync();
        var invitation = await db.HomeInvitations
            .Where(value =>
                value.TokenHash == tokenHash &&
                value.InvitedUserId == userId &&
                value.AcceptedAt == null &&
                value.RevokedAt == null &&
                value.ExpiresAt > now)
            .Select(value => new { value.Id, value.HomeId })
            .SingleOrDefaultAsync();
        if (invitation is null)
        {
            return NotFound(new { message = "This invitation is invalid or unavailable." });
        }

        var claimed = await db.HomeInvitations
            .Where(value =>
                value.Id == invitation.Id &&
                value.AcceptedAt == null &&
                value.RevokedAt == null &&
                value.ExpiresAt > now)
            .ExecuteUpdateAsync(update => update.SetProperty(value => value.AcceptedAt, now));
        if (claimed != 1)
        {
            return NotFound(new { message = "This invitation is invalid or unavailable." });
        }

        if (!await db.HomeMembers.AnyAsync(member =>
                member.HomeId == invitation.HomeId && member.UserId == userId))
        {
            db.HomeMembers.Add(new HomeMember
            {
                HomeId = invitation.HomeId,
                UserId = userId,
                Role = "member",
            });
            await db.SaveChangesAsync();
        }

        await transaction.CommitAsync();
        return Ok(invitation.HomeId);
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

    private Task<HomeInvitation?> FindActiveInvitationAsync(string token, Guid userId)
    {
        var tokenHash = HashInvitationToken(token);
        var now = DateTimeOffset.UtcNow;
        return db.HomeInvitations
            .Include(value => value.Home)
            .Include(value => value.InvitedUser)
            .SingleOrDefaultAsync(value =>
                value.TokenHash == tokenHash &&
                value.InvitedUserId == userId &&
                value.AcceptedAt == null &&
                value.RevokedAt == null &&
                value.ExpiresAt > now);
    }

    private static string NewInvitationToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');

    private static string HashInvitationToken(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    private static HomeDto ToDto(Home home) =>
        new(home.Id, home.Name, home.CreatedBy, home.CreatedAt);
}
