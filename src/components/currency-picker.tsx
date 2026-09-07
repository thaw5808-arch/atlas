"use client";

import { useTransition } from "react";
import { setPreferredCurrency } from "@/lib/actions/profile";
import { CURRENCIES } from "@/lib/money";

export function CurrencyPicker({ current }: { current: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-1.5">
      {CURRENCIES.map((currency) => (
        <button
          key={currency.code}
          type="button"
          disabled={pending}
          aria-pressed={currency.code === current}
          className={currency.code === current ? "chip chip-selected" : "chip"}
          onClick={() => startTransition(async () => { await setPreferredCurrency(currency.code); })}
        >
          {currency.code}
        </button>
      ))}
    </div>
  );
}
