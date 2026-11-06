namespace HomeTools.API.Services.Authentication.Contracts;

public sealed record RegisterRequest(string Email, string Username, string Password, string DisplayName);
public sealed record LoginRequest(string Identifier, string Password);
public sealed record AuthUserDto(Guid Id, string Email, string Username, string DisplayName, bool IsAdmin);
public sealed record AuthResponse(string AccessToken, AuthUserDto User);
public sealed record UpdateProfileRequest(string DisplayName, string? CurrentPassword, string? NewPassword);
