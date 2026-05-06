# Beta Pilot Plan — 15 Days, End-to-End

**Status**: active. **Schedule**: 15 days from kickoff to beta launch. **Scope**: all 7 product dimensions functional for two real beta customers with the architecture done right.

**Beta customers (real, not hypothetical)**:
1. **The fund** — primary beta, the fund CEO operates here daily
2. **Hospital** — portfolio company, $50M revenue, multi-facility
3. **University** — portfolio company, $6M revenue, multi-campus

The fund CEO is admin across all three. Each portfolio company has its own leadership team scoring its own assessment.

**Architecture locked in `docs/architecture.md`**:
- Own Supabase project (not Lovable Cloud)
- Single monorepo with Lovable's app under `apps/web/`
- GitHub Actions CI/CD pipeline
- Sentry + Slack alerts for ops

---

## What ships end-to-end (15-day v1)

| # | Dimension | v1 capability | v1.1 follow-up |
|---|---|---|---|
| 1 | **Assessment** | 8 universal pillars × ~5 practices, dual-slider scoring, per-company question sets, **maturity rubrics for top 5 practices per pillar (~40 rubrics)** | Rubrics for the long-tail practices, full evidence-loop approval queue |
| 2 | **Monitoring** | Manual KPI entry, threshold colour-coding, live tile updates via Realtime, alert banners | Generic webhook ingest, Slack/email digest, native connectors |
| 3 | **Benchmarking** | Cross-company portfolio rollup for fund CEO, internal trend over rounds | Cross-tenant industry benchmarks (anonymised averages) |
| 4 | **Visualisation** | Number tiles, sparklines, radar (assessment), bar charts (pillar scores), **inline charts in chat** | Save chart from chat → mosaic, drag-drop reorder, NL-to-SQL queries |
| 5 | **Chatting** | Text-grounded Q&A with **source citations** + inline chart rendering (Julius-lite) | Pin-to-dashboard, multi-company queries, conversation memory across sessions |
| 6 | **Initiative** | 3-status kanban (Planned / In Progress / Done), evidence upload, AI rubric grading | 7-status workflow, formal approval queue, escalation paths |
| 7 | **Governance** | One combined view adapting to user role + audit log + decisions table populated | Three separated views (executive / board / functional), decision-log dedicated UI, action-coupled alerts |

---

## Non-negotiable principles (stress-test fixes baked in)

- **Source-cited chat** — every numeric claim in chat output references its underlying data row. No hallucinated numbers reach users.
- **Maturity rubrics for top practices** — 5 levels per top-5 practices per pillar = ~40 rubrics. Without these the assessment is sliders without a standard. Hand-authored content during pre-pilot.
- **Framework heritage cited in UI** — "Synthesis of Baldrige + EFQM + Balanced Scorecard" visible to users so they don't dismiss it as house-consultant material.
- **Day-1 kickstart** — empty-state isn't empty. Each new company gets pre-populated KPIs with target values, a 5-question kickstart questionnaire (not 40), and a suggested first-30-days focus portfolio.
- **CEO not exempt from evidence loop** — the operator's score changes go through the same AI rubric grade + senior approval as the team's. Built in from day 1.
- **Feedback loop functional from day 1** — in-app feedback widget, weekly beta call, friction log shared doc, Sean Ellis PMF survey at day 30.

---

## 15-day schedule (parallel-friendly)

Pre-pilot architecture work runs **in parallel** with content/spec authoring. The pilot itself is 13 days inside that 15-day envelope.

### Days 1–2 — Architecture setup + foundation specs (parallel)

**You** (browser tasks, ~1 hour total):
- Create your own Supabase project (Pro tier, US East). Get URL, anon key, service role key.
- In Lovable: change GitHub target to push into `wbardawil/bds-OS` under `apps/web/`. (If subdirectory pushing is unsupported, fall back to scheduled subtree-pull from `strategy-spark-86`.)
- Create accounts: Sentry (Developer free), Vercel (Hobby free), Slack workspace or Discord with `#ops-alerts` channel + webhook URL.
- Configure GitHub Actions secrets: Supabase service role key, Vercel deploy hook, Anthropic API key, Resend API key, Sentry DSN, Slack webhook URL.

**Me** (autonomous):
- Write the **SQL migration** that applies the framework tables on top of Lovable's existing schema (`universal_pillars`, `customer_pillars`, `templates`, `metrics`, `metric_values`, `widgets`, `dashboards`, `alerts`, `chat_messages`, `decisions`, `feedback`, `pmf_responses`, `maturity_rubrics`).
- Write the **professional-services / fund template** in `docs/industry-templates.md`.
- Write **`.github/workflows/deploy.yml`** — typecheck → migration → edge function deploy → Vercel deploy → Slack notify.
- Spec the **Sentry integration** (web SDK + edge function SDK) and **Slack/Discord webhook integration** with `audit_log` triggers.
- Spec the **`chat-with-data` edge function** including source-citation enforcement.

### Day 3 — Lovable applies foundation, monorepo settles

**You + Lovable**:
- Apply the SQL migration to your new Supabase project (paste into SQL editor or run via CLI from your codespace).
- Update Lovable's env vars to point at the new Supabase project.
- Verify Lovable's existing flows still work (public assessment, dashboard, etc.) on the new backend.
- If monorepo: confirm Lovable is now pushing into `apps/web/`.

### Day 4 — Refactor questions to load from DB

**You + Lovable**:
- Paste the refactor spec. Lovable updates `src/data/questions.ts` to load practices from the new `practices` table instead of hardcoded.
- Backward compatibility: existing data preserved.
- Verify: existing companies still see their old questions; new companies will pick from templates.

### Day 5 — Author the templates content + maturity rubrics

**Me** (autonomous):
- Finalise hospital, university, fund templates with full practice + KPI lists in `docs/industry-templates.md`.
- Author **maturity rubrics for top 5 practices per pillar** for each template = 40 × 5 = 200 rubric entries × 3 templates = ~600 lines of structured rubric content.
- Generate seed SQL for the templates + rubrics.

**You + Lovable**:
- Paste the seed SQL into Supabase. Verify templates and rubrics are loaded.

### Day 6 — Three pilot companies created + customised

**You** (~1.5 hours):
- Create **Fund X** → pick fund template → review/edit practices and KPIs (~30 min).
- Create **Hospital Y** → pick hospital template → review/edit (~30 min).
- Create **University Z** → pick university template → review/edit (~30 min).
- Configure user roles: fund CEO is owner of all three; hospital admin is owner of Hospital Y; university admin is owner of University Z.

### Days 7–8 — Monitoring + visualisation surfaces

**Me** (specs):
- Control Tower home page layout spec (hero KPI tiles, pillar radar, pillar status strip, activity stream).
- Manual KPI entry form spec with threshold colour-coding.
- Portfolio view spec (fund-CEO-only, lists all owned companies with summary tiles).
- Pillar drill-down spec.

**You + Lovable**:
- Lovable implements each surface from the specs.
- You verify each company's Control Tower renders with seeded KPIs.
- You verify the Portfolio view shows all three companies side-by-side.

### Days 9–10 — Chat + charts (the wow)

**Me** (specs + edge function source):
- `chat-with-data` edge function source code (Anthropic API integration, structured prompt, source-citation enforcement, optional `chart_spec` in response).
- Chat UI spec (always-visible panel, multi-turn, voice input, citation rendering, chart rendering via Recharts).

**You + Lovable**:
- Lovable implements the chat UI + integrates the edge function.
- You verify chat answers a real question for each company with real data.
- You verify charts render inline when the question implies a metric.
- You verify citations are clickable and resolve to source rows.

### Day 11 — Initiatives + governance

**Me** (specs):
- Initiative kanban spec (3 columns, drag-drop, evidence upload affordance, AI grade card).
- Combined governance view spec (role-aware: executive sees priorities + alerts; board sees pillar maturity trajectory; functional sees their pillar's practices).
- Audit log writes for all state changes (already partially designed).

**You + Lovable**:
- Lovable implements both surfaces.
- You verify per-company workflows work (create initiative, upload evidence, grade, change status, see in governance).

### Day 12 — KPI population + first assessments

**You + leadership teams** (~3 hours total):
- Enter initial KPI values for each company manually (~30 min × 3).
- Send invitations to each company's leadership team via in-platform invitation flow.
- Each leader logs in and completes their assessment for their company. `round_responses` populated.
- Trigger OPI computation per company. Focus portfolios materialised.

### Day 13 — End-to-end smoke test

**You + Me**:
- Walk every dimension for every company:
  - Sign-up + log-in works
  - Assessment scoring works (with rubrics visible per practice)
  - KPIs render with thresholds
  - Portfolio view shows all three companies
  - Drill-down works
  - Chat answers real questions with source citations and inline charts
  - Initiative kanban works
  - Combined governance view renders for each role
  - Feedback widget submits successfully
- Capture issues in friction log. Triage and fix critical breaks.

### Day 14 — Polish + final rubric expansion + documentation pass

- Fix issues from the smoke test.
- Author additional maturity rubrics if time allows (long-tail practices).
- Final docs pass: update `docs/coherence-mece.md` to reflect what shipped, update `docs/integration-plan.md` to show v1.1 work moving forward.
- Smoke test again post-fixes.

### Day 15 — Beta launch

- Final pre-flight (5-min walkthrough of every surface for every company).
- Invitations to the actual fund CEO + each portfolio CEO + each portfolio's leadership team.
- 15-minute onboarding call / video for each beta team.
- Beta is **live**.

### Day 16+ — Operating cadence + product-fit feedback loop

(see "Product-fit feedback loop" below)

---

## Coverage check — all 7 dimensions × 3 companies

| | Fund | Hospital | University |
|---|---|---|---|
| Assessment (with top-5 rubrics) | ✅ Day 12 | ✅ Day 12 | ✅ Day 12 |
| Monitoring (manual KPIs + thresholds) | ✅ Day 12 | ✅ Day 12 | ✅ Day 12 |
| Benchmarking (portfolio rollup) | ✅ Day 8 | ✅ (visible from fund's portfolio) | ✅ |
| Visualisation (tiles + radar + chat charts) | ✅ Day 10 | ✅ Day 10 | ✅ Day 10 |
| Chatting (Julius-lite + citations) | ✅ Day 10 | ✅ Day 10 | ✅ Day 10 |
| Initiative (3-status kanban) | ✅ Day 11 | ✅ Day 11 | ✅ Day 11 |
| Governance (combined view + audit log) | ✅ Day 11 | ✅ Day 11 | ✅ Day 11 |

All 7 dimensions × 3 companies, functional by Day 13 (smoke test), live by Day 15.

---

## Product-fit feedback loop (built in from day 1)

| Channel | Cadence | What we capture | Action owner |
|---|---|---|---|
| **In-app feedback widget** | Continuous — button on every screen → row in `feedback` table tagged by screen + user + timestamp + free-text | Granular usability + missing-feature feedback | Reviewed daily during beta, weekly thereafter |
| **Weekly 30-min beta call** with the fund CEO | Weekly Mondays from beta start | Strategic / "would I keep paying" questions | Decisions feed back into the next week's build |
| **Friction log** (shared doc, not in platform) | Continuous, edited by beta team between calls | Issues that come up between weekly calls | Triaged in weekly call |
| **Usage telemetry** | Passive — Vercel + Supabase analytics surfaced in `/admin` | Where users go, where they drop off | Reviewed weekly to find dropoff cliffs |
| **Sean Ellis PMF survey** | At day 30, again at day 90 | "How would you feel if you could no longer use the platform?" — % "Very disappointed" is the PMF anchor | Determines the v2 priorities |

The `feedback` and `pmf_responses` tables are part of Day 1's SQL migration. The friction log is a shared Notion or Google Doc, not in the platform.

---

## Risks and mitigations

| Risk | Probability | Mitigation |
|---|---|---|
| Lovable's Day 4 refactor (load questions from DB) takes 2 days instead of 1 | High | Schedule has buffer in Day 5; Day 4 prep specs are minimal so iteration is fast |
| Chat edge function quality issues (Claude returns hallucinated numbers despite citation enforcement) | Medium | Strict validation in edge function: any numeric claim not present in supplied context is filtered; tested with adversarial prompts pre-launch |
| Maturity rubric authoring slips (200+ rubric entries per template × 3 templates is significant content) | Medium | Day 5 dedicated to authoring; if it slips into Day 6, I can author in parallel during Day 6's Lovable work |
| Beta customers don't complete their assessments by Day 12 | Medium | Send invitations Day 11 evening with "please complete by Day 13" deadline; I draft a friendly reminder email template |
| Architecture pre-work blocks (Supabase setup hits a hiccup) | Low | Days 1–2 are buffer-friendly; if Supabase setup takes 3 days, push everything by 1 day |
| Lovable can't push to subdirectory of monorepo | Medium | Fallback: keep `strategy-spark-86` separate; periodic git-subtree-pull into `apps/web/` of `bds-OS`. Functionally equivalent for our purposes; minor friction. |

If two or more risks fire, Day 15 launch becomes Day 16 or 17. Acceptable — beta customers care about quality more than the specific date.

---

## What this plan supersedes

- The 9-day version of this plan (committed earlier today) — replaced by this 15-day version that includes architecture pre-work + chat with charts + maturity rubrics + source-citing.
- `docs/v1-plan.md` — pre-Lovable-discovery, obsolete.
- `docs/integration-plan.md` — covers the longer roadmap; for v1 pilot, **this plan is authoritative**.

When this plan is executed, update `docs/coherence-mece.md` and `docs/integration-plan.md` to reflect what shipped on Day 14. Do not silently let docs drift.
