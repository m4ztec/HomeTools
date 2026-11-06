import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useSession } from "@/features/auth/useSession";
import { authApi } from "@/features/auth/api";
import { setAccessToken } from "@/shared/lib/api-client";

type Search = { mode?: "signin" | "signup"; returnTo?: string };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    mode: s["mode"] === "signup" ? "signup" : "signin",
    ...(typeof s["returnTo"] === "string" ? { returnTo: s["returnTo"] } : {}),
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
  const { mode, returnTo } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const isSignup = mode === "signup";

  const continueAfterAuth = useCallback(() => {
    const destination = invitationReturnPath(returnTo);
    if (destination) {
      window.location.assign(destination);
      return;
    }
    navigate({ to: "/homes", replace: true });
  }, [navigate, returnTo]);

  useEffect(() => {
    if (!loading && user) continueAfterAuth();
  }, [user, loading, continueAfterAuth]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (isSignup) {
        const response = await authApi.register(email, username.trim(), password, name.trim());
        setAccessToken(response.accessToken);
        continueAfterAuth();
      } else {
        const response = await authApi.login(identifier.trim(), password);
        setAccessToken(response.accessToken);
        continueAfterAuth();
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
                  ? "Create your account and set up a home. To join an existing home, sign in with the account it invited."
                  : "Sign in to see your homes or accept an invitation."}
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
            {isSignup && (
              <div>
                <label className="text-xs text-mist" htmlFor="username">
                  Username
                </label>
                <input
                  id="username"
                  className="field mt-1"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. manuel"
                  minLength={3}
                  maxLength={30}
                  pattern="[A-Za-z0-9](?:[A-Za-z0-9._-]{1,28}[A-Za-z0-9])?"
                  title="Use 3–30 letters, numbers, periods, underscores, or hyphens. Start and end with a letter or number."
                  required
                  autoComplete="username"
                />
                <p className="mt-1 text-xs text-mist">
                  Unique; use 3–30 letters, numbers, periods, underscores, or hyphens.
                </p>
              </div>
            )}
            <div>
              <label className="text-xs text-mist" htmlFor={isSignup ? "email" : "identifier"}>
                {isSignup ? "Email" : "Email or username"}
              </label>
              <input
                id={isSignup ? "email" : "identifier"}
                type={isSignup ? "email" : "text"}
                className="field mt-1"
                value={isSignup ? email : identifier}
                onChange={(e) =>
                  isSignup ? setEmail(e.target.value) : setIdentifier(e.target.value)
                }
                placeholder={isSignup ? "you@example.com" : "you@example.com or username"}
                required
                autoComplete={isSignup ? "email" : "username"}
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
                search={{
                  mode: isSignup ? "signin" : "signup",
                  ...(returnTo ? { returnTo } : {}),
                }}
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

function invitationReturnPath(value: string | undefined) {
  if (!value?.startsWith("/join#invite=")) return null;
  const destination = new URL(value, window.location.origin);
  if (destination.origin !== window.location.origin || destination.pathname !== "/join")
    return null;
  const token = new URLSearchParams(destination.hash.slice(1)).get("invite");
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return `${destination.pathname}${destination.hash}`;
}
