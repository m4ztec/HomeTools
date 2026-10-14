import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, Plus, Trash2, TrendingUp } from "lucide-react";
import { useMemo, type FormEvent } from "react";
import { toast } from "sonner";
import type { AuthUser } from "@/features/auth/api";
import { tradeTrackerApi, type Trade, type TrackedAsset } from "./api";
import { AppNavbar } from "@/shared/ui/AppNavbar";

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 8 });

function currency(value: number, code: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: code,
    maximumFractionDigits: 2,
  }).format(value);
}

function localDateTimeNow() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function profitClass(value: number) {
  return value >= 0 ? "text-mint" : "text-rose";
}

export function TradeTrackerPage({ user }: { user: AuthUser }) {
  const queryClient = useQueryClient();
  const dashboard = useQuery({
    queryKey: ["trade-tracker"],
    queryFn: tradeTrackerApi.dashboard,
  });
  const assets = dashboard.data?.assets ?? [];
  const trades = dashboard.data?.trades ?? [];
  const activePositions = assets.filter((asset) => asset.quantity > 0);

  const summaryByCurrency = useMemo(() => {
    const summary = new Map<string, { realized: number; unrealized: number; unpriced: number }>();
    for (const asset of assets) {
      const totals = summary.get(asset.currency) ?? { realized: 0, unrealized: 0, unpriced: 0 };
      totals.realized += asset.realizedProfitLoss;
      if (asset.currentPrice !== null) {
        totals.unrealized += asset.unrealizedProfitLoss;
      } else if (asset.quantity > 0) {
        totals.unpriced += 1;
      }
      summary.set(asset.currency, totals);
    }
    return [...summary.entries()].sort(([left], [right]) => left.localeCompare(right));
  }, [assets]);

  const addTrade = useMutation({
    mutationFn: tradeTrackerApi.createTrade,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["trade-tracker"] });
      toast.success("Trade added");
      document.getElementById("trade-form")?.reset();
      const dateInput = document.getElementById("traded-at");
      if (dateInput instanceof HTMLInputElement) dateInput.value = localDateTimeNow();
    },
    onError: (error) => toast.error(error.message),
  });

  const updatePrice = useMutation({
    mutationFn: ({ assetId, price }: { assetId: string; price: number }) =>
      tradeTrackerApi.updatePrice(assetId, price),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["trade-tracker"] });
      toast.success("Market price updated");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteTrade = useMutation({
    mutationFn: tradeTrackerApi.deleteTrade,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["trade-tracker"] });
      toast.success("Trade deleted");
    },
    onError: (error) => toast.error(error.message),
  });

  function submitTrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const tradedAt = String(form.get("tradedAt"));
    addTrade.mutate({
      symbol: String(form.get("symbol")).trim().toUpperCase(),
      name: String(form.get("name")).trim(),
      currency: String(form.get("currency")).trim().toUpperCase(),
      side: String(form.get("side")) === "Sell" ? "Sell" : "Buy",
      quantity: Number(form.get("quantity")),
      unitPrice: Number(form.get("unitPrice")),
      fees: Number(form.get("fees") || 0),
      tradedAt: new Date(tradedAt).toISOString(),
      notes: String(form.get("notes")).trim(),
    });
  }

  function removeTrade(trade: Trade) {
    if (
      window.confirm(
        `Delete the ${trade.side.toLowerCase()} of ${trade.quantity} ${trade.symbol}?`,
      )
    ) {
      deleteTrade.mutate(trade.id);
    }
  }

  return (
    <div className="ambient min-h-screen">
      <main className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <AppNavbar user={user} isAdmin={user.isAdmin} active="trades" />

        <section className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-glow">
              Money & planning
            </p>
            <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              <TrendingUp className="size-7 text-glow" />
              Average Cost Trade Tracker
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-mist">
              Record buys and sells, follow average cost basis, and track realized and unrealized
              performance for each asset.
            </p>
          </div>
        </section>

        <aside className="glass mt-5 rounded-2xl border border-glow/20 p-4 text-sm leading-6 text-mist">
          Average cost includes buy fees; sell fees reduce proceeds. Market prices are entered
          manually and are not live quotes. The tracker supports long positions only and is not tax
          or investment advice.
        </aside>

        {dashboard.isError && (
          <section className="glass mt-5 rounded-2xl border border-rose/30 p-4 text-sm text-rose">
            Could not load your trade history: {dashboard.error.message}
          </section>
        )}

        <section className="mt-5 grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Open positions" value={numberFormat.format(activePositions.length)} />
          <SummaryCard label="Tracked symbols" value={numberFormat.format(assets.length)} />
          <SummaryCard label="Recorded trades" value={numberFormat.format(trades.length)} />
        </section>

        {summaryByCurrency.length > 0 && (
          <section className="mt-3 grid gap-3 sm:grid-cols-2">
            {summaryByCurrency.map(([code, summary]) => (
              <article key={code} className="glass rounded-2xl p-4">
                <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-mist">
                  Performance · {code}
                </h2>
                <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                  <p>
                    Realized{" "}
                    <span className={`font-semibold ${profitClass(summary.realized)}`}>
                      {currency(summary.realized, code)}
                    </span>
                  </p>
                  <p>
                    Unrealized{" "}
                    <span className={`font-semibold ${profitClass(summary.unrealized)}`}>
                      {currency(summary.unrealized, code)}
                    </span>
                  </p>
                </div>
                {summary.unpriced > 0 && (
                  <p className="mt-2 text-xs text-mist">
                    Excludes {summary.unpriced} open position
                    {summary.unpriced === 1 ? "" : "s"} without a market price.
                  </p>
                )}
              </article>
            ))}
          </section>
        )}

        <section className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="glass min-w-0 rounded-3xl p-4 sm:p-6">
            <div>
              <h2 className="text-lg font-semibold">Positions</h2>
              <p className="mt-1 text-xs text-mist">
                Values remain separate by currency; no currency conversion is applied.
              </p>
            </div>

            {dashboard.isLoading ? (
              <p className="py-10 text-center text-sm text-mist">Loading positions…</p>
            ) : assets.length === 0 ? (
              <p className="py-10 text-center text-sm text-mist">
                No tracked assets yet. Add your first trade to start a position.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[780px] text-left text-sm">
                  <thead className="border-b border-glass-line text-xs text-mist">
                    <tr>
                      <th className="pb-3 pr-4 font-medium">Asset</th>
                      <th className="pb-3 pr-4 text-right font-medium">Quantity</th>
                      <th className="pb-3 pr-4 text-right font-medium">Average cost</th>
                      <th className="pb-3 pr-4 text-right font-medium">Cost basis</th>
                      <th className="pb-3 pr-4 font-medium">Market price</th>
                      <th className="pb-3 pr-4 text-right font-medium">Unrealized P&amp;L</th>
                      <th className="pb-3 text-right font-medium">Realized P&amp;L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-glass-line">
                    {assets.map((asset) => (
                      <AssetRow
                        key={asset.id}
                        asset={asset}
                        updating={updatePrice.isPending}
                        onUpdatePrice={(price) => updatePrice.mutate({ assetId: asset.id, price })}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="glass rounded-3xl p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <Plus className="size-4 text-glow" /> Add a trade
            </h2>
            <form id="trade-form" onSubmit={submitTrade} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Symbol">
                  <input
                    className="field mt-1"
                    name="symbol"
                    placeholder="e.g. AAPL"
                    maxLength={20}
                    required
                  />
                </Field>
                <Field label="Side">
                  <select className="field mt-1" name="side" defaultValue="Buy">
                    <option value="Buy">Buy</option>
                    <option value="Sell">Sell</option>
                  </select>
                </Field>
              </div>
              <Field label="Asset name">
                <input className="field mt-1" name="name" placeholder="Optional" maxLength={80} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Currency">
                  <input
                    className="field mt-1 uppercase"
                    name="currency"
                    defaultValue="EUR"
                    maxLength={3}
                    minLength={3}
                    required
                  />
                </Field>
                <Field label="Quantity">
                  <input
                    className="field mt-1"
                    name="quantity"
                    type="number"
                    min="0.00000001"
                    step="any"
                    required
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Price per unit">
                  <input
                    className="field mt-1"
                    name="unitPrice"
                    type="number"
                    min="0.00000001"
                    step="any"
                    required
                  />
                </Field>
                <Field label="Fees">
                  <input
                    className="field mt-1"
                    name="fees"
                    type="number"
                    min="0"
                    step="any"
                    defaultValue="0"
                  />
                </Field>
              </div>
              <Field label="Trade date and time">
                <input
                  id="traded-at"
                  className="field mt-1"
                  name="tradedAt"
                  type="datetime-local"
                  defaultValue={localDateTimeNow()}
                  required
                />
              </Field>
              <Field label="Notes">
                <input className="field mt-1" name="notes" placeholder="Optional" maxLength={240} />
              </Field>
              <button
                className="btn-glow w-full"
                type="submit"
                disabled={addTrade.isPending}
              >
                {addTrade.isPending ? "Saving…" : "Add trade"}
              </button>
            </form>
          </section>
        </section>

        <section className="glass mt-6 rounded-3xl p-4 sm:p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Trade history</h2>
              <p className="mt-1 text-xs text-mist">Newest trades first</p>
            </div>
            <span className="text-xs text-mist">{trades.length} total</span>
          </div>
          {dashboard.isLoading ? (
            <p className="py-10 text-center text-sm text-mist">Loading trade history…</p>
          ) : trades.length === 0 ? (
            <p className="py-10 text-center text-sm text-mist">
              Your trades will appear here after you add one.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-glass-line text-xs text-mist">
                  <tr>
                    <th className="pb-3 pr-4 font-medium">Date</th>
                    <th className="pb-3 pr-4 font-medium">Asset</th>
                    <th className="pb-3 pr-4 font-medium">Side</th>
                    <th className="pb-3 pr-4 text-right font-medium">Quantity</th>
                    <th className="pb-3 pr-4 text-right font-medium">Price</th>
                    <th className="pb-3 pr-4 text-right font-medium">Fees</th>
                    <th className="pb-3 pr-4 text-right font-medium">Realized P&amp;L</th>
                    <th className="pb-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-line">
                  {trades.map((trade) => (
                    <tr key={trade.id}>
                      <td className="whitespace-nowrap py-3 pr-4 text-mist">
                        {new Date(trade.tradedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="font-medium">{trade.symbol}</span>
                        {trade.name !== trade.symbol && (
                          <span className="ml-2 text-xs text-mist">{trade.name}</span>
                        )}
                        {trade.notes && (
                          <span className="mt-0.5 block text-xs text-mist">{trade.notes}</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center gap-1 ${trade.side === "Buy" ? "text-mint" : "text-rose"}`}
                        >
                          {trade.side === "Buy" ? (
                            <ArrowDownRight className="size-3.5" />
                          ) : (
                            <ArrowUpRight className="size-3.5" />
                          )}
                          {trade.side}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right">{numberFormat.format(trade.quantity)}</td>
                      <td className="py-3 pr-4 text-right">
                        {currency(trade.unitPrice, trade.currency)}
                      </td>
                      <td className="py-3 pr-4 text-right">{currency(trade.fees, trade.currency)}</td>
                      <td
                        className={`py-3 pr-4 text-right ${trade.realizedProfitLoss === null ? "text-mist" : profitClass(trade.realizedProfitLoss)}`}
                      >
                        {trade.realizedProfitLoss === null
                          ? "—"
                          : currency(trade.realizedProfitLoss, trade.currency)}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          className="rounded-lg p-2 text-mist transition-colors hover:bg-rose/10 hover:text-rose"
                          aria-label={`Delete ${trade.side.toLowerCase()} trade for ${trade.symbol}`}
                          disabled={deleteTrade.isPending}
                          onClick={() => removeTrade(trade)}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="glass rounded-2xl p-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-mist">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
    </article>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="text-xs text-mist">{label}</span>
      {children}
    </label>
  );
}

function AssetRow({
  asset,
  updating,
  onUpdatePrice,
}: {
  asset: TrackedAsset;
  updating: boolean;
  onUpdatePrice: (price: number) => void;
}) {
  function submitPrice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onUpdatePrice(Number(form.get("currentPrice")));
  }

  return (
    <tr>
      <td className="py-3 pr-4">
        <span className="font-medium">{asset.symbol}</span>
        <span className="mt-0.5 block text-xs text-mist">{asset.name}</span>
      </td>
      <td className="py-3 pr-4 text-right">{numberFormat.format(asset.quantity)}</td>
      <td className="py-3 pr-4 text-right">{currency(asset.averageCost, asset.currency)}</td>
      <td className="py-3 pr-4 text-right">{currency(asset.costBasis, asset.currency)}</td>
      <td className="py-3 pr-4">
        <form className="flex items-center gap-1.5" onSubmit={submitPrice}>
          <input
            className="field w-28"
            aria-label={`Current market price for ${asset.symbol}`}
            name="currentPrice"
            type="number"
            min="0"
            step="any"
            defaultValue={asset.currentPrice ?? ""}
            required
          />
          <button
            className="rounded-lg bg-glow/10 px-2.5 py-2 text-xs font-medium text-glow transition-colors hover:bg-glow/20"
            type="submit"
            disabled={updating}
          >
            Save
          </button>
        </form>
        {asset.currentPrice !== null && (
          <span className="mt-1 block text-xs text-mist">
            Value {currency(asset.marketValue, asset.currency)}
          </span>
        )}
      </td>
      <td className={`py-3 pr-4 text-right ${profitClass(asset.unrealizedProfitLoss)}`}>
        {asset.currentPrice === null ? "—" : currency(asset.unrealizedProfitLoss, asset.currency)}
      </td>
      <td className={`py-3 text-right ${profitClass(asset.realizedProfitLoss)}`}>
        {currency(asset.realizedProfitLoss, asset.currency)}
      </td>
    </tr>
  );
}
