import { useState, type FormEvent } from "react";
import { Copy, LogOut } from "lucide-react";
import { toast } from "sonner";
import type { Home } from "../model";
import { useCreateHomeInvitation, useLeaveHome, useMembers } from "../hooks";

const tones = [
  "bg-glow/15 text-glow",
  "bg-mint/15 text-mint",
  "bg-amber/15 text-amber",
  "bg-rose/15 text-rose",
];

export function HouseholdPanel({
  home,
  currentUserId,
  onLeft,
}: {
  home: Home;
  currentUserId: string;
  onLeft: () => void;
}) {
  const { data: members = [] } = useMembers(home.id);
  const leave = useLeaveHome();
  const createInvitation = useCreateHomeInvitation(home.id);
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [invitedEmail, setInvitedEmail] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const isOwner = home.created_by === currentUserId;

  function createInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createInvitation.mutate(email.trim(), {
      onSuccess: (invitation) => {
        const url = new URL("/join", window.location.origin);
        url.hash = `invite=${invitation.token}`;
        setInviteUrl(url.toString());
        setInvitedEmail(invitation.invited_email);
        setExpiresAt(invitation.expires_at);
        setEmail("");
        toast.success("Invite link created");
      },
    });
  }

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied");
    } catch {
      toast.error("Clipboard access is unavailable. Select and copy the invite link.");
    }
  }

  return (
    <section className="glass rounded-3xl p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Household</h2>
        {isOwner && (
          <button
            type="button"
            onClick={() => setShowInvite((value) => !value)}
            aria-expanded={showInvite}
            className="text-xs font-medium text-glow hover:text-glow/80"
          >
            Invite
          </button>
        )}
      </div>

      {showInvite && isOwner && (
        <div className="mt-3 rounded-xl bg-ink-2/60 p-3 ring-1 ring-glass-line">
          <p className="text-xs leading-5 text-mist">
            Invite an existing Pantry account by email. Links are single-use, expire in 7 days, and
            only work for that account. Email delivery is not configured, so copy and send the link
            yourself.
          </p>
          <form onSubmit={createInvite} className="mt-3">
            <label htmlFor={`invite-email-${home.id}`} className="sr-only">
              Account email
            </label>
            <input
              id={`invite-email-${home.id}`}
              className="field"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              maxLength={256}
              required
            />
            <button
              type="submit"
              className="btn-glow mt-2 w-full"
              disabled={createInvitation.isPending || !email.trim()}
            >
              {createInvitation.isPending ? "Creating link…" : "Create invite link"}
            </button>
          </form>
          {inviteUrl && (
            <div className="mt-3 border-t border-foreground/10 pt-3">
              <p className="text-xs font-medium">{invitedEmail}</p>
              <p className="mt-1 text-xs text-mist">
                Expires {new Date(expiresAt).toLocaleDateString()}
              </p>
              <input
                className="field mt-2"
                aria-label="Invite link"
                readOnly
                value={inviteUrl}
                onFocus={(event) => event.currentTarget.select()}
              />
              <button
                type="button"
                onClick={() => void copyInviteLink()}
                className="btn-ghost mt-2 flex w-full items-center justify-center gap-2"
              >
                <Copy className="size-4" /> Copy invite link
              </button>
              <p className="mt-2 text-xs text-mist">
                Creating another invite for this account will invalidate this link.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 space-y-2">
        {members.map((m, i) => (
          <div key={m.user_id} className="flex items-center gap-3">
            <div
              className={`grid size-9 place-items-center rounded-full text-sm font-semibold ${tones[i % tones.length]}`}
            >
              {m.display_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {m.display_name}
                {m.user_id === currentUserId ? " (you)" : ""}
              </p>
              <p className="text-xs capitalize text-mist">{m.role}</p>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="btn-ghost mt-1 flex w-full items-center justify-center gap-2"
          onClick={() => {
            if (confirm(`Leave ${home.name}?`)) leave.mutate(home.id, { onSuccess: onLeft });
          }}
        >
          <LogOut className="size-4" /> Leave this home
        </button>
      </div>
    </section>
  );
}
