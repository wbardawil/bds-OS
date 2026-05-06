# Coherence — MECE across product, onboarding, visualization, monitoring

This doc is the synthesis. It shows that every layer of the product, every phase of onboarding, every type of visualization, and every step of the monitoring loop is **mutually exclusive and collectively exhaustive**, and that they all line up coherently for the primary use case: a **fund CEO** standing this up for themselves and their portfolio in one week.

Read the other docs (`framework.md`, `industry-templates.md`, `data-analytics-vision.md`, `pilot-plan.md`, `integration-plan.md`) for the details. This is the map.

---

## 1. Product layers — MECE

Five layers, each with a clear job. Nothing crosses layers.

| # | Layer | Purpose | Customisation | Examples |
|---|---|---|---|---|
| **L1** | **Framework** | The 8 universal pillars (Direction, Customer, Delivery, Economics, People, Technology, Governance, Innovation). MECE foundation for everything. | **Locked** — not customer-customisable | The pillars themselves |
| **L2** | **Templates** | Industry-flavoured *suggestions* of practices and KPIs within the 8 pillars. | Read-only system data, but *optional* per customer | Hospital, university, professional-services-fund, SaaS, etc. |
| **L3** | **Tenant data** | A customer's actual practices, KPIs, thresholds, sources, dashboards, initiatives. Cloned from a template if used; built from scratch otherwise. | **Fully customisable** | "Acme Capital's strategic-planning practices" |
| **L4** | **Surfaces** | The screens / actions through which a customer interacts. Each surface reads from L3 and produces output. | Configurable layout | Assessment screen, control tower, focus-portfolio view, evidence panel, governance dashboards |
| **L5** | **Engines** | The pure logic that computes derived values: OPI, focus portfolio selection, lifecycle determination, evidence grading. Lives in `bds-OS`, runs as edge functions. | Not directly customer-touched | `compute-opi`, `select-focus-portfolio`, `grade-evidence` |

Coherence check:
- **Mutually exclusive** — a thing belongs to exactly one layer. Pillars are L1. Templates are L2. The customer's edited copy is L3. Their dashboard is L4. The math that computes their priority is L5.
- **Collectively exhaustive** — every concept in the product fits one of these. If something doesn't, the model is wrong.

---

## 2. Onboarding journey — MECE

Eleven phases, each clearly defined, no skipping, no overlap.

| # | Phase | What happens | Owner | Output |
|---|---|---|---|---|
| **O1** | **Sign-up** | User creates an `auth.users` row (Supabase Auth). | User | Authenticated session |
| **O2** | **Org creation** | User creates a `company` (their fund, their hospital, their university). | User | Row in `companies`, user becomes owner |
| **O3** | **Pillar acknowledgement** | User sees the 8 pillars; can rename labels for their context (Customer → Patient or Student). | User (5 min) | Display labels stored on `companies` |
| **O4** | **Template selection** | User picks an industry template OR opts for blank. | User (5 min) | `question_set.source_template` set or null |
| **O5** | **Practice customisation** | User edits, drops, or adds practices in each pillar. | User (15–60 min) | Final `question_set` populated |
| **O6** | **Metric customisation** | User edits, drops, or adds KPIs; sets thresholds and source (manual / webhook / connector). | User (15–60 min) | Final `metric_set` populated |
| **O7** | **Team invitation** | User invites leadership team via email. | User (5 min) | Rows in `invitations`, emails sent |
| **O8** | **First assessment** | Leadership scores importance × competency for each practice. | Each leader (45 min) | Rows in `round_responses` (Lovable's jsonb shape) |
| **O9** | **First KPI values** | Manual entry of current values for each metric (or connect a data source if applicable). | Each owner (15 min per area) | Rows in `metric_values` |
| **O10** | **First read-out** | User opens the control tower for the first time and sees the integrated picture. | User (5 min reading) | Action: review, share with team |
| **O11** | **Ongoing operating cadence** | Assessment refresh quarterly; KPI updates weekly/monthly; initiatives run; alerts fire. | Whole team | Continuous platform use |

Coherence check:
- **Mutually exclusive** — phases happen in order; each produces a specific output that the next consumes.
- **Collectively exhaustive** — sign-up to ongoing. No "and then magic happens" gap. The bridge from O10 to O11 is the only soft transition; it depends on the user actually committing to a recurring rhythm. We surface that as the digest in O11.

---

## 3. Visualization layer — MECE

Every view a user can pull up, organised by *what they want to learn*.

| # | View | What it answers | Source data | Default home? |
|---|---|---|---|---|
| **V1** | **Control tower (live tiles)** | "What's happening now?" | `metric_values` (latest) + `round_responses` (latest) + `audit_log` (recent) | Yes — operator view |
| **V2** | **Assessment results** | "Where are we strong / weak across the 8 pillars?" | `round_responses` aggregated by pillar | Quarterly view |
| **V3** | **OPI / focus portfolio** | "What should we work on this quarter?" | `opi_scores` + `focus_portfolios` | Yes — CEO view |
| **V4** | **KPI trends** | "How are key metrics trending over time?" | `metric_values` time-series | Yes — board view (subset) |
| **V5** | **Pillar drill-down** | "How are we doing in this specific pillar?" | All of the above filtered by pillar | Yes — functional-leader view |
| **V6** | **Alerts & flags** | "What's out of bounds?" | Threshold evaluations on `metric_values` + risk-floor breaches on practices | Cross-cutting |
| **V7** | **Initiative kanban** | "Which initiatives are in flight, what's blocked?" | `initiatives` + `evidence` + `score_change_requests` | Operator view |
| **V8** | **Cross-company portfolio (fund CEO use case)** | "How is the whole portfolio doing?" | Rollup across multiple `companies` the user owns | Fund-CEO view |
| **V9** | **Audit / activity stream** | "What changed recently?" | `audit_log` | Drill-in only |
| **V10** | **Reports & exports** | "Give me a static artefact (PDF, CSV)" | Snapshots of any of the above | Cross-cutting |

Each view is composed of **widgets**: number, sparkline, line chart, bar chart, gauge, table, list, gap-radar. Widgets are the implementation; views are the semantic groupings.

Visualization coherence: every question an operator/CEO/board would ask maps to one view. The natural-language query layer (v3+) is a *meta-view* — it produces ad-hoc widgets the user can pin into V1, V4, or V5.

---

## 4. Monitoring layer — MECE

The data → action loop. Six steps, no gaps.

| # | Step | What it does | Configurable? |
|---|---|---|---|
| **M1** | **Data ingestion** | Source pushes a value into `metric_values`. Sources: manual entry, generic webhook, native connector, SQL connector, BI source. | Yes — per metric, source is selectable |
| **M2** | **Storage (time-series)** | `metric_values` keeps every value with timestamp. Append-only. | No — fixed schema |
| **M3** | **Rule evaluation** | Each metric has thresholds (red/yellow/green) and optional rules (trend, cross-metric, risk-floor). Evaluator runs on insert + on schedule. | Yes — per metric |
| **M4** | **Alert generation** | Rule fires → row in `alerts` table with severity + context. | Yes — rule definitions |
| **M5** | **Alert delivery** | Alert routed to: in-app banner, email digest, Slack, etc. | Yes — per user / per alert tier |
| **M6** | **Action coupling** | Alert links to: a suggested initiative, a required evidence pickup, a governance escalation. Closes the loop with the operating layer. | Yes — alert-to-action mapping |

Coherence check:
- **Mutually exclusive** — each step does one thing; data flows in one direction.
- **Collectively exhaustive** — there's no "now what?" gap after an alert. Every alert has a configured action path (or defaults to "shown in app, do nothing else").

The monitoring layer is **decoupled** from the operating layer at the data model (separate tables) but **coupled** at the action layer (alerts can spawn initiatives). That's intentional — you want both pure observability and integrated action.

---

## 5. End-to-end trace: fund CEO in 7 days

Walking the same fund-CEO scenario through every layer above, day by day.

### Day 1 — me, in this repo
- Author the **professional-services / fund** template in `docs/industry-templates.md` (8 pillars × ~5 practices, ~3 KPIs each)
- Write the Lovable migration spec for `question_sets`, `metric_sets`, `metrics`, `metric_values`, `dashboards`, `widgets`, `alerts` tables (the data model L3 needs)
- Write the Lovable refactor spec to load practices from DB instead of hardcoded `src/data/questions.ts`
- Commit + push

### Day 2 — you, with Lovable
- Paste the migration spec into Lovable's chat. Lovable applies it. Existing data is preserved (Lovable's `companies`, `evaluation_rounds`, `round_responses` untouched; new tables add alongside).
- Paste the refactor spec. Lovable updates the code to load questions from DB.
- Sanity-check: existing flows still work (the public assessment, dashboard, etc.).

### Day 3 — you create the three companies
- Create **Fund X** (your fund) — pick the professional-services / fund template.
- Create **Hospital Y** (portfolio company) — pick the hospital template.
- Create **University Z** (portfolio company) — pick the university template.
- Each company has its own `question_set` and `metric_set` cloned from its template.

### Day 4 — me, finishes the visualization layer
- Spec the basic Control Tower widget set (number tile, sparkline, gap radar, list).
- Spec the **portfolio / fund CEO view** — a dashboard that lists the user's N companies with summary tiles per company (overall score, top 3 pillar gaps, latest KPI flags).
- Commit specs.

### Day 5 — you customise
- For Fund X: customise the question_set (drop practices that don't apply to a fund's back-office; add fund-specific items like LP relations, deal flow, IC cadence).
- For Hospital Y, University Z: minor edits if anything is off.
- Enter initial KPI values for each company (manual entry).

### Day 6 — leadership teams complete first assessment
- Send invitations to fund team, hospital leadership, university leadership.
- Each leader scores their respective company's practices.
- Real data populates `round_responses`.

### Day 7 — fund CEO opens the control tower
- Sees the **portfolio dashboard** — Fund X / Hospital Y / University Z each with summary score and flags.
- Drills into any one — sees its pillar breakdown, top gaps, KPI tiles.
- Sees alerts — anything red across the three companies.
- Has enough data to act: which portfolio company needs a check-in, which pillar across the fund needs the next investment.

### Coherence check on this trace
- Every onboarding phase O1–O10 is hit on day 3–6.
- Every product layer L1–L5 is exercised (framework, template, tenant, surface, engine).
- Every visualization view used: V1 (control tower), V2 (assessment results), V5 (pillar drill-down), V8 (cross-company portfolio).
- Monitoring loop M1–M6 partially active: M1 manual entry, M2 storage, M3 thresholds, M4 alerts in-app, M5 in-app banner only (Slack/digest = post-pilot), M6 alert→initiative deferred.

What's intentionally absent from week 1: M1 connectors, M3 cross-metric rules, M5 Slack/digest, M6 action coupling, V8 NL query, V10 PDF export (Lovable already has its own version).

---

## 6. Coherence gaps I see (and how each is handled)

| # | Gap | Severity | Handling |
|---|---|---|---|
| **G1** | Professional-services / fund template doesn't exist yet | Medium for week 1 | Author tomorrow (day 1). |
| **G2** | Cross-company rollup view (V8) requires a new dashboard layout | Medium for week 1 | Day 4 spec. Simple version: a "My Portfolio" page listing companies with summary tiles. |
| **G3** | Maturity rubrics (5 levels per practice) not in v1 | Low for week 1 | Assessment uses gap-only scoring (importance × competency). Rubrics added when evidence loop ships post-pilot. |
| **G4** | Multi-facility / multi-campus roll-up | Low for week 1 | Each site is its own company in v1. Hierarchical roll-up is v2. |
| **G5** | NL query (Julius-style) | Out of scope for week 1 | v3+. Documented in `data-analytics-vision.md`. Data model leaves room. |
| **G6** | Native connectors | Out of scope for week 1 | v2. Generic webhook ships in v2 first; Stripe / CRM connectors after. |
| **G7** | Slack / email digest | Out of scope for week 1 | v2. In-app banners only for v1. |
| **G8** | Alert-to-initiative coupling (M6) | Out of scope for week 1 | v2. v1 alerts are advisory only. |

None of these gaps break the coherence of v1. Each has a documented home in a future milestone.

---

## 7. The one-line product description

A live, MECE operating + monitoring system for any organisation: **8 universal pillars, customer-defined practices and KPIs within them, live tiles and alerts, suggestions when wanted, no semantic-modelling layer in the middle**. Stand it up in a week. Run it as your operating compass.

---

## 8. Order of operations going forward (what I produce next)

1. **Professional-services / fund template** in `docs/industry-templates.md` (next commit)
2. **Lovable migration spec** for the new data model: `pillars`, `question_sets`, `metric_sets`, `metrics`, `metric_values`, `dashboards`, `widgets`, `alerts` (next commit, separate doc `docs/lovable-migration-spec.md`)
3. **Lovable refactor spec** for loading practices from DB (same doc as above)
4. **Portfolio / fund-CEO view spec** — a "My Portfolio" dashboard that lists companies with summary tiles (Lovable component spec)
5. **Update `docs/pilot-plan.md`** to reflect fund CEO as primary user with hospital + university as portfolio companies
6. **Update `docs/integration-plan.md`** to slot M5 (Control Tower v1) and M6 (Generic Webhook) ahead of the deeper milestones, with the analytics vision (`data-analytics-vision.md`) as the long-term horizon

I'll work through 1–6 sequentially. After each commit I'll log it here so cross-session sessions see what's done vs pending.
