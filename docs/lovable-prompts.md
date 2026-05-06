# Lovable Iteration Prompts (paste-ready)

**Status: canonical**. The actionable manifest for building the v1 frontend in Lovable. Each section below is a self-contained prompt to paste into Lovable's chat in sequence. Prompts assume the framework migrations are applied (per `docs/architecture.md` migration step) and `src/types/Database.ts` is in place.

Companion: `docs/frontend-contract.md` — the descriptive contract Lovable consumes for context. `docs/pilot-plan.md` — the day-by-day schedule.

## How to use this doc

1. Open Lovable's chat for `wbardawil/strategy-spark-86`.
2. Find the prompt matching today's pilot day in the table below.
3. Copy the **`PASTE THIS`** code block.
4. Paste into Lovable's chat as a single message.
5. Wait for Lovable to generate the change. Review.
6. Verify against the **Verify** checklist on this doc.
7. If satisfied, move to the next prompt. If not, iterate by replying with the gap.

## Prompt index by pilot day

| Day | Prompt | Surface built |
|---|---|---|
| 2 | **P1** Foundation: types + auth glue | Database type imported; supabase client typed |
| 2 | **P2** Onboarding wizard | `/onboarding` with template picker |
| 3 | **P3** Pillar + practice customisation | Settings → pillars + practices editor |
| 4 | **P4** KPI manual entry + threshold tiles | KPI entry form, threshold colour-coding |
| 5 | **P5** Pillar drill-down + 8-pillar radar | `/company/:id/pillars/:pillarId` |
| 6 | **P6** Control Tower home (hero + activity + chat) | `/company/:id` enhanced |
| 7 | **P7** Portfolio rollup (fund-CEO) | `/portfolio` for users with multi-company |
| 8 | **P8** Chat panel integration | Chat panel calls `chat-with-data` |
| 9 | **P9** Focus portfolio + initiative kanban | `/company/:id/portfolio` + `/initiatives` |
| 10 | **P10** Evidence + AI grade + governance view | `/company/:id/governance` + evidence |
| 11 | **P11** Delegation UI (admin sends) | `/company/:id/round/:roundId/delegate` |
| 11 | **P12** Delegated response UI (anonymous) | `/delegated/:token` |
| 12 | **P13** Feedback widget + PMF survey | Persistent feedback + Day-30 PMF form |
| 14 | **P14** Ops surface (`/admin/*`) | Platform-admin-only operator UI |

---

## P1 — Foundation: types + auth glue

**When**: Day 2 of pilot, after applying migrations to Supabase.
**What it builds**: Typed Supabase client + groundwork for the rest.

### PASTE THIS

```
I want to integrate a new typed Supabase Database schema and prepare for upcoming feature builds.

Tasks:

1. I will paste in a TypeScript file (the contents of src/types/Database.ts from my bds-OS repo). Place it at src/integrations/supabase/types.ts (replacing the auto-generated file). It contains the Database interface that supports createClient<Database>().

2. Update src/integrations/supabase/client.ts to import { Database } from './types' and pass it as the type parameter:
   const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)

3. Add to the .env file (and document in the README) these new env vars I will need:
   - VITE_FRONTEND_URL (used for share links e.g., /accept-invite, /delegated/:token)
   - VITE_SENTRY_DSN (browser error reporting; can be empty initially)

4. Add @sentry/react and initialise it in src/main.tsx (only if VITE_SENTRY_DSN is set):
   Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, environment: import.meta.env.MODE, tracesSampleRate: 0.1 });

5. Verify the existing flows still work after the typed client is in place: public assessment, lead gate, dashboard, /round/:code submission. No regressions.

Don't make any other changes in this prompt. The next prompts will build new screens on top of this foundation.
```

### Verify
- [ ] `src/integrations/supabase/types.ts` is the file I provided (via paste of Database.ts contents)
- [ ] `client.ts` uses `createClient<Database>(...)`
- [ ] No type errors in `npm run typecheck`
- [ ] Existing flows still work

---

## P2 — Onboarding wizard

**When**: Day 2-3 of pilot, after P1.
**What it builds**: `/onboarding` that runs for a freshly signed-up user with no company memberships.

### PASTE THIS

```
Build an onboarding wizard at the route /onboarding. Trigger it automatically when a logged-in user has no rows in company_members.

7 steps in this exact order. Save progress to localStorage so the user can refresh and resume.

Step 1 — Welcome
  Title: "Set up your company"
  Subtitle: "Takes about 5 minutes. You can edit anything later."
  Single button: "Get started"

Step 2 — Company basics
  Fields: company name (required), industry (text, optional), revenue_range (dropdown: $0-1M, $1-10M, $10-50M, $50-250M, $250M+), employee_count (number), years_in_operation (number)
  Button: "Continue"
  On click: call edge function create-organization via supabase.functions.invoke('create-organization', { body: { name, industry, revenue_range, employee_count, years_in_operation } }). Store the returned organization_id in component state. If error, show toast.

Step 3 — Lifecycle
  Title: "We've placed you at the [stage] stage"
  After step 2, call supabase.functions.invoke('determine-lifecycle', { body: { organization_id } }) and display the returned current_stage with a short description (lookups: startup/growth/scale/mature).
  Button: "Continue"

Step 4 — Industry template picker
  Show 4 cards (read from templates table where is_active=true): General SMB, Hospital, University, Investment Fund. Each shows name + description.
  User picks one. On click "Use this template": call a new edge function 'apply-template' with { company_id, template_id } that does the cloning. (If that function doesn't exist yet, fall back to client-side: insert a question_set + metric_set + 8 customer_pillars (one per universal_pillar, label=universal_pillar.name) for this company, then SELECT practices/metrics where template_id=picked into the new sets. Reuse logic from existing /round/:code submission.)
  Button: "Continue"

Step 5 — Customise pillars (rename only in v1)
  Show the 8 customer_pillars. User can edit the label of each. Save updates customer_pillars.label.
  Button: "Continue"

Step 6 — Invite team (optional, can skip)
  Form to add up to 10 emails with role_lens dropdown (CEO/COO/CFO/CRO/CHRO/CIO/CMO/Legal/Manager/Viewer).
  On submit: for each row, call supabase.functions.invoke('invite-user', { body: { email, role: 'member', role_lens } }).
  Button: "Send invites" or "Skip for now"

Step 7 — Done
  Confirmation. Button "Open my Control Tower" routes to /company/:id where :id is the organization_id from step 2.

Use shadcn/ui Stepper if available, else build a simple step indicator. Style consistent with the existing app.
```

### Verify
- [ ] Brand new sign-up redirects to /onboarding
- [ ] Each step persists locally on refresh
- [ ] Step 2 creates a row in `companies` and `company_members` (caller becomes owner)
- [ ] Step 4 populates `question_sets`, `metric_sets`, `customer_pillars`, `practices`, `metrics` for the company
- [ ] Step 5 renames are persisted to `customer_pillars.label`
- [ ] Step 6 invitations create `invitations` rows
- [ ] Step 7 routes correctly

---

## P3 — Pillar + practice customisation (Settings)

**When**: Day 3 of pilot, after P2.
**What it builds**: Settings → Pillars + Practices editor for ongoing customisation after onboarding.

### PASTE THIS

```
Add a settings area at /company/:id/settings. Tabs:
  - "Pillars" — list of customer_pillars for this company. Each shows label + linked universal pillar name. Allow rename. (v1 doesn't allow merge/split/delete.) On save, update customer_pillars.label.
  - "Practices" — grouped by customer pillar. Each practice shows statement + an edit button. Edit allows changing statement + description. Add button creates a new practice (statement, description, customer_pillar_id; sort_order = max+1). Soft-delete via is_active=false. Mark customised practices visually (pill: "edited").
  - "KPIs" — same pattern. Each KPI shows name + unit + target_value + threshold_red + threshold_yellow. Allow editing all fields. Add new KPI form. Pillar dropdown (customer_pillars).

Permission: only company_members where role IN ('owner','admin') can edit. Members see read-only.

After every save, show toast + audit_log row gets written automatically (database side; no client work needed).

Use the same shadcn/ui form components as the rest of the app. Tabs at the top. Consistent spacing.
```

### Verify
- [ ] /company/:id/settings is reachable from the company nav
- [ ] Members without admin role see read-only
- [ ] Edits persist to DB and audit_log captures them
- [ ] "edited" badge appears on customised practices/KPIs

---

## P4 — KPI manual entry + threshold tiles

**When**: Day 4 of pilot, after P3.
**What it builds**: Manual KPI entry screen + threshold-coloured tiles ready for Control Tower.

### PASTE THIS

```
Build two pieces:

1. KPI entry screen at /company/:id/kpis/entry
   - Show all metrics for this company grouped by customer pillar
   - Each metric: current value (most recent metric_values row), input field for new value, optional notes, period field (e.g., "2026-Q1" or "2026-05")
   - Submit button per metric: INSERT into metric_values { metric_id, company_id, value, period, notes, recorded_by: auth.uid() }
   - Show toast on save + immediate refresh of the displayed value

2. KPI Tile component (reusable, used in Control Tower next)
   - Props: metric_id (uuid)
   - Fetches latest value from metric_values + metric definition (name, unit, target, thresholds)
   - Renders a tile showing: name, value (formatted with unit), small sparkline of last 6 entries, status colour:
     - Red if (threshold_red is set AND value crosses it in the bad direction)
     - Yellow if value crosses threshold_yellow
     - Green otherwise
     - Grey if no value yet
   - "Bad direction" depends on whether higher-is-better or lower-is-better. Heuristic: if target > threshold_red, higher-is-better; otherwise lower-is-better.
   - On click, opens a small modal showing the full time series as a line chart (recharts).

Use Supabase Realtime to subscribe to metric_values inserts for this company so tiles auto-refresh:
  supabase.channel('kpi-tiles').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'metric_values', filter: 'company_id=eq.<id>' }, refetch).subscribe()
```

### Verify
- [ ] Entry screen lists all KPIs grouped by pillar
- [ ] Submitting a value writes to metric_values
- [ ] Tile colour matches threshold logic
- [ ] Realtime subscription updates tiles on insert without page refresh
- [ ] Click opens line chart modal

---

## P5 — Pillar drill-down + 8-pillar radar

**When**: Day 5 of pilot, after P4.

### PASTE THIS

```
Build pillar surfaces:

1. 8-pillar radar component
   - Fetches latest round_responses for the company (the most recent completed_at row)
   - Aggregates per customer_pillar (averaging respondents): importanceAvg, competencyAvg, gap (competency - importance)
   - Renders an 8-axis radar with two series: Importance and Competency
   - Used on Control Tower (next prompt) and at the top of the pillar drill-down

2. Pillar status strip component
   - Shows the 8 customer_pillars in order (sort_order)
   - Each: pillar label + a 5-dot maturity indicator (filled dots = average competency rounded). Colour: green if competency >= importance, yellow if 1 below, red if 2+ below.

3. Pillar drill-down route at /company/:id/pillars/:pillarId
   - Header: customer pillar label + universal pillar name + description
   - Section 1: practices in this pillar with their importance/competency scores (from latest round) and gap. Sort by gap (largest gap first). Each practice expandable to show the maturity rubric (5 levels from maturity_rubrics for that practice — show descriptor + evidence_criteria for each level, with the current level highlighted).
   - Section 2: KPI tiles for this pillar (using the Tile component from P4, filtered by metrics.customer_pillar_id)
   - Section 3: Initiatives in this pillar (table of rows from initiatives where practice_id is one of the practices in this pillar). Status column with colour coding.
   - Section 4: Recent activity (last 10 audit_log rows where the resource is in this pillar, joining practice_id or metric_id).

Use shadcn/ui Card components. Make it mobile-responsive.
```

### Verify
- [ ] Radar renders for each company
- [ ] Pillar drill-down shows practices sorted by gap (descending)
- [ ] Maturity rubric tooltip/expansion shows the 5 levels with the current one highlighted
- [ ] KPI tiles in the pillar are filtered correctly
- [ ] Initiatives table is filtered by pillar's practices

---

## P6 — Control Tower home

**When**: Day 6 of pilot, after P5.

### PASTE THIS

```
Replace the existing /company/:id home page with a Control Tower layout. Mobile-responsive (stacks vertically on phone).

Layout (top to bottom):
  Header bar: company switcher (dropdown of user's companies), search icon, alert badge (unread alerts count), avatar dropdown with role_lens display + sign out

  Hero row (4 cards in a grid, 2x2 on tablet, 4-col on desktop, stacked on phone):
    The 4 cards default by role_lens — query company_members for the current user's role_lens then pick:
    - ceo: pillar status strip card + top 3 alerts card + portfolio card (if user has 2+ companies, else "Recent decisions") + "Pending approvals" card (count of decisions where decided_by IS NULL and proposed_by != auth.uid())
    - coo: initiative kanban summary (count by status) + Delivery pillar KPI tiles (top 3 by sort_order) + cross-pillar blockers (initiatives with status='evidence_ready' for >7 days) + recent activity
    - cfo: cash KPI + runway KPI + margin KPI + days AR KPI (specific KPI external_ids per template)
    - cro/chro/cio/cmo/legal: their pillar's top 4 KPI tiles
    - manager: their pillar drill-down summary
    - viewer: same as ceo (read-only feel)
   For unknown role_lens: default to ceo layout.
   Each card has a "..." menu with "Pin different metric" (v1.1) — render as disabled in v1.

  Mid row:
    Left half: 8-pillar radar (component from P5)
    Right half: 8-pillar status strip (component from P5)

  Bottom row:
    Left: chat panel placeholder (will be wired in P8)
    Right: recent activity stream (last 20 rows of audit_log filtered by company_id; render as a feed: "{user} {action} {resource_type} at {time}")

Subscribe via Supabase Realtime to alerts inserts and audit_log inserts for live update.

Existing CompanyDashboard component code stays for the rounds list — move it under a "Rounds" tab/section below the Control Tower.
```

### Verify
- [ ] Page renders in <1.5s on first visit
- [ ] Hero cards adapt to user's role_lens
- [ ] Realtime subscriptions update the alert badge and activity stream live
- [ ] Mobile shows everything stacked, hero scrolls horizontally
- [ ] Existing rounds list still accessible

---

## P7 — Portfolio rollup (fund-CEO)

**When**: Day 7 of pilot.

### PASTE THIS

```
Add /portfolio route. Visible only when the current user has 2+ rows in company_members.

Page content:
  Header: "Your Portfolio"
  Subheader: "<N> companies you own or admin"

  Grid of company cards (one per row in company_members where user_id = auth.uid() and role IN ('owner','admin')):
    Each card:
      Logo / initial of company name
      Company name
      Lifecycle stage chip
      Overall score (average of latest round's competencyAvg across all categories)
      Top 3 pillar gaps as small bars
      Open critical alerts count (badge if >0)
      Pending approvals count (badge if >0)
      Last activity timestamp
      Click anywhere to navigate to /company/:id

  Sort options: by overall score (lowest first = needs attention), by company name, by last activity

Use Supabase Realtime to subscribe to alerts for any of the listed companies so badges update live.

Add a top-nav link "Portfolio" that's visible only when this view is reachable (user has 2+ companies).
```

### Verify
- [ ] Visible only when user belongs to 2+ companies
- [ ] Cards show real data from each company's latest round
- [ ] Click navigates to that company's Control Tower
- [ ] Sort works
- [ ] Mobile renders cards in a single column

---

## P8 — Chat panel integration

**When**: Day 8 of pilot.

### PASTE THIS

```
Wire the chat panel placeholder on the Control Tower (and a dedicated /company/:id/chat route) to the chat-with-data edge function.

Component: ChatPanel
  Persistent text input at the bottom
  Conversation history above (scrolling, newest at bottom)
  Each user message is right-aligned, each assistant message is left-aligned with a small avatar
  Voice input button (uses the Web Speech API) that fills the input
  Send button (or Enter key) submits

On submit:
  1. Append user message to the local conversation state
  2. Call supabase.functions.invoke('chat-with-data', { body: { company_id, conversation_id, question } })
     conversation_id: keep the same uuid for the duration of this conversation; null on first send (the function returns one)
  3. Append assistant response to conversation state
  4. Render assistant text:
     - Replace [src:<id>] tokens with clickable citation chips. Click opens a small popover showing the source description.
     - If response.vega_spec is set, render with react-vega or vega-embed below the text
     - If response.stripped_unsupported_numbers > 0, show a small "AI flagged some claims it couldn't verify" badge

Add npm dependencies if needed: react-vega, vega-embed.

Add a "Save chart to dashboard" button below any rendered chart. v1: button is visible but disabled with tooltip "Available in v1.1". Don't wire the actual save yet.

Style the chat panel with shadcn/ui card + scroll area. On mobile, the chat is a slide-up bottom sheet.
```

### Verify
- [ ] Sending a question to chat returns a real grounded answer for a company with real data
- [ ] Citation chips are clickable and show source description
- [ ] If the question implies a chart, a Vega-Lite chart renders
- [ ] Voice input populates the text field
- [ ] Conversation history persists for the session
- [ ] On mobile, the chat is a bottom sheet

---

## P9 — Focus portfolio + initiative kanban

**When**: Day 9 of pilot.

### PASTE THIS

```
Build two surfaces:

1. /company/:id/portfolio — Focus portfolio
   On load:
     Find the most recent focus_portfolios row for this company.
     If none: show a "Compute focus portfolio" button. On click, call supabase.functions.invoke('compute-opi', { body: { round_id: latestRoundId, organization_id: companyId } }) followed by supabase.functions.invoke('select-focus-portfolio', { body: { organization_id: companyId, round_id, quarter: currentQuarterString } }).
     If exists: render the focus portfolio.

   Render:
     Header: "Q[X] Focus Portfolio — [WIP cap, e.g., 5 active]"
     Grid of practice cards (one per practice in active_practice_ids):
       Practice statement
       OPI score and phase (1=Proof, 2=Structure, 3=Scale)
       Selection rationale text from select-focus-portfolio output
       Linked initiative status (or "Make initiative" button if no initiative exists for this practice in this round)

     Click "Make initiative": INSERT into initiatives { organization_id: companyId, practice_id, title: practice.statement, status: 'planned', owner_id: auth.uid() }. Then route to /company/:id/initiatives/:newInitiativeId

2. /company/:id/initiatives — Initiative kanban
   3 columns: Planned, In Progress, Done
   Each column is a vertical list of initiative cards
   Card content: title, owner avatar (from profiles), due date if set, evidence count badge, linked practice statement (truncated)
   Drag a card between columns updates initiatives.status (planned, in_progress, done in v1).
   Click a card opens /company/:id/initiatives/:id for detail (will be built in P10).

Use shadcn/ui Card + a drag-drop library Lovable already uses (or react-dnd / @dnd-kit/core if needed).

Filter bar at the top: by owner, by pillar (joined via practices.customer_pillar_id), by status.
```

### Verify
- [ ] If no focus portfolio exists, the compute flow works end-to-end (compute-opi then select-focus-portfolio)
- [ ] Focus portfolio renders practices ranked correctly
- [ ] "Make initiative" creates a row + routes
- [ ] Kanban drag-drop persists status to DB
- [ ] Filters work

---

## P10 — Evidence + AI grade + governance view

**When**: Day 10 of pilot.

### PASTE THIS

```
Build initiative detail + evidence + governance:

1. /company/:id/initiatives/:initiativeId — Initiative detail
   Header: title, status, owner, due date (editable inline)
   Section 1: Linked practice statement + maturity rubric panel (5 levels with current level highlighted, like the pillar drill-down)
   Section 2: Evidence list
     Upload area: file (uses Supabase Storage bucket 'evidence' with company-scoped path) OR URL input
     On upload: INSERT into evidence { initiative_id, description, file_path or url, uploaded_by }
     Each evidence row: description, file/url link, uploaded_at, uploaded_by, optional AI grade card if grade exists
     "Grade" button per evidence row: calls supabase.functions.invoke('grade-evidence', { body: { evidence_id } })
     Grade card shows: rubric_mapping.matched_level, completeness_score, quality_score, risk_flags (chips), level_proposal, confidence, rationale, recommendation.action
   Section 3: Score-change request
     Button "Propose level upgrade based on evidence" (visible if any evidence has level_proposal > current level)
     Opens a modal: shows current level, proposed level, evidence_ids checkbox list. Submit creates a row in score_change_requests.

2. /company/:id/governance — Combined governance view
   Three tabs: Executive / Board / Functional
   Executive tab:
     Top 5 alerts (severity desc, fired_at desc)
     Top 5 active initiatives (by OPI of linked practice)
     Top 5 KPIs (manually pinned in v1; default to Economics pillar)
     Pending approvals (decisions where decided_by IS NULL, score_change_requests where status='pending')
   Board tab:
     8-pillar maturity radar (round-over-round trajectory line chart for each pillar, last 4 rounds)
     Decision log (all rows from decisions table, ordered by proposed_at desc, with vote tallies)
     Risk register (open alerts grouped by severity)
   Functional tab:
     Default to the user's role_lens's pillar drill-down (reuse component from P5)
     Allow switching to any other pillar via dropdown.

   Mobile: tabs collapse to a select dropdown.
```

### Verify
- [ ] File upload works to Supabase Storage
- [ ] Grade button calls grade-evidence and renders the result
- [ ] Score-change-request modal creates a row
- [ ] Governance tabs all render real data
- [ ] Tabs work on mobile

---

## P11 — Delegation UI (admin sends questions)

**When**: Day 11 of pilot.

### PASTE THIS

```
Build /company/:id/round/:roundId/delegate — admin-only screen for sending blocks or single practices to third parties.

Permission: only company_members where role IN ('owner','admin') can access.

Layout:
  Header: "Delegate questions to teammates" + round title + back link

  Two modes (toggle at top): "By pillar block" / "By individual practice"

  By pillar block:
    Show 8 customer pillars as cards
    Click a pillar card → opens a side panel with the practices in that pillar (read-only preview)
    Side panel has form fields: assignee email (required), assignee name (optional), message (textarea, optional), due date (optional)
    Add multiple assignees with "+" button
    Submit button: for each assignee, call supabase.functions.invoke('delegate-questions', { body: { round_id, company_id, assignments: [{ customer_pillar_id, assignee_email, assignee_name, message, due_at }] } })
    Show success toast with delivered count

  By individual practice:
    Show all practices in this round grouped by pillar (collapsed by default)
    Each practice has a "Delegate" button → opens the same side panel as above but with practice_id pre-filled instead of customer_pillar_id

  Below: existing delegations table (queried from assignment_progress view filtered by round_id):
    Columns: assignee_email, scope (pillar name or practice statement), status (pending/reminded/overdue/complete with colour), due_at, completed_at, share_url (with copy button)
    Action menu per row: "Send reminder" (sets reminded_at and could resend the email — v1 just updates the timestamp; v1.1 wires the resend), "Cancel assignment" (DELETE).
```

### Verify
- [ ] Admin-only access enforced
- [ ] Pillar block delegation creates assignments scoped to the pillar
- [ ] Single practice delegation creates assignments scoped to one practice
- [ ] Email is sent (or share_url is shown if email_sent is false)
- [ ] Existing delegations table updates after submit
- [ ] Reminder + cancel actions work

---

## P12 — Delegated response UI (anonymous)

**When**: Day 11 of pilot, alongside P11.

### PASTE THIS

```
Build /delegated/:token — anonymous-by-token route for assignees to submit their delegated scores.

No auth required. The token in the URL is the auth.

On load:
  Call a new edge function 'get-delegated-assignment' (you'll need to create this — it takes { token } and returns the assignment details + scoped practices + maturity rubrics, service-role lookup so no RLS friction).
  If token is expired/completed: show a friendly "This link is no longer valid" page with the reason.
  Otherwise: show the assignment.

Page content:
  Header: assignment scope ("You've been asked to provide input on [pillar name] / [practice statement]")
  Subheader: who delegated (inviter name if present), optional message in a quote block, due date if present
  Optional: name field (defaults to invitation's assignee_name if present, editable)

  Practices to score: render each practice card with:
    Practice statement
    Importance slider (1-5) with labels: "Not important" → "Critical"
    Competency slider (1-5) with labels: "We don't do this" → "We're best in class"
    Maturity rubric expandable below each practice (5 levels, descriptors only — keep this concise for non-employees)

  Submit button at the bottom (disabled until all practices have been scored):
    Calls supabase.functions.invoke('submit-delegated-response', { body: { token, respondent_name, scores: [{ question_id: practice.external_id, importance, competency }, ...] } }) — note: no Authorization header
    Alternatively, since invoke adds the Authorization header automatically and the function expects no auth, use fetch directly to the edge function URL.
    On success: show a thank-you screen with an option to "Save my answers" (downloads a copy of what they submitted).

Style: keep it clean and standalone. This is a public-facing surface — no sidebar, no chrome. Looks like it could be sent to the CFO of a hospital.

Mobile-responsive (most respondents will open this on phone).
```

### Verify
- [ ] Token-only access works
- [ ] Expired/completed token shows a clean error page
- [ ] Sliders save the scores correctly
- [ ] Submit calls the edge function and shows thank-you
- [ ] Mobile responsive

You'll also need to create supabase/functions/get-delegated-assignment/index.ts in bds-OS that takes { token }, validates, and returns the assignment + scoped practices + their rubrics for rendering. (I'll write that next on the bds-OS side; tell me when you're ready and I'll commit it.)

---

## P13 — Feedback widget + PMF survey

**When**: Day 12 of pilot.

### PASTE THIS

```
Build two pieces:

1. Persistent feedback widget
   A fixed bottom-right "Feedback" button on every authenticated screen (not on /, /assessment, /results, /auth)
   Click opens a modal:
     Free-text textarea (required, max 1000 chars)
     Auto-tagged with screen (current route via window.location.pathname)
     Optional category dropdown (Bug / Feature request / Usability / Other)
     Submit: INSERT into feedback { company_id (current), user_id (auth.uid()), screen, category, content }
     Toast: "Thanks — we read every one"
   Use shadcn/ui Sheet or Dialog.

2. PMF survey
   Two trigger points:
     a. After a user has completed at least one assessment + spent 30+ days in the platform: show an in-app banner "Quick 1-minute survey?". On accept, open the modal.
     b. /pmf route (linkable for direct access)

   Modal/page content:
     Question 1 (required, radio): "How would you feel if you could no longer use this platform?"
       Options: Very disappointed / Somewhat disappointed / Not disappointed / N/A — I don't really use it
     Question 2 (optional textarea): "What is the main benefit you receive from this platform?"
     Question 3 (optional textarea): "What type of person do you think would benefit most from this platform?"
     Question 4 (optional textarea): "How can we improve it for you?"
     Submit: INSERT into pmf_responses { company_id, user_id, disappointment, primary_benefit, who_benefits_most, improvement }
     Show thank-you screen.

Don't show the PMF banner more than once per user.
```

### Verify
- [ ] Feedback button visible on authenticated screens
- [ ] Submit creates a feedback row
- [ ] PMF triggers correctly
- [ ] PMF responses persist
- [ ] Banner doesn't re-show after dismissal

---

## P14 — Ops surface (`/admin/*`)

**When**: Day 14 of pilot.

### PASTE THIS

```
Build the platform-admin-only ops surface. Role-gated by the existence of a row in platform_admins where user_id = auth.uid().

Routes (all under /admin):
  /admin                — operator home
  /admin/feedback       — beta feedback inbox
  /admin/customers      — list of all companies
  /admin/alerts         — open alerts across all companies
  /admin/deploys        — recent deploys (read from a deploys table OR GitHub Actions API; v1 can be a placeholder)
  /admin/chat           — operator-mode chat (different system context — talks about the platform itself, not customer data)
  /admin/status         — bookmarkable status page (last deploy, errors last 24h, customers active, alerts open)

Mobile-first design:
  Big tap targets (48px+)
  Single-column layout
  Voice input on every text field
  "Ack" / "Approve" / "Reject" / "Defer" as primary actions on cards

Feedback inbox:
  List feedback rows ordered by created_at desc
  Filter: company, screen, category, reviewed/unreviewed
  Each row: company name, user name, screen, category, content (truncated to 200 chars expandable), created_at
  Action buttons: "Mark reviewed" (sets reviewed_at + reviewed_by = auth.uid()), "Open in chat" (opens /admin/chat with this feedback as context)

Customers list:
  All companies, columns: name, lifecycle_stage, member_count, last_activity, latest_round_completed
  Search by name
  Click → /company/:id (you can navigate as a platform admin; in v1 enforce no destructive actions unless you're also a member)

Alerts list:
  All alerts where status='open', sortable by severity + fired_at
  Action: "Acknowledge" (sets acknowledged_at + acknowledged_by)

Status page:
  Big tiles: Last deploy ago + status, Errors (last 24h count from Sentry — placeholder if Sentry not wired), Active alerts count, Customers count, Recent feedback count.
  Refresh every 30s via polling.

Important: don't expose the /admin/* routes to non-platform-admin users. Use a route guard.
```

### Verify
- [ ] /admin requires platform_admins membership
- [ ] Feedback inbox shows recent submissions
- [ ] Mobile-friendly tap targets
- [ ] Status page renders without errors

---

## After all prompts: smoke test

Walk every dimension for every company:
- [ ] Sign-up + log-in works
- [ ] Onboarding wizard completes
- [ ] Pillar/practice/KPI customisation works
- [ ] KPI entry + tile colour-coding works
- [ ] Pillar drill-down renders with rubrics
- [ ] Control Tower adapts to role_lens
- [ ] Chat answers a real question with citations and (when relevant) a chart
- [ ] Focus portfolio + initiative kanban works
- [ ] Evidence upload + AI grade + score-change request works
- [ ] Governance tabs render
- [ ] Delegation: send a block to an external email, the recipient submits, the response appears in the round
- [ ] Feedback widget submits
- [ ] PMF survey submits
- [ ] Ops surface accessible only to platform admins

If any check fails, capture in the friction log and reply to Lovable with the specific gap.
