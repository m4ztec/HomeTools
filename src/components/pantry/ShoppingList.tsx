import { useMemo } from "react";
import { ShoppingCart } from "lucide-react";
import { currency, formatQty, isLow, type Home, type Item } from "@/lib/inventory";

type Props = {
  items: Item[];
  homes: Home[];
};

/** Aggregates items below target across all homes. */
export function ShoppingList({ items, homes }: Props) {
  const homeNames = useMemo(() => new Map(homes.map((h) => [h.id, h.name])), [homes]);

  const groups = useMemo(() => {
    const missing = items.filter(isLow);
    const byHome = new Map<string, Item[]>();
    for (const item of missing) {
      const list = byHome.get(item.home_id) ?? [];
      list.push(item);
      byHome.set(item.home_id, list);
    }
    // Largest shortfall first within each home
    for (const list of byHome.values()) {
      list.sort((a, b) => b.target_qty - b.qty - (a.target_qty - a.qty) || a.name.localeCompare(b.name));
    }
    return [...byHome.entries()].sort(([a], [b]) => (homeNames.get(a) ?? "").localeCompare(homeNames.get(b) ?? ""));
  }, [items, homeNames]);

  const totalCost = useMemo(
    () => items.filter(isLow).reduce((s, i) => s + Number(i.price) * (i.target_qty - i.qty), 0),
    [items],
  );
  const count = groups.reduce((s, [, list]) => s + list.length, 0);

  return (
    <section className="glass rounded-3xl p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ShoppingCart className="size-5 text-glow" /> Shopping list
        </h2>
        <span className="text-xs text-mist">
          {count === 0 ? "all stocked up" : `est. ${currency.format(totalCost)} to restock`}
        </span>
      </div>
      {count === 0 ? (
        <p className="py-8 text-center text-sm text-mist">Nothing missing — every home is at or above target.</p>
      ) : (
        <div className="mt-4 space-y-5">
          {groups.map(([homeId, list]) => (
            <div key={homeId}>
              <p className="text-xs uppercase tracking-[0.12em] text-mist">{homeNames.get(homeId) ?? "Home"}</p>
              <ul className="mt-2 divide-y divide-foreground/5">
                {list.map((item) => {
                  const missing = item.target_qty - item.qty;
                  return (
                    <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-mist">
                          have {formatQty(item.qty)} {item.unit} · want {formatQty(item.target_qty)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-glow">
                          +{formatQty(missing)} {item.unit}
                        </p>
                        <p className="text-xs text-mist">{currency.format(Number(item.price) * missing)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
