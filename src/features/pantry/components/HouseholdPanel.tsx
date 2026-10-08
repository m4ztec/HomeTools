import { useState } from "react";
import { Copy, LogOut } from "lucide-react";
import { toast } from "sonner";
import type { Home } from "../model";
import { useLeaveHome, useMembers } from "../hooks";

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
  const [showCode, setShowCode] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(home.invite_code);
      toast.success("Invite code copied");
    } catch {
      toast.message(`Invite code: ${home.invite_code}`);
    }
  }

  return (
    <section className="glass rounded-3xl p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Household</h2>
        <button
          type="button"
          onClick={() => setShowCode((v) => !v)}
          className="text-xs font-medium text-glow hover:text-glow/80"
        >
          Share
        </button>
      </div>

      {showCode && (
        <div className="mt-3 rounded-xl bg-ink-2/60 p-3 ring-1 ring-glass-line">
          <p className="text-xs text-mist">Anyone with this code can join {home.name}:</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 font-display text-lg font-semibold tracking-[0.2em]">
              {home.invite_code}
            </code>
            <button
              type="button"
              onClick={copyCode}
              className="qty-btn"
              aria-label="Copy invite code"
            >
              <Copy className="size-3.5" />
            </button>
          </div>
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
