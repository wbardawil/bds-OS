# Beta Pilot Plan — End-to-End for the Fund CEO + Portfolio

**Status**: active. **Scope**: assessment → monitoring → benchmarking → visualisation → chatting → initiative → governance, all working for two real beta customers (the fund and its portfolio companies).

**Beta customers (real, not hypothetical)**:
1. **The fund** — primary beta, the fund CEO operates here daily
2. **Hospital** — portfolio company, $50M revenue, multi-facility
3. **University** — portfolio company, $6M revenue, multi-campus

The fund CEO is admin across all three. Each portfolio company has its own leadership team scoring its own assessment.

**Honest schedule**: 9–10 days for end-to-end production quality across all seven product dimensions. The original "7 days" was unrealistic given the full scope. We do not ship pieces that don't work — every dimension is functional or it doesn't go to the beta.

---

## What ships end-to-end (the seven dimensions)

For all three companies, every dimension below is **MVP-functional**, not stubbed:

| # | Dimension | What ships in v1 | What's deferred to v1.1+ |
|---|---|---|---|
| 1 | **Assessment** | 8 pillars × ~5 practices, importance + competency scoring, per-company question sets cloned from a template, leadership team can score | Maturity rubrics with 5 levels per practice (post-pilot, content-heavy) |
| 2 | **Monitoring** | Manual KPI entry per pillar, threshold-based color coding (red/yellow/green), live tile updates via Supabase Realtime | Native connectors (Stripe, CRM, EHR, SIS), generic webhook, Slack/email alerts |
| 3 | **Benchmarking** | Cross-company portfolio rollup view for the fund CEO (fund + all portfolio companies side-by-side, summary scores per pillar), trend over rounds | Cross-tenant industry benchmarks (anonymised averages across all customers) |
| 4 | **Visualisation** | Number tiles, sparklines, radar (assessment), bar charts (pillar scores), gap charts | Drag-and-drop dashboard builder; pinning chat results to dashboard |
| 5 | **Chatting** | Text-grounded Q&A (Claude API): ask any question about your data, get a synthesised answer citing real values | Chart rendering inside chat (v1.1, ~3 days extra after v1) |
| 6 | **Initiative** | Focus portfolio (top N practices by OPI), each becomes an initiative with a 3-status workflow (planned / in_progress / done) | Full 7-status workflow with evidence loop and AI grading (post-pilot M5) |
| 7 | **Governance** | Three views — executive (priorities + alerts), board (pillar maturity + trajectory), functional (per-pillar drill-down for owners) | Action-coupled alerts, escalation policies, audit-log UI |

---

## Non-negotiable principles

- **Every dimension is functional end-to-end** before the beta opens. No half-built features.
- **The fund CEO can walk the entire journey** from sign-up to chatting on day 1 of access.
- **Each portfolio company's leadership** can independently complete an assessment and see their own results.
- **The fund CEO sees the rollup** — all companies in one view, drilldown to any.
- **Customisation works** — at minimum: rename pillar labels, edit practice text, add/remove KPIs, customise thresholds.
- **Feedback loop is built in** — beta customers have a real mechanism to tell us what's broken or missing.

---

## 9-day schedule

Each day has clear ownership: **Me** (writing specs / engine code / docs in `bds-OS`), **You** (pasting prompts into Lovable, customisations, testing), **Lovable** (implementing UI / migrations / edge functions on Lovable Cloud).

### Day 1 — Foundation specs (Me)
- Write `docs/lovable-migration-spec.md` containing:
  - SQL for new tables: `universal_pillars` (seeded 8), `customer_pillars`, `question_sets`, `practices`, `metric_sets`, `metrics`, `metric_values`, `dashboards`, `widgets`, `alerts`, `chat_messages`
  - Refactor instructions: load practices/categories from DB instead of hardcoded `src/data/questions.ts`
  - Backward compatibility: existing companies default to "no template selected"
- Write professional-services / fund template in `docs/industry-templates.md`
- Write `docs/chat-design.md` — chat architecture, prompt structure, edge function spec
- Commit + push

### Day 2 — Lovable applies the foundation (You + Lovable)
- Paste the migration spec into Lovable. Lovable applies the migrations. Existing data preserved.
- Paste the question-loading refactor spec. Lovable refactors `src/data/questions.ts` to read from DB.
- Sanity-check: existing flows still work. Existing companies see their old questions.
- Buffer for Lovable iteration (this step may take 1–2 days; built into schedule)

### Day 3 — Templates + customisation surfaces (Lovable, with my specs)
- Paste seed-data prompts for hospital, university, professional-services-fund templates.
- Paste UI prompts for: template picker on company creation; pillar customise page (rename, merge, split, hide, add); practice customise page (edit, drop, add); KPI customise page (edit, drop, add, set thresholds, set source).
- Verify: a fresh company can pick a template and customise.

### Day 4 — Three pilot companies created + customised (You)
- Create **Fund X** (the fund) → pick fund template → review/edit practices and KPIs (~30 min).
- Create **Hospital Y** → pick hospital template → review/edit (~30 min).
- Create **University Z** → pick university template → review/edit (~30 min).
- Configure user roles: fund CEO is owner of all three; hospital admin is owner of Hospital Y; university admin is owner of University Z.

### Day 5 — Monitoring + visualisation (Me + Lovable)
- I deliver specs for: control tower home page (tile grid, configurable per company), threshold-based colour coding, manual KPI entry form.
- Lovable implements. You verify each company's control tower renders with the seeded KPIs.
- I deliver spec for the **Portfolio view** (fund-CEO-only): list of all companies the user owns/admins, summary score per company, drill-down link.
- Lovable implements. You verify fund CEO sees all three companies in one view.

### Day 6 — Chat + initiative + governance (Me + Lovable)
- I deliver `chat-with-data` edge function source. Lovable implements + adds chat UI (textbox always visible on control tower).
- I deliver Focus Portfolio + Initiatives spec (3-status workflow, simplified from the 7-status v2 design). Lovable implements.
- I deliver Governance views spec (executive / board / functional layouts using existing data). Lovable implements.
- You verify every surface renders for each company.

### Day 7 — KPI population + first assessments (You + leadership teams)
- For each company, enter the initial KPI values manually (~30 min × 3 = 1.5 hours). Triggers thresholds; live tiles colour-code.
- Send invitations to each company's leadership team.
- Each leader logs in and completes their assessment for their company. Real `round_responses` populated.
- Trigger OPI computation per company. Focus portfolios materialised.

### Day 8 — End-to-end smoke test (You + Me)
- You walk every dimension for every company:
  - Sign-up + log-in works
  - Assessment scoring works
  - KPIs render with thresholds
  - Portfolio view shows all three
  - Drill-down into each company works
  - Chat answers a real question for each company with real data
  - Focus portfolio surfaces sensible practices
  - Initiatives show
  - Each governance view renders
- Capture issues in a shared friction log.
- I fix or spec fixes for any breaks.
- Lovable iterates on UI fixes.

### Day 9 — Beta launch (You)
- Final pre-flight: walk each company once more end-to-end.
- Invitations to the actual fund CEO + each portfolio CEO + each portfolio's leadership team.
- 15-minute onboarding video / call for each beta team.
- Beta is live.

### Day 10+ — Operating cadence (You + product-fit feedback loop)
See "Product-fit feedback loop" below.

---

## Product-fit feedback loop (built in from day 1)

Real beta customers, real feedback. Without this loop we ship blind.

| Channel | Cadence | What we capture | Who acts |
|---|---|---|---|
| **In-app feedback widget** | Continuous — a button on every screen → row in `feedback` table tagged by screen + user + timestamp + free-text | Granular usability + missing-feature feedback | Reviewed daily during beta, weekly thereafter |
| **Weekly 30-min beta call** with the fund CEO | Weekly Mondays from beta start | Strategic / "would I keep paying" questions | Decisions feed back into the next week's build |
| **Friction log** (shared doc) | Continuous, edited by beta team between calls | Issues that come up between weekly calls | Triaged in weekly call |
| **Usage telemetry** | Passive — Lovable Cloud writes to its analytics; we surface a simple "screens visited" report | Where users go, where they drop off | Reviewed weekly to find the dropoff cliffs |
| **Sean Ellis PMF survey** | At day 30, again at day 90 | "How would you feel if you could no longer use the platform?" — % "Very disappointed" is the PMF anchor | Determines the v2 priorities |

The `feedback` table is part of the migration in day 1. The PMF survey is a Lovable form that posts to a `pmf_responses` table. The friction log is a shared doc (Notion / Google Doc) — not in the platform.

---

## Coverage check — does this hit all 7 dimensions for all 3 companies?

| | Fund | Hospital | University |
|---|---|---|---|
| Assessment | ✅ Day 7 | ✅ Day 7 | ✅ Day 7 |
| Monitoring | ✅ Day 7 | ✅ Day 7 | ✅ Day 7 |
| Benchmarking | ✅ Day 5 (portfolio view) | ✅ (visible from fund's portfolio view) | ✅ (same) |
| Visualisation | ✅ Day 5 | ✅ Day 5 | ✅ Day 5 |
| Chatting | ✅ Day 6 | ✅ Day 6 | ✅ Day 6 |
| Initiative | ✅ Day 6 | ✅ Day 6 | ✅ Day 6 |
| Governance | ✅ Day 6 | ✅ Day 6 | ✅ Day 6 |

All 7 dimensions × 3 companies × functional by day 8 (smoke test) and live by day 9.

---

## What can slip the schedule (real risks)

| Risk | Probability | Mitigation |
|---|---|---|
| Lovable's Day 2 refactor (questions from DB) takes 2 days instead of 1 | High | Schedule already buffers this; if it slips into day 3, push everything by 1 day |
| Chat edge function quality issues (Claude returns wrong format / inconsistent) | Medium | Strict prompt template with tested examples; fall back to "I couldn't answer that" gracefully |
| Customising 3 templates well takes longer than estimated | Medium | Day 4 has a full day; if it bleeds into day 5, run customisation in parallel with monitoring spec work |
| Threshold UI is harder than estimated in Lovable | Low | Default thresholds seeded so customisation is optional |
| Beta customers are slow to complete their assessments on day 7 | Medium | Send invitations day 6 evening with clear "please complete by day 8" ask |

If two or more of these hit, day 9 launch becomes day 10 or 11. Not catastrophic — beta customers care more about quality than the specific date.

---

## What this plan supersedes

- `docs/v1-plan.md` — pre-Lovable-discovery, obsolete
- `docs/integration-plan.md` — covers the longer roadmap; for v1 pilot, **this plan is authoritative**
- The earlier "7-day pilot" framing — replaced by this 9–10 day end-to-end version

When this plan is executed, update `docs/coherence-mece.md` and `docs/integration-plan.md` to reflect what shipped. Do not silently let docs drift.
