import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Plus,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import type { AuthUser } from "@/features/auth/api";
import { tradeTrackerApi, type Trade, type TrackedAsset } from "./api";
import { AddAssetDialog } from "./AddAssetDialog";
import { AppNavbar } from "@/shared/ui/AppNavbar";

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 8 });
const EMPTY_ASSETS: TrackedAsset[] = [];
const EMPTY_TRADES: Trade[] = [];
const PAGE_SIZE = 10;

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
  const tradeFormRef = useRef<HTMLFormElement>(null);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [recordNow, setRecordNow] = useState(true);
  const [assetQuery, setAssetQuery] = useState("");
  const [assetSuggestionsOpen, setAssetSuggestionsOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const dashboard = useQuery({
    queryKey: ["trade-tracker"],
    queryFn: tradeTrackerApi.dashboard,
  });
  const assets = dashboard.data?.assets ?? EMPTY_ASSETS;
  const trades = dashboard.data?.trades ?? EMPTY_TRADES;

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
      const form = tradeFormRef.current;
      if (form) {
        setFormFieldValue(form, "quantity", "");
        setFormFieldValue(form, "unitPrice", "");
        setFormFieldValue(form, "fees", "0");
        setFormFieldValue(form, "notes", "");
        setFormFieldValue(form, "tradedAt", localDateTimeNow());
      }
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
    const tradedAt = recordNow
      ? new Date().toISOString()
      : new Date(String(form.get("tradedAt"))).toISOString();
    addTrade.mutate({
      assetId: String(form.get("assetId")),
      side: String(form.get("side")) === "Sell" ? "Sell" : "Buy",
      quantity: Number(form.get("quantity")),
      unitPrice: Number(form.get("unitPrice")),
      fees: Number(form.get("fees") || 0),
      tradedAt,
      notes: String(form.get("notes")).trim(),
    });
  }

  function removeTrade(trade: Trade) {
    if (
      window.confirm(`Delete the ${trade.side.toLowerCase()} of ${trade.quantity} ${trade.symbol}?`)
    ) {
      deleteTrade.mutate(trade.id);
    }
  }

  const matchingAssets = useMemo(() => {
    const query = assetQuery.trim().toLowerCase();
    if (!query) return assets;
    return assets.filter(
      (asset) =>
        asset.symbol.toLowerCase().includes(query) || asset.name.toLowerCase().includes(query),
    );
  }, [assets, assetQuery]);

  const filteredTrades = useMemo(() => {
    const search = searchFilter.trim().toLowerCase();
    const asset = assetQuery.trim().toLowerCase();
    const matchedAssetIds = asset
      ? new Set(
          assets
            .filter(
              (item) =>
                item.symbol.toLowerCase().includes(asset) ||
                item.name.toLowerCase().includes(asset),
            )
            .map((item) => item.id),
        )
      : null;
    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;
    return trades.filter((trade) => {
      if (matchedAssetIds && !matchedAssetIds.has(trade.assetId)) return false;
      const tradeTime = new Date(trade.tradedAt).getTime();
      if (fromTime !== null && tradeTime < fromTime) return false;
      if (toTime !== null && tradeTime > toTime) return false;
      if (
        search &&
        !`${trade.symbol} ${trade.name} ${trade.notes ?? ""}`.toLowerCase().includes(search)
      ) {
        return false;
      }
      return true;
    });
  }, [trades, assets, assetQuery, dateFrom, dateTo, searchFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredTrades.length / PAGE_SIZE));

  const activeFilterCount =
    (assetQuery.trim() ? 1 : 0) + (dateFrom || dateTo ? 1 : 0) + (searchFilter.trim() ? 1 : 0);

  useEffect(() => {
    if (!filtersOpen) return;
    function handleClick(event: MouseEvent) {
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) {
        setFiltersOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setFiltersOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [filtersOpen]);

  function clearFilters() {
    setAssetQuery("");
    setDateFrom("");
    setDateTo("");
    setDateRange("all");
    setSearchFilter("");
    setPage(1);
  }

  function applyDateRange(range: "day" | "week" | "month" | "all") {
    setDateRange(range);
    setPage(1);
    if (range === "all") {
      setDateFrom("");
      setDateTo("");
      return;
    }
    const to = new Date();
    const from = new Date();
    if (range === "day") from.setDate(from.getDate() - 1);
    if (range === "week") from.setDate(from.getDate() - 7);
    if (range === "month") from.setMonth(from.getMonth() - 1);
    const format = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    setDateFrom(format(from));
    setDateTo(format(to));
  }

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const pageTrades = filteredTrades.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="ambient min-h-screen">
      <main className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <AppNavbar user={user} isAdmin={user.isAdmin} active="trades" />
        {assetDialogOpen && (
          <AddAssetDialog
            onClose={() => setAssetDialogOpen(false)}
            onCreated={(asset) => {
              setSelectedAssetId(asset.id);
              setAssetDialogOpen(false);
            }}
          />
        )}

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

        {dashboard.isError && (
          <section className="glass mt-5 rounded-2xl border border-rose/30 p-4 text-sm text-rose">
            Could not load your trade history: {dashboard.error.message}
          </section>
        )}

        <section className="glass mt-6 rounded-3xl p-4 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Positions</h2>
              <p className="mt-1 text-xs text-mist">
                Values remain separate by currency; no currency conversion is applied.
              </p>
            </div>
            <button
              type="button"
              className="btn-glow flex items-center gap-2"
              onClick={() => setAssetDialogOpen(true)}
            >
              <Plus className="size-4" /> Add asset
            </button>
          </div>

          {dashboard.isLoading ? (
            <p className="py-10 text-center text-sm text-mist">Loading positions…</p>
          ) : assets.length === 0 ? (
            <p className="py-10 text-center text-sm text-mist">
              No assets yet. Add an asset, then record each buy and sell as a separate trade.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
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

        {summaryByCurrency.length > 0 && (
          <section className="glass mt-6 rounded-3xl p-4 sm:p-6">
            <h2 className="text-lg font-semibold">Performance</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {summaryByCurrency.map(([code, summary]) => (
                <article key={code} className="glass rounded-2xl p-4">
                  <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-mist">
                    {code}
                  </h3>
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
            </div>
          </section>
        )}

        <section className="glass mt-6 rounded-3xl p-4 sm:p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <Plus className="size-4 text-glow" /> Record a trade
          </h2>
          <form
            id="trade-form"
            ref={tradeFormRef}
            onSubmit={submitTrade}
            className="mt-4 grid gap-3 sm:grid-cols-2"
          >
            <Field label="Asset">
              <select
                className="field mt-1"
                name="assetId"
                value={selectedAssetId}
                onChange={(event) => setSelectedAssetId(event.currentTarget.value)}
                required
              >
                <option value="" disabled>
                  Select an asset
                </option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.symbol} · {asset.currency}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Side">
              <select className="field mt-1" name="side" defaultValue="Buy">
                <option value="Buy">Buy</option>
                <option value="Sell">Sell</option>
              </select>
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
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--color-glow)]"
                  checked={recordNow}
                  onChange={(event) => setRecordNow(event.currentTarget.checked)}
                />
                <span>Record now (UTC)</span>
              </label>
              {recordNow ? (
                <p className="mt-1 text-xs text-mist">
                  The trade will be stamped with the current UTC time when you submit.
                </p>
              ) : (
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
              )}
            </div>
            <Field label="Notes">
              <input className="field mt-1" name="notes" placeholder="Optional" maxLength={240} />
            </Field>
            <div className="flex items-end">
              <button className="btn-glow w-full" type="submit" disabled={addTrade.isPending}>
                {addTrade.isPending ? "Saving…" : "Record trade"}
              </button>
            </div>
          </form>
        </section>

        <section className="glass mt-6 rounded-3xl p-4 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Trade history</h2>
              <p className="mt-1 text-xs text-mist">Newest trades first</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-mist">
                {filteredTrades.length} of {trades.length} total
              </span>
              <div className="relative" ref={filtersRef}>
                <button
                  type="button"
                  className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition-colors ${
                    filtersOpen || activeFilterCount > 0
                      ? "bg-glow/25 text-glow"
                      : "bg-glow/10 text-mist hover:bg-glow/20"
                  }`}
                  aria-expanded={filtersOpen}
                  onClick={() => setFiltersOpen((open) => !open)}
                >
                  <SlidersHorizontal className="size-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="rounded-full bg-glow px-1.5 text-[10px] font-semibold text-ink">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                {filtersOpen && (
                  <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-glass-line bg-ink-2 p-4 shadow-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-[0.14em] text-mist">
                        Filters
                      </span>
                      <button
                        type="button"
                        className="text-xs text-mist transition-colors hover:text-glow"
                        onClick={clearFilters}
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="mt-3 space-y-3">
                      <div className="relative">
                        <Field label="Asset">
                          <input
                            className="field mt-1"
                            placeholder="Type to search assets"
                            value={assetQuery}
                            onChange={(event) => {
                              setAssetQuery(event.currentTarget.value);
                              setAssetSuggestionsOpen(true);
                              setPage(1);
                            }}
                            onFocus={() => setAssetSuggestionsOpen(true)}
                            onBlur={() => setAssetSuggestionsOpen(false)}
                          />
                        </Field>
                        {assetSuggestionsOpen && matchingAssets.length > 0 && (
                          <ul className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-glass-line bg-ink-2 p-1 text-sm shadow-lg">
                            {matchingAssets.map((asset) => (
                              <li key={asset.id}>
                                <button
                                  type="button"
                                  className="w-full rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-glow/20"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => {
                                    setAssetQuery(asset.symbol);
                                    setAssetSuggestionsOpen(false);
                                    setPage(1);
                                  }}
                                >
                                  <span className="font-medium">{asset.symbol}</span>
                                  {asset.name !== asset.symbol && (
                                    <span className="ml-2 text-xs text-mist">{asset.name}</span>
                                  )}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <span className="text-xs text-mist">Date range</span>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {(
                            [
                              ["day", "Last day"],
                              ["week", "Last week"],
                              ["month", "Last month"],
                              ["all", "All time"],
                            ] as const
                          ).map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                                dateRange === value
                                  ? "bg-glow/25 text-glow"
                                  : "bg-glow/10 text-mist hover:bg-glow/20"
                              }`}
                              onClick={() => applyDateRange(value)}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <input
                            className="field"
                            type="date"
                            aria-label="From date"
                            value={dateFrom}
                            onChange={(event) => {
                              setDateFrom(event.currentTarget.value);
                              setDateRange("custom");
                              setPage(1);
                            }}
                          />
                          <input
                            className="field"
                            type="date"
                            aria-label="To date"
                            value={dateTo}
                            onChange={(event) => {
                              setDateTo(event.currentTarget.value);
                              setDateRange("custom");
                              setPage(1);
                            }}
                          />
                        </div>
                      </div>
                      <Field label="Search">
                        <input
                          className="field mt-1"
                          placeholder="Symbol, name, or notes"
                          value={searchFilter}
                          onChange={(event) => {
                            setSearchFilter(event.currentTarget.value);
                            setPage(1);
                          }}
                        />
                      </Field>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {dashboard.isLoading ? (
            <p className="py-10 text-center text-sm text-mist">Loading trade history…</p>
          ) : filteredTrades.length === 0 ? (
            <p className="py-10 text-center text-sm text-mist">
              {trades.length === 0
                ? "Your trades will appear here after you add one."
                : "No trades match the current filters."}
            </p>
          ) : (
            <>
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
                    {pageTrades.map((trade) => (
                      <tr key={trade.id}>
                        <td className="whitespace-nowrap py-3 pr-4 text-mist">
                          {new Date(trade.tradedAt).toLocaleString()}
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
                        <td className="py-3 pr-4 text-right">
                          {numberFormat.format(trade.quantity)}
                        </td>
                        <td className="py-3 pr-4 text-right">
                          {currency(trade.unitPrice, trade.currency)}
                        </td>
                        <td className="py-3 pr-4 text-right">
                          {currency(trade.fees, trade.currency)}
                        </td>
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
              {pageCount > 1 && (
                <nav
                  className="mt-4 flex items-center justify-between gap-3 text-sm"
                  aria-label="Trade history pagination"
                >
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-lg px-3 py-2 text-mist transition-colors hover:bg-glow/10 hover:text-glow disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft className="size-4" /> Previous
                  </button>
                  <span className="text-xs text-mist">
                    Page {page} of {pageCount}
                  </span>
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-lg px-3 py-2 text-mist transition-colors hover:bg-glow/10 hover:text-glow disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={page === pageCount}
                    onClick={() => setPage(page + 1)}
                  >
                    Next <ChevronRight className="size-4" />
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      </main>
    </div>
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

function setFormFieldValue(form: HTMLFormElement, name: string, value: string) {
  const field = form.elements.namedItem(name);
  if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
    field.value = value;
  }
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
