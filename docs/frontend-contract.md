# Frontend Contract — Paste-Ready for Lovable

**Status: canonical**. This is the single artefact to give Lovable so it consumes the new framework cleanly. Paste the relevant sections into Lovable's chat as instructions when building each surface.

This contract assumes:
- Architecture is locked per `docs/architecture.md` (own Supabase project, two-repo with mirror, CI/CD, Sentry).
- Framework migrations are applied (`supabase/migrations/20260506000001-7`).
- Lovable's existing surfaces (public funnel, auth, dashboard) stay; new surfaces layer on top.

For a richer narrative read `docs/coherence-mece.md`, `docs/csio-fit-mece.md`, `docs/pilot-plan.md`. This doc is the actionable contract.

---

## 1. Setup — what Lovable uses to talk to the backend

```typescript
// src/integrations/supabase/client.ts (likely already exists in Lovable)
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../src/types/Database';
//   ^ Copy src/types/Database.ts from bds-OS into Lovable's tree.
//   It's the canonical schema type and supports createClient<Database>().

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
```

Env vars Lovable needs (set on Lovable + Vercel):
- `VITE_SUPABASE_URL` — your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key
- `VITE_SENTRY_DSN` — Sentry browser DSN (for error reporting)
- `VITE_FRONTEND_URL` — used for share links (e.g. invite, delegated assignments)

---

## 2. Auth contract

Lovable's existing `/auth` flow stays. Sign-up creates `profiles` automatically via the `handle_new_user` trigger. After sign-up the user has an `auth.users` row but may not yet belong to any company.

Three onboarding paths from there:
1. **Returning member** — they see a `companies` list at `/dashboard` (their `company_members` rows), pick one, route to `/company/:id`.
2. **First-time admin (no companies)** — they hit a "Create your first company" screen → calls `create-organization` edge function.
3. **Invited member** — they have an invitation token in the URL → calls `accept-invitation` edge function.

---

## 3. The 8 universal pillars (locked structure)

Every customer's data is bucketed into 8 pillars. Customers can rename labels but cannot remove pillars (v1). Lovable should display **customer pillar labels** but use `universal_pillar_id` for sorting, grouping, and cross-tenant logic.

```
1. Direction       — Strategy, vision, mission, planning, decision rights
2. Customer        — Who we serve and how well
3. Delivery        — Operations, processes, throughput, quality, supply
4. Economics       — Financial discipline, capital, P&L, sustainability
5. People          — Talent, culture, engagement, leadership, succession
6. Technology      — Systems, data, security, interoperability
7. Governance      — Board, compliance, risk, accountability, ethics
8. Innovation      — Learning, R&D, new offerings, adaptation
```

When rendering a "pillars view," fetch the user's company's `customer_pillars` ordered by `sort_order`, then resolve `universal_pillar_id` for behaviour/colour.

---

## 4. Screens to build (post-existing)

In addition to Lovable's existing public funnel + auth + dashboard + company view + members view + round-by-code:

### A. Onboarding wizard (when a new company is created)
Path: `/onboarding`
- Step 1 — Welcome
- Step 2 — Lifecycle (revenue range, employee count) → `companies.lifecycle_stage` set via `determine-lifecycle` edge function
- Step 3 — Industry template picker (smb-default / hospital / university / fund). Selection clones template into a new `question_set` + `metric_set` for the company, plus customer_pillars (defaulting 1:1 with universal_pillars, label = universal_pillar.name).
- Step 4 — Customise pillars (rename labels; v1.1: merge / split / hide / add)
- Step 5 — Customise practices (drop / edit / add per pillar)
- Step 6 — Invite team members → `invite-user` edge function
- Step 7 — Done, route to `/company/:id`

### B. Control Tower (`/company/:id` enhancement)
The default landing for an authenticated user inside a company. Mobile-responsive; stacks vertically on phone.

Composition (top to bottom):
- Header: company switcher + alert badge + avatar
- Hero row: 4 widgets pinned to default dashboard. Default tiles by role lens (see §6 below). Powered by `widgets` table joined to `metrics` for KPI tiles.
- Mid row: 8-pillar radar (importance vs competency from latest `round_responses`) + 8-pillar status strip
- Bottom row: chat panel (`chat-with-data` edge function) + recent activity stream (last 20 rows of `audit_log` for this company)

### C. Assessment screen (`/company/:id/assessment`)
- Tabs across the 8 customer pillars
- Per practice: dual sliders (importance 1-5, competency 1-5)
- Auto-saves on every change to `round_responses.category_scores` (jsonb), `completed_at` stays null until user clicks "Submit" → set `completed_at = now()`
- Maturity rubric tooltip: when user hovers a practice, show the 5-level rubric from `maturity_rubrics` (descriptor + evidence_criteria per level). This is the "standard to live by."
- Progress indicator (X of N scored)

### D. Pillar drill-down (`/company/:id/pillars/:pillarId`)
- Practice list with importance/competency scores (latest round) + gap
- KPI tiles for metrics in this pillar
- Initiatives in this pillar (kanban subset)
- Recent activity for this pillar

### E. Focus portfolio (`/company/:id/portfolio`)
- Top N practices by `opi_scores.priority_rank` for the current quarter
- Each card: practice name, OPI score, phase (1/2/3), recommended action, "Make initiative" button
- Powered by `select-focus-portfolio` edge function output

### F. Initiatives kanban (`/company/:id/initiatives`)
- 3-column kanban (v1): Planned / In Progress / Done. (v2 expands to 7-status with evidence loop.)
- Cards: title, owner, due date, linked practice, evidence count
- Drag-drop between columns updates `initiatives.status`

### G. Evidence + AI grade (`/company/:id/initiatives/:id/evidence`)
- Upload area for evidence (file or URL) → writes `evidence` row
- "Grade" button → calls `grade-evidence` edge function → renders the AI grade card with `rubric_mapping`, `completeness_score`, `quality_score`, `risk_flags`, `level_proposal`, `recommendation`

### H. Governance (combined view in v1, three views in v1.1)
`/company/:id/governance`
Tabbed (or single page in v1):
- **Executive lens**: top alerts + active initiatives + KPI summary
- **Board lens**: pillar maturity radar + decisions log + risk register
- **Functional lens**: per-pillar drill-down filtered by user's role_lens

### I. Settings (`/company/:id/settings`)
- Pillar customisation (rename labels in v1)
- Practice customisation (edit / drop / add per pillar)
- KPI customisation (edit / drop / add; set thresholds; choose source: manual / webhook / connector)
- Members + role_lens management
- Integrations (v1.1: webhook URL + connector configs)

### J. Portfolio rollup (fund-CEO-only, `/portfolio`)
Visible only when the user owns/admins multiple companies.
- List of all companies they belong to with summary tiles (overall score, top 3 alerts, pending approvals)
- Drill-in link per company

### K. Delegation (`/company/:id/round/:roundId/delegate`)
Admin-only screen.
- Pick: a single practice OR a whole pillar block
- Enter: assignee email(s), optional name, optional message, optional due date
- Submit → `delegate-questions` edge function → emails sent + share URLs returned
- Below: list of delegations on this round (status: pending/reminded/overdue/complete) from `assignment_progress` view

### L. Delegated response (`/delegated/:token`)
Anonymous (token-authenticated) screen.
- Token in URL → fetch via `submit-delegated-response` edge function (which validates token + scope)
- Render only the practices in scope (single practice OR all practices in the assigned pillar)
- Same dual-slider UI as the main assessment
- Submit → `submit-delegated-response` edge function

### M. Feedback widget (everywhere, persistent)
- Fixed bottom-right "Send feedback" button on every authenticated screen
- Modal: free-text + auto-tagged with `screen` (current route)
- Submit → INSERT into `feedback` table

### N. Ops surface (`/admin/*`, platform admin only)
For the platform operator (you) only. Role-gated by `platform_admins` table.
- `/admin` — operator home: alerts, recent feedback count, last deploy, customer count
- `/admin/feedback` — beta feedback inbox
- `/admin/customers` — list of all companies
- `/admin/chat` — operator chat (different system prompt than customer chat)

---

## 5. Edge functions Lovable calls

| Function | Method | When |
|---|---|---|
| `create-organization` | POST | First-time admin creates their org |
| `determine-lifecycle` | POST | Onboarding step 2; or whenever revenue/headcount changes |
| `compute-opi` | POST | After all 82-83 practices scored in a round |
| `select-focus-portfolio` | POST | Quarterly, after compute-opi |
| `grade-evidence` | POST | When a user clicks "Grade" on evidence |
| `governance-report` | POST | When opening a governance view |
| `chat-with-data` | POST | Chat input in Control Tower |
| `invite-user` | POST | Admin invites a teammate |
| `accept-invitation` | POST | Invited user clicks invite link, signs up, lands on accept page |
| `delegate-questions` | POST | Admin delegates practices/pillars to third parties |
| `submit-delegated-response` | POST | Anonymous assignee submits via share token |

All called via `supabase.functions.invoke('<name>', { body: {...} })`. JWT is auto-attached except for `submit-delegated-response` (which uses the share_token instead).

---

## 6. Role-aware default Control Tower

Each `company_members.role_lens` value drives the default tile selection on the Control Tower hero row:

| `role_lens` | Default hero tiles |
|---|---|
| `ceo` | Pillar status strip + top 3 alerts + portfolio rollup (if applicable) + decisions this week |
| `coo` | Initiative kanban summary + Delivery KPIs + cross-pillar blockers |
| `cfo` | Cash + runway + margin + days AR + open audit findings |
| `cro` | Pipeline + conversion + revenue forecast + customer NPS |
| `chro` | Engagement + attrition + hiring pipeline + open positions |
| `cio` | Uptime + open security incidents + IT spend vs budget + key system status |
| `cmo` | Lead volume + brand health + active campaigns + CAC |
| `legal` | Open compliance findings + risk register + open litigation + audit log |
| `manager` | Their pillar drill-down + owned initiatives + pending evidence |
| `viewer` | The CEO default (read-only) |

Implementation: when fetching widgets for a Control Tower load, prefer widgets where `dashboards.role_default = <user's role_lens>`. Fallback to `dashboards.is_default = true`.

---

## 7. Realtime subscriptions

For live tile updates (no polling). Subscribe to:
- `metric_values` insert → re-render any tile bound to `metric_id`
- `alerts` insert/update → update alert badge + recent activity
- `audit_log` insert (filtered by company_id) → recent activity stream
- `practice_assignments` update (filtered by company_id) → assignment_progress refresh

```typescript
const ch = supabase.channel('control-tower')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'metric_values', filter: `company_id=eq.${companyId}` }, refresh)
  .subscribe();
```

---

## 8. Source-citing chat — UI requirements

`chat-with-data` returns:
```typescript
{
  conversation_id: string;
  text: string;                     // may contain [src:<id>] inline citations
  vega_spec: object | null;         // optional Vega-Lite chart
  citations: Array<{ kind: string; id: string; description: string }>;
  stripped_unsupported_numbers: number;  // count of hallucinated numbers removed
}
```

UI rules:
- Render `text` with `[src:abc-123]` rewritten as a clickable citation chip
- If `vega_spec` is set, render with `vega-embed` or `react-vega` below the text
- If `stripped_unsupported_numbers > 0`, show a small confidence indicator: "AI flagged some claims it couldn't verify"
- "Save chart to dashboard" button (v1.1) → INSERT a row in `widgets` with `type: 'vega_spec'` and `vega_spec` jsonb

---

## 9. What Lovable should NEVER do

- Write directly to `opi_scores`, `focus_portfolios`, `audit_log`, `chat_messages` from the frontend. Always go through edge functions.
- Bypass `create-organization` by inserting `companies` + `company_members` directly. (The edge function handles partial-failure rollback.)
- Hard-code `company_id` from the URL or local storage. Always read from the current `company_members` row.
- Cache JWTs anywhere except the Supabase JS client's built-in storage.
- Show numbers from chat responses without their `[src:<id>]` citations resolved.

---

## 10. When this contract changes

Updates happen when:
- A migration adds/changes a table or column
- An edge function gains/loses a parameter
- A surface's spec evolves

Workflow:
1. Change lands in `bds-OS`.
2. `src/types/Database.ts` is updated.
3. This file is updated.
4. The diff is pasted into Lovable's chat: *"Update the frontend to match this contract change: [diff]"*
5. Lovable rebuilds the affected screens.

That's the entire sync loop.
