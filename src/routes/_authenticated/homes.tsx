import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Home as HomeIcon, Plus, Shield } from "lucide-react";
import { useAllItems, useHomes } from "@/hooks/useHomes";
import { currency, isExpiringSoon, isLow, SELECTED_HOME_KEY, type Item } from "@/lib/inventory";
import { ShoppingList } from "@/components/pantry/ShoppingList";
import { HomeSetup } from "@/components/pantry/HomeSetup";

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
  const { isAdmin } = Route.useRouteContext();
  const navigate = useNavigate();
  const { data: homes = [] } = useHomes();
  const homeIds = useMemo(() => homes.map((h) => h.id), [homes]);
  const { data: items = [] } = useAllItems(homeIds);
  const [showSetup, setShowSetup] = useState(false);

  const byHome = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of items) {
      const list = map.get(item.home_id) ?? [];
      list.push(item);
      map.set(item.home_id, list);
    }
    return map;
  }, [items]);

  function openHome(id: string) {
    localStorage.setItem(SELECTED_HOME_KEY, id);
    navigate({ to: "/app" });
  }

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
          <div className="flex items-center gap-2">
          {isAdmin && (
            <Link to="/admin" className="glass grid size-9 place-items-center rounded-full text-mist transition-colors hover:text-foreground" aria-label="Admin panel" title="Admin panel">
              <Shield className="size-4" />
            </Link>
          )}
          <button
            type="button"
            onClick={() => setShowSetup((v) => !v)}
            className="glass grid size-9 place-items-center rounded-full text-mist transition-colors hover:text-foreground"
            aria-label="Add or join a home"
            title="Add or join a home"
          >
            <Plus className="size-4" />
          </button>
          </div>
        </header>

        {showSetup && (
          <section className="mt-6">
            <HomeSetup onDone={openHome} />
          </section>
        )}

        {homes.length === 0 ? (
          <section className="glass mt-6 rounded-3xl p-8 text-center">
            <p className="text-sm text-mist">You're not in any home yet — create or join one above.</p>
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
                  <Link
                    key={home.id}
                    to="/app"
                    onClick={() => localStorage.setItem(SELECTED_HOME_KEY, home.id)}
                    className="glass block rounded-3xl p-5 transition-colors hover:ring-1 hover:ring-glow/40"
                  >
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
                  </Link>
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
