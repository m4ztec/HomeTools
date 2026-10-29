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
[Authorize(Roles = "admin")]
[Route("api/admin")]
public sealed class AdminController(
    HomeToolsDbContext db,
    UserManager<HomeToolsUser> users) : ControllerBase
{
    [HttpGet("users")]
    public async Task<ActionResult<IReadOnlyList<AdminUserDto>>> GetUsers()
    {
        var userList = await users.Users.OrderBy(user => user.CreatedAt).ToListAsync();
        var admins = (await users.GetUsersInRoleAsync("admin")).Select(user => user.Id).ToHashSet();
        var memberCounts = await db.HomeMembers
            .GroupBy(member => member.UserId)
            .Select(group => new { UserId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(group => group.UserId, group => group.Count);
        return Ok(userList.Select(user => new AdminUserDto(
            user.Id,
            user.Email ?? "",
            user.DisplayName,
            user.CreatedAt,
            memberCounts.GetValueOrDefault(user.Id),
            admins.Contains(user.Id))).ToArray());
    }

    [HttpGet("homes")]
    public async Task<ActionResult<IReadOnlyList<AdminHomeDto>>> GetHomes()
    {
        var homes = await db.Homes
            .OrderBy(home => home.CreatedAt)
            .Select(home => new
            {
                Home = home,
                Owner = home.Members.Where(member => member.Role == "owner").Select(member => member.User.DisplayName).FirstOrDefault(),
                MemberCount = home.Members.Count,
                ItemCount = home.Items.Count,
            })
            .ToListAsync();
        return Ok(homes.Select(entry => new AdminHomeDto(
            entry.Home.Id, entry.Home.Name, entry.Home.CreatedAt, entry.Owner ?? "", entry.MemberCount, entry.ItemCount)).ToArray());
    }

    [HttpDelete("users/{id:guid}")]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        var currentId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value
            ?? throw new UnauthorizedAccessException("The authenticated token has no user ID."));
        if (id == currentId) return BadRequest(new { message = "You can't delete your own admin account." });
        var user = await users.FindByIdAsync(id.ToString());
        if (user is null) return NotFound();
        if (await users.IsInRoleAsync(user, "admin")) return BadRequest(new { message = "Admin accounts cannot be deleted here." });

        var result = await users.DeleteAsync(user);
        return result.Succeeded
            ? NoContent()
            : BadRequest(new { message = string.Join(" ", result.Errors.Select(error => error.Description)) });
    }

    [HttpDelete("homes/{id:guid}")]
    public async Task<IActionResult> DeleteHome(Guid id)
    {
        var home = await db.Homes.SingleOrDefaultAsync(value => value.Id == id);
        if (home is null) return NotFound();
        db.Homes.Remove(home);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
