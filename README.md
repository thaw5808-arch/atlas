# ATLAS

International education decision support: which universities and countries are actually
affordable, academically realistic and compatible with a given student's circumstances.

Next.js 15 (App Router) · TypeScript · Tailwind v4 · Prisma 6 · PostgreSQL · Recharts.

## Running it

```bash
npm install                 # runs prisma generate via postinstall
cp .env.example .env        # add a Postgres URL and a session secret
openssl rand -base64 32     # → SESSION_SECRET
npm run db:push             # sync the schema
npm run db:migrate          # apply prisma/migrations (the AuditLog append-only guard)
npm run db:seed             # sample dataset + demo accounts
npm run dev
```

`db:push` and `db:migrate` are both needed: the schema itself is synced with `db push` (no migration
history), but the one thing that can't be expressed in `schema.prisma` — the trigger that makes
`AuditLog` append-only, below — lives in `prisma/migrations` and is applied separately. `npm run
build` runs `prisma migrate deploy` before `next build`, so it's also applied automatically on
every deploy.

Demo logins (all `password123`):

| Account | Role |
| --- | --- |
| `demo@atlas.study` | Student, profile complete, two applications in the planner |
| `admin@atlas.study` | Administrator — corrections queue, claims, verification |
| `rep@atlas.study` | Verified university representative |
| `claims@atlas.study` | Student with a pending university claim |

## The parts that matter

**`src/lib/decision.ts`** — the scoring model. Six dimensions (academic, financial, language,
location, scholarship, career), each returning a score *and* the reasons behind it. Weights come
from the student's stated priorities; `LOW → VERY_HIGH` maps to `0.5 → 2.5`. Hard eligibility
problems are recorded as blockers and cap the overall score rather than being averaged away. The
file is dependency-free so the same code runs on the server (persisted scores) and in the browser
(instant re-ranking when weights change).

**`src/lib/costs.ts`** — the money model. Builds a full annual picture: tuition, admission fee,
academic fees, housing, food, transport, insurance, books, personal spending, visa fees, flights
and an emergency reserve, against family budget, savings drawdown, support and scholarships.
What-if presets re-run the same model with one assumption changed. Part-time earnings are
calculated separately and never counted as guaranteed funding.

**`src/lib/scholarships.ts`** — per-requirement eligibility with three states (eligible, possibly
eligible, not currently eligible) and a reason for each check.

**`src/lib/recommendations.ts`** — assembles candidates from Prisma, converts every figure into the
student's currency, and runs the engines.

## Data honesty

The seed dataset is **invented**. Institution names are fictional; countries, cities and cost
ranges are plausible but unsourced. Every record is attributed to the "ATLAS sample dataset" source
and marked `NEEDS_REVIEW`, which is what the verification badges in the UI display. Replace it with
sourced records before this is used for real decisions.

The schema carries source, collection date, last-verified date and verification status on tuition,
living-cost, admission and language records, and every administrative change writes an `AuditLog`
row with the previous and new value.

`AuditLog` is append-only: application code only ever inserts into it, and a database trigger
(`prisma/migrations/20260906050000_audit_log_append_only`) enforces that — any `UPDATE` or `DELETE`
against the table is rejected outright, from any client, not just Prisma. The only exception is the
seed script's `reset()`, which sets a session-local flag before wiping the table for a fresh seed;
nothing else ever sets that flag.

## Built

Onboarding wizard · discovery with filters and six sort orders · university profiles with
explainable scoring, cost tables, requirements and sources · Decision Lab (live weights + scenario
builder + what-if) · comparison (2–5, responsive table) · country explorer with coordinate map and
side panel · scholarship matching · application planner with kanban, checklist and timeline ·
saved collections · notifications · currency switching · admin (audit trail, corrections queue,
representative verification, record verification) · representative portal with an approval workflow.

## Not built yet

Real file uploads (S3/R2), Redis caching, the optional assistant in §24, email/push delivery for
notifications, live exchange-rate fetching (rates are seeded with a timestamp), rate limiting, and
OAuth. Auth is a hand-rolled HMAC-signed session cookie with bcrypt, matching the pattern used in
the other projects in this stack.

## Conventions worth keeping

- Component classes live inside `@layer components` in `globals.css` so Tailwind utilities can
  still override them.
- Every `/admin/*` page re-checks the role itself; the layout gate does not re-run on client-side
  navigation between sibling routes.
- Server actions resolve the user from the session and re-derive permissions from the database
  rather than trusting anything the client sends.
