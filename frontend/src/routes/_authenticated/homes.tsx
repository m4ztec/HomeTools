import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Calculator, Home as HomeIcon, Plus } from "lucide-react";
import { useAllItems, useHomes } from "@/features/pantry/hooks";
import {
  currency,
  isExpiringSoon,
  isLow,
  SELECTED_HOME_KEY,
  type Item,
} from "@/features/pantry/model";
import { ShoppingList } from "@/features/pantry/components/ShoppingList";
import { HomeSetup } from "@/features/pantry/components/HomeSetup";
import { AppNavbar } from "@/shared/ui/AppNavbar";

export const Route = createFileRoute("/_authenticated/homes")({
  head: () => ({
    meta: [
      { title: "Your services — HomeTools" },
      {
        name: "description",
        content: "Your HomeTools dashboard for household inventory and Portuguese IRS estimates.",
      },
      { property: "og:title", content: "HomeTools — Your services" },
      {
        property: "og:description",
        content: "Manage your homes with Pantry or plan with the Portuguese IRS simulator.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomesPage,
});

function HomesPage() {
  const { user } = Route.useRouteContext();
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
        <AppNavbar
          user={user}
          isAdmin={user.isAdmin}
          active="services"
          actions={
            <button
              type="button"
              onClick={() => setShowSetup((v) => !v)}
              aria-expanded={showSetup}
              aria-controls="home-setup"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Add home</span>
            </button>
          }
        />

        <section className="mt-10 sm:mt-14">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-glow">
            Your dashboard
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            What would you like to do?
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-mist sm:text-base">
            Choose a service to manage the practical details of home life. Your services and
            household information are gathered here.
          </p>
        </section>

        <section
          id="services"
          aria-label="HomeTools services"
          className="mt-7 grid gap-4 lg:grid-cols-2"
        >
          <a
            href="#pantry"
            className="glass group rounded-3xl p-5 transition-colors hover:ring-1 hover:ring-mint/40 sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="grid size-11 place-items-center rounded-xl bg-mint/10 text-mint">
                <HomeIcon className="size-5" />
              </div>
              <ArrowUpRight className="size-4 text-mist transition group-hover:text-foreground" />
            </div>
            <p className="mt-5 text-xs font-medium uppercase tracking-[0.14em] text-mint">
              Home management
            </p>
            <h2 className="mt-1 text-xl font-semibold">Pantry</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-mist">
              Keep household stock organized, spot low or expiring items, and coordinate shopping
              across your homes.
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium">
              View your homes <ArrowDownRight className="size-4 text-mint" />
            </span>
          </a>

          <Link
            to="/irs"
            className="glass group rounded-3xl p-5 transition-colors hover:ring-1 hover:ring-glow/40 sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="grid size-11 place-items-center rounded-xl bg-glow/10 text-glow">
                <Calculator className="size-5" />
              </div>
              <ArrowUpRight className="size-4 text-mist transition group-hover:text-foreground" />
            </div>
            <p className="mt-5 text-xs font-medium uppercase tracking-[0.14em] text-glow">
              Money & planning
            </p>
            <h2 className="mt-1 text-xl font-semibold">IRS simulator</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-mist">
              Explore and save simplified Portuguese IRS estimates for different income and
              household scenarios.
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium">
              Open simulator <ArrowUpRight className="size-4 text-glow" />
            </span>
          </Link>
        </section>

        <section id="pantry" className="scroll-mt-6">
          <div className="mt-12 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-mint">Pantry</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">Your homes</h2>
            </div>
            <p className="text-sm text-mist">Inventory, stock levels, and shared shopping</p>
          </div>

          {showSetup && (
            <section id="home-setup" className="mt-6">
              <HomeSetup onDone={openHome} />
            </section>
          )}

          {homes.length === 0 ? (
            <section className="glass mt-6 rounded-3xl p-8 text-center">
              <p className="text-sm text-mist">
                You're not in any home yet — create or join one above.
              </p>
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
                          <p
                            className={`font-display text-2xl font-semibold ${low > 0 ? "text-rose" : "text-mint"}`}
                          >
                            {low}
                          </p>
                          <p className="text-xs text-mist">low</p>
                        </div>
                        <div>
                          <p
                            className={`font-display text-2xl font-semibold ${expiring > 0 ? "text-amber" : ""}`}
                          >
                            {expiring}
                          </p>
                          <p className="text-xs text-mist">expiring</p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-mist">
                        Stock value: {currency.format(value)}
                      </p>
                    </Link>
                  );
                })}
              </section>

              <section className="mt-4">
                <ShoppingList items={items} homes={homes} />
              </section>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
