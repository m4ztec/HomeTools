import { differenceInCalendarDays, format, parseISO } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

export type Item = Tables<"items">;
export type Home = Tables<"homes">;
export type Profile = Tables<"profiles">;

export type AppSettings = Tables<"app_settings">;

// App-wide settings, managed by the super-admin and applied on sign-in.
export let CATEGORIES: string[] = ["Dairy", "Pantry", "Produce", "Frozen", "Household", "Bathroom", "Other"];
export let UNITS: string[] = ["pcs", "kg", "g", "L", "ml", "pack"];
export let EXPIRING_DAYS = 3;
export let currency = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

export function applySettings(s: Pick<AppSettings, "categories" | "units" | "currency" | "expiring_days">) {
  CATEGORIES = s.categories;
  UNITS = s.units;
  EXPIRING_DAYS = s.expiring_days;
  try {
    currency = new Intl.NumberFormat("pt-PT", { style: "currency", currency: s.currency });
  } catch {
    /* keep previous formatter on invalid code */
  }
}

export const SELECTED_HOME_KEY = "pantry:selected-home";

/** Format a quantity without trailing zeros: 0.7 -> "0.7", 2 -> "2". */
export function formatQty(q: number) {
  return Number(q.toFixed(2)).toString();
}

export function qtyStep(unit: string) {
  return unit === "pcs" || unit === "pack" ? 1 : 0.1;
}

export function isLow(item: Item) {
  return item.qty < item.target_qty;
}

export function daysUntilExpiry(item: Item): number | null {
  if (!item.expires_at) return null;
  return differenceInCalendarDays(parseISO(item.expires_at), new Date());
}

export function isExpiringSoon(item: Item, days = EXPIRING_DAYS) {
  const d = daysUntilExpiry(item);
  return d !== null && d <= days;
}

export function expiryLabel(item: Item): string | null {
  const d = daysUntilExpiry(item);
  if (d === null || !item.expires_at) return null;
  if (d < 0) return "Expired";
  if (d === 0) return "Expires today";
  if (d === 1) return "Expires tomorrow";
  return `Expires ${format(parseISO(item.expires_at), "d MMM")}`;
}

/** Sort by attention: expired/expiring first, then low stock, then name. */
export function attentionScore(item: Item) {
  const d = daysUntilExpiry(item);
  let score = 0;
  if (d !== null && d < 0) score -= 1000;
  else if (d !== null && d <= EXPIRING_DAYS) score -= 500 + (EXPIRING_DAYS - d);
  if (isLow(item)) score -= 100 + (item.target_qty - item.qty);
  return score;
}
