import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { currency, daysUntilExpiry, expiryLabel, formatQty, isLow, qtyStep, type Item } from "@/lib/inventory";
import { useDeleteItem, useUpdateItem } from "@/hooks/useHomes";
import { ItemEditor } from "./ItemEditor";

export function ItemRow({ item }: { item: Item }) {
  const update = useUpdateItem();
  const remove = useDeleteItem();
  const [editing, setEditing] = useState(false);
  const days = daysUntilExpiry(item);
  const expiry = expiryLabel(item);
  const expiryTone = days !== null && days <= 1 ? "bg-rose/15 text-rose" : "bg-amber/15 text-amber";
  const low = isLow(item);
  const step = qtyStep(item.unit);

  const setQty = (q: number) => update.mutate({ id: item.id, qty: Math.max(0, Number(q.toFixed(2))) });

  return (
    <div className="py-3">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setEditing((v) => !v)} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">{item.name}</p>
            {expiry && days !== null && days <= 7 && <span className={`pill ${expiryTone}`}>{expiry}</span>}
            {low ? <span className="pill bg-rose/15 text-rose">Low</span> : <span className="pill bg-mint/15 text-mint">OK</span>}
          </div>
          <p className="mt-0.5 text-xs text-mist">
            {item.category} · {currency.format(Number(item.price))} / {item.unit}
            {expiry && days !== null && days > 7 ? ` · ${expiry}` : ""}
          </p>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" className="qty-btn" aria-label={`Decrease ${item.name}`} onClick={() => setQty(item.qty - step)} disabled={item.qty === 0}>−</button>
          <span className="min-w-10 text-center text-sm font-medium">{formatQty(item.qty)}<span className="text-xs text-mist"> {item.unit}</span></span>
          <button type="button" className="qty-btn" aria-label={`Increase ${item.name}`} onClick={() => setQty(item.qty + step)}>+</button>
          <span className="mx-1 text-xs text-mist">/</span>
          <span className="min-w-8 text-center text-sm font-medium text-mist" title="Target quantity">{formatQty(item.target_qty)}</span>
        </div>
      </div>
      {editing && (
        <div className="mt-3 rounded-2xl bg-ink-2/60 p-4 ring-1 ring-glass-line">
          <ItemEditor
            initial={item}
            submitLabel="Save changes"
            busy={update.isPending}
            onSubmit={(values) => {
              update.mutate({ id: item.id, ...values }, { onSuccess: () => { setEditing(false); toast.success("Saved"); } });
            }}
            extra={
              <button
                type="button"
                className="btn-ghost flex items-center gap-2 text-rose hover:text-rose"
                onClick={() => remove.mutate(item.id, { onSuccess: () => toast.success(`Removed ${item.name}`) })}
              >
                <Trash2 className="size-4" /> Remove
              </button>
            }
          />
        </div>
      )}
    </div>
  );
}
