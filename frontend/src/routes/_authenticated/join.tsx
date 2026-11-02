import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Home as HomeIcon } from "lucide-react";
import { useState } from "react";
import { useAcceptHomeInvitation, useHomeInvitation } from "@/features/pantry/hooks";
import { SELECTED_HOME_KEY } from "@/features/pantry/model";
import { AppNavbar } from "@/shared/ui/AppNavbar";

export const Route = createFileRoute("/_authenticated/join")({
  head: () => ({
    meta: [
      { title: "Join a home — Pantry" },
      { name: "description", content: "Review and accept a Pantry home invitation." },
    ],
  }),
  component: JoinHomePage,
});

function JoinHomePage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [token] = useState(() =>
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.hash.slice(1)).get("invite"),
  );
  const invitation = useHomeInvitation(token);
  const accept = useAcceptHomeInvitation();

  function acceptInvitation() {
    if (!token) return;
    accept.mutate(token, {
      onSuccess: (homeId) => {
        localStorage.setItem(SELECTED_HOME_KEY, homeId);
        navigate({ to: "/pantry", replace: true });
      },
    });
  }

  return (
    <div className="ambient min-h-screen">
      <main className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <AppNavbar user={user} isAdmin={user.isAdmin} active="pantry" />
        <section className="mx-auto mt-10 max-w-xl">
          <div className="glass rounded-3xl p-6 sm:p-8">
            <div className="grid size-12 place-items-center rounded-2xl bg-mint/10 text-mint">
              <HomeIcon className="size-6" />
            </div>
            <p className="mt-5 text-xs font-medium uppercase tracking-[0.16em] text-mint">
              Pantry invitation
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Join a home</h1>

            {!token ? (
              <p className="mt-3 text-sm text-mist">
                This invitation link is missing its invite token. Ask the home owner for a new link.
              </p>
            ) : invitation.isPending ? (
              <p className="mt-3 text-sm text-mist">Checking your invitation…</p>
            ) : invitation.isError ? (
              <p role="alert" className="mt-3 text-sm text-rose">
                {invitation.error.message} Sign in with the invited Pantry account, or ask the owner
                for a new invitation.
              </p>
            ) : invitation.data ? (
              <>
                <p className="mt-3 text-sm leading-6 text-mist">
                  You are signed in as{" "}
                  <span className="font-medium text-foreground">{user.email}</span>. This invitation
                  is for{" "}
                  <span className="font-medium text-foreground">
                    {invitation.data.invited_email}
                  </span>{" "}
                  to join{" "}
                  <span className="font-medium text-foreground">{invitation.data.home_name}</span>.
                </p>
                <p className="mt-2 text-xs text-mist">
                  Expires {new Date(invitation.data.expires_at).toLocaleString()} and can only be
                  used once.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={acceptInvitation}
                    className="btn-glow"
                    disabled={accept.isPending}
                  >
                    {accept.isPending ? "Joining…" : "Accept invitation"}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/pantry" })}
                    className="btn-ghost inline-flex items-center gap-2"
                  >
                    <ArrowLeft className="size-4" /> Not now
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
