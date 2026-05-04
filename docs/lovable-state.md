# Lovable's actual state (as of 2026-05-04)

This doc captures what's currently shipped in the Lovable frontend (`wbardawil/strategy-spark-86`), how it diverges from what `bds-OS` describes, and the strategic paths to reconcile them. Read this before assuming the two halves agree — they don't.

---

## TL;DR

**Lovable built a simpler product than `bds-OS` describes.** They are not different naming for the same thing — they're two different products at different depths. No reconciliation has happened. For tomorrow's demo (2026-05-05), we use Lovable as-is. The deep reconciliation is a post-demo decision.

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
- `has_company_role` — RLS helper
- `count_user_owned_companies` — enforces max 3 owned companies per user
- `generate_round_code` — generates the 6-char share code
- `handle_new_user` — auto-creates `profiles` row on signup

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
| Practice ontology | **none** | 82 practices × 8 areas × 5 maturity levels (410 rubric entries) |
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

`bds-OS` is the deeper, opinionated operating-maturity system the original product brief describes. Lovable is a working but shallower assessment funnel + team workspace. They overlap in the abstract concept ("score practices, see results") but share zero code, zero tables, and zero edge function names.

---

## Three strategic paths (decide post-demo)

### Path 1 — Lovable is the product
- Archive `bds-OS`'s deep engines and reference data.
- Ship the simpler assessment + team workspace.
- Pros: already working, faster to launch.
- Cons: throws away the IP (82-practice ontology, OPI math, lifecycle model, evidence loop). Competitive moat reduced.

### Path 2 — `bds-OS` is the product
- Lovable's current implementation is a v0 prototype. Rebuild Lovable's UI on top of `bds-OS`'s schema.
- Pros: ships the deep, defensible product.
- Cons: rebuild ~all of Lovable's frontend, lose the public lead funnel and share-code flow unless re-implemented.

### Path 3 — both ship in phases (hybrid)
- Lovable's funnel becomes the **public / sales / lead-capture layer** (free, no auth).
- `bds-OS`'s schema becomes the **paid / team / depth layer** (requires sign-up, accessed at `/dashboard` and beyond).
- Migrate Lovable's `companies` → `organizations`, `company_members` → `users`, `evaluation_rounds` → `assessment_rounds`, etc., once a user signs up. Add `bds-OS`'s missing tables (`opi_scores`, `focus_portfolios`, `lifecycle_weights`, `practice_metadata`, `maturity_levels`, `initiatives`, `evidence`, `score_change_requests`, `approvals`, `audit_log`) onto the same Supabase project.
- Adapt Lovable's existing post-signup screens to consume the deeper data (replace category sliders with the 82-practice grid, add OPI results screen, add focus portfolio screen).
- Pros: preserves both efforts. Lovable's funnel stays as the lead engine. The depth gets the buyer to "wow." Can ship the funnel now and the depth incrementally.
- Cons: most engineering work. Requires careful migration so existing companies/members aren't broken.

---

## Recommendation

**Path 3 (hybrid).** Lovable's lead funnel and share-code rounds are real product value worth keeping — those are exactly the kind of frictionless entry points a B2B SaaS needs. `bds-OS`'s depth is the differentiator and the buyer-facing IP. Combining them yields a stronger product than either alone.

But this is **deferred until after the 2026-05-05 demo**. Tomorrow's demo runs on Lovable as-is. The strategic decision happens after we see the friend's reaction.

---

## Status as of 2026-05-04

- Lovable preview is live and working.
- `bds-OS`'s migrations and edge functions are **not** deployed against any Supabase project linked to Lovable. Lovable runs on its own schema (probably Lovable Cloud — not yet confirmed which Supabase project).
- No reconciliation has been attempted.
- Tomorrow's demo: use Lovable's existing path (`/` → `/assessment` → `/auth` → `/dashboard` → `/company/:id` → round → results).

## Open questions for after the demo

1. Is the database on **Lovable Cloud** (Lovable-managed) or on a **Supabase project the user owns**? This determines whether `bds-OS`'s migrations can be applied directly or require working through Lovable.
2. Does Lovable's "category" model in `category_scores` jsonb correspond to anything in `bds-OS`'s 8 areas? Or are they entirely different categorisation?
3. Does the demo confirm the buyer wants the **simpler funnel** or the **deeper system**?
