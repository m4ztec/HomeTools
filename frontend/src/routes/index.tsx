import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { Calculator, House, TrendingUp } from "lucide-react";
import { useSession } from "@/features/auth/useSession";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HomeTools" },
      {
        name: "description",
        content: "A few practical tools for home, finances, and trade history.",
      },
    ],
  }),
  component: Index,
});

const tools = [
  {
    icon: House,
    name: "Pantry",
    description: "Keep track of household items and shopping.",
  },
  {
    icon: Calculator,
    name: "IRS simulator",
    description: "Estimate Portuguese IRS for planning purposes.",
  },
  {
    icon: TrendingUp,
    name: "Trade tracker",
    description: "Record trades and follow average cost.",
  },
];

function Index() {
  const { user, loading } = useSession();

  if (!loading && user) return <Navigate to="/homes" replace />;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <header className="flex h-20 items-center justify-between border-b border-glass-line">
          <Link to="/" className="font-display text-lg font-semibold" aria-label="HomeTools home">
            HomeTools
          </Link>
          <nav className="flex items-center gap-4 text-sm" aria-label="Account">
            {loading ? (
              <span className="text-mist">Loading…</span>
            ) : (
              <>
                <Link to="/auth" className="text-mist hover:text-foreground">
                  Sign in
                </Link>
                <Link
                  to="/auth"
                  search={{ mode: "signup" }}
                  className="rounded-lg bg-white/10 px-3 py-2 hover:bg-white/15"
                >
                  Create account
                </Link>
              </>
            )}
          </nav>
        </header>

        <main className="py-16 sm:py-24">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">A few useful tools.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-mist sm:text-base">
            A small collection for keeping track of things at home and managing everyday
            calculations.
          </p>

          <section aria-labelledby="tools-heading" className="mt-10">
            <h2 id="tools-heading" className="text-sm font-medium text-mist">
              Tools
            </h2>
            <ul className="mt-3 divide-y divide-glass-line border-y border-glass-line">
              {tools.map(({ icon: Icon, name, description }) => (
                <li key={name}>
                  <Link
                    to="/auth"
                    className="group flex items-center gap-4 py-4 transition-colors hover:text-glow"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/5 text-mist group-hover:text-glow">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{name}</span>
                      <span className="mt-1 block text-sm text-mist">{description}</span>
                    </span>
                    <span className="text-xs text-mist">Sign in to open</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-5 text-mist">
              The IRS simulator provides estimates only, not official tax advice.
            </p>
          </section>
        </main>

        <footer className="border-t border-glass-line py-5 text-xs text-mist">HomeTools</footer>
      </div>
    </div>
  );
}
