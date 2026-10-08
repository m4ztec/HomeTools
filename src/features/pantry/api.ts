import { apiRequest } from "@/shared/lib/api-client";
import type { AppSettings, Home, Item, ItemInput } from "./model";

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
  addItem: (homeId: string, input: ItemInput) =>
    apiRequest<Item>(`/items?homeId=${encodeURIComponent(homeId)}`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateItem: (id: string, patch: Partial<ItemInput>) =>
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
