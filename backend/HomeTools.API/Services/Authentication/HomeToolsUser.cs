using Microsoft.AspNetCore.Identity;

namespace HomeTools.API.Services.Authentication;

public sealed class HomeToolsUser : IdentityUser<Guid>
{
    public string DisplayName { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
