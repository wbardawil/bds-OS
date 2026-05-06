# Role-Fit MECE Analysis (Operating Leadership + Fund Overlay)

**Status: canonical**. Replaces the earlier CSIO-only framing.

The platform's primary users are the **operating C-suite + management layer** of each company. The fund / CSIO seat is a **secondary overlay** that aggregates across portfolio companies. This doc covers both, with operating leadership as primary.

---

## PRIMARY — Operating C-suite (the daily users)

### MECE breakdown of executive roles

Eight roles. Each has a primary pillar focus + secondary touch-points; together they cover the operating layer of any company.

| # | Role | Primary pillar | Secondary | Cadence |
|---|---|---|---|---|
| **R1** | **CEO** (operating) | Direction (strategic priorities, board, lifecycle) | All 8 — they hold the integrated picture | Daily glance; deep weekly + quarterly |
| **R2** | **COO** | Delivery (operations, throughput, quality, supply) | People, Technology, Innovation | Daily — initiatives + ops KPIs |
| **R3** | **CFO** | Economics (financial discipline, P&L, capital, cash) | Governance, Direction (capital allocation) | Daily — financial KPIs; deep monthly + quarterly |
| **R4** | **CRO** (Revenue) | Customer (acquisition, retention, satisfaction) | Innovation, Delivery (sales execution) | Daily — pipeline, conversion, win/loss |
| **R5** | **CHRO** (HR) | People (talent, culture, engagement, succession) | Direction, Governance (labour, DEI) | Weekly — engagement, retention; deep monthly |
| **R6** | **CIO / CTO** | Technology (systems, data, security) | Governance (cyber), Innovation | Daily — incidents, uptime; deep weekly |
| **R7** | **CMO** (often folded into CRO) | Customer (brand, demand, segmentation) | Innovation, Direction | Daily — campaign, brand signals |
| **R8** | **GC / Compliance / CRO-risk** | Governance (legal, regulatory, ethics) | Risk overlay across all pillars | Weekly — incidents; deep quarterly |

Plus **management layer**:

| **M9** | **VPs / Directors / Functional Leads** | Their pillar's deep view + their initiatives | Cross-pillar handoffs | Daily within domain |

### Why this is MECE

- **Mutually exclusive** — every operational activity has a primary owner. Cash → CFO. Hiring → CHRO. Cybersecurity → CIO. Sales pipeline → CRO. Operating delivery → COO. Direction → CEO. Compliance → GC.
- **Collectively exhaustive** — every operational concern has a home. Cross-pillar concerns (e.g. M&A) get **shared ownership** via cross-tagging on initiatives.

### Each role's daily / weekly / quarterly platform usage

#### R1 — CEO
- **Daily** (5–10 min, mobile): Control Tower → top alerts across 8 pillars, pillar status strip, pending approvals, chat *"What needs my attention?"*
- **Weekly** (30 min): each C-level reports their pillar status; CEO scans drill-downs; reviews decision log.
- **Quarterly** (2–3h): assessment round, focus portfolio approval, board pack prep.
- **v1 support**: ✅ Control Tower + chat + governance + initiative kanban + audit log + assessment cycle. Board-pack export = v1.1.

#### R2 — COO
- **Daily** (15–20 min): Delivery pillar drill-down, ops KPIs, initiative kanban, chat *"What's blocked?"*
- **Weekly** (1h): People + Technology pillars (workforce + ops systems), escalations, initiative status with owners.
- **Quarterly**: Delivery pillar assessment, set ops improvement initiatives.
- **v1 support**: ✅ Pillar drill-down + KPI tiles + initiatives + chat. Detailed cycle-time analytics = v1.1.

#### R3 — CFO
- **Daily** (10 min): financial KPI tiles (revenue, margin, cash, days AR), threshold alerts, chat *"How is gross margin tracking?"*
- **Weekly** (1h): full Economics drill-down, compliance findings, treasury decisions logged.
- **Monthly** (3–4h): close cycle, budget vs actual variance.
- **Quarterly** (1d): board pack, capital plan, audit prep.
- **v1 support**: ✅ Economics + KPIs + thresholds + chat + governance + audit. Automated board financial pack = v1.1; full close-cycle workflow = v2.

#### R4 — CRO
- **Daily** (15 min): pipeline KPIs, Customer pillar (retention, NPS, churn), chat.
- **Weekly**: forecast vs actual, sales accountability.
- **Monthly**: market positioning (Innovation pillar — competitive landscape, new offerings), pricing.
- **Quarterly**: Customer pillar assessment, set GTM initiatives.
- **v1 support**: ✅ Customer + Innovation + KPIs + chat. CRM connector (HubSpot / Salesforce) = v2.

#### R5 — CHRO
- **Weekly** (45 min): People pillar drill-down (engagement, attrition, hiring), HR-owned initiatives, pulse-survey results.
- **Monthly** (1–2h): comp / promotion / succession workflow, DEI metrics (Governance × People).
- **Quarterly**: People pillar assessment, performance-review cycle initiation.
- **v1 support**: ✅ People + KPIs + initiatives + chat. HRIS connector = v2; comp/promotion workflow = v2; DEI dashboard = v1.1.

#### R6 — CIO / CTO
- **Daily** (10 min): Technology pillar (uptime, security, system status), real-time alerts.
- **Weekly** (1–2h): tech debt + initiatives, vendor / tool spend, cybersecurity (Governance × Tech).
- **Quarterly**: Technology assessment, IT investment plan, security audit.
- **v1 support**: ✅ Technology + KPIs + chat + governance. Direct integration with monitoring tools (Datadog) = v2; cyber-specific dashboard = v1.1.

#### R7 — CMO
- **Daily** (10 min): Customer pillar (brand awareness, lead gen), campaign KPIs.
- **Weekly**: demand-gen funnel, content / channel mix.
- **Monthly + Quarterly**: brand health, market positioning, Customer + Innovation assessments.
- **v1 support**: ✅ Customer + Innovation + KPIs. Marketing analytics integrations = v2.

#### R8 — GC / Compliance
- **Weekly** (30 min): Governance pillar (compliance findings, risk register, incidents).
- **Monthly**: audit log review, decision-log entries.
- **Quarterly**: Governance assessment, board risk update, regulatory cycle.
- **v1 support**: ✅ Governance + audit log + decision-log table. Decision-log dedicated UI = v1.1; matter-management = v3.

#### M9 — Management Layer
- **Daily** (10 min): their pillar's drill-down filtered to their function, owned initiatives, evidence pending.
- **Weekly**: 1:1 with their C-level.
- **Quarterly**: score assigned practices; upload evidence for level-up claims.
- **v1 support**: ✅ Drill-down + initiatives + evidence + AI grading. Function-level filtering = v1.1.

---

## Role-aware UI — small schema add for v1

Today the design has a single dashboard layout per company. To serve all roles properly, default tiles must adapt to role.

| Schema add | Purpose |
|---|---|
| `company_members.role_lens` text | One of `ceo / coo / cfo / cro / chro / cio / cmo / legal / manager / viewer` — drives **default tile selection**. Distinct from access role (`owner / admin / member`) which controls permissions. |
| `dashboards.role_default` text | A dashboard configuration tagged to a role; first time a user lands, they see the dashboard matching their role_lens, then can customise. |
| `practices.primary_role` array | Which roles own this practice (informational; allows "show me MY practices" filter). |

Default Control Towers per role:

| Role | Default tiles on hero |
|---|---|
| CEO | Pillar status strip + top 3 cross-pillar alerts + portfolio rollup (if applicable) + decisions this week |
| COO | Initiative kanban + Delivery KPIs + cross-pillar blockers |
| CFO | Cash + runway + margin + days AR + open audit findings |
| CRO | Pipeline + conversion + revenue forecast + customer NPS |
| CHRO | Engagement + attrition + hiring pipeline + open positions |
| CIO | Uptime + security incidents + IT spend vs budget + key system status |
| CMO | Lead volume + brand health + active campaigns + CAC |
| GC / Legal | Open compliance findings + risk register + audit log |
| Manager | Their pillar drill-down + owned initiatives + pending evidence |

**Implementation**: schema lands in v1 migration. UI for role-default Control Towers = v1.1 (in v1 everyone sees the same Control Tower; in v1.1 the default tile selection adapts).

---

## ICP needs cross-referenced with operating roles

Per `docs/about.md`'s ICP definition. Most-relevant role consumes each value proposition:

| ICP value | Role most consuming it | v1 support |
|---|---|---|
| "Clarity on what matters this week" | CEO + COO | ✅ |
| "Shared model of what 'good' looks like in their function" | Each C-level for their pillar; management for their function | ✅ |
| "Queue of well-scoped initiatives, not vague directives" | COO + management | ✅ |
| "Maturity scoreboard hard to fake" | CEO (board defence) + GC (audit) | ✅ |
| "Operational due-diligence artefact" | CFO + CEO (M&A / fundraising / sale) | ✅ |
| "Quarter-over-quarter visibility for the board" | CEO + CFO (board prep) | ✅ v1 (combined view); per-role = v1.1 |

Coverage: every ICP value lands on a v1 capability.

---

## Cross-cutting needs that span roles

| Cross-cut | Roles involved | Platform support |
|---|---|---|
| **Initiative cross-pillar tagging** (e.g. M&A integration) | CEO + CFO + CHRO + CIO + GC | ✅ multi-pillar tagging on initiatives in v1 |
| **Decision logging** (e.g. board decision affecting all functions) | CEO + GC + relevant C-level | ✅ decisions table writes from any surface |
| **Cross-functional KPIs** (e.g. CLV spans CRO + CFO) | CRO + CFO | 🟡 multi-pillar metric tagging = v1.1 (v1 = single-pillar) |
| **Risk floors affecting multiple pillars** (cyber breach → Tech + Gov + Customer) | CIO + GC + CEO | ✅ risk-floor flags surface everywhere |
| **Evidence supporting multiple practices** | Any owner | ✅ evidence rows can link to multiple practices = v1.1 (v1 = single-link) |

---

## SECONDARY — Fund / CSIO overlay (the portfolio aggregator)

When the operating-layer view is complete per company, a **fund or PE Operating Partner** sees an aggregation across the companies they own / oversee. This is the secondary persona, layered on top of the operating layer.

### CSIO functional buckets (mapped to universal pillars)

| # | Bucket | Maps to |
|---|---|---|
| **C1** | Strategy & Thesis | Direction |
| **C2** | Portfolio Oversight | Customer (portfolio companies as stakeholders) + Delivery |
| **C3** | Capital & Economics | Economics |
| **C4** | Stakeholder Mgmt (LPs, boards, op partners) | Customer + Governance |
| **C5** | Internal People (fund team) | People |
| **C6** | Risk, Compliance & Governance | Governance |
| **C7** | Innovation & Learning (thesis evolution, post-mortems) | Innovation |

### CSIO platform usage at-a-glance

- **Monday morning** (10 min, mobile): Portfolio rollup → all owned companies summary tiles + top 3 cross-portfolio alerts + chat *"What changed across the portfolio?"*
- **Tuesday**: drill into a portfolio company; review their assessment + KPIs; chat for trend explanations.
- **Wednesday** (IC / strategy): chat-pulled live data; decisions logged.
- **Thursday** (LP comms): chat synthesises portfolio operating health; manual paste into LP letter (auto-generated LP report = v2).
- **Friday**: review fund's own company view (the fund itself is one of N companies the CSIO owns).
- **Quarterly**: full reassessment cycle across all portfolio companies; LPAC report.

### CSIO-specific gaps

| Gap | Ships in |
|---|---|
| Investment pipeline workflow (sourcing → DD → IC → close) | v2 — dedicated Pipeline surface |
| Automated LP-report generation | v2 — LP-report templating engine |
| Carry attribution dashboard | v1.1 |
| Industry intelligence feeds | v3 — connector framework matures |
| Cross-portfolio benchmarking with industry peers | v2 — needs domain-tag layer |
| LPAC meeting workflow | v1.1 |

**Net for the CSIO running the fund + 2 portfolio betas**: v1 covers ~85% of role-week activities; v1.1 closes ~10%; v2 closes ~5%.

---

## What this MECE confirms

1. **Eight operating roles + management layer map cleanly to the 8 universal pillars.** Every operational activity has a primary owner role.
2. **The ICP value proposition holds for every role** — each consumes different surfaces of the same underlying data.
3. **Role-aware default Control Towers are a small schema extension** (3 columns), shipping in v1's migration; UI for role-default landing = v1.1.
4. **The fund / CSIO seat is correctly positioned as a secondary overlay** — useful for portfolio aggregation but the primary product value is the operating C-suite running each company.
5. **The 3 beta customers (fund + hospital + university) test both layers**: the fund's own C-suite running the fund, hospital's C-suite running the hospital (same), and the CSIO overlay seeing all three.

---

## Implication for `docs/about.md` (positioning fix)

The current ICP description in `docs/about.md` leans towards fund / Operating Partner as primary. **That should be re-prioritised**:

- **Primary users**: operating C-suite (CEO, COO, CFO, CRO, CHRO, CIO, CMO, GC) + management layer at $10M–$250M companies
- **Secondary buyers / aggregators**: PE Operating Partners, fund CSIOs (the portfolio rollup view)
- **Tertiary stakeholders**: boards, LPs

The fund-CEO Monday-morning scenario in `docs/about.md` is fine but needs to be paired with an operating CEO + COO + CFO scenario at a single company. I'll update `about.md` next to fix the framing.

---

## What this doc does NOT do

- It does NOT add new functionality requirements to v1 — it confirms what's there serves all operating roles, plus one small schema addition for role-awareness.
- It does NOT replace `docs/coherence-mece.md` — that doc covers the product/system MECE (layers, onboarding, viz, monitoring); this doc covers the user/role MECE.
- It does NOT change the framework — the 8 universal pillars handle all 8 C-level roles cleanly.
