const TOKEN_KEY = "pantry:access-token";
const AUTH_EVENT = "pantry:auth-changed";
const API_URL = (import.meta.env["VITE_API_URL"] ?? "http://localhost:5050").replace(/\/$/, "");

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
