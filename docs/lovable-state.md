# Lovable's actual state (as of 2026-05-04, count corrected 2026-05-05)

This doc captures what's currently shipped in the Lovable frontend (`wbardawil/strategy-spark-86`), how it diverges from what `bds-OS` describes, and the strategic paths to reconcile them. Read this before assuming the two halves agree — they don't.

---

## TL;DR

**Lovable built a simpler product than `bds-OS` describes.** They are not different naming for the same thing — they're two different products at different depths. No reconciliation has happened beyond the M1 foundation specs in `docs/blueprints/`.

---

## Lovable's actual schema

Tables (6) and enums (2) Lovable's frontend reads/writes:

### `companies`
- `id` uuid PK
- `name` text
- `created_by` uuid
- `created_at` timestamptz

### `company_members`
- `id` uuid PK
- `company_id` uuid
- `user_id` uuid
- `role` enum `company_role` (`owner | admin | member`)
- `invited_by` uuid (nullable)
- `created_at` timestamptz

### `evaluation_rounds`
- `id` uuid PK
- `company_id` uuid
- `code` text — 6-character share code
- `title` text
- `status` enum `round_status` (`active | closed`)
- `created_by` uuid
- `created_at` timestamptz

### `round_responses`
- `id` uuid PK
- `round_id` uuid
- `respondent_name` text
- `respondent_email` text
- `category_scores` jsonb — scores grouped by free-form categories
- `overall_score` numeric (nullable)
- `completed_at` timestamptz

### `profiles`
- `id` uuid PK (= `auth.users.id`)
- `full_name` text
- `email` text
- `avatar_url` text (nullable)
- `created_at` / `updated_at` timestamptz

### `leads` (public assessment captures)
- `id`, `name`, `email`, `company`, `wants_call`, `language`
- `worst_category`, `overall_score`, `category_scores` jsonb
- `created_at`

### Enums
- `company_role`: owner | admin | member
- `round_status`: active | closed

### Key database functions
- `has_company_role` — RLS helper (the one to use in all new policies)
- `count_user_owned_companies` — enforces max 3 owned companies per user
- `generate_round_code` — generates the 6-char share code
- `handle_new_user` — auto-creates `profiles` row on signup

---

## Lovable's question ontology (canonical for the integrated product)

Defined in `src/data/questions.ts`. **75 questions across 8 categories** (recount 2026-05-05 — earlier docs claimed 83).

| Category key | Display | Count | First..Last id |
|---|---|---|---|
| `strategic_planning` | Strategic Planning | 7 | sp_1..sp_7 |
| `management` | Management & Administration | 14 | ma_1..ma_14 |
| `kpi_okr` | KPI-OKR | 6 | ko_1..ko_6 |
| `operations` | Operations | 6 | op_1..op_6 |
| `human_resources` | Human Resources | 16 | hr_1..hr_16 |
| `it` | IT - AI | 15 | it_1..it_15 |
| `market_intelligence` | Market Intelligence | 7 | mi_1..mi_7 |
| `sales_marketing` | Sales & Marketing | 4 | sm_1..sm_4 |
| **Total** | | **75** | |

No maturity-level ontology around them. The 5-level rubric is added in M2 via the `maturity_rubrics` table (5 × 75 = 375 entries to author).

---

## Lovable's actual user journey

Two parallel entry points that converge in the team platform.

### A. Public lead / individual assessment (no auth)
1. **`/`** — landing page, CTA to take the assessment
2. **`/assessment`** — wizard with dual sliders (importance vs. competency); gap = competency − importance
3. **`LeadGateModal`** — captures name/email/company before showing full results → writes to `leads` via `submit-lead` edge function
4. **`/results`** — radar chart, `CategoryBreakdown`, "One Thing" recommendation, optional PDF/email report (`email-my-report`). CTA bridges to team platform via `/auth?redirect=/dashboard`

### B. Authenticated team platform
5. **`/auth`** — sign up / sign in. On signup, `handle_new_user` trigger creates a `profiles` row. Redirects to query param or `/dashboard`.
6. **`/dashboard`** — lists companies the user belongs to (`useCompanies`). Owners can create up to 3 companies via `CreateCompanyDialog` → `create-company` edge function (which also inserts owner into `company_members`).
7. **`/company/:id`** — `CompanyDashboard` shows the company's evaluation rounds. Owner/admin can create rounds (`CreateRoundDialog` generates a 6-char code) and view consolidated results.
8. **`/company/:id/members`** — `CompanyMembers`. Owner/admin invite members (`InviteMemberDialog` → `invite-member` / `send-invite-email`). Owner manages roles, admin removes members.
9. **`/round/:code`** — public-by-code page. Anyone invited can take the assessment for a round without logging in. Submission goes through `submit-round-response` (RLS blocks direct inserts), writes to `round_responses`. Ends on `RoundResults` with the respondent's individual gap analysis.
10. **`/company/:id/round/:roundId`** — `RoundDetail` for owner/admin. Consolidated results across all respondents (averaged competency and importance, recalculated gap) plus per-respondent drill-down (`QuestionBreakdownTable`). Owner can delete responses; owner/admin can close the round.

### C. Internal admin
11. **`/admin`** — password-gated (`ADMIN_PASSWORD`) view of `leads` and company data via `admin-leads` / `admin-companies` edge functions.

**Entry point**: `/` for prospects, `/auth` for returning team members. Both flows meet at `/dashboard` after a lead converts.

### Edge functions Lovable uses (named, not bds-OS's)
- `submit-lead`
- `email-my-report`
- `create-company`
- `invite-member`
- `send-invite-email`
- `submit-round-response`
- `admin-leads`
- `admin-companies`

---

## How Lovable differs from `bds-OS`

| Concept | Lovable | `bds-OS` |
|---|---|---|
| Org-equivalent | `companies` (max 3 per user) | `organizations` |
| Member-equivalent | `company_members` (owner/admin/member) | `users` (admin/leader/functional_lead) |
| Round | `evaluation_rounds` + 6-char share code | `assessment_rounds` |
| Scoring shape | jsonb `category_scores`, free-form categories | one row per (round, practice) — 82 practices |
| Practice ontology | **75 questions × 8 categories** (no maturity rubric yet) | 82 practices × 8 areas × 5 maturity levels (410 rubric entries) |
| Practice metadata (P&L impact, speed, dependency, risk) | **none** | per-practice metadata table |
| OPI engine | **none** | full implementation in `src/engines/opi.ts` |
| Lifecycle stage + weights | **none** | startup / growth / scale / mature, weights table |
| Focus portfolio with WIP cap | **none** | `select-focus-portfolio` engine and edge function |
| Initiatives + evidence + AI grading + approvals | **none** | full execution loop in schema and edge functions |
| Audit log | **none** | `audit_log` table, written by `grade-evidence` and `invite-user` |
| Practice dependencies | **none** | schema exists, not seeded |
| Public lead funnel | yes (`leads`, `submit-lead`) | **none** |
| Share-code anonymous responders | yes (`/round/:code`) | **none** |
| "One Thing" recommendation, PDF email report | yes | **none** |

### Architectural read

`bds-OS` is the deeper, opinionated operating-maturity system the original product brief describes. Lovable is a working but shallower assessment funnel + team workspace. They overlap in the abstract concept ("score practices, see results") but share zero code, zero tables, and zero edge function names — until M2 onward, when the blueprints in `docs/blueprints/` are ported into `strategy-spark-86`.

---

## Strategic path (post-demo, decided 2026-05-05)

**Path 3 (hybrid).** Lovable's funnel becomes the **public / sales / lead-capture layer**; `bds-OS`'s schema becomes the **paid / team / depth layer**. See `docs/integration-plan.md` for the milestone-by-milestone plan.

---

## Status as of 2026-05-05

- Lovable preview is live and working.
- M1 foundation specs (this commit) authored on `claude/integrate-frontend-backend-kVV84`.
- M2+ migrations and edge functions to be ported to `strategy-spark-86` via PR.

## Resolved open questions

1. Database is on **Lovable Cloud** (Lovable-managed). Schema lands via `strategy-spark-86/supabase/migrations/` and Lovable Cloud applies on push.
2. Lovable's category model (`strategic_planning`, etc.) does not map cleanly to bds-OS's 8 areas. Lovable's framing is canonical (D3).
3. Buyer feedback from 2026-05-05 demo informs M2+ priorities (record outcome here).

## Still open

4. Practice metadata content (P&L impact, speed, dependency, risk floor per question) — needs product-owner curation.
5. Maturity rubric content (5 × 75 = 375 entries) — needs product-owner curation.
6. `category_scores` jsonb exact shape — verify against `submit-round-response` source in M2.
