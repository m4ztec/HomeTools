import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useSession } from "@/hooks/useSession";
import { authApi, setAccessToken } from "@/lib/api";

type Search = { mode?: "signin" | "signup" };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    mode: s["mode"] === "signup" ? "signup" : "signin",
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Pantry" },
      {
        name: "description",
        content: "Sign in or create an account to manage your shared home inventory.",
      },
      { property: "og:title", content: "Sign in — Pantry" },
      {
        property: "og:description",
        content: "Sign in or create an account to manage your shared home inventory.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const isSignup = mode === "signup";

  useEffect(() => {
    if (!loading && user) navigate({ to: "/homes", replace: true });
  }, [user, loading, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (isSignup) {
        const response = await authApi.register(email, password, name.trim());
        setAccessToken(response.accessToken);
        navigate({ to: "/homes", replace: true });
      } else {
        const response = await authApi.login(email, password);
        setAccessToken(response.accessToken);
        navigate({ to: "/homes", replace: true });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ambient min-h-screen">
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <Link to="/" className="flex items-center gap-3">
          <div className="glass grid size-10 place-items-center rounded-xl font-display text-lg font-semibold text-glow">
            P
          </div>
          <div>
            <p className="font-display text-xl font-semibold leading-none">Pantry</p>
            <p className="mt-1 text-xs text-mist">Household stock, kept in order</p>
          </div>
        </Link>

        <div className="glass mt-8 rounded-3xl p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <h1 className="text-lg font-semibold">
                {isSignup ? "Create your account" : "Welcome back"}
              </h1>
              <p className="mt-1 text-sm text-mist">
                {isSignup
                  ? "Then create a home or join one with an invite code."
                  : "Sign in to see your homes."}
              </p>
            </div>
            {isSignup && (
              <div>
                <label className="text-xs text-mist" htmlFor="name">
                  Your name
                </label>
                <input
                  id="name"
                  className="field mt-1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Manuel"
                  required
                />
              </div>
            )}
            <div>
              <label className="text-xs text-mist" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="field mt-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="text-xs text-mist" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="field mt-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                minLength={6}
                required
                autoComplete={isSignup ? "new-password" : "current-password"}
              />
            </div>
            <button type="submit" className="btn-glow w-full" disabled={busy}>
              {busy ? "One moment…" : isSignup ? "Create account" : "Sign in"}
            </button>
            <p className="text-center text-xs text-mist">
              {isSignup ? "Already have an account? " : "New here? "}
              <Link
                to="/auth"
                search={{ mode: isSignup ? "signin" : "signup" }}
                className="font-medium text-glow"
              >
                {isSignup ? "Sign in" : "Create one"}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
