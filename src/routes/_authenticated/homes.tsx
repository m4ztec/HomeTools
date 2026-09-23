import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowRight, Home as HomeIcon } from "lucide-react";
import { useAllItems, useHomes } from "@/hooks/useHomes";
import { currency, isExpiringSoon, isLow, type Item } from "@/lib/inventory";
import { ShoppingList } from "@/components/pantry/ShoppingList";

export const Route = createFileRoute("/_authenticated/homes")({
  head: () => ({
    meta: [
      { title: "Homes overview — Pantry" },
      { name: "description", content: "Every home you belong to at a glance, plus a combined shopping list." },
      { property: "og:title", content: "Homes overview — Pantry" },
      { property: "og:description", content: "Every home you belong to at a glance, plus a combined shopping list." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomesPage,
});

function HomesPage() {
  const { data: homes = [] } = useHomes();
  const homeIds = useMemo(() => homes.map((h) => h.id), [homes]);
  const { data: items = [] } = useAllItems(homeIds);

  const byHome = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of items) {
      const list = map.get(item.home_id) ?? [];
      list.push(item);
      map.set(item.home_id, list);
    }
    return map;
  }, [items]);

  return (
    <div className="ambient min-h-screen">
      <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="glass grid size-10 place-items-center rounded-xl font-display text-lg font-semibold text-glow">P</div>
            <div>
              <h1 className="text-xl font-semibold leading-none">My homes</h1>
              <p className="mt-1 text-xs text-mist">Everything at a glance</p>
            </div>
          </div>
          <Link to="/app" className="btn-ghost flex items-center gap-2 text-sm">
            Open ledger <ArrowRight className="size-4" />
          </Link>
        </header>

        {homes.length === 0 ? (
          <section className="glass mt-6 rounded-3xl p-8 text-center">
            <p className="text-sm text-mist">You're not in any home yet — create or join one from the ledger.</p>
          </section>
        ) : (
          <>
            <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {homes.map((home) => {
                const list = byHome.get(home.id) ?? [];
                const low = list.filter(isLow).length;
                const expiring = list.filter((i) => isExpiringSoon(i)).length;
                const value = list.reduce((s, i) => s + Number(i.price) * i.qty, 0);
                return (
                  <div key={home.id} className="glass rounded-3xl p-5">
                    <div className="flex items-center gap-2">
                      <HomeIcon className="size-4 text-glow" />
                      <h2 className="truncate font-semibold">{home.name}</h2>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="font-display text-2xl font-semibold">{list.length}</p>
                        <p className="text-xs text-mist">items</p>
                      </div>
                      <div>
                        <p className={`font-display text-2xl font-semibold ${low > 0 ? "text-rose" : "text-mint"}`}>{low}</p>
                        <p className="text-xs text-mist">low</p>
                      </div>
                      <div>
                        <p className={`font-display text-2xl font-semibold ${expiring > 0 ? "text-amber" : ""}`}>{expiring}</p>
                        <p className="text-xs text-mist">expiring</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-mist">Stock value: {currency.format(value)}</p>
                  </div>
                );
              })}
            </section>

            <section className="mt-4">
              <ShoppingList items={items} homes={homes} />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
