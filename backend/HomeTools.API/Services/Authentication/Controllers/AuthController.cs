using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HomeTools.API.Services.Authentication.Contracts;
using HomeTools.API.Data;
using HomeTools.API.Services.Authentication;

namespace HomeTools.API.Services.Authentication.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(
    HomeToolsDbContext db,
    UserManager<HomeToolsUser> users,
    SignInManager<HomeToolsUser> signInManager,
    TokenService tokens) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        var email = request.Email.Trim();
        var displayName = request.DisplayName.Trim();
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(displayName) || displayName.Length > 60)
        {
            return BadRequest(new { message = "Enter a valid email and a name of at most 60 characters." });
        }

        await using var transaction = await db.Database.BeginTransactionAsync();
        var settings = await db.AppSettings.SingleAsync();
        if (!settings.SignupsEnabled)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Sign-ups are currently closed." });
        }

        var user = new HomeToolsUser
        {
            Id = Guid.NewGuid(),
            UserName = email,
            Email = email,
            DisplayName = displayName,
        };
        var created = await users.CreateAsync(user, request.Password);
        if (!created.Succeeded)
        {
            return BadRequest(new { message = string.Join(" ", created.Errors.Select(error => error.Description)) });
        }

        var admins = await users.GetUsersInRoleAsync("admin");
        var initialAdmin = admins.Count == 0;
        var roleResult = await users.AddToRoleAsync(user, initialAdmin ? "admin" : "user");
        if (!roleResult.Succeeded)
        {
            return BadRequest(new { message = string.Join(" ", roleResult.Errors.Select(error => error.Description)) });
        }

        await transaction.CommitAsync();
        return Ok(await CreateResponseAsync(user));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var user = await users.FindByEmailAsync(request.Email.Trim());
        if (user is null || !(await signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: false)).Succeeded)
        {
            return Unauthorized(new { message = "Email or password is incorrect." });
        }

        return Ok(await CreateResponseAsync(user));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<AuthUserDto>> Me()
    {
        var user = await users.GetUserAsync(User);
        return user is null ? Unauthorized() : Ok(await ToUserDtoAsync(user));
    }

    [Authorize]
    [HttpPut("profile")]
    public async Task<ActionResult<AuthUserDto>> UpdateProfile(UpdateProfileRequest request)
    {
        var user = await users.GetUserAsync(User);
        if (user is null) return Unauthorized();
        var name = request.DisplayName.Trim();
        if (string.IsNullOrWhiteSpace(name) || name.Length > 60)
        {
            return BadRequest(new { message = "Name must be between 1 and 60 characters." });
        }

        if (!string.IsNullOrEmpty(request.NewPassword))
        {
            var passwordResult = await users.ChangePasswordAsync(user, request.CurrentPassword ?? "", request.NewPassword);
            if (!passwordResult.Succeeded)
            {
                return BadRequest(new { message = string.Join(" ", passwordResult.Errors.Select(error => error.Description)) });
            }
        }

        user.DisplayName = name;
        var result = await users.UpdateAsync(user);
        if (!result.Succeeded)
        {
            return BadRequest(new { message = string.Join(" ", result.Errors.Select(error => error.Description)) });
        }

        return Ok(await ToUserDtoAsync(user));
    }

    private async Task<AuthResponse> CreateResponseAsync(HomeToolsUser user) =>
        new(await tokens.CreateAsync(user), await ToUserDtoAsync(user));

    private async Task<AuthUserDto> ToUserDtoAsync(HomeToolsUser user) =>
        new(user.Id, user.Email ?? "", user.DisplayName, await users.IsInRoleAsync(user, "admin"));
}
