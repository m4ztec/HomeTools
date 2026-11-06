import { apiRequest } from "@/shared/lib/api-client";

export enum TradeSide {
  Buy = "Buy",
  Sell = "Sell",
}

export enum TradeCurrency {
  EUR = "EUR",
  USD = "USD",
}

export type AssetInput = {
  symbol: string;
  name: string;
  currency: TradeCurrency;
};

export type TradeInput = {
  assetId: string;
  side: TradeSide;
  quantity: number;
  unitPrice: number;
  fees: number;
  tradedAt: string;
  notes: string;
};

export type ImportTradeInput = Omit<TradeInput, "assetId" | "notes"> & {
  symbol: string;
  name: string | null;
  currency: TradeCurrency;
  notes: string | null;
};

export type Trade = {
  id: string;
  assetId: string;
  symbol: string;
  name: string;
  currency: TradeCurrency;
  side: TradeSide;
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
  currency: TradeCurrency;
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

export type ImportTradesResult = {
  importedTrades: number;
  createdAssets: number;
};

export const tradeTrackerApi = {
  dashboard: () => apiRequest<TradeDashboard>("/trades"),
  createAsset: (asset: AssetInput) =>
    apiRequest<TrackedAsset>("/trades/assets", {
      method: "POST",
      body: JSON.stringify(asset),
    }),
  createTrade: (trade: TradeInput) =>
    apiRequest<Trade>("/trades", {
      method: "POST",
      body: JSON.stringify(trade),
    }),
  importTrades: (trades: ImportTradeInput[]) =>
    apiRequest<ImportTradesResult>("/trades/import", {
      method: "POST",
      body: JSON.stringify({ trades }),
    }),
  updatePrice: (assetId: string, currentPrice: number) =>
    apiRequest<TrackedAsset>(`/trades/assets/${assetId}/price`, {
      method: "PUT",
      body: JSON.stringify({ currentPrice }),
    }),
  deleteTrade: (tradeId: string) => apiRequest<void>(`/trades/${tradeId}`, { method: "DELETE" }),
};
