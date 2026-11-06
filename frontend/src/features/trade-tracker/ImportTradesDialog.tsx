import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Upload, X } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { tradeTrackerApi, TradeCurrency, TradeSide, type ImportTradeInput } from "./api";

const CSV_TEMPLATE =
  "symbol,name,currency,side,quantity,unitPrice,fees,tradedAt,notes\r\n" +
  "AAPL,Apple Inc,USD,Buy,10,185.50,1.00,2025-01-15T10:30:00Z,Initial purchase\r\n" +
  "AAPL,Apple Inc,USD,Sell,2,210.00,1.00,2025-06-20T14:00:00Z,Partial sale\r\n";

const REQUIRED_COLUMNS = ["symbol", "side", "quantity", "unitprice", "tradedat"];
const COLUMN_ALIASES: Record<string, string> = {
  ticker: "symbol",
  amount: "quantity",
  price: "unitprice",
  time: "tradedat",
  date: "tradedat",
};
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const MAX_ROWS = 1000;
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

type PreviewRow = {
  line: number;
  trade: ImportTradeInput;
  error?: string;
};

function parseCsv(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index++) {
    const character = text[index]!;
    if (inQuotes) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index++;
      } else if (character === '"') {
        inQuotes = false;
      } else {
        cell += character;
      }
    } else if (character === '"' && cell.length === 0) {
      inQuotes = true;
    } else if (character === ",") {
      record.push(cell);
      cell = "";
    } else if (character === "\r" || character === "\n") {
      if (character === "\r" && text[index + 1] === "\n") index++;
      record.push(cell);
      if (record.some((value) => value.trim())) records.push(record);
      record = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (inQuotes) throw new Error("The CSV contains an unclosed quoted field.");
  record.push(cell.replace(/\r$/, ""));
  if (record.some((value) => value.trim())) records.push(record);
  return records;
}

function parseTrades(text: string, defaultCurrency: TradeCurrency): PreviewRow[] {
  const [headerRow, ...dataRows] = parseCsv(text);
  if (!headerRow) throw new Error("The CSV is empty.");
  const headers = headerRow.map((value) => {
    const header = value
      .replace(/^\uFEFF/, "")
      .trim()
      .toLowerCase();
    return COLUMN_ALIASES[header] ?? header;
  });
  const duplicate = headers.find((header, index) => headers.indexOf(header) !== index);
  if (duplicate) throw new Error(`The "${duplicate}" column appears more than once.`);
  const missing = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
  if (missing.length) throw new Error(`Missing required columns: ${missing.join(", ")}.`);
  if (dataRows.length === 0) throw new Error("The CSV does not contain any trades.");
  if (dataRows.length > MAX_ROWS)
    throw new Error(`A maximum of ${MAX_ROWS.toLocaleString()} trades can be imported at once.`);

  const column = (values: string[], name: string) =>
    headers.includes(name) ? (values[headers.indexOf(name)]?.trim() ?? "") : "";
  return dataRows.map((values, index) => {
    const line = index + 2;
    const rawSide = column(values, "side").toLowerCase();
    const side =
      rawSide === "buy" ? TradeSide.Buy : rawSide === "sell" ? TradeSide.Sell : undefined;
    const rawQuantity = column(values, "quantity");
    const quantityFraction = /^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(rawQuantity);
    const quantity = Number(quantityFraction ? quantityFraction[1] : rawQuantity);
    const unitPrice = Number(column(values, "unitprice"));
    const feesText = column(values, "fees");
    const fees = feesText ? Number(feesText) : 0;
    const tradedAtText = column(values, "tradedat");
    const excelDate = Number(tradedAtText);
    const tradedAt =
      Number.isFinite(excelDate) && excelDate > 0
        ? new Date(EXCEL_EPOCH + excelDate * 86_400_000)
        : new Date(tradedAtText);
    const symbol = column(values, "symbol").toUpperCase();
    const currencyText = (column(values, "currency") || defaultCurrency).toUpperCase();
    const currency = currencyText === TradeCurrency.USD ? TradeCurrency.USD : TradeCurrency.EUR;
    const name = column(values, "name");
    const notes = column(values, "notes");
    let error: string | undefined;

    if (!/^[A-Z0-9.^_-]{1,20}$/.test(symbol)) error = "Invalid symbol.";
    else if (currencyText !== TradeCurrency.EUR && currencyText !== TradeCurrency.USD)
      error = "Currency must be EUR or USD.";
    else if (!side) error = 'Side must be "Buy" or "Sell".';
    else if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 9_999_999_999)
      error = "Quantity must be greater than zero.";
    else if (!Number.isFinite(unitPrice) || unitPrice <= 0 || unitPrice > 9_999_999_999)
      error = "Unit price must be greater than zero.";
    else if (!Number.isFinite(fees) || fees < 0 || fees > 9_999_999_999)
      error = "Fees cannot be negative.";
    else if (
      !(Number.isFinite(excelDate) && excelDate > 0) &&
      !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(tradedAtText)
    )
      error = "Trade date must include a timezone.";
    else if (Number.isNaN(tradedAt.getTime())) error = "Trade date is invalid.";
    else if (
      tradedAt.getTime() < Date.UTC(1900, 0, 1) ||
      tradedAt.getTime() > Date.now() + 86_400_000
    )
      error = "Trade date must be between 1900 and tomorrow.";
    else if (name.length > 80) error = "Name must be 80 characters or fewer.";
    else if (notes.length > 240) error = "Notes must be 240 characters or fewer.";
    else if (
      values.length > headers.length &&
      values.slice(headers.length).some((value) => value.trim())
    )
      error = "Unexpected extra column.";

    return {
      line,
      trade: {
        symbol,
        name: name || null,
        currency,
        side: side ?? TradeSide.Buy,
        quantity,
        unitPrice,
        fees,
        tradedAt: Number.isNaN(tradedAt.getTime()) ? "" : tradedAt.toISOString(),
        notes: notes || null,
      },
      ...(error ? { error } : {}),
    };
  });
}

export function ImportTradesDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [fileError, setFileError] = useState("");
  const [fileName, setFileName] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState(TradeCurrency.EUR);
  const [csvText, setCsvText] = useState("");
  const invalidRows = rows.filter((row) => row.error);
  const importTrades = useMutation({
    mutationFn: tradeTrackerApi.importTrades,
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["trade-tracker"] });
      toast.success(
        `Imported ${result.importedTrades} ${result.importedTrades === 1 ? "trade" : "trades"}`,
      );
      onClose();
    },
    onError: (error) => toast.error(error.message),
  });

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    setRows([]);
    setFileError("");
    setFileName(file?.name ?? "");
    setCsvText("");
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setFileError("Choose a CSV file smaller than 2 MB.");
      return;
    }
    try {
      const text = await file.text();
      setCsvText(text);
      setRows(parseTrades(text, defaultCurrency));
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Could not read the CSV file.");
    }
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "trade-history-example.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-background/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-trades-title"
        className="glass my-auto w-full max-w-3xl space-y-4 rounded-3xl p-5 sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="import-trades-title" className="text-lg font-semibold">
              Import trade history
            </h2>
            <p className="mt-1 text-sm text-mist">
              Upload a CSV, review every row, then import the history in one step.
            </p>
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-mist hover:text-foreground"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="rounded-2xl border border-glass-line bg-ink-2/50 p-4 text-sm">
          <p className="font-medium">CSV columns</p>
          <p className="mt-1 text-xs leading-5 text-mist">
            Required: <code>symbol</code>, <code>side</code>, <code>quantity</code>,{" "}
            <code>unitPrice</code>, and <code>tradedAt</code>. <code>currency</code> is optional;
            choose EUR or USD below if it is missing. Optional: <code>name</code>, <code>fees</code>{" "}
            (defaults to 0), and <code>notes</code>. Use <code>Buy</code> or <code>Sell</code>;
            dates should include a timezone, for example <code>2025-01-15T10:30:00Z</code>. New
            symbols are added to your tracked assets. Broker exports with <code>Ticker</code>,{" "}
            <code>Price</code>, <code>Amount</code>, and <code>Time</code> columns are supported
            too; Excel date serials and filled amounts such as <code>1/1.5</code> are recognized.
          </p>
          <button
            type="button"
            onClick={downloadTemplate}
            className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-glow hover:underline"
          >
            <Download className="size-4" /> Download example CSV
          </button>
        </div>

        <label className="block text-sm">
          <span className="text-xs text-mist">Currency for rows without a currency column</span>
          <select
            className="field mt-1"
            value={defaultCurrency}
            onChange={(event) => {
              const value = event.currentTarget.value;
              if (value !== TradeCurrency.EUR && value !== TradeCurrency.USD) return;
              const currency = value === TradeCurrency.USD ? TradeCurrency.USD : TradeCurrency.EUR;
              setDefaultCurrency(currency);
              if (!csvText) return;
              try {
                setRows(parseTrades(csvText, currency));
                setFileError("");
              } catch (error) {
                setRows([]);
                setFileError(
                  error instanceof Error ? error.message : "Could not read the CSV file.",
                );
              }
            }}
          >
            <option value={TradeCurrency.EUR}>EUR</option>
            <option value={TradeCurrency.USD}>USD</option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-xs text-mist">CSV file</span>
          <input
            className="field mt-1"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => void selectFile(event)}
          />
        </label>

        {fileName && <p className="text-xs text-mist">Selected: {fileName}</p>}
        {fileError && (
          <p role="alert" className="rounded-xl border border-rose/30 p-3 text-sm text-rose">
            {fileError}
          </p>
        )}

        {rows.length > 0 && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">
                Preview: {rows.length} {rows.length === 1 ? "trade" : "trades"}
              </p>
              <p className={`text-xs ${invalidRows.length ? "text-rose" : "text-mint"}`}>
                {invalidRows.length
                  ? `${invalidRows.length} row(s) need attention`
                  : "Ready to import"}
              </p>
            </div>
            <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-glass-line">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="sticky top-0 bg-ink-2 text-mist">
                  <tr>
                    <th className="p-2">Row</th>
                    <th className="p-2">Asset</th>
                    <th className="p-2">Side</th>
                    <th className="p-2">Quantity</th>
                    <th className="p-2">Unit price</th>
                    <th className="p-2">Date</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-line">
                  {rows.slice(0, 100).map((row) => (
                    <tr key={row.line}>
                      <td className="p-2">{row.line}</td>
                      <td className="p-2">
                        {row.trade.symbol} · {row.trade.currency}
                      </td>
                      <td className="p-2">{row.trade.side}</td>
                      <td className="p-2">{row.trade.quantity}</td>
                      <td className="p-2">{row.trade.unitPrice}</td>
                      <td className="p-2">{row.trade.tradedAt}</td>
                      <td className={`p-2 ${row.error ? "text-rose" : "text-mint"}`}>
                        {row.error ?? "Valid"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 100 && (
                <p className="p-2 text-xs text-mist">Showing the first 100 rows.</p>
              )}
            </div>
            <p className="mt-2 text-xs text-mist">
              The import is all-or-nothing. Trades that would result in selling more than the
              available position will be rejected by the server.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm text-mist hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-glow inline-flex items-center gap-2"
            disabled={!rows.length || invalidRows.length > 0 || importTrades.isPending}
            onClick={() => importTrades.mutate(rows.map((row) => row.trade))}
          >
            <Upload className="size-4" />
            {importTrades.isPending ? "Importing…" : `Import ${rows.length || ""} trades`}
          </button>
        </div>
      </section>
    </div>
  );
}
