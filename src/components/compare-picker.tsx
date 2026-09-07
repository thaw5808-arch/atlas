"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";

export function ComparePicker({
  universities,
}: {
  universities: { slug: string; name: string; countryName: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const selected = params.get("ids")?.split(",").filter(Boolean) ?? [];

  const toggle = (slug: string) => {
    const next = selected.includes(slug)
      ? selected.filter((item) => item !== slug)
      : [...selected, slug].slice(0, 5);
    router.push(next.length ? `/compare?ids=${next.join(",")}` : "/compare", { scroll: false });
  };

  return (
    <div className="glass rounded-[22px] p-4">
      <p className="text-sm text-slate">
        Pick between two and five universities. {selected.length} selected.
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {universities.map((university) => {
          const active = selected.includes(university.slug);
          return (
            <button
              key={university.slug}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(university.slug)}
              className={active ? "chip chip-selected" : "chip"}
              disabled={!active && selected.length >= 5}
            >
              {active && <Check size={12} aria-hidden="true" />}
              {university.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
