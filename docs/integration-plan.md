# BDS OS — Integration Plan

How we turn `bds-OS` (the design / IP repo) and `wbardawil/strategy-spark-86` (the running Lovable app on Lovable Cloud) into one coherent product. This is the active plan.

---

## Status update — 2026-05-08 (evening)

After a closer audit of `data/practice-metadata.json` and `data/maturity-levels.json` in this repo:

- **All 82 bds-OS practices have fully calibrated metadata** (P&L impact, speed-to-impact, dependency, risk floor + level). Real values, not placeholders.
- **All 82 practices have full 5-level maturity rubrics** authored (descriptor + evidence criteria + refresh cadence). 410 entries total.
- **The OPI engine, Focus Portfolio engine, and supporting UI are built** (M1–M4 on `claude/integrate-frontend-backend-kVV84`).

This means the gap to deliver "ranked by P&L impact, speed, dependency, and risk" credibly is **much smaller than initially estimated**. The work is **mapping**, not authoring from scratch.

See `data/lovable-question-mapping.json` for the 75-row mapping from Lovable's `question_id` to the closest bds-OS `practice_id`.

---

## Decisions made (durable)

| # | Decision | Rationale |
|---|---|---|
| **D1** | **Lovable Cloud is the canonical backend.** No own Supabase project. | Already running, no migration risk. |
| **D2** | **Lovable's schema is the canonical schema.** | Already in production with real data. |
| **D3** | **Lovable's 8 categories are canonical.** bds-OS's `data/areas.json` deprecated. | Already in production. |
| **D4** | **Lovable's 75 questions in `src/data/questions.ts` are canonical.** bds-OS's `data/practices.json` deprecated as the user-facing list **— but its calibrated metadata + rubrics are inherited via `data/lovable-question-mapping.json`.** | Lovable's questions are deployed; bds-OS's calibration work is reusable via mapping. Best of both. |
| **D5** | **`round_responses.category_scores` jsonb shape stays.** | Lovable's frontend already reads/writes this shape. |
| **D6** | **Both OTV and OPI ship as complementary lenses.** | Different purposes. |
| **D7** | **`bds-OS` is the design / IP repo. `strategy-spark-86` is the deployed code.** | Two repos coexist. |
| **D8** | **Sync: Claude Code writes directly to both repos via PR.** | MCP scope covers both. |

---

## What we ADD to Lovable Cloud (the integration scope)

### New tables
All use `company_id`. RLS uses Lovable's `has_company_role` helper.

| Table | Purpose | Status |
|---|---|---|
| `lifecycle_weights` | Per-stage OPI weights + modifier | M2: schema seeded |
| `practice_metadata` | Per-question P&L/speed/dep/risk | M2: schema; M3.5: real metadata via mapping |
| `maturity_rubrics` | 5-level rubric per question | M2: schema; M3.6: real rubrics via mapping (next push) |
| `opi_scores` | Computed OPI per question per round | M3 |
| `focus_portfolios` | Quarterly WIP-capped selection | M4 |
| `initiatives` + `artifacts` | Execution units | M4 |
| `evidence` | AI-graded proof bundles | M5 (not yet) |
| `score_change_requests` + `approvals` | Maturity upgrade flow | M5 |
| `audit_log` | Append-only history | M7 |
| `invitations` | Email-token invites | M7 |

### New columns on existing tables
- `companies.lifecycle_stage` enum + revenue/employee/years inputs
- `evaluation_rounds.mode` enum (quick | full)

### New edge functions
- `compute-opi` (M3, deployed on branch)
- `select-focus-portfolio` (M4, deployed on branch)
- `determine-lifecycle` (M3, deployed on branch)
- `grade-evidence` (M5, blueprint only — LLM call stubbed)
- `governance-report` (M6, blueprint only)

---

## Roadmap (revised 2026-05-08)

### M1 — Foundation specs — **DONE 2026-05-05**
### M2 — Schema in strategy-spark-86 — **DONE 2026-05-05**
### M3 — OPI computation backend — **DONE 2026-05-05**
### M3.5 — OPI tab UI + Focus Portfolio UI — **DONE 2026-05-05** (combined with M4 work)
### M4 — Focus Portfolio backend + UI — **DONE 2026-05-05**
### M3.5b — Real practice_metadata seed — **IN PROGRESS 2026-05-08**
Replace placeholder seed with calibrated values inherited from bds-OS via `data/lovable-question-mapping.json`. 68 of 75 rows inherit directly; 7 are authored fresh (4 AI questions + ecosystems + AI workflow + talent deployment).

### M3.6 — Maturity rubrics seed — **NEXT**
Generate `maturity_rubrics` seed (5 levels × 75 questions = 375 rows): 340 inherited via mapping, 35 (= 7 unmapped × 5) authored fresh.

### M5 — Evidence loop — **2 days**
- Migrations: `evidence`, `artifacts`, `score_change_requests`, `approvals`
- Edge function: `grade-evidence` (LLM call wired to Anthropic)
- Frontend: initiative detail with evidence upload + AI grading panel

### M6 — Governance views — **1 day**
### M7 — Audit log + invitations — **0.5 day**

**Total remaining to credible v1:** ~5 working days (M3.5b + M3.6 + M5 + M6 + validation).

---

## Resolved open questions (vs. earlier draft)

- ~~**Practice metadata content**~~ — **resolved.** 68 of 75 inherit from bds-OS's calibrated 82; 7 authored fresh in this push.
- ~~**Maturity rubrics content**~~ — **resolvable.** Same mapping path. Next push.
- ~~**`category_scores` jsonb shape**~~ — resolved 2026-05-05 (verified against `RoundAssessment.tsx`).

## Still open

1. **Industry benchmarks** — keep gap-only or feed OPI scores in?
2. **Round-over-round trends** — unify or keep separate?
3. **Existing `invite-member` flow** — keep or replace with `invitations`?
4. **Lifecycle stage UI** — currently no way for a user to set `companies.lifecycle_stage` without SQL editor. Add a small dropdown in CompanyDashboard (~1 hour).
