import type { AppSettings, Home, Item } from "@/lib/inventory";

const TOKEN_KEY = "pantry:access-token";
const AUTH_EVENT = "pantry:auth-changed";
const API_URL = (import.meta.env["VITE_API_URL"] || "http://localhost:5050").replace(/\/$/, "");

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
};

export type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

export type Member = { user_id: string; role: string; display_name: string };
export type AdminUser = {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  home_count: number;
  is_admin: boolean;
};
export type AdminHome = {
  id: string;
  name: string;
  created_at: string;
  owner_name: string;
  member_count: number;
  item_count: number;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getAccessToken() {
  return typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
  notifyAuthChanged();
}

export function notifyAuthChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(AUTH_EVENT));
}

export function onAuthChanged(listener: () => void) {
  window.addEventListener(AUTH_EVENT, listener);
  return () => window.removeEventListener(AUTH_EVENT, listener);
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (
    init.body !== undefined &&
    !(typeof FormData !== "undefined" && init.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}/api${path}`, { ...init, headers });
  if (!response.ok) {
    if (response.status === 401 && token) {
      localStorage.removeItem(TOKEN_KEY);
      notifyAuthChanged();
    }
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { message?: string; title?: string; detail?: string };
      message = body.message ?? body.detail ?? body.title ?? message;
    } catch {
      // Preserve the HTTP status message for non-JSON error responses.
    }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const authApi = {
  register: (email: string, password: string, displayName: string) =>
    apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, displayName }),
    }),
  login: (email: string, password: string) =>
    apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => apiRequest<AuthUser>("/auth/me"),
  updateProfile: (displayName: string, currentPassword?: string, newPassword?: string) =>
    apiRequest<AuthUser>("/auth/profile", {
      method: "PUT",
      body: JSON.stringify({ displayName, currentPassword, newPassword }),
    }),
};

export const pantryApi = {
  homes: () => apiRequest<Home[]>("/homes"),
  createHome: (name: string) =>
    apiRequest<Home>("/homes", { method: "POST", body: JSON.stringify({ name }) }),
  joinHome: (code: string) =>
    apiRequest<string>("/homes/join", { method: "POST", body: JSON.stringify({ code }) }),
  members: (homeId: string) => apiRequest<Member[]>(`/homes/${homeId}/members`),
  leaveHome: (homeId: string) =>
    apiRequest<void>(`/homes/${homeId}/membership`, { method: "DELETE" }),
  items: (homeId: string) => apiRequest<Item[]>(`/items?homeId=${encodeURIComponent(homeId)}`),
  allItems: (homeIds: string[]) =>
    apiRequest<Item[]>(`/items?homeIds=${encodeURIComponent(homeIds.join(","))}`),
  addItem: (homeId: string, input: unknown) =>
    apiRequest<Item>(`/items?homeId=${encodeURIComponent(homeId)}`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateItem: (id: string, patch: unknown) =>
    apiRequest<Item>(`/items/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteItem: (id: string) => apiRequest<void>(`/items/${id}`, { method: "DELETE" }),
  settings: () => apiRequest<AppSettings>("/settings"),
  updateSettings: (settings: AppSettings) =>
    apiRequest<AppSettings>("/settings", { method: "PUT", body: JSON.stringify(settings) }),
  adminUsers: () => apiRequest<AdminUser[]>("/admin/users"),
  adminHomes: () => apiRequest<AdminHome[]>("/admin/homes"),
  deleteUser: (id: string) => apiRequest<void>(`/admin/users/${id}`, { method: "DELETE" }),
  deleteHome: (id: string) => apiRequest<void>(`/admin/homes/${id}`, { method: "DELETE" }),
};
