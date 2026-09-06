import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyCronRequest } from "@/lib/cron";
import { CURRENCIES } from "@/lib/money";

export const dynamic = "force-dynamic";

// Free, no-key-required endpoint (exchangerate-api.com's "open access" tier).
// Rates are USD-based, matching how ExchangeRate rows are stored.
const RATES_API_URL = "https://open.er-api.com/v6/latest/USD";
const SOURCE = "open.er-api.com";

const QUOTE_CURRENCIES = CURRENCIES.map((currency) => currency.code).filter((code) => code !== "USD");

type RatesApiResponse = {
  result?: string;
  rates?: Record<string, number>;
};

export async function GET(request: Request) {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  try {
    const response = await fetch(RATES_API_URL, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`Rate API responded with ${response.status}`);

    const payload = (await response.json()) as RatesApiResponse;
    if (payload.result !== "success" || !payload.rates) {
      throw new Error("Rate API returned an unexpected payload");
    }

    const rates = payload.rates;
    const updates = QUOTE_CURRENCIES.flatMap((quoteCurrency) => {
      const rate = rates[quoteCurrency];
      return typeof rate === "number" && rate > 0 ? [{ quoteCurrency, rate }] : [];
    });
    if (updates.length === 0) throw new Error("Rate API did not include any supported currency");

    const fetchedAt = new Date();
    await prisma.$transaction(
      updates.map(({ quoteCurrency, rate }) =>
        prisma.exchangeRate.upsert({
          where: { baseCurrency_quoteCurrency: { baseCurrency: "USD", quoteCurrency } },
          create: { baseCurrency: "USD", quoteCurrency, rate, fetchedAt, source: SOURCE },
          update: { rate, fetchedAt, source: SOURCE },
        }),
      ),
    );

    return NextResponse.json({ updated: updates.length, skipped: QUOTE_CURRENCIES.length - updates.length });
  } catch (error) {
    // Stale rates already in ExchangeRate beat a hard failure — every reader
    // goes through getRateTable(), which just returns whatever rows exist.
    console.error("[cron/rates] fetch failed, keeping existing rates:", error);
    return NextResponse.json({ updated: 0, error: "Upstream rate fetch failed; kept existing rates" });
  }
}
