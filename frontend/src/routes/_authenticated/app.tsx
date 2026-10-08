import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { useAddItem, useAllItems, useHomes, useItems } from "@/features/pantry/hooks";
import {
  attentionScore,
  currency,
  EXPIRING_DAYS,
  isExpiringSoon,
  isLow,
  SELECTED_HOME_KEY,
} from "@/features/pantry/model";
import { ItemRow } from "@/features/pantry/components/ItemRow";
import { ItemEditor } from "@/features/pantry/components/ItemEditor";
import { HouseholdPanel } from "@/features/pantry/components/HouseholdPanel";
import { HomeSetup } from "@/features/pantry/components/HomeSetup";
import { ShoppingList } from "@/features/pantry/components/ShoppingList";
import { AppNavbar } from "@/shared/ui/AppNavbar";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "My homes — Pantry" },
      {
        name: "description",
        content: "Your shared household inventory: stock levels, targets, and expiry dates.",
      },
      { property: "og:title", content: "My homes — Pantry" },
      {
        property: "og:description",
        content: "Your shared household inventory: stock levels, targets, and expiry dates.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AppPage,
});

const STORAGE_KEY = SELECTED_HOME_KEY;

function AppPage() {
  const { user } = Route.useRouteContext();
  const { data: homes = [], isLoading } = useHomes();
  const [selected, setSelected] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem(STORAGE_KEY),
  );

  const homeId = homes.some((h) => h.id === selected) ? selected : (homes[0]?.id ?? null);
  const home = homes.find((h) => h.id === homeId) ?? null;

  useEffect(() => {
    if (homeId) localStorage.setItem(STORAGE_KEY, homeId);
  }, [homeId]);

  const { data: items = [] } = useItems(homeId);
  const addItem = useAddItem(homeId);
  const homeIds = useMemo(() => homes.map((h) => h.id), [homes]);
  const { data: allItems = [] } = useAllItems(homeIds);

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => attentionScore(a) - attentionScore(b) || a.name.localeCompare(b.name),
      ),
    [items],
  );
  const low = items.filter(isLow).length;
  const expiring = items.filter((i) => isExpiringSoon(i)).length;
  const total = items.reduce((s, i) => s + Number(i.price) * i.qty, 0);

  return (
    <div className="ambient min-h-screen">
      <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <AppNavbar
          user={user}
          isAdmin={user.isAdmin}
          active="pantry"
          actions={
            homes.length > 0 ? (
              <div className="glass relative flex items-center rounded-full">
                <select
                  value={homeId ?? ""}
                  onChange={(e) => setSelected(e.target.value)}
                  aria-label="Choose a home"
                  className="w-36 appearance-none truncate rounded-full bg-transparent py-1.5 pl-3 pr-8 text-sm font-medium outline-none sm:w-44"
                >
                  {homes.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
                <ChevronsUpDown className="pointer-events-none absolute right-2.5 size-3.5 text-mist" />
              </div>
            ) : null
          }
        />

        {!isLoading && homes.length === 0 && (
          <section className="mt-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">
                Welcome{user.displayName ? `, ${user.displayName}` : ""}
              </h2>
              <p className="text-sm text-mist">
                Start by creating your first home, or join one someone shared with you.
              </p>
            </div>
            <HomeSetup onDone={(id) => setSelected(id)} />
          </section>
        )}

        {home && (
          <>
            <section className="mt-6">
              <h1 className="text-xl font-semibold leading-none">{home.name}</h1>
              <p className="mt-1 text-xs text-mist">Pantry · Household inventory</p>
            </section>
            <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat
                label="Low on stock"
                tone="text-rose"
                value={String(low)}
                hint="items below target"
              />
              <Stat
                label="Expiring soon"
                tone="text-amber"
                value={String(expiring)}
                hint={`within ${EXPIRING_DAYS} days`}
              />
              <Stat
                label="Total value"
                tone="text-mist"
                value={currency.format(total)}
                hint={`across ${items.length} item${items.length === 1 ? "" : "s"}`}
              />
              <Stat
                label="In stock"
                tone="text-mint"
                value={String(items.length - low)}
                hint="at or above target"
              />
            </section>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <section className="glass rounded-3xl p-4 sm:p-5 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{home.name} ledger</h2>
                  <span className="text-xs text-mist">sorted by attention</span>
                </div>
                <div className="mt-4 divide-y divide-foreground/5">
                  {sorted.length === 0 ? (
                    <p className="py-8 text-center text-sm text-mist">
                      Nothing here yet — add your first item on the right.
                    </p>
                  ) : (
                    sorted.map((item) => <ItemRow key={item.id} item={item} />)
                  )}
                </div>
              </section>

              <div className="space-y-4">
                <section className="glass rounded-3xl p-4 sm:p-5">
                  <h2 className="text-base font-semibold">Add an item</h2>
                  <div className="mt-3">
                    <ItemEditor
                      submitLabel="Add to pantry"
                      busy={addItem.isPending}
                      onSubmit={(values) =>
                        addItem.mutate(values, {
                          onSuccess: () => toast.success(`Added ${values.name}`),
                        })
                      }
                    />
                  </div>
                </section>
                <HouseholdPanel
                  home={home}
                  currentUserId={user.id}
                  onLeft={() => setSelected(null)}
                />
              </div>
            </div>

            <section className="mt-4">
              <ShoppingList items={allItems} homes={homes} />
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  tone,
  value,
  hint,
}: {
  label: string;
  tone: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className={`text-xs uppercase tracking-[0.12em] ${tone}`}>{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold leading-none">{value}</p>
      <p className="mt-1 text-xs text-mist">{hint}</p>
    </div>
  );
}
