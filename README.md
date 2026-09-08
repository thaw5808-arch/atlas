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

## Design decisions

The reasoning behind the choices that shaped the project, including the alternatives that were
considered and dropped. Where a decision was a pragmatic compromise rather than a principled
one, it says so.

### Six scoring dimensions rather than one number

A single fit score can't be argued with. Students don't reject an option because it scored 61 —
they reject it because they can't afford it, or don't have the language score, or don't want to
live in a city that size. Six dimensions (academic, financial, language, location, scholarship,
career) each return a score *and* a `Reason[]` explaining it, so every number on screen traces
back to a sentence. `DecisionScore` persists the six columns plus the serialised explanation, so
a score computed weeks ago can still say why it was what it was.

**Rejected: one 0–100 score.** Cheaper to compute, store and sort, and the ranking would be
identical for a student on default weights. But an unexplained ranking is unfalsifiable — a
student who disagrees with it has nothing to point at, and neither does an assessor. The whole
value of the tool is the explanation, not the ordering.

**Rejected: more, finer dimensions** (visa difficulty, climate, safety, alumni network, campus
size). Each extra dimension dilutes the weight of the ones students actually act on, and the
dataset can't support them honestly — a "safety score" invented from nothing is worse than no
safety score.

Six is not a derived number. It is the set of things the schema can support with real fields and
the student profile actually captures. Ranking was going to be a seventh and became a modifier of
the academic score instead (`scoreCandidate`), because a university's global rank isn't a *fit* a
student experiences — it's a preference about prestige that colours the academic judgement. The
career dimension is the weakest of the six: it is keyword overlap between the student's stated
goal and the program's name, major and field, and it says so in the reasons. It earns its place
because career motivation is the reason most students are doing this at all, not because the
measurement is good.

### Weights multiply each dimension rather than adding to it

`IMPORTANCE_WEIGHT` maps `LOW → 0.5`, `MEDIUM → 1`, `HIGH → 1.75`, `VERY_HIGH → 2.5`, and those
are multipliers inside a weighted mean: `Σ(score × weight) / Σ(weight)`. Multiplying keeps the
result on the same 0–100 scale as each dimension, so changing a weight re-ranks the options
without changing what the number means. It also gives "twice as important" its literal meaning:
doubling a dimension's weight doubles how far a ten-point difference in that dimension moves the
total.

**Rejected: additive bonuses** (`score + weight × k`). The bonus is independent of how the option
actually scored, so an option with terrible financial fit gets the same points as an affordable
one purely because the student said money matters. That rewards the student's preference instead
of the option's match to it, which is backwards. It also unbounds the total and destroys the
shared scale.

**Rejected: normalising the weights to sum to 1.** This is the common approach and it was dropped
deliberately: with normalised sliders, raising one lowers all the others behind the student's
back. Someone who says "money matters more" would find, without being asked, that language now
matters less. Dividing by `Σ(weight)` at the end already gives the property normalisation is
for — only the ratios between weights affect the result, so setting all six to `VERY_HIGH` ranks
identically to setting all six to `MEDIUM`, which is the correct reading of "everything matters
equally."

The 0.5 / 1 / 1.75 / 2.5 spacing is tuned, not derived. It was chosen so `VERY_HIGH` is five times
`LOW` — enough for a genuine top priority to dominate the ranking, not so much that one slider
makes the other five decorative. There is no user research behind those four numbers, and they
shouldn't be defended as calibrated.

### A failed hard requirement caps the total instead of being averaged in

A weighted mean is the wrong instrument for a hard requirement. If a student's GPA is below the
stated minimum, that option isn't slightly worse than the others — it's off the table until
something changes, and no amount of strong location and career fit should compensate. So
eligibility failures are recorded as `kind: "blocker"` reasons and applied *outside* the mean:
`overall = min(overall, 100 − 15 × min(blockers, 4))`, capping at 85, 70, 55 and 40.

The cap sits outside the weighted mean on purpose. Scoring a failed requirement as zero within
its dimension was considered and rejected for exactly this reason: a zero still gets diluted by
its weight, so a student who had set language importance to `LOW` would watch a failed language
requirement quietly vanish from the total. A blocker has to be immune to the weights, because
the student's preferences don't have a vote on the university's entry rules.

**Rejected: filtering ineligible options out of the results.** Tempting, and it's what a naive
implementation does. Two reasons not to. First, blockers are frequently actionable — retake the
IELTS, do a foundation year, apply to the cheaper campus — and a student who never sees the
option never learns what stands between them and it. Second, the dataset is unverified: a wrong
minimum GPA in a `NEEDS_REVIEW` record would silently delete a genuinely viable option, with no
trace. Capping degrades gracefully when the data is wrong; filtering fails silently. The option
stays visible, capped and labelled, with `eligible: false` and the blocker spelled out.

The 15-points-per-blocker ladder and the ceiling of four are arbitrary. The property that
mattered is that ineligible options stay ordered among themselves — one blocker outranks three,
so a near-miss is visibly nearer than a hopeless case — and any decreasing function would have
done. The specific numbers aren't defended by anything.

### Part-time earnings are modelled separately and never counted as guaranteed funding

Every `FundingLine` carries a `guaranteed` flag, and work income is deliberately left out of
`annualFundingGuaranteed` — the figure behind the headline `annualGap`. The model reports both
sides: `annualFundingGuaranteed` / `annualFundingWithWork`, `annualGap` / `annualGapWithWork`.

This is the single most consequential number in the project, so it takes the pessimistic
position. The failure this tool exists to prevent is a student moving countries and discovering
the plan only balanced if they found a job. Term-time earnings depend on visa hour limits, the
local labour market, language ability and a timetable nobody has seen yet, and they are the first
thing to disappear when any of those goes wrong. Counting them in the headline makes an
unaffordable option look affordable, which is the one error the tool must not make.

It's still modelled rather than ignored, because it is real money and pretending otherwise just
pushes the student to do the arithmetic in their head, less carefully. `WorkAssumption` gives
`NONE`, `CONSERVATIVE` (half the permitted hours) and `PERMITTED_MAX`, and the funding line is
labelled "never guaranteed" in the UI.

**Rejected: counting work income at a discount** — say half of the conservative estimate — into
the funding total. It still puts contingent money in the headline figure, and the discount rate
would be a guess presented to the student as a fact. Showing two numbers and the difference
between them is more honest than one number with an invisible haircut. The "I can't find
part-time work" what-if preset exists so the pessimistic case is one click rather than mental
arithmetic.

One honest inconsistency: scholarships are also flagged `guaranteed: false`, but are included in
`annualFundingGuaranteed` through an explicit `|| line.key === "scholarship"` exception in the
filter. The flag drives the "counts only once an award is confirmed" label, while the headline gap
assumes the award lands. The defence is that `scholarshipPercent` defaults to 0 and only moves
when the student deliberately drags the slider — it models an offer they're weighing — whereas
work income computes itself from permitted hours whether or not anyone asked for it. That's a
real distinction, but it's one boolean doing two different jobs, and the field should be split
into "confirmed" and "contingent" rather than explained in a comment.

### The decision and cost engines are dependency-free pure functions

`decision.ts` and `costs.ts` have no imports at all — not Prisma, not React, not a date library.
The consequence is that the same module runs on the server (`recommendations.ts`, persisting
`DecisionScore` rows) and in the browser (`weights-panel.tsx`, `scenario-lab.tsx`) with no
adapter and no network round trip. Dragging a weight slider re-ranks the entire list in place;
changing a rent assumption redraws the cost table immediately.

The deeper reason is that there is exactly one definition of the score. The obvious way to get
Decision Lab's responsiveness would be to reimplement the model client-side, which creates two
implementations that have to be kept in agreement forever — and the disagreement would surface as
the ranking changing when the student reloads the page, which is precisely the kind of thing that
destroys trust in a scoring tool. Purity also makes the engines testable without a database:
`decision.test.ts` and `costs.test.ts` construct their inputs as literals.

**Rejected: server-only scoring with a request per change.** Simpler data flow, and one fewer
copy of the model shipped to the client. But the Decision Lab is the project's main interaction,
and a network round trip per slider drag turns a live model into a form submission.

**Rejected: letting the engines take Prisma types directly.** This would have removed most of
`recommendations.ts`, which spends much of its 444 lines converting Prisma rows and currencies
into `CandidateInput` and `StudentInput`. That mapping layer is the price of the decision, and
it's paid knowingly: the engines define their own input types, so the scoring contract doesn't
move every time the schema does, and the engines can be tested and reasoned about without a
database in the picture.

### Corrections from universities go through an approval queue

A verified university representative is the best-informed party about their own tuition and the
most interested one. Verification here establishes affiliation, not disinterest. So
`proposeChange` writes a `CorrectionRequest` — claimed value, message, optional evidence URL —
and changes nothing else; `resolveCorrection` runs under `requireRole("ADMIN")` and applies the
change in a single transaction that updates the record, resolves the request, writes a
`VerificationRecord` and writes an `AuditLog` row with the previous and new values.

Data provenance is the other half of the reason. Every cost record carries a source, collection
date, last-verified date and verification status, and those exist to tell a student how much to
trust a number. A representative writing directly would either leave that provenance stale — a
changed figure still claiming its old verification — or let the university mark its own numbers
as verified. Routing through an admin means the status change and the value change happen
together, under someone who saw the evidence.

**Rejected: direct writes from verified representatives.** The fastest path to correct data, and
arguable given they're verified. But the audit trail would then record a university editing its
own prices as though it were review, and the trail is the thing that makes the dataset
defensible.

**Rejected: no correction path at all**, admin-only editing. Then the people best placed to know
a figure is wrong have no way to say so, and an unverified starting dataset never improves.

Two honest limits. Approval only auto-applies to numeric fields on cost records (`NUMERIC_FIELDS`);
anything else is rejected with "edit it directly instead" and the admin makes the change by hand.
A narrow allowlist was chosen over a general field writer because "set field X to string Y,
applied on a click" is a wide hole in an admin tool, and the manual path is an acceptable cost at
this data volume. And there is no evidence verification beyond checking the URL parses — the
admin reading the request is the entire check. That's a process control, not a technical one, and
it should be described as such.

### The audit log is append-only at the database, not in application code

Application code only ever calls `.create()` on `AuditLog`. That's a convention, and it holds
right up until someone adds a cleanup job, a "fix that typo" admin action, or a data migration
that rewrites rows. An audit log whose integrity depends on every future contributor remembering
a rule isn't an audit log — it's a table of changes that happens to be complete so far. The
trigger in `20260906050000_audit_log_append_only` rejects any `UPDATE` or `DELETE` on the table,
from any client: Prisma, `psql`, Prisma Studio, a future service, anyone holding the production
`DATABASE_URL`.

**Rejected: convention plus code review.** Unverifiable and silent. There's no way to show that
it held, which is exactly what an audit trail needs to be able to show.

**Rejected: a Prisma middleware or client extension** blocking mutations on the model. It looks
equivalent and isn't: it only binds code that goes through that particular client, so the seed
script, any `$executeRaw`, a psql session and any future non-Prisma consumer all walk past it. It
also places the guarantee inside the codebase it is meant to constrain.

**Rejected: revoking `UPDATE`/`DELETE` from the application role via `GRANT`.** Arguably the
cleaner mechanism, and no trigger function to maintain. It was dropped for a pragmatic reason
rather than a principled one: the app connects with a single role for everything, so this would
mean introducing a second role and connection management for the sake of one table, and the seed
reset would need elevated rights. The trigger keeps the whole guarantee in one migration file.

The escape hatch is deliberately narrow and deliberately ugly. The seed's `reset()` sets
`atlas.allow_audit_log_mutation` with `SET LOCAL` inside its transaction, so the exemption expires
with that transaction and cannot leak into another connection or request. It is an admission of a
real tension — a genuinely immutable table can't be reseeded, and this project ships a demo
dataset that gets wiped — resolved by making the exception explicit, transaction-scoped and
greppable, so any second use of that flag is obvious in review.

The limit worth stating plainly: append-only is not tamper-proof. Anyone with superuser rights can
drop the trigger, and nothing here would record that they did. This defends against accident,
convenience and casual editing, which is the realistic threat, not against a determined operator
with full database access.

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
