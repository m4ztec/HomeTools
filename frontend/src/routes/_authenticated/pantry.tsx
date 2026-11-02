import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarClock,
  Home as HomeIcon,
  PackageCheck,
  Plus,
  TriangleAlert,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { HomeSetup } from "@/features/pantry/components/HomeSetup";
import { ShoppingList } from "@/features/pantry/components/ShoppingList";
import {
  currency,
  daysUntilExpiry,
  expiryLabel,
  EXPIRING_DAYS,
  formatQty,
  isExpiringSoon,
  isLow,
  SELECTED_HOME_KEY,
  type Item,
} from "@/features/pantry/model";
import { useAllItems, useHomes } from "@/features/pantry/hooks";
import { AppNavbar } from "@/shared/ui/AppNavbar";

export const Route = createFileRoute("/_authenticated/pantry")({
  head: () => ({
    meta: [
      { title: "Pantry — HomeTools" },
      {
        name: "description",
        content: "A quick overview of your homes, pantry stock, and shopping list.",
      },
      { property: "og:title", content: "Pantry — HomeTools" },
      {
        property: "og:description",
        content: "A quick overview of your homes, pantry stock, and shopping list.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PantryPage,
});

function PantryPage() {
  const { user } = Route.useRouteContext();
  const { data: homes = [] } = useHomes();
  const homeIds = useMemo(() => homes.map((home) => home.id), [homes]);
  const { data: allItems = [] } = useAllItems(homeIds);
  const [showSetup, setShowSetup] = useState(false);
  const homesById = useMemo(() => new Map(homes.map((home) => [home.id, home])), [homes]);
  const lowItems = useMemo(() => allItems.filter(isLow), [allItems]);
  const expiringItems = useMemo(
    () =>
      allItems
        .filter(isExpiringSoon)
        .sort(
          (a, b) =>
            (daysUntilExpiry(a) ?? Number.MAX_SAFE_INTEGER) -
              (daysUntilExpiry(b) ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name),
        ),
    [allItems],
  );
  const stockValue = allItems.reduce((total, item) => total + Number(item.price) * item.qty, 0);

  return (
    <div className="ambient min-h-screen">
      <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <AppNavbar user={user} isAdmin={user.isAdmin} active="pantry" />

        <section className="mt-9 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mint">
              Home management
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Pantry</h1>
            <p className="mt-2 text-sm text-mist">
              A quick look across all your homes and everything on your shopping list.
            </p>
          </div>
        </section>

        {homes.length === 0 ? (
          <section className="mt-8">
            <div className="glass mb-5 rounded-3xl p-6 sm:p-8">
              <div className="grid size-12 place-items-center rounded-2xl bg-mint/10 text-mint">
                <HomeIcon className="size-6" />
              </div>
              <h2 className="mt-4 text-xl font-semibold">Start with a home</h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-mist">
                Create a home for your household, or open a private invitation link from a home
                owner to join one.
              </p>
            </div>
            <HomeSetup onDone={() => setShowSetup(false)} />
          </section>
        ) : (
          <>
            <section
              aria-label="All homes overview"
              className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4"
            >
              <Stat
                icon={<PackageCheck className="size-4" />}
                label="In stock"
                value={String(allItems.length - lowItems.length)}
                hint={`of ${allItems.length} items across all homes`}
                tone="text-mint"
              />
              <Stat
                icon={<TriangleAlert className="size-4" />}
                label="Need restocking"
                value={String(lowItems.length)}
                hint="below target"
                tone={lowItems.length ? "text-rose" : "text-mist"}
              />
              <Stat
                icon={<CalendarClock className="size-4" />}
                label="Expiry alerts"
                value={String(expiringItems.length)}
                hint={`expired or due within ${EXPIRING_DAYS} days`}
                tone={expiringItems.length ? "text-amber" : "text-mist"}
              />
              <Stat
                icon={<Wallet className="size-4" />}
                label="Stock value"
                value={currency.format(stockValue)}
                hint="across all homes"
                tone="text-glow"
              />
            </section>

            <section className="mt-4 grid gap-4 lg:grid-cols-3">
              <div className="glass rounded-3xl p-4 sm:p-5 lg:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Expiry watch</h2>
                    <p className="mt-1 text-xs text-mist">
                      Expired and soon-to-expire items across all homes
                    </p>
                  </div>
                  <CalendarClock className="size-5 text-amber" />
                </div>
                {expiringItems.length === 0 ? (
                  <p className="py-8 text-center text-sm text-mist">
                    Nothing expiring soon. Your pantry is looking fresh.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-foreground/5">
                    {expiringItems.slice(0, 5).map((item) => (
                      <ExpiryRow
                        key={item.id}
                        item={item}
                        homeName={homesById.get(item.home_id)?.name ?? "Home"}
                      />
                    ))}
                  </ul>
                )}
                {expiringItems.length > 5 && (
                  <p className="mt-2 text-xs text-mist">
                    And {expiringItems.length - 5} more item
                    {expiringItems.length - 5 === 1 ? "" : "s"}
                  </p>
                )}
              </div>

              <div className="glass rounded-3xl p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Your homes</h2>
                  <div className="flex items-center gap-2">
                    <HomeIcon className="size-5 text-glow" />
                    <button
                      type="button"
                      onClick={() => setShowSetup(true)}
                      aria-label="Add home"
                      className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>
                <ul className="mt-3 divide-y divide-foreground/5">
                  {homes.map((entry) => {
                    const homeItems = allItems.filter((item) => item.home_id === entry.id);
                    const homeLowCount = homeItems.filter(isLow).length;
                    return (
                      <li key={entry.id}>
                        <Link
                          to="/app"
                          onClick={() => localStorage.setItem(SELECTED_HOME_KEY, entry.id)}
                          className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-mint"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{entry.name}</span>
                            <span className="mt-0.5 block text-xs text-mist">
                              {homeItems.length} items
                              {homeLowCount > 0 ? ` · ${homeLowCount} to restock` : ""}
                            </span>
                          </span>
                          <ArrowRight className="size-4 shrink-0 text-mist" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>

            <section className="mt-4">
              <ShoppingList items={allItems} homes={homes} />
            </section>
          </>
        )}
      </div>
      {showSetup && <HomeSetupDialog onClose={() => setShowSetup(false)} />}
    </div>
  );
}

function HomeSetupDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-background/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="home-setup-title"
        className="glass w-full max-w-2xl rounded-3xl p-4 sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="home-setup-title" className="text-lg font-semibold">
            Create a home
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="grid size-8 place-items-center rounded-full text-mist transition-colors hover:bg-foreground/10 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <HomeSetup compact onDone={onClose} />
      </section>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: string;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className={`flex items-center gap-2 text-xs uppercase tracking-[0.12em] ${tone}`}>
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-3 truncate font-display text-2xl font-semibold leading-none sm:text-3xl">
        {value}
      </p>
      <p className="mt-1 text-xs text-mist">{hint}</p>
    </div>
  );
}

function ExpiryRow({ item, homeName }: { item: Item; homeName: string }) {
  const days = daysUntilExpiry(item);
  const label = expiryLabel(item);
  const urgent = days !== null && days <= 1;

  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{item.name}</span>
        <span className="mt-0.5 block truncate text-xs text-mist">
          {homeName} · {formatQty(item.qty)} {item.unit} · {item.category}
        </span>
      </span>
      <span className={`pill ${urgent ? "bg-rose/15 text-rose" : "bg-amber/15 text-amber"}`}>
        {label}
      </span>
    </li>
  );
}
