# BDS OS — Integration Plan

How we turn `bds-OS` (the design / IP repo) and `wbardawil/strategy-spark-86` (the running Lovable app on Lovable Cloud) into one coherent product. This is the active plan. All previous frontend/backend planning docs (`docs/v1-plan.md`, `docs/frontend-contract.md`, `src/types/Database.ts`) were written before we learned what Lovable actually built — they reflect bds-OS's original schema, not the integrated reality, and need to be revised as we execute this plan.

---

## Decisions made (durable)

These are settled. Don't re-litigate without explicit user approval.

| # | Decision | Rationale |
|---|---|---|
| **D1** | **Lovable Cloud is the canonical backend.** No own Supabase project. | Already running, no migration risk, Lovable handles edge functions and migrations through its UI. |
| **D2** | **Lovable's schema is the canonical schema.** `companies`, `company_members`, `evaluation_rounds`, `round_responses`, `profiles`, `leads` stay as they are. | Already in production with real data. bds-OS's renamed migrations would have been net-new anyway. |
| **D3** | **Lovable's 8 categories are canonical** (`strategic_planning`, `management`, `kpi_okr`, `operations`, `human_resources`, `it`, `market_intelligence`, `sales_marketing`). bds-OS's `data/areas.json` (8 different functional areas) is **deprecated**. | Already in production. Reconciliation effort would be high with no user benefit. |
| **D4** | **Lovable's 75 questions in `src/data/questions.ts` are canonical.** bds-OS's `data/practices.json` (82 different practices) is **deprecated**. | Already in production. (Earlier docs said 83; recount of `src/data/questions.ts` on 2026-05-05 confirms 75: sp:7 + ma:14 + ko:6 + op:6 + hr:16 + it:15 + mi:7 + sm:4.) |
| **D5** | **`round_responses.category_scores` jsonb shape stays.** No migration to per-practice rows. | Lovable's frontend already reads/writes this shape; changing it breaks shipped UI. bds-OS engines will read jsonb via an adapter. |
| **D6** | **Both OTV and OPI ship as complementary lenses.** | OTV (Clarity / Speed / Skills / Commitment) is the narrative dashboard; OPI is the action priority list. They serve different purposes. |
| **D7** | **`bds-OS` is the design / IP repo. `strategy-spark-86` is the deployed code.** | Two repos coexist. Sync via design specs Lovable consumes. |
| **D8** | **Sync mechanism: Claude Code writes directly to both repos via PR.** | MCP scope now covers both `bds-OS` and `wbardawil/strategy-spark-86`. Claude authors blueprints in `bds-OS/docs/blueprints/`, then ports them into `strategy-spark-86` (migrations under `supabase/migrations/`, functions under `supabase/functions/`, frontend wiring under `src/`) on a `claude/integrate-frontend-backend-XXXXX` branch. The user reviews via PR before merge. **Updated 2026-05-05** (was: paste into Lovable). |

---

## Architecture (the integrated product)

```
   Visitor / friend / team member browser
                 │
                 ▼
        Lovable's frontend                          (lives in strategy-spark-86)
        (existing screens + new
         OPI / portfolio / evidence
         / governance screens)
                 │
                 ▼ Supabase JS client
        Lovable Cloud (managed Supabase)
        ├── Existing tables                         (companies, company_members,
        │                                            evaluation_rounds, round_responses,
        │                                            profiles, leads)
        ├── NEW tables (added via PR to             (lifecycle_weights, opi_scores,
        │   strategy-spark-86/supabase/migrations/) focus_portfolios, initiatives,
        │                                            evidence, score_change_requests,
        │                                            approvals, audit_log,
        │                                            invitations, maturity_rubrics)
        ├── Existing edge functions                 (submit-lead, create-company,
        │                                            invite-member, etc.)
        └── NEW edge functions (added via PR)       (compute-opi, select-focus-portfolio,
                                                     grade-evidence, governance-report,
                                                     determine-lifecycle)
                 ↑
                 │ each new edge function uses
                 │ the engine logic specified in
                 │
        bds-OS (design / IP repo)
        ├── src/engines/*.ts        (pure functions, source of truth for the math)
        ├── src/adapters/*.ts       (Lovable jsonb → engine-input adapters)
        ├── docs/blueprints/        (migrations + edge functions ported into strategy-spark-86)
        └── docs/integration-plan.md (this file)
```

`bds-OS`'s engines, adapters, and blueprints are the source of truth. Claude ports them into `strategy-spark-86` via PR. Once merged, Lovable Cloud picks them up.

---

## Category mapping (Lovable canonical, bds-OS noted)

| Lovable category (canonical) | Display name | bds-OS area equivalent (deprecated) |
|---|---|---|
| `strategic_planning` | Strategic Planning | partial overlap with Governance & Leadership |
| `management` | Management & Administration | no direct equivalent |
| `kpi_okr` | KPI-OKR | partial overlap with Governance & Leadership |
| `operations` | Operations | matches Delivery & Operations |
| `human_resources` | Human Resources | matches People & Organization |
| `it` | IT - AI | matches Technology & Infrastructure |
| `market_intelligence` | Market Intelligence | partial overlap with Marketing & Brand |
| `sales_marketing` | Sales & Marketing | combines Go-To-Market & Sales + Marketing & Brand |

bds-OS's areas with no Lovable equivalent (deprecated): `Finance & Unit Economics`, `Product & Offering`.

**Implication**: bds-OS's per-area scoring logic, focus-portfolio area-balancing, and area-level governance reports all need to be reframed against Lovable's 8 categories. The math doesn't change, but the names and groupings do.

---

## What we ADD to Lovable Cloud (the integration scope)

### New tables
All use `company_id` (not `organization_id`) and reference Lovable's existing tables. RLS uses Lovable's `has_company_role(auth.uid(), company_id, roles[])` helper, not bds-OS's `get_user_organization_id()`.

| Table | Purpose | Roughly maps from bds-OS |
|---|---|---|
| `lifecycle_weights` | Per-stage OPI weights (5 numeric weights × 4 stages) + lifecycle modifier | identical to bds-OS table, modifier folded in |
| `practice_metadata` | Per-question P&L impact, speed-to-impact, dependency, risk floor (1–5 each) | identical structure, keyed to Lovable's `question_id text` rather than `practice_id integer` |
| `maturity_rubrics` | 5 maturity levels per question with descriptor + evidence criteria | renamed from bds-OS `maturity_levels`; keyed to `question_id` |
| `opi_scores` | Computed OPI per question per round, with phase + rank | from bds-OS schema, `company_id` + `question_id text` |
| `focus_portfolios` | Quarterly WIP-capped selection of practices | from bds-OS schema, `company_id` + `active_question_ids text[]` |
| `initiatives` | Execution units, 7-status workflow | from bds-OS schema, `company_id` + `question_id text` |
| `artifacts` | Files attached to initiatives | from bds-OS schema |
| `evidence` | Evidence rows graded by AI | from bds-OS schema |
| `score_change_requests` | Maturity level upgrade requests | from bds-OS schema, `company_id` |
| `approvals` | Senior verifications of score changes | from bds-OS schema |
| `audit_log` | Append-only history of state changes | from bds-OS schema, `company_id` |
| `invitations` | Email-invite team members (separate from existing `company_members.invited_by`) | from bds-OS schema, `company_id` |

### New columns on existing tables
- `companies.lifecycle_stage` enum (`startup | growth | scale | mature`) — drives OPI weights
- `companies.industry`, `companies.revenue_range`, `companies.employee_count`, `companies.years_in_operation` — inputs to `determine-lifecycle`
- `evaluation_rounds.mode` enum (`quick | full`) — distinguishes the public funnel's quick assessment from the deep team assessment

### New edge functions (ported into strategy-spark-86 via PR)
- `determine-lifecycle` — takes `company_id`, computes lifecycle stage from revenue + headcount, persists
- `compute-opi` — takes `round_id` and `company_id`, reads `round_responses.category_scores` jsonb, applies bds-OS's OPI engine logic, writes to `opi_scores`
- `select-focus-portfolio` — takes `company_id`, `round_id`, `quarter`; applies WIP cap and selection rules; writes to `focus_portfolios`; auto-creates initiative stubs
- `grade-evidence` — takes `evidence_id`; AI-grades against the question's maturity rubric; writes back to `evidence`; advances initiative status
- `governance-report` — takes `company_id` and `view_type ∈ executive | board | functional`; returns the appropriate dashboard data

### bds-OS engine adapter
The bds-OS engines under `src/engines/` were written to consume per-practice rows. The adapter under `src/adapters/lovable-jsonb-to-opi-input.ts` reads Lovable's jsonb and produces the engine input. Edge functions in `strategy-spark-86` import (or re-implement) the adapter.

Adapter responsibilities:
1. Read `round_responses.category_scores` jsonb for every respondent in a round
2. Flatten each into per-question records: `{ question_id, importance, competency }`
3. Aggregate across respondents (mean per question)
4. Look up `practice_metadata` for each `question_id`
5. Pass to the OPI engine
6. Return OPI results, with a list of any `question_id`s missing metadata

---

## What does NOT change

- Lovable's existing tables (no renames, no destructive migrations)
- Lovable's existing edge functions (`submit-lead`, `create-company`, `invite-member`, etc.) — they keep their current names
- Lovable's existing screens (landing, assessment funnel, lead gate, dashboard, company view, round-by-code, admin)
- Lovable's existing analytics (gap, overall_score, OTV pillars, industry benchmarks, round-over-round trends, PDF/CSV export)

---

## Roadmap (post-deadline-discovery, no firm dates)

### M1 — Foundation specs (this repo, ~1 day) — **IN PROGRESS 2026-05-05**
- Update `docs/lovable-state.md` with the practice / category data we now have
- Write `src/adapters/lovable-jsonb-to-opi-input.ts` blueprint
- Write per-table SQL migration blueprints for the new tables under `docs/blueprints/migrations/`
- Write per-edge-function source blueprints under `docs/blueprints/functions/`

### M2 — Schema landed in strategy-spark-86 (~half day)
Claude opens a PR on `strategy-spark-86` that adds:
1. Migration: `lifecycle_stage` enum + columns on `companies`
2. Migration: `lifecycle_weights` table + seed (4 rows)
3. Migration: `practice_metadata` table (seed deferred — content lift)
4. Migration: `maturity_rubrics` table (seed deferred — content lift)
5. Migration: `mode` column on `evaluation_rounds`

### M3 — OPI computation (~1 day)
- Migration: `opi_scores` table
- Edge function: `compute-opi` (ported from blueprint)
- Frontend: "OPI view" tab on the round results screen
- Test: a full round → compute → see Phase 1/2/3 grouping with risk-floor flags

### M4 — Focus portfolio (~1 day)
- Migration: `focus_portfolios` and `initiatives` tables
- Edge function: `select-focus-portfolio`
- Frontend: "Focus Portfolio" screen on the company dashboard

### M5 — Evidence loop (~2 days)
- Migrations: `evidence`, `artifacts`, `score_change_requests`, `approvals` tables
- Edge function: `grade-evidence` (LLM call wired to project-managed key)
- Frontend: initiative detail screen with evidence upload + AI grading panel

### M6 — Governance views (~1 day)
- Edge function: `governance-report`
- Frontend: three dashboards — executive, board, functional

### M7 — Audit log + invitations (~half day)
- Migrations: `audit_log` and `invitations` tables
- Edge functions: `invite-user` and `accept-invitation` (replacing or augmenting Lovable's existing `invite-member` / `send-invite-email`)
- Frontend: admin "team management" screen

**Total estimate**: ~6–7 days of focused work. Sequencing is intentional — each milestone produces something user-visible.

---

## Maintenance & docs to update as we go

- After M2: update `src/types/Database.ts` to reflect Lovable's schema + new additions; deprecate the bds-OS-naming version
- After M3: update `docs/frontend-contract.md` to reflect actual Lovable endpoints (canonical names, jsonb shape)
- After each milestone: update `docs/lovable-state.md` status section so future sessions see what's actually deployed

`docs/v1-plan.md` is now obsolete (it described bds-OS's standalone v1 before we knew about Lovable's existing implementation). Delete or mark deprecated.

---

## Open questions to resolve along the way

1. **Industry benchmarks** (Lovable already has these): do we want to feed bds-OS's OPI scores into the same benchmark mechanism, or keep benchmarks gap-only?
2. **Round-over-round trends** (Lovable has these for gap; bds-OS has placeholder for OPI trends): unify or keep separate?
3. **Existing `invite-member` flow**: keep it for the simple "add to company" case, and add `invitations` for cross-domain invitations? Or replace?
4. **Practice metadata content**: who provides the P&L impact / speed / dependency / risk_floor values for Lovable's 75 questions? bds-OS's seeds map to its own 82, not Lovable's 75. Probably needs human curation by the product owner.
5. **Maturity rubrics content** (5 levels × 75 questions = 375 rubric entries): same — bds-OS's are written for its own 82. Big content lift to author for Lovable's 75.
6. **`category_scores` jsonb shape**: assumed `{category: {question_id: {importance, competency}}}` in the adapter. Verify against `submit-round-response` in M2.
