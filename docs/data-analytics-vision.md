# Data & Analytics Vision

This doc captures a foundational product principle: the platform is its own analytics surface. We do **not** layer on top of a Power BI / Tableau / Looker semantic-modelling step. We aim closer to **Grafana** (live, configurable widgets pulling directly from data sources) and **Julius AI** (natural-language analytics that produce charts on demand) — applied to operating data instead of generic BI.

This is an architectural direction, not a v1 feature. v1 ships manual KPI entry + simple tiles. The vision below is what v2/v3/v4 evolve into. It's recorded here so sessions don't re-litigate the direction and so the data model we build now leaves room for it.

---

## Why not Power BI / Tableau / Looker as a layer

The traditional BI stack is heavy:
- A data warehouse (Snowflake / BigQuery / Redshift)
- An ELT layer (Fivetran / Airbyte / Stitch) pulling source data into the warehouse
- A semantic model (LookML / Tableau Calculated Fields / Power BI dataflows)
- A dashboarding tool the user interacts with

For an operating compass aimed at executives at a $6M university or a $50M hospital, that stack is:
- Expensive (often $20K–100K+ a year just for tooling)
- Slow to set up (weeks of data engineering before anything renders)
- Requires a data team to maintain
- Disconnects "what we measure" from "what we do about it"

We bypass that layer. The customer's operating data flows directly into our platform's database (Lovable Cloud / Supabase under the hood), and our UI is the dashboard. No semantic layer in between, no separate BI seat licences.

---

## What the experience looks like (target state, v3+)

**Live widgets, like Grafana for executives:**
- Tiles on a Control Tower home page — number, trend, gauge, sparkline, table
- Each tile pulls from a metric defined in the platform
- Thresholds (red/yellow/green) configurable per metric
- Real-time updates via Supabase Realtime — when a connector pushes new data, the tile re-renders without refresh
- Drag-and-drop dashboard authoring — pick a metric, pick a viz type, drop on the canvas

**Natural-language query, like Julius:**
- Chat box on the control tower: *"show me revenue trend the last 12 months"*
- AI translates the question into a query against the metric_values table
- Renders the result as a chart inline in the chat
- Customer can pin the chart to their dashboard or save it for later

**No-modelling data plumbing:**
- Connectors (Stripe, HubSpot, QuickBooks, etc.) push raw values into `metric_values`
- A connector defines its own mapping (Stripe MRR → metric_id 'revenue.mrr')
- Customer doesn't model dimensions or measures — the connector does it
- For unknown sources, customer uses the generic webhook + maps the field once

---

## Where this connects to existing architecture

The framework (`docs/framework.md`) already supports this conceptually:
- Each pillar has a monitoring lens with metrics
- Metrics have a `source` enum (manual / webhook / connector_*)
- Metric values are time-series

What needs to be added (over time, not for v1):

### v2 additions
- **`dashboards`** table — per company, multiple dashboards possible (default = control tower home)
- **`widgets`** table — per dashboard, composing the layout
  - `widget_type` (number, sparkline, line_chart, bar_chart, gauge, table)
  - `metric_id` (FK to metrics)
  - `position` (x, y, w, h)
  - `threshold_config` (overrides metric's thresholds for this widget)
- **Generic webhook endpoint** — accepts `{ company_id, metric_id, value, timestamp }` from any source (Zapier, Make, n8n, custom integration)
- **First two native connectors** — Stripe + a CRM (HubSpot or similar)

### v3 additions
- **Natural-language query** — chat surface that:
  1. Takes the question and the company's metric metadata
  2. Calls Claude (or similar) to generate a SQL query against `metric_values` (RLS-scoped to the company)
  3. Executes with a strict timeout and row limit
  4. Infers a chart type from the result shape
  5. Renders inline + offers "pin to dashboard"
- **SQL connector** — read-only access to customer's PostgreSQL / MySQL / Snowflake. Customer provides connection string; we run scoped queries.
- **BI source connector** — query the customer's existing Looker / Tableau semantic layer, so they can keep their existing models and use us as the executive UI on top.

### v4 additions
- **Custom widgets** — low-code widget builder with formula bar
- **Embedding** — use our widgets in their existing tools (iframe + signed URL)
- **Public API** — programmatic access to metric_values

---

## What we're NOT building (intentional)

- A data warehouse / OLAP cube layer. Customer's data lives in our operational database with a sensible schema, that's it.
- A semantic modelling layer. Each connector knows what it produces; customer doesn't define dimensions/measures.
- A general-purpose BI tool that competes with Tableau. We're an **operating compass** with analytics built in, not a horizontal BI product.
- Anything that requires the customer to hire a data engineer. The bar is "an executive sets it up themselves in an hour or fewer."

---

## How v1 stays consistent with this direction

The 7-day pilot ships:
- Manual KPI entry (matches the "no data team needed" principle)
- Simple number tiles on a basic Control Tower (the foundation that v2 evolves into)
- No connectors, no NL query, no widget editor — too much for 7 days, but the data model leaves room for them

If we get the data model right in v1, v2/v3/v4 are extensions, not rewrites.

### Concrete v1 data-model decisions that protect this future

1. **`metric_values` is time-series shaped from day 1**, even if v1 just inserts one row per manual entry. Future connectors / NL queries assume time-series.
2. **`metrics` table has a `source` field**, even if v1 always sets it to `manual`. Future connectors set it to `connector_stripe` etc.
3. **`metrics` belongs to a pillar** (FK to pillars). NL queries can leverage pillar context: *"how is the Customer pillar trending?"*
4. **`metrics` has explicit `unit` and `target_value`**. Widgets and NL queries use these for formatting and thresholds.
5. **`dashboards` and `widgets` tables ship in v2, but the `metrics` table's design supports being queried directly** in v1. No coupling that we'd have to break later.

---

## Open design decisions (record as we make them)

1. **NL query backend** — Claude API direct? Or via Lovable's edge function? Tradeoffs: latency, cost, security (don't want customer questions leaking into Claude training).
2. **Embedding strategy** — iframe with signed URLs? Web component? Server-rendered images?
3. **Customer-owned data warehouse** — if the customer has a Snowflake, do we read from it or replicate into our DB? Probably read directly via SQL connector, but RLS / security implications need careful design.
4. **Real-time vs near-real-time** — Supabase Realtime is good for sub-second updates within our DB. For external-source freshness, we depend on connector polling cadence (every 5 min, every hour, on-webhook).

---

## Why this matters for the framework

The framework (8 pillars, MECE) is the operating layer. The data analytics direction in this doc is the monitoring + insight layer that sits on top. Together they are the "operating + monitoring system" the user described.

Without this direction, the framework is just an assessment tool. With it, the framework becomes the structure for a live, queryable, customisable executive command centre — which is the actual product.
