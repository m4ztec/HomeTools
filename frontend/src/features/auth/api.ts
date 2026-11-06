import { apiRequest } from "@/shared/lib/api-client";

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  isAdmin: boolean;
};

export type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

export const authApi = {
  register: (email: string, username: string, password: string, displayName: string) =>
    apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, username, password, displayName }),
    }),
  login: (identifier: string, password: string) =>
    apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    }),
  me: () => apiRequest<AuthUser>("/auth/me"),
  updateProfile: (displayName: string, currentPassword?: string, newPassword?: string) =>
    apiRequest<AuthUser>("/auth/profile", {
      method: "PUT",
      body: JSON.stringify({ displayName, currentPassword, newPassword }),
    }),
};
