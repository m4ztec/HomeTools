import { differenceInCalendarDays, format, parseISO } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

export type Item = Tables<"items">;
export type Home = Tables<"homes">;
export type Profile = Tables<"profiles">;

export const CATEGORIES = ["Dairy", "Pantry", "Produce", "Frozen", "Household", "Bathroom", "Other"] as const;

export const currency = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

export function isLow(item: Item) {
  return item.quantity < item.target_quantity;
}

export function daysUntilExpiry(item: Item): number | null {
  if (!item.expires_at) return null;
  return differenceInCalendarDays(parseISO(item.expires_at), new Date());
}

export function isExpiringSoon(item: Item, days = 3) {
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
  else if (d !== null && d <= 3) score -= 500 + (3 - d);
  if (isLow(item)) score -= 100 + (item.target_quantity - item.quantity);
  return score;
}
