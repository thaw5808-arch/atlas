// Currency handling. Rates are stored relative to USD and always carry the
// timestamp they were fetched at — converted figures are shown as estimates,
// never as fixed prices.

export type RateTable = {
  rates: Record<string, number>; // 1 USD = rate units of the currency
  fetchedAt: Date;
};

export const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "Pound sterling" },
  { code: "JPY", symbol: "¥", name: "Japanese yen" },
  { code: "THB", symbol: "฿", name: "Thai baht" },
  { code: "KRW", symbol: "₩", name: "Korean won" },
  { code: "AUD", symbol: "A$", name: "Australian dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian dollar" },
  { code: "SGD", symbol: "S$", name: "Singapore dollar" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export function convert(
  amount: number,
  from: string,
  to: string,
  table: RateTable,
): number {
  if (from === to) return amount;
  const fromRate = from === "USD" ? 1 : table.rates[from];
  const toRate = to === "USD" ? 1 : table.rates[to];
  if (!fromRate || !toRate) return amount;
  return (amount / fromRate) * toRate;
}

export function symbolFor(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? "";
}

export function formatMoney(amount: number, code: string, opts?: { compact?: boolean }): string {
  const value = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: opts?.compact && Math.abs(amount) >= 100000 ? "compact" : "standard",
  }).format(Math.abs(amount));
  // Rounding can take a small negative amount to zero; don't show "-$0" for that.
  const sign = amount < 0 && value !== "0" ? "-" : "";
  return `${sign}${symbolFor(code)}${value}`;
}
