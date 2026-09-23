import { createFileRoute, Link } from "@tanstack/react-router";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pantry — Household stock, kept in order" },
      { name: "description", content: "A shared home inventory: prices, how many you have, how many you want, and what expires soon." },
      { property: "og:title", content: "Pantry — Household stock, kept in order" },
      { property: "og:description", content: "A shared home inventory: prices, how many you have, how many you want, and what expires soon." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useSession();

  return (
    <div className="ambient min-h-screen">
      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="glass grid size-14 place-items-center rounded-2xl font-display text-2xl font-semibold text-glow">P</div>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Pantry</h1>
        <p className="mt-3 max-w-md text-balance text-mist">
          Household stock, kept in order. Know what you have, what you want to keep stocked, and what expires soon — shared with the people you live with.
        </p>
        <div className="mt-8 flex items-center gap-3">
          {loading ? null : user ? (
            <Link to="/app" className="btn-glow">Open my homes</Link>
          ) : (
            <>
              <Link to="/auth" className="btn-glow">Sign in</Link>
              <Link to="/auth" search={{ mode: "signup" }} className="btn-ghost">Create account</Link>
            </>
          )}
        </div>
        <div className="mt-14 grid w-full grid-cols-1 gap-3 text-left sm:grid-cols-3">
          <div className="glass rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-rose">Low on stock</p>
            <p className="mt-1 text-sm text-mist">Set a target for every item and see what dropped below it.</p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-amber">Expiring soon</p>
            <p className="mt-1 text-sm text-mist">Milk, eggs, yoghurt — perishables surface before they go off.</p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-mint">Shared homes</p>
            <p className="mt-1 text-sm text-mist">Your apartment with your partner, plus each of your parents' homes.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
