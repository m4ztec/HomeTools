import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  Calculator,
  Home as HomeIcon,
  TrendingUp,
} from "lucide-react";
import { AppNavbar } from "@/shared/ui/AppNavbar";

export const Route = createFileRoute("/_authenticated/homes")({
  head: () => ({
    meta: [
      { title: "Your services — HomeTools" },
      {
        name: "description",
        content:
          "Your HomeTools dashboard for household inventory, Portuguese IRS estimates, and average-cost trade tracking.",
      },
      { property: "og:title", content: "HomeTools — Your services" },
      {
        property: "og:description",
        content:
          "Manage your homes with Pantry, plan with the Portuguese IRS simulator, or track average-cost trades.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomesPage,
});

function HomesPage() {
  const { user } = Route.useRouteContext();

  return (
    <div className="ambient min-h-screen">
      <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <AppNavbar user={user} isAdmin={user.isAdmin} active="services" />

        <section className="mt-10 sm:mt-14">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-glow">
            Your dashboard
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Your services</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-mist sm:text-base">
            Choose a tool to help manage your home and finances.
          </p>
        </section>

        <section aria-label="HomeTools services" className="mt-7 grid gap-4 lg:grid-cols-3">
          <Link
            to="/pantry"
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
              See your homes, keep an eye on stock, and plan your next shop.
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium">
              Open Pantry <ArrowDownRight className="size-4 text-mint" />
            </span>
          </Link>

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

          <Link
            to="/trade-tracker"
            className="glass group rounded-3xl p-5 transition-colors hover:ring-1 hover:ring-glow/40 sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="grid size-11 place-items-center rounded-xl bg-glow/10 text-glow">
                <TrendingUp className="size-5" />
              </div>
              <ArrowUpRight className="size-4 text-mist transition group-hover:text-foreground" />
            </div>
            <p className="mt-5 text-xs font-medium uppercase tracking-[0.14em] text-glow">
              Money & planning
            </p>
            <h2 className="mt-1 text-xl font-semibold">Average Cost Trade Tracker</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-mist">
              Keep track of trades, monitor average cost basis, and understand portfolio performance
              over time.
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium">
              Open tracker <ArrowUpRight className="size-4 text-glow" />
            </span>
          </Link>
        </section>
      </div>
    </div>
  );
}
