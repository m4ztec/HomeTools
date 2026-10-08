import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Shield, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { pantryApi } from "@/features/pantry/api";
import { applySettings, type AppSettings } from "@/features/pantry/model";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: ({ context }) => {
    if (!context.isAdmin) throw redirect({ to: "/homes" });
  },
  head: () => ({
    meta: [
      { title: "Admin panel — Pantry" },
      {
        name: "description",
        content: "App-wide configuration, users and homes for Pantry administrators.",
      },
      { property: "og:title", content: "Admin panel — Pantry" },
      {
        property: "og:description",
        content: "App-wide configuration, users and homes for Pantry administrators.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <div className="ambient min-h-screen">
      <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center gap-3">
          <Link
            to="/homes"
            className="glass grid size-10 place-items-center rounded-xl text-mist hover:text-foreground"
            aria-label="Back to homes"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold leading-none">
              <Shield className="size-5 text-glow" /> Admin panel
            </h1>
            <p className="mt-1 text-xs text-mist">App-wide configuration</p>
          </div>
        </header>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <SettingsPanel />
          <div className="space-y-4">
            <UsersPanel />
            <HomesPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsPanel() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["app_settings"],
    queryFn: pantryApi.settings,
  });
  const [draft, setDraft] = useState<AppSettings | null>(null);
  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const save = useMutation({
    mutationFn: (s: AppSettings) =>
      pantryApi.updateSettings({
        ...s,
        currency: s.currency.toUpperCase(),
        updated_at: new Date().toISOString(),
      }),
    onSuccess: (s) => {
      applySettings({ ...s, currency: s.currency.toUpperCase() });
      qc.invalidateQueries();
      toast.success("Settings saved");
    },
    onError: (e) => toast.error(e.message),
  });

  if (!draft)
    return <section className="glass rounded-3xl p-5 text-sm text-mist">Loading…</section>;
  const set = (patch: Partial<AppSettings>) => setDraft({ ...draft, ...patch });

  return (
    <section className="glass space-y-5 rounded-3xl p-5">
      <h2 className="text-lg font-semibold">Settings</h2>
      <ListEditor
        label="Categories"
        values={draft.categories}
        onChange={(categories) => set({ categories })}
      />
      <ListEditor label="Units" values={draft.units} onChange={(units) => set({ units })} />
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="text-xs text-mist">Currency code</span>
          <input
            className="field mt-1 w-full"
            maxLength={3}
            value={draft.currency}
            onChange={(e) => set({ currency: e.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="text-xs text-mist">"Expiring soon" window (days)</span>
          <input
            className="field mt-1 w-full"
            type="number"
            min={0}
            max={60}
            value={draft.expiring_days}
            onChange={(e) => set({ expiring_days: Math.max(0, Number(e.target.value) || 0) })}
          />
        </label>
      </div>
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>
          New sign-ups
          <span className="block text-xs text-mist">
            When off, nobody can create a new account.
          </span>
        </span>
        <input
          type="checkbox"
          className="size-5 accent-[var(--color-glow)]"
          checked={draft.signups_enabled}
          onChange={(e) => set({ signups_enabled: e.target.checked })}
        />
      </label>
      <button
        type="button"
        className="btn-glow w-full"
        disabled={save.isPending}
        onClick={() => save.mutate(draft)}
      >
        {save.isPending ? "Saving…" : "Save settings"}
      </button>
    </section>
  );
}

function ListEditor({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const [input, setInput] = useState("");
  function add() {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput("");
  }
  return (
    <div>
      <p className="text-xs text-mist">{label}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span key={v} className="pill flex items-center gap-1">
            {v}
            <button
              type="button"
              aria-label={`Remove ${v}`}
              disabled={values.length <= 1}
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="text-mist hover:text-rose"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          className="field flex-1"
          placeholder={`Add ${label.toLowerCase().slice(0, -1)}`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn-ghost" onClick={add}>
          Add
        </button>
      </div>
    </div>
  );
}

function UsersPanel() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: pantryApi.adminUsers,
  });
  const remove = useMutation({
    mutationFn: pantryApi.deleteUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      toast.success("User removed");
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <section className="glass rounded-3xl p-5">
      <h2 className="text-lg font-semibold">
        Users <span className="text-sm text-mist">({data.length})</span>
      </h2>
      <ul className="mt-3 divide-y divide-foreground/5">
        {data.map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {u.display_name || u.email}{" "}
                {u.is_admin && <span className="ml-1 text-xs text-glow">admin</span>}
              </p>
              <p className="truncate text-xs text-mist">
                {u.email} · {u.home_count} home{u.home_count === 1 ? "" : "s"}
              </p>
            </div>
            {!u.is_admin && (
              <button
                type="button"
                className="qty-btn text-rose"
                aria-label={`Remove ${u.email}`}
                disabled={remove.isPending}
                onClick={() =>
                  confirm(`Remove ${u.email}? This deletes their account.`) && remove.mutate(u.id)
                }
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function HomesPanel() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin", "homes"],
    queryFn: pantryApi.adminHomes,
  });
  const remove = useMutation({
    mutationFn: pantryApi.deleteHome,
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Home deleted");
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <section className="glass rounded-3xl p-5">
      <h2 className="text-lg font-semibold">
        Homes <span className="text-sm text-mist">({data.length})</span>
      </h2>
      <ul className="mt-3 divide-y divide-foreground/5">
        {data.map((h) => (
          <li key={h.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{h.name}</p>
              <p className="truncate text-xs text-mist">
                by {h.owner_name || "unknown"} · {h.member_count} member
                {h.member_count === 1 ? "" : "s"} · {h.item_count} items
              </p>
            </div>
            <button
              type="button"
              className="qty-btn text-rose"
              aria-label={`Delete ${h.name}`}
              disabled={remove.isPending}
              onClick={() =>
                confirm(`Delete "${h.name}" and all its items?`) && remove.mutate(h.id)
              }
            >
              <Trash2 className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
