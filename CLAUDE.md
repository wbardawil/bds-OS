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
- **Doc hygiene — signal over noise**:
  - Before creating a new `.md`, check if existing docs cover the topic. Prefer
    extending an existing canonical doc over creating a new one.
  - Each doc has a single clear purpose. If two docs overlap in scope, consolidate.
  - When a doc is superseded, mark with `**Status: superseded by [docs/X.md]**`
    at the top. Don't silently let docs drift.
  - Active canonical docs (read first): `architecture.md`, `framework.md`,
    `pilot-plan.md`, `coherence-mece.md`, `csio-fit-mece.md`,
    `industry-templates.md`, `data-analytics-vision.md`, `about.md`.
  - Superseded by architecture lock + Lovable discovery (kept for history):
    `v1-plan.md`, `frontend-contract.md`, `how-it-works.md`, `integration-plan.md`.
  - Don't create a doc just to capture a passing thought — capture in a commit
    message or in CLAUDE.md's "where we are right now" section instead.

## Common commands

```bash
npm run typecheck                 # tsc --noEmit
npm run db:reset                  # supabase db reset (rebuilds + seeds locally)
npm run db:migrate                # supabase migration up
npm run functions:serve           # supabase functions serve (local edge functions)
```

## Where we are right now (as of 2026-05-06)

- **Backend v1 — code complete**. All migrations, seeds, edge functions, CI/CD,
  and observability committed on `claude/promote-assessments-P5G00`.
  - 7 framework migrations (`20260506000001-7`): schema + RLS + 4 templates +
    600 maturity rubrics + ops webhook triggers + practice_assignments
  - 11 edge functions: compute-opi, select-focus-portfolio, grade-evidence,
    governance-report, determine-lifecycle, invite-user, accept-invitation,
    create-organization, chat-with-data, delegate-questions,
    submit-delegated-response. Plus shared/sentry.ts helper.
  - CI/CD: `.github/workflows/{gate,deploy,mirror-frontend}.yml`
  - Adapter: `src/adapters/lovable-jsonb-to-opi-input.ts`
  - Canonical types: `src/types/Database.ts` (matches the post-migration schema)
- **Pending: infrastructure setup (you, browser tasks ~2 hours)**.
  See `docs/architecture.md` "GitHub Actions secrets needed" + the migration
  steps in `docs/pilot-plan.md`. Day-by-day plan: 15 days from architecture
  setup to beta launch.
- **Pending: Lovable iteration (you prompt, Lovable builds)**.
  `docs/lovable-prompts.md` is the **paste-ready manifest of 14 numbered prompts**
  for the v1 frontend, sequenced day-by-day. `docs/frontend-contract.md` is the
  descriptive contract Lovable consumes for context.
- **Pending: deletion of superseded branch**. `claude/integrate-frontend-backend-kVV84`
  on origin is from before the architecture lock. Useful jsonb adapter cherry-picked.
  Delete via GitHub UI when convenient.

## Known v1.1+ backlog
- Round-over-round trends (placeholder in `src/engines/operating-debt.ts:122`)
- Weekly digest email
- Save-chart-to-dashboard from chat
- Drag-and-drop dashboard mosaic
- Custom pillar UI (merge / split / hide / add)
- Three separate governance views (executive / board / functional)
- Decision-log dedicated UI
- Maturity rubrics for long-tail practices
- Generic webhook ingest for Zapier/Make
- Native connectors (Stripe, HubSpot, etc.)

## When picking up work

1. Read `docs/architecture.md` — **the canonical architecture reference**. Three
   foundational decisions are locked: (F1) own Supabase project, (F2) single
   monorepo with Lovable in `apps/web/`, (F3) CI/CD + Sentry + Slack alerts in v1.
   This doc supersedes earlier architecture content.
2. Read `docs/coherence-mece.md` — the MECE synthesis across product layers,
   onboarding, visualisation, monitoring.
3. Read `docs/framework.md` — the conceptual foundation. The 8 universal pillars,
   two-tier customisation (universal locked, customer pillars editable).
4. Read `docs/pilot-plan.md` — the active end-to-end plan. **Primary beta:
   the fund CEO**, with hospital + university as their portfolio companies.
   Schedule: ~17–18 days from today (3 days pre-pilot architecture + 13–15 day
   pilot build).
5. Read `docs/industry-templates.md` for the hospital + university content
   (professional-services / fund template still to be authored).
6. Read `docs/data-analytics-vision.md` for the visualization direction
   (Grafana / Julius style, no Power BI layer).
7. Read `docs/integration-plan.md` for the longer-horizon roadmap.
8. Read `docs/lovable-state.md` for what Lovable shipped (schema, journey).
9. Read `docs/about.md` for the product summary and ICP.
10. Read `docs/csio-fit-mece.md` — final synthesis showing the platform covers
    the CSIO's role end-to-end across daily / weekly / quarterly cadences,
    cross-referenced with the ICP value proposition.
11. `docs/how-it-works.md`, `docs/v1-plan.md`, `docs/frontend-contract.md`, and
    `src/types/Database.ts` are partially obsolete after the architecture lock —
    update when their relevant migrations / specs land.
12. `git log --oneline -20` on the active branch for recent context.
13. Confirm with the user before doing anything destructive or visible (push, PR, comment).
