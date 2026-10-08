using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;

namespace HomeTools.API.Services.Authentication;

public sealed class TokenService(IConfiguration configuration, UserManager<PantryUser> userManager)
{
    public async Task<string> CreateAsync(PantryUser user)
    {
        var issuer = configuration["Jwt:Issuer"] ?? "HomeTools.API";
        var audience = configuration["Jwt:Audience"] ?? "Pantry.Web";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["Jwt:Key"]!));
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email ?? ""),
            new(ClaimTypes.Name, user.UserName ?? user.Email ?? ""),
            new("display_name", user.DisplayName),
        };
        claims.AddRange((await userManager.GetRolesAsync(user)).Select(role => new Claim(ClaimTypes.Role, role)));
        var token = new JwtSecurityToken(
            issuer,
            audience,
            claims,
            expires: DateTime.UtcNow.AddHours(12),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
