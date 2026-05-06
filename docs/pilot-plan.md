# Pilot Plan — Hospital + University in 7 Days

This is the day-by-day plan to put **two real pilot customers** (a hospital and a university) on a working version of the platform within a week. Reference for cross-session continuity.

**Status**: in progress, day 1 work begins on commit of this doc.

## What "ships" by day 7

For each pilot:
- A configured company in Lovable Cloud with its own industry-specific question set
- Leadership team invited and able to log in
- Assessment round running with relevant practices
- Consolidated results visible to the CEO/COO
- A simple Control Tower v0 page with manual KPI entry tiles

What does **not** ship in week 1 (intentional — based on what pilots ask for, layered in weeks 2+):
- OPI weighting, focus portfolio, evidence loop, governance dashboards
- Realtime tiles, alert rules, digest
- Native API integrations, Zapier webhooks
- Maturity rubrics with 5 levels per practice

## Roles in this plan

- **Me**: author all content, write all specs, write all docs, write all engine code in `bds-OS` as a reference
- **You**: review content (~30 min), paste specs into Lovable's chat, click around to verify
- **Lovable**: implement the schema changes, edge functions, UI changes based on the specs you paste

## 7-day schedule

### Day 1 — Templates + Lovable spec (me)
- Author hospital industry template: 8 categories × 5 practices = 40 practice statements
- Author university industry template: same structure = 40 practice statements
- Both grounded in standard frameworks (Joint Commission, Magnet, HFMA, AGB, regional accreditation, IPEDS)
- Write `docs/industry-templates.md` with both templates
- Write the SQL spec for a `question_sets` table + an `industry_template` field on `companies` + the seed data for both templates
- Write the Lovable prompt that asks Lovable to (1) apply the migration, (2) refactor `src/data/questions.ts` to load from DB instead of hardcoded, (3) add a template picker to the company-creation flow
- Commit + push

### Day 2 — You hand off to Lovable
- Read the hospital and university templates (~30 min). Edit any phrasing that doesn't fit your two design partners.
- Paste the Lovable prompt from day 1 into Lovable's chat.
- Lovable applies the migration and refactor. Expected runtime: ~30–60 min of Lovable iteration with you.
- Confirm in Lovable's UI that the new schema is in place and existing companies still work (backward compatibility — they default to the existing 83-question set).

### Day 3 — Lovable implements per-company customisation
- Specs from me: how a company owner can edit / add / remove practices after picking a template (Lovable component spec + supporting RLS).
- You paste into Lovable. It builds the customise screen.
- Verify a company can clone their template into "their own" set and edit.

### Day 4 — Configure the two pilot companies (you)
- Create the hospital company in Lovable with the hospital template.
- Create the university company with the university template.
- Edit any of the 40 practices in each that don't fit the specific design partners (drop, edit, or add up to 10 each).

### Day 5 — Control Tower v0 (one simple page)
- Specs from me: a `/dashboard` enhancement that adds a Control Tower section with manual KPI entry. Uses Lovable's existing `kpis` table (already in our schema design — possibly need to add to Lovable Cloud).
- You paste into Lovable.
- Verify a company can enter 5–10 KPIs and see them on a tile-grid.

### Day 6 — Invitations + buffer
- Send invitations to the hospital leadership team.
- Send invitations to the university leadership team.
- Walk through the assessment yourself (or have an internal teammate) for each pilot to sanity-check the experience.
- Fix any showstoppers.

### Day 7 — Launch
- Both leadership teams have access.
- 15-minute walkthrough call (or async video) with each pilot.
- Done.

## Buffer realism

The biggest risk is day 2's Lovable refactor (loading questions from DB instead of hardcoded). That can balloon to 1–2 days because Lovable may regenerate components in unexpected ways and need iteration. If it slips, day 7 launch becomes day 8 or 9.

Other risk: the question content not landing well with the actual design partners. Mitigation: day 4 includes editing — you can drop or rewrite questions before the leadership team sees them.

## What happens after week 1

Based on which pilot wants what (we don't presuppose), we sequence the next milestones from `docs/integration-plan.md`:

- If a pilot wants prioritisation → ship M3 (OPI) and M4 (focus portfolio)
- If they want execution tracking → ship M6 (evidence loop) — needs maturity rubrics, which is multi-week content
- If they want live dashboards beyond manual entry → ship M5 (Control Tower v1) full version
- If they want integrations → ship M9 (Stripe / their CRM)

Don't build the deeper layers speculatively. Wait for pilot signal.

## Success criteria for the pilot

By end of week 1:
- Both leadership teams can sign in
- Both can complete the assessment
- The CEO/COO of each can see consolidated team results
- Both can manually enter 5+ ongoing KPIs
- Neither has a "this doesn't apply to my industry" objection on the questions

If 3 of those 5 are met by day 7, the pilot is alive. If 5 of 5, we've validated the product direction.
