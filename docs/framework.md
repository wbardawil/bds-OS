# BDS Operating System — The MECE Framework

This is the conceptual foundation of the platform. The framework is **mutually exclusive, collectively exhaustive (MECE)** for any organisation that needs to be operated and monitored — hospital, university, services firm, manufacturer, SaaS company, family business, non-profit. Industry templates are **suggestions within this framework**, not constraints.

A customer can:
- Use a suggested industry template as a starting point
- Edit, drop, or replace any suggested practice or metric
- Build their own from scratch within the 8 pillars
- Mix templates (e.g., a hospital that also runs a foundation may want healthcare practices + non-profit governance practices)

What customers **cannot** do is escape the 8 pillars themselves. Every operational practice and every metric maps to one of them. That's what makes the framework MECE.

---

## The 8 Universal Pillars

The framework is inspired by Baldrige Excellence and EFQM, tuned for an operating compass and monitoring system. Each pillar has two lenses:

- **Operating lens** — practices the organisation does (scored importance × competency)
- **Monitoring lens** — metrics the organisation measures (tracked over time, with thresholds and alerts)

| # | Pillar | Operating focus | Monitoring focus |
|---|---|---|---|
| 1 | **Direction** | Strategy, vision, mission, planning, decision rights | Strategic goal progress, decision velocity, board engagement |
| 2 | **Customer / Stakeholder** | Who we serve, how well, voice of customer, segmentation | NPS / CSAT / HCAHPS / equivalent, retention, complaints, lifetime value |
| 3 | **Delivery** | Operations, processes, throughput, quality, supply | Throughput, cycle time, quality rate, on-time delivery, capacity utilisation |
| 4 | **Economics** | Financial discipline, capital allocation, P&L, sustainability | Revenue, EBITDA / margin, cash, runway, growth, unit economics |
| 5 | **People** | Talent, culture, engagement, leadership, succession | eNPS, attrition, time-to-fill, engagement score, leadership pipeline depth |
| 6 | **Technology** | Systems, data, security, interoperability, automation | Uptime, security incidents, IT spend %, MTTR, automation rate |
| 7 | **Governance** | Board, compliance, risk, accountability, ethics | Compliance score, audit findings, risk register status, regulatory action |
| 8 | **Innovation** | Learning, R&D, new offerings, adaptation, future readiness | % revenue from new offerings, R&D spend %, time-to-market, idea pipeline |

## Why these 8 are MECE

**Mutually exclusive** — every operational concern has a primary home:
- Sales effectiveness → Customer (we exist for them) + Delivery (executing the sale)
- Marketing → Customer (understanding markets) + Innovation (positioning new offerings)
- Supply chain → Delivery
- Cybersecurity → Technology (systems) + Governance (risk)
- ESG / sustainability → Governance (risk and ethics) + Innovation (long-term)
- M&A → Direction (strategic) + Innovation (growth)

When something straddles, it has a clear primary classification. Customers tag practices and metrics to a single primary pillar to keep MECE.

**Collectively exhaustive** — nothing important falls outside:
- Strategy → Direction
- Operations → Delivery
- Money → Economics
- Talent → People
- Systems → Technology
- Compliance + risk + board → Governance
- New stuff → Innovation
- Customers / patients / students / members → Customer
- ✅ All eight are covered.

## Why each pillar has both an operating lens and a monitoring lens

The **operating lens** answers *"what should we be doing well?"* — the practices.
The **monitoring lens** answers *"what should we be watching?"* — the metrics.

Both are MECE within the same pillar. Both are customer-customisable. They feed into different surfaces:

- Operating lens → drives the **assessment** (importance × competency scoring), the **maturity rubric**, the **focus portfolio**, the **evidence loop**
- Monitoring lens → drives the **control tower** (live KPI tiles, thresholds, alerts, digests, integrations)

A new CEO using the platform sees both:
- "Where am I strong / weak?" (operating)
- "What's happening in the business right now?" (monitoring)

---

## Industry templates as suggestions, not constraints

Each industry template provides:
- **Suggested practices** (≈5 per pillar = ≈40 total) — phrased for that industry's vocabulary, drawn from established frameworks (Joint Commission for hospitals, accreditation rubrics for universities, etc.)
- **Suggested KPIs** (≈3–5 per pillar = ≈25–40 total) — the metrics commonly tracked in that industry

When a customer adopts a template:
1. They start with the template's practices and KPIs
2. They can **edit phrasing** to match their context (a religious university rephrasing mission language, a community hospital removing references to research)
3. They can **drop** anything that doesn't apply (a $6M university dropping research-heavy items)
4. They can **add** custom practices and KPIs in any pillar
5. They can **swap pillars' suggested content entirely** by picking from another template (e.g., a private hospital that also runs a clinic chain may want hospital practices in some pillars and services-firm practices in others)

The template's job is to make the first 80% of setup take 5 minutes instead of 5 hours. The remaining 20% is always customer-specific.

## Customers building from scratch (no template)

A customer can start without a template. They get:
- Empty pillars with placeholder text explaining the pillar's intent
- A "Suggested by other companies" gallery — anonymised practices from similar-stage / similar-size / similar-industry companies (this is the long-term flywheel; not in v1)

For v1, a customer building from scratch enters their own practices and KPIs from a blank slate.

---

## How this changes the data model

The data model in `docs/integration-plan.md` (Lovable's `companies` + `evaluation_rounds` + `round_responses` model) extends to support this:

### New / extended tables (Lovable Cloud)

```
pillars                     reference data — the 8 universal pillars (id, code, name, description)
question_sets               a customer's set of practices (formerly "industry template")
  - source_template         (nullable) — which template, if any, this set was cloned from
  - is_customised           bool
practices                   per question_set, the practice statements
  - pillar_id               FK to pillars
  - source_practice_id      (nullable) — if cloned from a template practice
  - is_customised           bool
metric_sets                 a customer's set of KPIs
  - source_template         (nullable)
metrics                     per metric_set, the KPI definitions
  - pillar_id               FK to pillars
  - unit                    string ("USD", "%", "days", etc.)
  - target_value            (nullable)
  - threshold_red / yellow  (nullable)
  - source                  enum (manual | webhook | connector_stripe | connector_hubspot | …)
metric_values               time-series of actual values
```

Everything roll-up by pillar.

### Industry templates become seed data

Industry templates (hospital, university, etc.) live as **seed data** in the `practices` and `metrics` tables, owned by a system company `template:hospital`, `template:university`, etc. When a customer picks a template, the system clones those rows into a new `question_set` and `metric_set` for the customer.

This makes templates editable at the platform level (we update a template, future customers get the update; existing customers don't, since they cloned). Standard SaaS pattern.

---

## What this means for the take-over CEO use case

A new CEO inheriting a business uses the framework like this:

1. **Pick or build a question_set** — 5 minutes if a relevant template exists, 30 minutes from scratch.
2. **Score practices** with the leadership team across all 8 pillars — a couple of hours, ideally individually then aligned.
3. **Pick or build a metric_set** — same approach.
4. **Wire metrics** — manual entry at minimum, generic webhook for any system the customer can hook up via Zapier, native connectors where they exist.
5. **See burning platforms** — practices with a large negative gap + KPIs in red. Surfaced on the control tower home.
6. **Build a 30/60/90 plan** — top items from the focus portfolio, dated.
7. **Execute and monitor** — initiatives, evidence, weekly digest.

Coverage check (MECE for take-over CEO):

| Take-over CEO need | Pillar(s) it lives in | Status |
|---|---|---|
| Where is the business strong / weak? | All 8 | Covered by operating lens |
| What's on fire right now? | All 8 (alerts on red metrics + low-competency practices in important areas) | Covered by monitoring lens + alerts |
| Cash, runway, P&L | Economics | Covered |
| Customer health | Customer | Covered |
| Team health | People | Covered |
| Operational issues | Delivery | Covered |
| Strategic direction | Direction | Covered |
| Compliance / risk | Governance | Covered |
| Tech debt / security | Technology | Covered |
| Future-readiness | Innovation | Covered |
| 30/60/90 plan | Cross-pillar | Covered by focus portfolio + dates (M11 in integration plan) |
| Stakeholder relationships | Customer + Governance | **Gap** — needs explicit stakeholder grid (M11 add) |
| Communications | Cross-pillar | **Gap** — needs comms templates (M11 add) |

The framework itself is MECE. Two execution surfaces (stakeholder grid, comms templates) sit on top of it and are M11 additions.

---

## How this maps to what's already been built / planned

| In bds-OS / Lovable today | Maps to |
|---|---|
| Lovable's 8 categories (`strategic_planning`, `management`, `kpi_okr`, `operations`, `human_resources`, `it`, `market_intelligence`, `sales_marketing`) | Will be re-grouped under the 8 pillars. `kpi_okr` and `management` collapse into Direction; the rest map straightforwardly. |
| bds-OS's 8 areas (Finance, Product, Go-to-Market, Marketing, People, Technology, Delivery, Governance) | Roughly aligned but not identical. Replaced by the 8 pillars below. |
| bds-OS's 82 practices | Reorganised under the 8 pillars as part of a generic "SMB services template," not as the canonical taxonomy. |
| Lovable's 83 questions | Same — re-tagged by pillar, kept as the "default template" for customers without an industry. |
| OPI engine | Operates on practices, weighted by lifecycle. Pillar tag becomes input to area-balanced selection in `select-focus-portfolio`. |
| Focus portfolio | Selects across pillars (one per quarter from each? or weighted by lifecycle?) — design decision documented in the engine. |
| Maturity rubrics | Per-practice 5-level rubric. Industry templates suggest rubrics; customer can edit. |
| KPIs / metric tables | Become first-class with pillar tagging. |
| Governance views | Per-pillar drill-down + cross-pillar rollups. Three views (executive / board / operator) × 8 pillars = a clean matrix. |

---

## Where customisation lives

| What's customisable | Per-customer | Per-template | Default |
|---|---|---|---|
| Pillar names (display) | Yes (cosmetic — they can call "Customer" "Patient" or "Student") | Yes | "Direction / Customer / Delivery / Economics / People / Technology / Governance / Innovation" |
| Pillar order in UI | Yes | Yes | Default order matches the table above |
| Practices per pillar | Yes (add / drop / edit) | Yes (suggests starting set) | Empty |
| KPIs per pillar | Yes (add / drop / edit) | Yes (suggests starting set) | Empty |
| KPI thresholds (red / yellow / green) | Yes (per metric) | Yes (suggests defaults) | None |
| KPI source (manual / webhook / connector) | Yes (per metric) | — | Manual |
| Lifecycle weights (OPI) | Yes (per company; can override pillar weighting) | Yes (suggests by lifecycle stage) | bds-OS defaults |
| Maturity rubrics (5 levels per practice) | Yes (edit any level) | Yes (suggests starting rubric) | None until M5 (evidence loop) |

The pillars themselves — the 8 of them — are **not customisable**. That's the only fixed thing. Everything inside is the customer's call.

---

## Open design decisions

These are choices we'll need to make as we build, recorded here for cross-session continuity:

1. **What if a customer's practice doesn't map to any of the 8 pillars?** — they tag it `Other` (a 9th catch-all). If `Other` grows large, that's a signal to consider whether the framework needs expansion.
2. **Should a practice or metric be allowed to belong to more than one pillar?** — recommendation: **no** for v1 (keeps MECE clean and rollups simple). Practices that span are tagged to their primary pillar.
3. **Should the 8 pillars be the same name across customers?** — yes for the underlying schema (`pillar_id` is fixed). Display names can be customised per customer (e.g., "Customer" → "Patient" for hospital, "Student" for university).
4. **Cross-template content** — when do we let a customer say "use the hospital template's Delivery pillar but the SaaS template's Technology pillar"? — v2 feature; v1 is single-template-then-customise.
