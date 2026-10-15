import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, Calculator, House, Layers3, TrendingUp } from "lucide-react";
import { useSession } from "@/features/auth/useSession";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HomeTools — Useful tools for everyday home life" },
      {
        name: "description",
        content:
          "A growing collection of practical home services: manage household stock with Pantry, explore Portuguese tax estimates with the IRS simulator, and track average cost trades with a dedicated portfolio app.",
      },
      { property: "og:title", content: "HomeTools — Useful tools for everyday home life" },
      {
        property: "og:description",
        content:
          "A growing collection of practical home services: manage household stock with Pantry, explore Portuguese tax estimates with the IRS simulator, and track average cost trades with a dedicated portfolio app.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useSession();

  if (!loading && user) return <Navigate to="/homes" replace />;

  return (
    <div className="ambient min-h-screen">
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <header className="flex h-20 items-center justify-between">
          <Link to="/" className="flex items-center gap-3" aria-label="HomeTools home">
            <div className="glass grid size-10 place-items-center rounded-xl font-display text-lg font-semibold text-glow">
              H
            </div>
            <span className="font-display text-lg font-semibold tracking-tight">HomeTools</span>
          </Link>
          <nav className="flex items-center gap-3" aria-label="Account">
            {loading ? (
              <span className="text-sm text-mist">Loading…</span>
            ) : (
              <>
                <Link to="/auth" className="btn-ghost">
                  Sign in
                </Link>
                <Link to="/auth" search={{ mode: "signup" }} className="btn-glow">
                  Get started
                </Link>
              </>
            )}
          </nav>
        </header>

        <main>
          <section className="grid gap-12 pb-20 pt-14 sm:pb-24 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-20 lg:pt-24">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-mist ring-1 ring-glass-line">
                <Layers3 className="size-3.5 text-mint" />
                <span>One home for practical tools</span>
              </div>
              <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-6xl lg:text-7xl">
                A little more <span className="text-glow">order</span> for everyday life.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-mist sm:text-lg">
                HomeTools brings useful services together in one place — from keeping your household
                stocked and planning your Portuguese IRS to tracking average-cost trades over time.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {loading ? (
                  <span className="text-sm text-mist">Checking your account…</span>
                ) : (
                  <>
                    <Link to="/auth" search={{ mode: "signup" }} className="btn-glow">
                      Create your account <ArrowUpRight className="ml-2 inline size-4" />
                    </Link>
                    <a href="#services" className="btn-ghost inline-flex items-center gap-2">
                      Explore services <ArrowDownRight className="size-4" />
                    </a>
                  </>
                )}
              </div>
              <p className="mt-5 text-xs text-mist">
                Self-hosted and built to grow with the tools you need.
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-lg">
              <div className="absolute -inset-8 rounded-full bg-glow/10 blur-3xl" />
              <div className="glass relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
                <div className="flex items-center justify-between border-b border-glass-line pb-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-mist">HomeTools</p>
                    <p className="mt-1 font-display text-xl font-semibold">Your everyday toolkit</p>
                  </div>
                  <Layers3 className="size-5 text-glow" />
                </div>
                <div className="space-y-3 pt-5">
                  <div className="flex items-center gap-4 rounded-2xl bg-glass-fill p-4">
                    <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-mint/10 text-mint">
                      <House className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">Pantry</p>
                      <p className="mt-1 text-sm text-mist">Home inventory & shopping</p>
                    </div>
                    <ArrowUpRight className="size-4 text-mist" />
                  </div>
                  <div className="flex items-center gap-4 rounded-2xl bg-glass-fill p-4">
                    <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-glow/10 text-glow">
                      <Calculator className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">IRS simulator</p>
                      <p className="mt-1 text-sm text-mist">Portuguese tax estimates</p>
                    </div>
                    <ArrowUpRight className="size-4 text-mist" />
                  </div>
                  <div className="flex items-center gap-4 rounded-2xl bg-glass-fill p-4">
                    <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-glow/10 text-glow">
                      <TrendingUp className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">Trade tracker</p>
                      <p className="mt-1 text-sm text-mist">Average cost &amp; portfolio P&amp;L</p>
                    </div>
                    <ArrowUpRight className="size-4 text-mist" />
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-3 rounded-2xl border border-dashed border-glass-line p-4">
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/5 text-mist">
                    <Layers3 className="size-4" />
                  </div>
                  <p className="text-sm text-mist">
                    One growing collection. More useful services can live here.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section id="services" className="scroll-mt-8 pb-20 sm:pb-28">
            <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-glow">
                  The toolkit
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Services for real life
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-mist">
                Each service solves a practical problem and works as part of the same HomeTools
                experience.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <ServiceCard
                icon={<House className="size-5" />}
                number="01"
                category="Home management"
                title="Pantry"
                description="Keep track of what you have at home, what is running low, and what is nearing its expiry date. Share homes and build a shopping list together."
                highlights={[
                  "Shared household inventory",
                  "Low-stock and expiry tracking",
                  "Combined shopping list",
                ]}
                color="mint"
                to="/auth"
              />
              <ServiceCard
                icon={<Calculator className="size-5" />}
                number="02"
                category="Money & planning"
                title="IRS simulator"
                description="Explore a simplified estimate of your Portuguese IRS. Save scenarios to compare different household and income assumptions."
                highlights={[
                  "Portuguese IRS estimates",
                  "Save and compare scenarios",
                  "Clearly marked as an estimate",
                ]}
                color="glow"
                to="/auth"
              />
              <ServiceCard
                icon={<TrendingUp className="size-5" />}
                number="03"
                category="Money & planning"
                title="Average Cost Trade Tracker"
                description="Track your trades, monitor average cost basis, and keep a clear view of portfolio performance over time."
                highlights={[
                  "Average cost calculations",
                  "Trade activity tracking",
                  "Portfolio overview at a glance",
                ]}
                color="glow"
                to="/auth"
              />
            </div>
            <p className="mt-4 text-xs leading-5 text-mist">
              The IRS simulator provides planning estimates only; it is not official tax advice and
              does not replace the Portal das Finanças.
            </p>
          </section>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-glass-line py-6 text-xs text-mist">
          <span>HomeTools</span>
          <span>Practical tools for home, gathered in one place.</span>
        </footer>
      </div>
    </div>
  );
}

type ServiceCardProps = {
  icon: React.ReactNode;
  number: string;
  category: string;
  title: string;
  description: string;
  highlights: string[];
  color: "mint" | "glow";
  to: "/auth";
};

function ServiceCard({
  icon,
  number,
  category,
  title,
  description,
  highlights,
  color,
  to,
}: ServiceCardProps) {
  const accent = color === "mint" ? "text-mint" : "text-glow";
  const iconBg = color === "mint" ? "bg-mint/10" : "bg-glow/10";
  const cardClasses =
    "glass group flex h-full flex-col rounded-3xl p-6 transition duration-200 hover:-translate-y-1 hover:ring-1 hover:ring-glow/40 sm:p-8";

  const content = (
    <>
      <div className="flex items-start justify-between">
        <div className={`grid size-12 place-items-center rounded-2xl ${iconBg} ${accent}`}>
          {icon}
        </div>
        <span className="font-display text-sm text-mist">{number}</span>
      </div>
      <p className={`mt-6 text-xs font-medium uppercase tracking-[0.14em] ${accent}`}>{category}</p>
      <div className="mt-2 flex items-center justify-between gap-4">
        <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
        <ArrowUpRight className="size-5 shrink-0 text-mist transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>
      <p className="mt-3 max-w-xl text-sm leading-6 text-mist">{description}</p>
      <ul className="mt-6 space-y-2 border-t border-glass-line pt-5 text-sm text-mist">
        {highlights.map((highlight) => (
          <li key={highlight} className="flex items-center gap-2">
            <span className={`size-1.5 rounded-full ${color === "mint" ? "bg-mint" : "bg-glow"}`} />
            {highlight}
          </li>
        ))}
      </ul>
      <span className="mt-7 text-sm font-medium text-foreground">
        Sign in to open <span className={accent}>→</span>
      </span>
    </>
  );

  return (
    <Link to={to} className={cardClasses}>
      {content}
    </Link>
  );
}
