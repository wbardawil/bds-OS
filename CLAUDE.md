# CLAUDE.md

Context for any Claude Code session working in this repo. Read this first.

## What this is

**BDS OS** — a P&L-driven operating maturity and capital allocation system. Backend
for an app that helps a leadership team:

1. Score 82 management practices across 8 areas on importance + competency.
2. Compute an Operational Priority Index (OPI) per practice, weighted by lifecycle stage.
3. Select a quarterly focus portfolio (WIP-limited active practices).
4. Track initiatives, grade evidence with AI, route score-change requests through approval.
5. Surface executive / board / functional governance views.

See `docs/about.md` for the product summary, ICP, and value proposition.

## Repo layout

```
bds-OS/
├── src/                       TypeScript engines + types (no runtime — imported by edge functions)
│   ├── engines/               opi, evidence-grader, focus-portfolio, lifecycle, delegation-index, operating-debt
│   ├── types/                 database, governance, kanban, opi
│   └── constants/             lifecycle-weights, wip-limits
├── supabase/
│   ├── migrations/            schema (enums, core, assessment, opi, execution, governance, indexes, RLS)
│   ├── functions/             edge functions (compute-opi, grade-evidence, select-focus-portfolio,
│   │                          determine-lifecycle, governance-report) + shared/
│   └── seed.sql               seeds 8 areas, 82 practices, 410 maturity levels, lifecycle weights
├── data/                      JSON source for seeds (practices, areas, maturity-levels, practice-metadata)
├── docs/
│   └── v1-plan.md             release plan, frontend contract, blockers
└── apps/web/                  (planned) Lovable frontend, integrated via subtree from strategy-spark-86
```

## Architecture in one diagram

```
Lovable UI (apps/web)
       │
       ▼  HTTPS + Supabase JS client
Supabase
  ├── Auth (users → users.organization_id)
  ├── Postgres (RLS scoped by organization_id)
  └── Edge Functions
        ├── determine-lifecycle    POST { organization_id }
        ├── compute-opi            POST { round_id, organization_id }
        ├── select-focus-portfolio POST { organization_id, round_id, quarter }
        ├── grade-evidence         POST { evidence_id }
        └── governance-report      POST { organization_id, view_type }
              ↑
              └─ each function imports pure logic from src/engines/*
```

The engines under `src/engines/` are pure functions — no DB calls, no IO. Edge
functions handle data fetching + persistence, then delegate computation to engines.
Keep that separation.

## Key data model

- `organizations` — one row per company, has `lifecycle_stage`
- `users` — linked to `auth.users`, has `organization_id` and `role` (admin | leader | functional_lead)
- `assessment_rounds` + `round_responses` — scoring sessions; one response per (round, practice)
- `opi_scores` — computed output of compute-opi, grouped into Phase 1/2/3
- `focus_portfolios` — selected practices per quarter, with WIP cap
- `initiatives` — execution units, 7-status workflow (backlog → ... → approved)
- `evidence` → `score_change_requests` → `approvals` — the maturity-level upgrade loop
- Reference data (read-only RLS): `practices` (82), `areas` (8), `maturity_levels` (410),
  `practice_metadata`, `practice_dependencies` (schema exists, not yet seeded), `lifecycle_weights`

All tenant data is RLS-scoped via `get_user_organization_id()`. Reference data is
readable by any authenticated user.

## Conventions

- **Branch naming**: `claude/<topic>-XXXXX` for Claude work, `chore/...`, `feat/...`,
  `fix/...` for human PRs.
- **Active Claude branch**: `claude/promote-assessments-P5G00` — current work lives here.
- **Commits**: focus the message on *why*, not what. Single line subject when possible.
- **No emojis** in code or docs unless explicitly requested.
- **No new files** without good reason — prefer editing.
- **No comments** explaining what the code does — names should do that. Comments only
  for non-obvious *why*.
- **Engines stay pure** — no Supabase imports under `src/engines/`.
- **Validate front + back before adding logic**: before writing new edge functions,
  migrations, or significant backend code, audit `apps/web/` (the Lovable frontend)
  to check what's already implemented client-side. Flows likely already in Lovable:
  signup, org creation, invitation send/accept, simple data CRUD via PostgREST.
  Don't duplicate. If `apps/web/` is empty, ask the user to import Lovable first.

## Common commands

```bash
npm run typecheck                 # tsc --noEmit
npm run db:reset                  # supabase db reset (rebuilds + seeds locally)
npm run db:migrate                # supabase migration up
npm run functions:serve           # supabase functions serve (local edge functions)
```

## Where we are right now (as of 2026-05-04)

- Backend: ~80% ready for v1. Engines, schema, seeds, edge functions all in place.
- Frontend: built in Lovable, lives in `wbardawil/strategy-spark-86`, integration into
  `apps/web/` via `chore/integrate-lovable` branch is in progress.
- v1 blocker status (full spec in `docs/v1-plan.md`):
  1. Team-invitation flow: backend done (`invitations` table + `invite-user` and
     `accept-invitation` edge functions, with Resend email delivery on `invite-user`).
     Frontend wiring still needed in Lovable.
  2. "Compass" landing page: not started (Lovable).
  3. Onboarding / empty states / rubric tooltips: not started (Lovable).
- Pre-v1 hygiene from `docs/external-patterns-review.md`:
  - Audit log migration (A1): done — `20260504000001_create_audit_log.sql`.
    Edge functions need to start writing entries on score-change approvals,
    evidence grading, initiative status transitions.
  - Minimal CI gate (A4): done — `.github/workflows/gate.yml` runs typecheck
    and trufflehog secret scan on every PR to main.
- Known backend gaps for v1.1+: round-over-round trends (placeholder in
  `src/engines/operating-debt.ts:122`), weekly digest, practice
  dependencies seed.

## When picking up work

1. Read `docs/v1-plan.md` for the release plan and frontend contract.
2. Read `docs/external-patterns-review.md` if touching CI, audit log, onboarding,
   or auth — it captures decisions from the gstack/gsd-2 audit.
3. `git log --oneline -20` on `claude/promote-assessments-P5G00` for recent context.
4. Confirm with the user before doing anything destructive or visible (push, PR, comment).
