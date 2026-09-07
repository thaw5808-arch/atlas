import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, CircleHelp, ShieldCheck } from "lucide-react";
import { DIMENSIONS, fitLabel, type Dimension, type DimensionResult } from "@/lib/decision";
import { formatDate } from "@/lib/format";

export function toneColor(score: number): string {
  if (score >= 75) return "var(--color-viridian)";
  if (score >= 50) return "var(--color-brass)";
  return "var(--color-rust)";
}

export function FitRing({ score, size = 68 }: { score: number; size?: number }) {
  const stroke = size >= 60 ? 6 : 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={toneColor(score)}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <span className="absolute tabular font-display" style={{ fontSize: size / 3.4 }}>
        {Math.round(score)}
      </span>
    </div>
  );
}

export function DimensionBars({
  dimensions,
  compact = false,
}: {
  dimensions: Record<Dimension, DimensionResult>;
  compact?: boolean;
}) {
  return (
    <dl className={compact ? "space-y-1.5" : "space-y-2.5"}>
      {DIMENSIONS.map(({ key, label }) => {
        const score = dimensions[key].score;
        return (
          <div key={key} className="grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-3">
            <dt className="text-xs text-slate">{label}</dt>
            <dd className="h-1.5 rounded-full bg-parchment">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(3, score)}%`, background: toneColor(score) }}
              />
            </dd>
            <dd className="tabular text-right text-xs text-slate">{Math.round(score)}%</dd>
          </div>
        );
      })}
    </dl>
  );
}

export function MatchBadge({ score }: { score: number }) {
  return (
    <span
      className="chip"
      style={{
        borderColor: toneColor(score),
        color: toneColor(score),
        background: "color-mix(in oklab, white 78%, transparent)",
      }}
    >
      {fitLabel(score)}
    </span>
  );
}

export function VerificationBadge({
  status,
  lastVerifiedAt,
}: {
  status: string;
  lastVerifiedAt?: Date | string | null;
}) {
  const map: Record<string, { icon: typeof ShieldCheck; label: string; color: string }> = {
    VERIFIED: { icon: ShieldCheck, label: "Verified", color: "var(--color-viridian)" },
    RECENTLY_UPDATED: { icon: CheckCircle2, label: "Recently updated", color: "var(--color-brass)" },
    NEEDS_REVIEW: { icon: CircleHelp, label: "Needs review", color: "var(--color-slate)" },
    DISPUTED: { icon: AlertTriangle, label: "Disputed", color: "var(--color-rust)" },
  };
  const entry = map[status] ?? map.NEEDS_REVIEW;
  const Icon = entry.icon;

  return (
    <span className="chip" style={{ color: entry.color, borderColor: "var(--color-line)" }}>
      <Icon size={13} aria-hidden="true" />
      {entry.label}
      {lastVerifiedAt ? <span className="text-mist">· {formatDate(lastVerifiedAt)}</span> : null}
    </span>
  );
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl">{title}</h2>
        {description && <p className="mt-1 max-w-prose text-sm text-slate">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  const color =
    tone === "positive" ? "var(--color-viridian)" : tone === "negative" ? "var(--color-rust)" : "var(--color-ink)";
  return (
    <div className="panel p-4">
      <p className="text-xs text-slate">{label}</p>
      <p className="tabular mt-1 font-display text-2xl" style={{ color }}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-mist">{sub}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-center gap-3 px-6 py-12 text-center">
      {/* h2, not h3: this is almost always the only heading below the page's h1 (there's no
          SectionHeading in the empty-state branch), so h3 would skip a level. On the one page
          where it does sit under a SectionHeading's h2, h2-under-h2 is still valid — headings
          may repeat a level, they just can't skip one. */}
      <h2 className="text-lg">{title}</h2>
      <p className="max-w-sm text-sm text-slate">{body}</p>
      {action}
    </div>
  );
}

export function DataNotice({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-xs text-slate">
      <CircleHelp size={14} className="mt-0.5 shrink-0 text-mist" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
