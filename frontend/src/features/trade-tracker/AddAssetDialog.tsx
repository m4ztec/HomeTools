import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, type FormEvent } from "react";
import { toast } from "sonner";
import { tradeTrackerApi, type TrackedAsset } from "./api";

export function AddAssetDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (asset: TrackedAsset) => void;
}) {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const addAsset = useMutation({
    mutationFn: tradeTrackerApi.createAsset,
    onSuccess: (asset) => {
      void queryClient.invalidateQueries({ queryKey: ["trade-tracker"] });
      toast.success(`${asset.symbol} added`);
      formRef.current?.reset();
      onCreated(asset);
    },
    onError: (error) => toast.error(error.message),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    addAsset.mutate({
      symbol: String(form.get("symbol")).trim().toUpperCase(),
      name: String(form.get("name")).trim(),
      currency: String(form.get("currency")).trim().toUpperCase(),
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        ref={formRef}
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        className="glass w-full max-w-sm space-y-3 rounded-3xl p-5"
      >
        <h2 className="text-lg font-semibold">Add an asset</h2>
        <label className="block text-sm">
          <span className="text-xs text-mist">Symbol</span>
          <input
            className="field mt-1"
            name="symbol"
            placeholder="e.g. AAPL"
            maxLength={20}
            required
            autoFocus
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-mist">Asset name</span>
          <input className="field mt-1" name="name" placeholder="Optional" maxLength={80} />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-mist">Currency</span>
          <input
            className="field mt-1 uppercase"
            name="currency"
            defaultValue="EUR"
            maxLength={3}
            minLength={3}
            required
          />
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm text-mist hover:text-foreground"
          >
            Cancel
          </button>
          <button type="submit" className="btn-glow" disabled={addAsset.isPending}>
            {addAsset.isPending ? "Saving…" : "Create asset"}
          </button>
        </div>
      </form>
    </div>
  );
}
