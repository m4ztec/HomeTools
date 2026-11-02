import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useCreateHome } from "../hooks";

export function HomeSetup({
  onDone,
  compact,
}: {
  onDone: (homeId: string) => void;
  compact?: boolean;
}) {
  const create = useCreateHome();
  const [name, setName] = useState("");

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

  return (
    <div className={compact ? "mx-auto w-full max-w-md" : "w-full max-w-md"}>
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
    </div>
  );
}
