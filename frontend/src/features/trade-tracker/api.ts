import { apiRequest } from "@/shared/lib/api-client";

export type TradeInput = {
  symbol: string;
  name: string;
  currency: string;
  side: "Buy" | "Sell";
  quantity: number;
  unitPrice: number;
  fees: number;
  tradedAt: string;
  notes: string;
};

export type Trade = {
  id: string;
  assetId: string;
  symbol: string;
  name: string;
  currency: string;
  side: "Buy" | "Sell";
  quantity: number;
  unitPrice: number;
  fees: number;
  tradedAt: string;
  notes: string | null;
  realizedProfitLoss: number | null;
};

export type TrackedAsset = {
  id: string;
  symbol: string;
  name: string;
  currency: string;
  currentPrice: number | null;
  quantity: number;
  averageCost: number;
  costBasis: number;
  marketValue: number;
  unrealizedProfitLoss: number;
  realizedProfitLoss: number;
  updatedAt: string;
};

export type TradeDashboard = {
  assets: TrackedAsset[];
  trades: Trade[];
};

export const tradeTrackerApi = {
  dashboard: () => apiRequest<TradeDashboard>("/trades"),
  createTrade: (trade: TradeInput) =>
    apiRequest<Trade>("/trades", {
      method: "POST",
      body: JSON.stringify(trade),
    }),
  updatePrice: (assetId: string, currentPrice: number) =>
    apiRequest<TrackedAsset>(`/trades/assets/${assetId}/price`, {
      method: "PUT",
      body: JSON.stringify({ currentPrice }),
    }),
  deleteTrade: (tradeId: string) => apiRequest<void>(`/trades/${tradeId}`, { method: "DELETE" }),
};
