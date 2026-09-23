import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function ProfileDialog({ userId, email, onClose }: { userId: string; email: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle().then(({ data }) => setName(data?.display_name ?? ""));
  }, [userId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Name can't be empty");
      const { error } = await supabase.from("profiles").update({ display_name: trimmed }).eq("id", userId);
      if (error) throw error;
      const updates: { data: { display_name: string }; password?: string } = { data: { display_name: trimmed } };
      if (password) {
        if (password.length < 6) throw new Error("Password must be at least 6 characters");
        updates.password = password;
      }
      const { error: authErr } = await supabase.auth.updateUser(updates);
      if (authErr) throw authErr;
      await qc.invalidateQueries();
      toast.success("Profile saved");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="glass w-full max-w-sm space-y-4 rounded-3xl p-5">
        <h2 className="text-lg font-semibold">Your profile</h2>
        <p className="text-xs text-mist">{email}</p>
        <label className="block space-y-1">
          <span className="text-xs text-mist">Display name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="w-full rounded-xl border border-foreground/10 bg-foreground/5 px-3 py-2 text-sm outline-none focus:border-foreground/30" />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-mist">New password (optional)</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-foreground/10 bg-foreground/5 px-3 py-2 text-sm outline-none focus:border-foreground/30" />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm text-mist hover:text-foreground">Cancel</button>
          <button type="submit" disabled={busy} className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </div>
  );
}
