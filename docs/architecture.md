# BDS OS — System Architecture

This is the **canonical architecture reference**. When in doubt about how the system is structured, where code lives, what services we depend on, or what tools we use, this doc decides. It supersedes earlier hints in `docs/how-it-works.md`, `docs/integration-plan.md`, and `docs/lovable-state.md`.

**Status**: locked. The three foundational decisions below are committed; we don't re-litigate without explicit user approval.

---

## Three foundational decisions (locked)

| # | Decision | Rationale |
|---|---|---|
| **F1** | **Own Supabase project** (not Lovable Cloud) | Required for Claude Code ops, CLI deploys, full observability, no vendor lock-in. ~$25/mo. |
| **F2** | **Two repos with one-way sync into `bds-OS`**. Lovable continues to push the frontend to `wbardawil/strategy-spark-86` (its native target — Lovable does not support pushing to a subdirectory of an existing repo). A GitHub Action mirrors `strategy-spark-86` into `wbardawil/bds-OS` at `apps/web/` on every push. CI deploys from `bds-OS`. | Closest to monorepo we can achieve given Lovable's GitHub integration constraints. Backend changes via Claude Code direct; frontend changes via Lovable's prompt loop, auto-mirrored. |
| **F3** | **CI/CD + Sentry + Slack/Discord alerts in v1** | Production observability is non-negotiable; you must be able to know what's happening from a phone. |

---

## High-level diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  END USERS                                                        │
│  ┌─────────────────────┐  ┌─────────────────────┐                │
│  │ Beta CEOs / leaders │  │ You (operator)      │                │
│  │ web + mobile        │  │ phone + laptop      │                │
│  └────────┬────────────┘  └──────┬──────────────┘                │
└───────────┼──────────────────────┼───────────────────────────────┘
            ▼                      ▼
┌──────────────────────────────────────────────────────────────────┐
│  WEB APP (single React app, three modes via routes)               │
│  Vite + React 18 + TypeScript                                     │
│  shadcn/ui + Tailwind • Recharts • TanStack Query                 │
│  Supabase JS client (typed) • React Router                        │
│  Hosted on Vercel; deploys triggered by GitHub Actions on main    │
│                                                                   │
│  Mode 1: Public funnel (/, /assessment, /results, /auth)          │
│  Mode 2: Customer app (/dashboard, /company/:id/*)                │
│  Mode 3: Ops surface (/admin/*) — mobile-first, you-only          │
└────────────────────────────┬─────────────────────────────────────┘
                             │ Supabase JS client (typed)
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  SUPABASE (your project, not Lovable Cloud)                       │
│  ├── Postgres 15 + RLS                                            │
│  ├── Auth (email/pw + Google OAuth)                               │
│  ├── Edge Functions (Deno) — deployed via GitHub Actions          │
│  ├── Realtime (live tile updates via subscriptions)               │
│  ├── Vault (secrets management)                                   │
│  └── Storage (evidence files)                                     │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  EXTERNAL SERVICES                                                 │
│  Anthropic API — chat                                              │
│  Resend — invitation + digest emails                               │
│  Sentry — error tracking (web + edge functions)                    │
│  Slack/Discord webhook — your ops alerts to phone                  │
└──────────────────────────────────────────────────────────────────┘
                             ▲
                             │
┌──────────────────────────────────────────────────────────────────┐
│  GITHUB — Single monorepo (wbardawil/bds-OS)                      │
│                                                                    │
│  apps/web/         — Lovable pushes here (the React app)          │
│  packages/                                                         │
│    engines/        — OPI, evidence-grader, focus-portfolio,       │
│                       lifecycle, delegation-index, operating-debt │
│    types/          — shared TS types (Database.ts, governance,    │
│                       opi, kanban, etc.)                          │
│  supabase/                                                         │
│    migrations/     — schema migrations                            │
│    functions/      — edge function source                         │
│    seed.sql        — reference data seed                          │
│  data/             — JSON source for seeds                        │
│  docs/             — all documentation                            │
│  .github/workflows/ — CI/CD (typecheck, test, deploy)             │
└──────────────────────────────────────────────────────────────────┘
```

---

## Tech stack — deliberate choices

### Frontend (`apps/web/`)
- **Vite + React 18 + TypeScript** — Lovable's default; fast dev, reasonable bundle.
- **shadcn/ui** — component library Lovable uses; Tailwind-based; copy-paste source so we own it.
- **Tailwind CSS** — utility-first, consistent design system.
- **Recharts** — charts for KPI tiles, dashboard widgets, chat-rendered visualisations. Lovable already uses for the radar chart.
- **TanStack Query** — server state caching + optimistic updates against Supabase.
- **Supabase JS client** — fully typed via the generated `Database` type.
- **React Router** — client-side routing.
- **Web Speech API** — voice input on chat + ops surface.
- **Sentry browser SDK** — error tracking.

### Backend (Supabase)
- **Postgres 15** — RLS-enforced multi-tenancy.
- **Edge Functions (Deno)** — server-side compute. Functions deployed via GitHub Actions, source in `supabase/functions/`.
- **Realtime** — subscribe to `metric_values`, `alerts`, `audit_log` for live tile updates without polling.
- **Auth** — Supabase Auth with email/password + optional Google OAuth.
- **Vault** — encrypted secrets (Anthropic API key, Resend API key, etc.).
- **Storage** — uploaded evidence files, with RLS-bound bucket policies.

### Build & Deploy (`.github/workflows/`)
- **`gate.yml`** (already exists) — typecheck + secret scan on every PR.
- **`deploy.yml`** (✅ committed `82b42a1`) — on push to main:
  - `typecheck` job: `npm install && npm run typecheck`
  - `migrate` job: `supabase link` + `supabase db push` (uses `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD` secrets)
  - `deploy-functions` job: iterates `supabase/functions/*/` and runs `supabase functions deploy <name>` for each (skips `shared/`)
  - `deploy-web` job: triggers Vercel deploy hook (`VERCEL_DEPLOY_HOOK` secret); skipped if `apps/web/` doesn't exist yet
  - `notify` job: posts deploy outcome to Slack/Discord webhook (`OPS_WEBHOOK_URL` secret)
- **`mirror-frontend.yml`** (✅ committed `82b42a1`) — every 5 min + manual dispatch:
  - Clones `wbardawil/strategy-spark-86` (using `LOVABLE_REPO_PAT` secret)
  - Compares its current HEAD to `apps/web/.lovable-source-sha` marker file
  - If changed: `cp -a` into `apps/web/`, removes `.git`, writes new marker, commits with `chore(mirror): sync apps/web from strategy-spark-86@<sha>`, pushes to main (which then triggers `deploy.yml`)
  - If unchanged: exits without committing
- **Branch protection on main**: requires PR + green CI for human-authored changes; mirror commits use the bot identity `lovable-mirror@bds-os.invalid` and are allowed to push directly via the action's default token.

### GitHub Actions secrets needed (one-time setup)
| Secret | Purpose | Where it comes from |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | Authenticates `supabase` CLI | supabase.com → Account → Access Tokens |
| `SUPABASE_PROJECT_REF` | Identifies which project to deploy to | Supabase project URL (`https://<ref>.supabase.co`) |
| `SUPABASE_DB_PASSWORD` | DB password for `db push` | Supabase project → Settings → Database |
| `VERCEL_DEPLOY_HOOK` | Triggers a Vercel deploy | Vercel project → Settings → Git → Deploy Hooks |
| `OPS_WEBHOOK_URL` | Posts deploy notifications | Slack/Discord webhook URL |
| `LOVABLE_REPO_PAT` | Reads `strategy-spark-86` for mirror | github.com → Settings → PATs (fine-grained, read-only on `wbardawil/strategy-spark-86`) |
| `ANTHROPIC_API_KEY` | Chat edge function (set on Supabase, not GitHub) | console.anthropic.com → API Keys |
| `RESEND_API_KEY` | Email edge functions (set on Supabase) | resend.com → API Keys |
| `SENTRY_DSN_WEB` + `SENTRY_DSN_EDGE` | Error reporting (set in Vercel + Supabase env) | sentry.io → project settings |

### Observability
- **Sentry** — web app (browser SDK) + edge functions (Deno SDK). Errors group automatically; high-severity issues notify Slack.
- **Supabase logs** — built-in Postgres + Edge Function logs visible in Supabase dashboard.
- **Custom op events** — append to `audit_log`; high-severity events trigger Slack via a database trigger calling a webhook edge function.
- **Status page** — `/admin/status` shows last deploy, recent error count, latest customer feedback count, active alerts count. One mobile-bookmarkable URL.

#### Sentry web SDK setup (in `apps/web/`)

The Lovable app needs Sentry initialised once at boot. Spec for Lovable to implement (paste this into Lovable's chat):

```typescript
// In src/main.tsx (or equivalent boot file)
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

Add `VITE_SENTRY_DSN` to Lovable's env vars (and to Vercel project env vars).

#### Sentry edge function SDK setup

Each edge function imports a small wrapper. Add to `supabase/functions/shared/sentry.ts`:

```typescript
import * as Sentry from 'https://deno.land/x/sentry@7.x.x/index.mjs';

const dsn = Deno.env.get('SENTRY_DSN_EDGE');
if (dsn) {
  Sentry.init({
    dsn,
    environment: Deno.env.get('SUPABASE_PROJECT_REF') ?? 'unknown',
    tracesSampleRate: 0.1,
  });
}

export function captureError(err: unknown, context?: Record<string, unknown>) {
  if (dsn) {
    Sentry.captureException(err, { extra: context });
  } else {
    console.error('captureError (no Sentry):', err, context);
  }
}
```

Each edge function wraps its main handler with try/catch + `captureError`. Set `SENTRY_DSN_EDGE` via `supabase secrets set` from CI or via the Supabase dashboard → Edge Functions → Secrets.

#### Slack/Discord webhook (DB trigger)

Implemented in migration `20260506000006_ops_notifications.sql` (✅ committed). Triggers fire on:
- Critical alerts (`alerts.severity = 'critical'`)
- New feedback submissions (`feedback` insert)
- Score-change requests entering `pending` state

Webhook URL is stored as a Supabase Vault secret named `ops_webhook_url`. Setup is one SQL statement in Supabase SQL editor:

```sql
SELECT vault.create_secret(
  'https://hooks.slack.com/services/T.../B.../xxx',  -- your webhook URL
  'ops_webhook_url'
);
```

Failures in the webhook call do not block the underlying transaction (the trigger function catches and logs).

### External services
- **Anthropic API** — `claude-sonnet-4-6` (or current Claude model) for chat-with-data. Called from `chat-with-data` edge function. API key in Supabase Vault.
- **Resend** — invitation emails, weekly digest. Free tier (3000/month) sufficient for beta.
- **Sentry** — free Developer tier.
- **Slack or Discord webhook** — your ops alerts to your phone.

---

## UI architecture — three modes, one app

The same React app serves three audiences via routes. Mobile-responsive throughout (no separate mobile app).

### Mode 1 — Public funnel (existing in Lovable)
Routes:
- `/` — landing
- `/assessment` — public quick assessment (existing Lovable wizard, kept as-is)
- `/results` — shareable result page with lead capture → writes to `leads` table
- `/auth` — sign-in / sign-up

Stays as-is. Lead funnel.

### Mode 2 — Authenticated customer app (the product)

```
/dashboard                       List of companies the user belongs to
/company/:id                     Control Tower (the heart of the product)
  /assessment                    Score the practices
  /assessment/results            Pillar breakdown + radar
  /portfolio                     Focus portfolio (top priorities)
  /initiatives                   Initiative kanban (3-status v1)
  /evidence                      Upload + AI grading
  /governance                    Three views + decision log
  /settings                      Customisation (pillars, practices, KPIs,
                                  members, integrations)
/portfolio                       Fund-CEO cross-company view
                                   (visible only to users who own/admin
                                   multiple companies)
/feedback                        Always-accessible feedback widget
```

#### Control Tower home (`/company/:id`)

The single most important screen. Layout (mobile-responsive — components stack vertically on phone):

```
┌────────────────────────────────────────────────────────────────┐
│  [Logo]  Hospital Y ▾   [Search]   [Bell 3]   [Avatar]         │
├────────────────────────────────────────────────────────────────┤
│  ┌───────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ KPI tile  │ │ KPI tile │ │ KPI tile │ │ Top 3 Priorities │ │
│  │ value+spk │ │ value+spk│ │ value+spk│ │ ▪ ...            │ │
│  └───────────┘ └──────────┘ └──────────┘ └──────────────────┘ │
│                                                                 │
│  ┌───────────────────────┐ ┌─────────────────────────────────┐ │
│  │ Pillar Radar          │ │ Pillar Status (8 pillars)        │ │
│  │ [importance vs        │ │ Direction      ●●●●○            │ │
│  │  competency radar]    │ │ Customer       ●●●○○            │ │
│  └───────────────────────┘ │ ...                              │ │
│                            └─────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────┐ ┌─────────────────────────────────┐ │
│  │ Chat (Julius-lite)    │ │ Recent Activity                  │ │
│  │  > How is...          │ │ ▪ KPI updated 2h ago             │ │
│  │  [chart inline]       │ │ ▪ Initiative advanced...         │ │
│  │  Synthesised text...  │ │                                  │ │
│  │  [Save to dashboard]  │ │                                  │ │
│  └───────────────────────┘ └─────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

Key UI principles:
- **Hero row (top)**: 4 saved widgets the user has pinned. Defaults seeded from template; user re-arranges and pins more from chat. Powered by `widgets` table.
- **Mid row**: Pillar radar + 8-pillar status strip. The assessment-grade signal at a glance.
- **Bottom row**: Always-on chat (collapsible) + activity stream.
- **Chat citations**: every numeric claim is source-cited (clickable link to underlying data row). No hallucinated numbers reach the user. *(Stress-test attack #2 fixed.)*
- **Mobile**: stacks vertically; hero row scrolls horizontally; chat docks to bottom sheet.

### Mode 3 — Ops surface (`/admin/*`, you-only)

Role-gated by `auth.users` flag `is_platform_admin = true`. Mobile-first design.

```
/admin                Operator home (alert badge, recent feedback count, deploy status)
/admin/alerts         Active alerts with ack buttons
/admin/feedback       Beta customer feedback inbox
/admin/deploys        Deploy history + manual trigger button
/admin/customers      Beta customer list + status snapshot
/admin/chat           Operator-mode chat — about the platform itself
/admin/status         Status page (read-only health check, mobile-bookmarkable)
```

UI principles for `/admin/*`:
- 48px+ tap targets
- Single column on mobile
- Voice input on every text input
- "Ack" / "Approve" / "Reject" / "Defer" as primary actions on cards
- Push notifications via Slack/Discord (same channels for alerts)

---

## Data model overview

The full schema lives in `supabase/migrations/`. Tables grouped by purpose:

### Identity & multi-tenant
- `auth.users` (Supabase Auth) — added: `is_platform_admin boolean default false`
- `profiles` — display info (kept from Lovable)
- `companies` — kept from Lovable, renamed concept maps to `organizations` semantically
- `company_members` — kept from Lovable; role enum (`owner | admin | member`)

### Framework foundation (new)
- `universal_pillars` — 8 rows, system-managed, immutable
- `customer_pillars` — per-company, FK to a universal pillar (M:1 or "Other"); customer-customisable label / order / visibility
- `templates` — system templates (hospital, university, professional-services-fund, etc.)

### Assessment
- `evaluation_rounds` — kept from Lovable; add `mode` enum (`quick | full`)
- `round_responses` — kept from Lovable's jsonb shape; engines read via adapter
- `practices` — per question_set, with FK to customer_pillars; practice-level rubrics here

### Maturity rubrics (new — Stress-test fix #1)
- `maturity_rubrics` — 5 levels per practice, descriptor + evidence criteria. Seeded for top 10–15 practices per template; default generic 5-level rubric for the rest.

### Computed outputs
- `opi_scores` — output of compute-opi engine
- `focus_portfolios` — quarterly WIP-capped selection

### Execution
- `initiatives` — 3-status kanban for v1 (planned / in_progress / done)
- `evidence` — uploads with AI grade
- `score_change_requests` — minimum viable in v1 (no full approval queue)

### Monitoring
- `metric_sets` + `metrics` — KPI definitions per company, FK to customer_pillars
- `metric_values` — time-series of actual values, append-only
- `widgets` — saved widget instances on a dashboard
- `dashboards` — per company, including default control tower
- `alerts` — fired alerts with severity, status, linked metric / practice
- `chat_messages` — conversation history per user per company

### Governance & accountability
- `decisions` — every governance decision logged: who proposed, who voted, dissent, data link *(Stress-test fix #5)*
- `audit_log` — append-only event stream

### Operations
- `feedback` — beta feedback widget submissions
- `pmf_responses` — Sean Ellis PMF survey responses

### External integration
- `webhook_payloads` — generic webhook ingestion (Zapier-bridged) — v1.1, scaffolded in v1
- `connector_configs` — native connector configs per company — v2

---

## How code is organised in the monorepo

```
bds-OS/
├── apps/
│   └── web/                          Lovable's React app
│       ├── src/
│       │   ├── routes/                 React Router routes
│       │   ├── components/             shadcn-derived components
│       │   ├── lib/
│       │   │   └── supabase.ts         typed Supabase client
│       │   ├── integrations/
│       │   │   └── supabase/
│       │   │       ├── client.ts       (Lovable's existing setup)
│       │   │       └── types.ts        (Lovable's auto-generated, kept)
│       │   └── ...
│       ├── public/
│       └── package.json
│
├── packages/
│   ├── engines/                      Pure logic, no IO
│   │   ├── opi.ts
│   │   ├── evidence-grader.ts
│   │   ├── focus-portfolio.ts
│   │   ├── lifecycle.ts
│   │   ├── delegation-index.ts
│   │   ├── operating-debt.ts
│   │   └── package.json
│   │
│   └── types/                        Shared TS types
│       ├── database.ts                  Supabase Database type
│       ├── governance.ts
│       ├── kanban.ts
│       ├── opi.ts
│       └── package.json
│
├── supabase/
│   ├── migrations/                   SQL migrations (numbered)
│   ├── functions/                    Edge function source
│   │   ├── compute-opi/
│   │   ├── grade-evidence/
│   │   ├── select-focus-portfolio/
│   │   ├── determine-lifecycle/
│   │   ├── governance-report/
│   │   ├── invite-user/
│   │   ├── accept-invitation/
│   │   ├── create-organization/
│   │   ├── chat-with-data/             NEW for v1
│   │   ├── webhook-ingest/             NEW for v1.1
│   │   └── shared/
│   ├── seed.sql                      Reference data seed
│   └── config.toml                   Supabase project config
│
├── data/                             JSON source for seeds
│   ├── practices.json (will deprecate)
│   ├── areas.json (will deprecate)
│   ├── maturity-levels.json (will deprecate)
│   └── practice-metadata.json (will deprecate)
│
├── docs/                             All documentation
│   ├── architecture.md (this file — canonical)
│   ├── framework.md
│   ├── coherence-mece.md
│   ├── industry-templates.md
│   ├── pilot-plan.md
│   ├── data-analytics-vision.md
│   ├── about.md
│   ├── how-it-works.md
│   ├── lovable-state.md
│   ├── integration-plan.md
│   └── external-patterns-review.md
│
├── .github/
│   └── workflows/
│       ├── gate.yml                  PR checks (already exists)
│       └── deploy.yml                Deploy on main (NEW)
│
├── CLAUDE.md
├── package.json (workspace root)
├── tsconfig.json
└── deno.json (for edge functions)
```

The engines move from `src/engines/` to `packages/engines/` as part of the monorepo restructure (clean import paths via TS workspace references). `src/` is deprecated.

---

## Migration path from current state to this architecture

Current state:
- Lovable Cloud running with Lovable's existing schema
- `wbardawil/bds-OS` separate from `wbardawil/strategy-spark-86`
- No CI/CD (only `gate.yml` for typecheck on PR)
- No Sentry, no Slack alerts

Target state:
- Own Supabase project running our combined schema
- `wbardawil/bds-OS` is the deployment source; `apps/web/` is auto-mirrored from `strategy-spark-86` via a GitHub Action triggered on push to `strategy-spark-86`'s main
- GitHub Actions CI/CD pipeline deploying to Supabase + Vercel from `bds-OS`
- Sentry + Slack alerts wired

### Pre-pilot architecture work (~3 days, parallel-friendly)

**Day -3** — Supabase + monorepo (in parallel):
- You: create new Supabase project at supabase.com (~5 min). Get project URL + anon key + service role key.
- You: in Lovable, configure GitHub integration to push the app to `wbardawil/bds-OS` under `apps/web/` (rather than to its own repo).
- Me: write SQL migration applying our framework tables on top of Lovable's existing schema (`universal_pillars`, `customer_pillars`, `templates`, `metrics`, `metric_values`, etc.). Generate from `docs/framework.md` and `docs/industry-templates.md`.
- You: apply the migration via the Supabase CLI from your codespace (or paste into Supabase SQL editor).

**Day -2** — Lovable points to new Supabase, GitHub Actions, repo-mirror:
- You: in Lovable, update env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) to point at the new project.
- You: in Lovable, disconnect from Lovable Cloud (or accept the Lovable Cloud project will go unused).
- Me: write `deploy.yml` GitHub Action — typecheck, test, supabase db push, supabase functions deploy, vercel deploy. Triggered on push to `bds-OS` main.
- Me: write `mirror-frontend.yml` GitHub Action — on push to `strategy-spark-86` main (or scheduled every 5 min), sync the tree into `bds-OS/apps/web/` via `git subtree split + push` or equivalent. Commits land on a `chore/sync-lovable` branch and auto-merge to main if CI passes.
- You: configure GitHub Actions secrets (Supabase service role key, Vercel deploy hook, Anthropic API key, `strategy-spark-86` read access PAT for the mirror action).
- You: connect `bds-OS` to Vercel (one-time, via Vercel dashboard) — Vercel deploys from `apps/web/`.

**Day -1** — Sentry + alerts:
- Me: spec the Sentry integration (web SDK + edge function SDK).
- You: create Sentry project (free tier), get DSNs.
- Me: spec the Slack/Discord webhook for ops alerts; integrate with `audit_log` triggers for high-severity events.
- You: create the Slack/Discord channel + webhook URL.
- Smoke test the whole pipeline by pushing a trivial change and watching it deploy.

### After pre-pilot work, the regular pilot proceeds (13–15 days, see `docs/pilot-plan.md` updated for the new architecture)

**Total: ~17–18 days from today to a beta-ready launch.**

---

## Cost model

| Service | Tier | Monthly | Notes |
|---|---|---|---|
| Supabase | Pro | $25 | DB + auth + storage + edge fns + realtime |
| Vercel | Hobby (or Pro $20) | $0–20 | Web hosting + preview deploys |
| Sentry | Developer | $0 | Errors + alerting |
| Anthropic API | usage-based | ~$50–100/mo for beta | Chat usage |
| Resend | Free 3K/mo | $0 | Invites + digests |
| GitHub | Free | $0 | Repo + Actions |
| Slack/Discord | Free | $0 | Ops alerts |
| Domain (optional) | annual | ~$15/yr | Custom domain |
| **Total** | | **~$100–150/mo** | for v1 with 3 betas |

Will rise with chat usage volume and customer count.

---

## How Claude Code can manage this architecture (post-launch)

Once live, your daily ops loop:

1. **Customer reports a bug** (via in-app feedback widget → row in `feedback` table → Slack notification → your phone).
2. You open Claude Code on phone or laptop. Tell Claude: *"There's a bug in the assessment screen, fix it."*
3. Claude reads the relevant code, writes a fix, commits to a branch, opens a PR.
4. You review on GitHub mobile app. Approve.
5. Merge → GitHub Actions runs the full pipeline → deploys → Slack notification ✅.
6. You verify on the live site.

For investigative tasks: *"Hey Claude, summarise this week's beta feedback"* → Claude reads the `feedback` table via Supabase MCP (or via SQL through edge function), writes a summary to `docs/feedback-2026-W18.md`, commits.

For DB changes: *"Hey Claude, add a column for X"* → Claude writes a migration, opens a PR, the PR runs the migration in CI safely, you approve, deploys.

This is **only possible because of F1 (own Supabase) + F2 (monorepo) + F3 (CI/CD)**. Without all three, the loop has manual paste steps.

---

## What this architecture supersedes

- `docs/how-it-works.md` references to Lovable Cloud — **obsolete**. Update to point here.
- Anything in `docs/lovable-state.md` about "Lovable Cloud (managed)" — **obsolete**. Lovable's app code stays; the Supabase backend moves to your own project.
- The "two repos" framing in `docs/integration-plan.md` — **obsolete**. Single monorepo.
- The 13-day pilot in `docs/pilot-plan.md` — **extended to 17–18 days** to include the 3-day pre-pilot architecture work.

---

## Risk register (consolidated)

Known risks, likelihood, impact, mitigation, owner. Reviewed weekly during beta.

| # | Risk | L | I | Mitigation | Owner |
|---|---|---|---|---|---|
| **R1** | Lovable Cloud → own Supabase migration loses data or breaks Lovable's UI | M | H | Migrate during low-activity window; verify Lovable functions against new project; keep Lovable Cloud accessible as rollback for 7 days | You |
| **R2** | Mirror cadence (5 min) makes Lovable changes feel slow to deploy | L | L | Acceptable for pilot; switch to webhook-triggered later | Me |
| **R3** | Chat hallucination passes the numeric validator | L | H | Validator strips numbers not in snapshot; system prompt explicit; manual QA 50 questions before beta launch; add `[unverified]` indicator on suspicious outputs | Me |
| **R4** | RLS bug leaks cross-tenant data | L | Critical | All RLS policies tested before beta; pen-test with 2 test orgs; audit log enabled; manual SQL injection test on every endpoint | Me |
| **R5** | Vega-Lite chart spec malformed; render breaks | M | L | Try/catch in frontend; fallback to text-only response; log to Sentry | Me |
| **R6** | Anthropic API cost spike (recursive chat or abuse) | M | M | Per-user daily token quota; Sentry alert at $50/day spend; chat conversation length cap | Me |
| **R7** | Beta customer doesn't engage (assessment incomplete by Day 17) | M | H | Day-13 check-in; offer to do assessment together via screenshare; reduce friction by pre-populating template | You |
| **R8** | Maturity rubrics feel generic / wrong for industry | M | H | Author with industry-specific framework refs (Joint Commission, accreditation rubrics); review with each beta during Day 14 customisation | Me |
| **R9** | Solo operator burnout / single point of failure | M | M | Documentation discipline (CLAUDE.md as institutional memory); Claude Code can manage routine ops post-launch | You |
| **R10** | Lovable changes pricing / shutters platform | L | H | Own GitHub repo retains all source; can rebuild on standard React stack if forced | You |
| **R11** | Migration script fails mid-deploy | L | M | Migrations idempotent; `IF NOT EXISTS` everywhere; test in staging Supabase project first; CI pipeline aborts on first failure | Me |
| **R12** | Customer reports a critical bug Friday evening | M | M | Sentry → Slack push notifications; rollback runbook; "ack the alert from phone" workflow tested before beta | You |
| **R13** | Chat returns inappropriate content (despite Claude's safety) | L | M | System prompt scope-bounded to operating data; refuse off-topic; flag any unsafe response to ops channel | Me |

L (Likelihood) / I (Impact): L=Low, M=Medium, H=High.

---

## Security posture

### Multi-tenancy
- RLS on every customer-owned table via `is_member_of(_company_id)` and `is_admin_of(_company_id)` helper functions
- Reference data (`universal_pillars`, `templates`) is read-only for authenticated users; not modifiable via PostgREST
- Service-role operations (edge functions writing to `chat_messages`, audit log) are intentional and bypass RLS

### Data ownership
- All customer data lives in their tenant rows in our Supabase
- Customer-initiated **export**: a "download my data" edge function (v1.1) generates a JSON dump of all rows owned by their company. v1: Supabase support ticket can do this.
- Customer-initiated **deletion**: `DELETE FROM companies WHERE id = ?` cascades through all foreign keys (RLS cascades configured). 30-day soft-delete window before permanent purge — v1.1.

### Sensitive-domain pilots — explicit position
- **Hospital pilot (HIPAA implications)**: the platform stores **assessment scores, KPI values, and free-text notes** at the company level. **PHI (patient health information) is NOT supposed to enter the system.** Customer-facing constraint:
  - Terms of Service and onboarding explicitly forbid entering PHI in evidence descriptions or chat queries
  - UI placeholders prompt for **aggregate / process / outcome metrics** — not patient identifiers
  - Audit log captures any free-text content; we monitor for accidental PHI in beta and fix patterns
  - **We do NOT pursue HIPAA BAA with Supabase or full HIPAA-compliant infrastructure for v1**. If a hospital customer requires HIPAA scope, we revisit (Supabase has a HIPAA-eligible Pro tier; cost ~$599/mo).
- **University pilot (FERPA implications)**: same structure. Student PII not supposed to enter the system. Same UI guardrails + ToS.
- **All pilots**: encrypted at rest (Postgres default), encrypted in transit (HTTPS only), secrets in Supabase Vault.

### Compliance posture
- **SOC 2**: not pursued for v1. Revisit when first paying customer asks (likely v1.5 or later).
- **GDPR**: data export + deletion in v1.1; basic ToS lays foundation.
- **Audit log**: ✅ in v1 from day 1.

### What we explicitly DON'T do (security posture)
- We don't run pen-testing in v1 beyond manual RLS verification
- We don't pursue ISO 27001 / SOC 2 / HIPAA infrastructure pre-paying-customers
- We don't build customer-managed encryption keys (Supabase default encryption is sufficient for v1)
- These are explicit "not yet" — to be revisited when a paying customer demands it

---

## Open architectural decisions still pending

These are smaller calls we'll make as we execute, recorded here for future-session continuity:

1. **Vercel vs Netlify vs Cloudflare Pages** — Vercel default unless cost or feature reason otherwise. Free tier sufficient for v1.
2. **Slack vs Discord** — your call. Slack is more business-y; Discord is faster to set up. Either works for ops alerts.
3. **Custom domain** — when to attach (e.g. `bds-os.com`, `app.bds-os.com`). Probably Day -1 of pre-pilot or post-launch.
4. **Postgres extensions to enable** — `pgcrypto`, `uuid-ossp` (default on Supabase), `pg_cron` (for scheduled digests), `pg_net` (for HTTP from triggers, used for Slack webhooks).
5. **Backup strategy** — Supabase Pro includes daily backups + point-in-time recovery. Sufficient for v1; revisit at scale.
6. **Multi-region / latency** — Supabase region choice (US East default). Revisit if customers complain about latency from non-US locations.
7. **Edge function cold start** — first hit can be slow. For chat especially, consider warm-up technique or moving to a longer-running compute (later optimization).

These get resolved as we encounter them. Track in this doc.
