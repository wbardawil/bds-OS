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
| **D4** | **Lovable's 83 practices in `src/data/questions.ts` are canonical.** bds-OS's `data/practices.json` (82 different practices) is **deprecated**. | Same as above. |
| **D5** | **`round_responses.category_scores` jsonb shape stays.** No migration to per-practice rows. | Lovable's frontend already reads/writes this shape; changing it breaks shipped UI. bds-OS engines will read jsonb via an adapter. |
| **D6** | **Both OTV and OPI ship as complementary lenses.** | OTV (Clarity / Speed / Skills / Commitment) is the narrative dashboard; OPI is the action priority list. They serve different purposes. |
| **D7** | **`bds-OS` is the design / IP repo. `strategy-spark-86` is the deployed code.** | Two repos coexist. Sync via design specs Lovable consumes. |
| **D8** | **Sync mechanism: Lovable consumes specs from `bds-OS` via paste.** | We don't have direct write access to `strategy-spark-86` from this session (MCP scope is `bds-OS` only). All Lovable changes happen via prompts the user pastes. |

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
        ├── NEW tables (added via Lovable Cloud)    (lifecycle_weights, opi_scores,
        │                                            focus_portfolios, initiatives,
        │                                            evidence, score_change_requests,
        │                                            approvals, audit_log,
        │                                            invitations, maturity_rubrics)
        ├── Existing edge functions                 (submit-lead, create-company,
        │                                            invite-member, etc.)
        └── NEW edge functions                      (compute-opi, select-focus-portfolio,
                                                     grade-evidence, governance-report,
                                                     determine-lifecycle)
                 ↑
                 │ each new edge function uses
                 │ the engine logic specified in
                 │
        bds-OS (design / IP repo)
        ├── src/engines/*.ts        (pure functions, blueprint for Lovable's edge functions)
        ├── supabase/migrations/    (blueprint for new Lovable Cloud migrations)
        └── docs/integration-plan.md (this file)
```

`bds-OS`'s engines and migrations are **blueprints**. Lovable adapts them to its codebase via prompts. The actual deployed code lives in `strategy-spark-86`.

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

This is significant. Lovable's categorisation skews leadership / operations / functional. bds-OS's was more functional / P&L flavoured. We accept Lovable's framing.

**Implication**: bds-OS's per-area scoring logic, focus-portfolio area-balancing, and area-level governance reports all need to be reframed against Lovable's 8 categories. The math doesn't change, but the names and groupings do.

---

## What we ADD to Lovable Cloud (the integration scope)

### New tables
All use `company_id` (not `organization_id`) and reference Lovable's existing tables.

| Table | Purpose | Roughly maps from bds-OS |
|---|---|---|
| `lifecycle_weights` | Per-stage OPI weights (5 numeric weights × 4 stages) | identical to bds-OS table |
| `practice_metadata` | Per-practice P&L impact, speed-to-impact, dependency, risk floor (1–5 each) | identical structure, but keyed to Lovable's `questionId` strings rather than `practice_id` integers |
| `maturity_rubrics` | 5 maturity levels per practice with descriptor + evidence criteria | renamed from bds-OS `maturity_levels`; keyed to Lovable's `questionId` |
| `opi_scores` | Computed OPI per practice per round, with phase + rank | from bds-OS schema, `company_id` instead of `organization_id` |
| `focus_portfolios` | Quarterly WIP-capped selection of practices | from bds-OS schema, `company_id` |
| `initiatives` | Execution units, 7-status workflow | from bds-OS schema, `company_id` |
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

### New edge functions (Lovable implements based on bds-OS specs)
- `determine-lifecycle` — takes `company_id`, computes lifecycle stage from revenue + headcount, persists
- `compute-opi` — takes `round_id` and `company_id`, reads `round_responses.category_scores` jsonb, applies bds-OS's OPI engine logic, writes to `opi_scores`
- `select-focus-portfolio` — takes `company_id`, `round_id`, `quarter`; applies WIP cap and selection rules; writes to `focus_portfolios`; auto-creates initiative stubs
- `grade-evidence` — takes `evidence_id`; AI-grades against the practice's maturity rubric; writes back to `evidence`; advances initiative status
- `governance-report` — takes `company_id` and `view_type ∈ executive | board | functional`; returns the appropriate dashboard data

### bds-OS engine adapter
The bds-OS engines under `src/engines/` were written to consume per-practice rows. They need a thin adapter that reads Lovable's jsonb and produces the engine input. This adapter lives in this repo (`src/adapters/`) as a blueprint, and Lovable's edge functions call it (or implement equivalent logic).

Adapter responsibilities:
1. Read `round_responses.category_scores` jsonb for a given round
2. Flatten into per-practice records: `{ questionId, importance, competency, category }`
3. Look up `practice_metadata` for each `questionId`
4. Pass to the OPI engine
5. Return OPI results

---

## What does NOT change

- Lovable's existing tables (no renames, no destructive migrations)
- Lovable's existing edge functions (`submit-lead`, `create-company`, `invite-member`, etc.) — they keep their current names
- Lovable's existing screens (landing, assessment funnel, lead gate, dashboard, company view, round-by-code, admin)
- Lovable's existing analytics (gap, overall_score, OTV pillars, industry benchmarks, round-over-round trends, PDF/CSV export)

---

## Roadmap (post-deadline-discovery, no firm dates)

### M1 — Foundation specs (this repo, ~1 day)
- Update `docs/lovable-state.md` with the practice / category data we now have
- Write `src/adapters/jsonb-to-opi-input.ts` blueprint
- Write per-table SQL migration blueprints for the new tables Lovable should add
- Write per-edge-function source blueprints that Lovable adapts

### M2 — Lovable applies foundational schema (Lovable, ~half day)
User pastes specs in this order:
1. Add `lifecycle_stage` and metadata columns to `companies`
2. Add `lifecycle_weights` table + seed
3. Add `practice_metadata` table + seed (one row per Lovable question)
4. Add `maturity_rubrics` table + seed (5 rows per Lovable question — biggest content lift)
5. Add `mode` column to `evaluation_rounds`

### M3 — Add OPI computation (Lovable + this repo, ~1 day)
- Lovable adds `opi_scores` table
- Lovable adds `compute-opi` edge function (using our spec)
- Lovable adds an "OPI view" tab to the round results screen
- Test: a full round → compute → see Phase 1/2/3 grouping with risk-floor flags

### M4 — Focus portfolio (Lovable + this repo, ~1 day)
- Lovable adds `focus_portfolios` and `initiatives` tables
- Lovable adds `select-focus-portfolio` edge function
- Lovable adds a "Focus Portfolio" screen to the company dashboard

### M5 — Evidence loop (Lovable + this repo, ~2 days)
- Lovable adds `evidence`, `artifacts`, `score_change_requests`, `approvals` tables
- Lovable adds `grade-evidence` edge function
- Lovable adds initiative detail screen with evidence upload + AI grading panel

### M6 — Governance views (Lovable + this repo, ~1 day)
- Lovable adds `governance-report` edge function
- Lovable adds three dashboards: executive, board, functional

### M7 — Audit log + invitations (Lovable + this repo, ~half day)
- Lovable adds `audit_log` and `invitations` tables
- Lovable adds `invite-user` and `accept-invitation` edge functions (replacing or augmenting the existing `invite-member` / `send-invite-email`)
- Lovable adds an admin "team management" screen

**Total estimate**: ~6–7 days of focused work across both sides. Sequencing is intentional — each milestone produces something user-visible.

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
4. **Practice metadata content**: who provides the P&L impact / speed / dependency / risk_floor values for Lovable's 83 practices? bds-OS's seeds map to its own 82, not Lovable's 83. Probably needs human curation by the product owner.
5. **Maturity rubrics content** (5 levels × 83 practices = 415 rubric entries): same — bds-OS's are written for its own 82. Big content lift to author for Lovable's 83.
