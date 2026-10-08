import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useCreateHome, useJoinHome } from "../hooks";

export function HomeSetup({
  onDone,
  compact,
}: {
  onDone: (homeId: string) => void;
  compact?: boolean;
}) {
  const create = useCreateHome();
  const join = useJoinHome();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  function onCreate(e: FormEvent) {
    e.preventDefault();
    create.mutate(name.trim(), {
      onSuccess: (home) => {
        toast.success(`Created ${home.name}`);
        setName("");
        onDone(home.id);
      },
    });
  }
  function onJoin(e: FormEvent) {
    e.preventDefault();
    join.mutate(code.trim(), {
      onSuccess: (id) => {
        toast.success("Joined home");
        setCode("");
        onDone(id);
      },
    });
  }

  return (
    <div className={compact ? "grid gap-4 sm:grid-cols-2" : "grid gap-4 md:grid-cols-2"}>
      <form onSubmit={onCreate} className="glass rounded-3xl p-5">
        <h2 className="text-base font-semibold">Create a home</h2>
        <p className="mt-1 text-xs text-mist">Your apartment, a parent's house, a cabin…</p>
        <input
          className="field mt-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Maple Street"
          required
        />
        <button
          type="submit"
          className="btn-glow mt-3 w-full"
          disabled={create.isPending || !name.trim()}
        >
          Create
        </button>
      </form>
      <form onSubmit={onJoin} className="glass rounded-3xl p-5">
        <h2 className="text-base font-semibold">Join with a code</h2>
        <p className="mt-1 text-xs text-mist">Ask a member to tap Share and send you the code.</p>
        <input
          className="field mt-3 font-display uppercase tracking-[0.2em]"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ABCD1234"
          required
          maxLength={8}
        />
        <button
          type="submit"
          className="btn-ghost mt-3 w-full"
          disabled={join.isPending || !code.trim()}
        >
          Join
        </button>
      </form>
    </div>
  );
}
