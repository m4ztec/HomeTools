import { useState, type FormEvent, type ReactNode } from "react";
import { CATEGORIES, UNITS, type Item, type ItemInput } from "../model";

type Props = {
  initial?: Partial<Item>;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (values: ItemInput) => void;
  extra?: ReactNode;
};

export function ItemEditor({ initial, submitLabel, busy, onSubmit, extra }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Pantry");
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : "");
  const [unit, setUnit] = useState(initial?.unit ?? "pcs");
  const [qty, setQty] = useState(initial?.qty != null ? String(initial.qty) : "");
  const [target, setTarget] = useState(
    initial?.target_qty != null ? String(initial.target_qty) : "",
  );
  const [perishable, setPerishable] = useState(!!initial?.expires_at);
  const [expires, setExpires] = useState(initial?.expires_at ?? "");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      category,
      price: Number(price) || 0,
      unit,
      qty: Math.max(0, parseFloat(qty) || 0),
      target_qty: Math.max(0, parseFloat(target) || 0),
      expires_at: perishable && expires ? expires : null,
    });
    if (!initial?.id) {
      setName("");
      setPrice("");
      setQty("");
      setTarget("");
      setExpires("");
      setPerishable(false);
      setUnit("pcs");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-xs text-mist">Name</label>
        <input
          className="field mt-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Flour"
          required
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-mist">Price (€)</label>
          <input
            className="field mt-1"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="text-xs text-mist">Unit</label>
          <select className="field mt-1" value={unit} onChange={(e) => setUnit(e.target.value)}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-mist">Category</label>
          <select
            className="field mt-1"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-mist">Have ({unit})</label>
          <input
            className="field mt-1"
            inputMode="decimal"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="0.7"
          />
        </div>
        <div>
          <label className="text-xs text-mist">Want to keep ({unit})</label>
          <input
            className="field mt-1"
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="1"
          />
        </div>
      </div>
      <div>
        <label className="flex items-center gap-2 text-xs text-mist">
          <input
            type="checkbox"
            className="accent-glow"
            checked={perishable}
            onChange={(e) => setPerishable(e.target.checked)}
          />
          Perishable — has an expiry date
        </label>
        {perishable && (
          <input
            type="date"
            className="field mt-2"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
            required
          />
        )}
      </div>
      <div className="flex items-center gap-2">
        <button type="submit" className="btn-glow flex-1" disabled={busy || !name.trim()}>
          {busy ? "Saving…" : submitLabel}
        </button>
        {extra}
      </div>
    </form>
  );
}
