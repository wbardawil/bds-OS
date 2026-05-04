# BDS OS — v1 Release Plan

**Target user**: a friend stepping into a CEO role, using this as a Monday-morning
management compass and ongoing monitoring tool.

**Active branch**: `claude/promote-assessments-P5G00`

---

## 1. Backend ↔ Frontend contract

The backend assumes a 5-stage flow. Lovable should have one screen (or section) per stage.

### Stage 1 — Lifecycle setup

- **Endpoint**: `POST /determine-lifecycle` → `{ organization_id }`
- **Returns**: `{ current_stage, previous_stage, changed, inputs: { revenue_range, employee_count } }`
- **Lovable needs**: org settings screen capturing `revenue_range` + `employee_count`,
  then a "Determine lifecycle" action. Stage drives OPI weights and WIP limits — surface
  it prominently.

### Stage 2 — Assessment round (scoring)

- **Tables**: `assessment_rounds`, `round_responses` (importance 1–5, competency 1–5,
  per `practice_id`)
- **Reference data**: `areas` (8), `practices` (82), grouped by area, ordered by `sort_order`
- **Lovable needs**:
  - "New round" action → inserts `assessment_rounds`
  - Scoring grid: 82 rows × 2 Likert inputs, grouped by 8 areas
  - Save = upsert `round_responses` keyed on `(round_id, practice_id)`
  - Progress indicator (X of 82 scored); round is ready to compute only when all 82 have responses

### Stage 3 — OPI computation & phases

- **Endpoint**: `POST /compute-opi` → `{ round_id, organization_id }`
- **Returns**: `phase_summary` + `scores[]` (per practice: `final_opi`, `phase_number` 1–3,
  `priority_rank`, `risk_floor_triggered`)
- **Lovable needs**:
  - "Compute OPI" CTA on the round
  - Results page grouped by **Phase 1 Proof / Phase 2 Structure / Phase 3 Scale**, ranked
    by `final_opi` within each phase
  - Visual flag for `risk_floor_triggered`
  - Subsequent loads read from `opi_scores` directly, don't re-compute

### Stage 4 — Focus portfolio (quarterly WIP selection)

- **Endpoint**: `POST /select-focus-portfolio` → `{ organization_id, round_id, quarter }`
- **Returns**: `selected_practices[]` with `selection_reason`, plus auto-creates
  `initiatives` stubs
- **Lovable needs**:
  - "Build focus portfolio" action scoped to a quarter
  - Display selected slate with `max_active` (WIP cap), each card showing rationale
  - Link each selected practice to its generated initiative

### Stage 5 — Evidence → score change → approval

- **Initiative board**: `initiatives` with 7-status workflow:
  `backlog → planned → in_progress → evidence_ready → ai_pre_graded → pending_verification → approved`
- **Evidence upload** per initiative → row in `evidence`
- **Endpoint**: `POST /grade-evidence` → `{ evidence_id }`
- **Returns**: rubric match, `completeness_score`, `quality_score`, `level_proposal`,
  `confidence`, `recommendation`. Advances initiative to `ai_pre_graded`.
- **Score change request**: `score_change_requests` with `proposed_level` + linked `evidence_ids[]`
- **Approval**: `approvals` row by senior reviewer
- **Lovable needs**:
  - Initiative detail page with evidence list + "Grade evidence" button per item
  - AI grade output displayed as read-only cards (rubric mapping, confidence, rationale)
  - "Request score change" form (current → proposed level, attach evidence IDs)
  - Reviewer queue for `pending` `score_change_requests`

### Stage 6 — Governance dashboards

- **Endpoint**: `POST /governance-report` with `view_type ∈ executive | board | functional`
- **Lovable needs**: three distinct dashboards (don't collapse them):
  - **Executive**: active practices, P&L impact, decision cycle, risk alerts
  - **Board**: area maturity, phase distribution, operating debt, governance health
  - **Functional**: owned practices, pending evidence, coaching prompts, adoption tracking

---

## 2. v1 blockers (must ship before handing to CEO)

### Blocker 1 — No team-invitation flow (backend gap)

- Today: every team member must be created manually in Supabase Auth + `users` table.
- A CEO scoring 82 practices alone defeats the purpose — needs CFO, COO, functional
  leads scoring their own areas.
- **Fix**: add `invitations` table (token, role, org_id, invited_by, expires_at) +
  `POST /invite-user` edge function + accept-invite handler.
- **Effort**: ~0.5 day.

### Blocker 2 — No "compass" landing page (Lovable gap)

- Current plan has 6 functional screens but no Monday-morning home.
- A new CEO opening the app should see one screen with "the 3 things that matter this week."
- **Pull from existing data, no backend changes needed**:
  - Top 3 Phase-1 (Proof) practices from latest `opi_scores`
  - Risk-floor breaches from `governance-report` executive view
  - Pending approvals waiting on the CEO from `score_change_requests`
  - Active focus portfolio count vs WIP cap

### Blocker 3 — Onboarding & empty states (Lovable gap)

- A brand-new org with zero rounds will see empty dashboards everywhere.
- Each screen needs:
  - First-run checklist: "Set lifecycle → Invite team → Run first assessment → Build portfolio"
  - Inline "What is OPI?" / "What does Phase 1 mean?" tooltips
  - Maturity rubric (`maturity_levels.descriptor` + `evidence_criteria`) surfaced
    contextually when scoring a practice — don't make him guess what "Level 3" means.

---

## 3. v1.1 — soft gaps (ship without, add right after)

| Gap | Where | Effort | Notes |
|---|---|---|---|
| Practice dependencies seed | Backend, this repo | 0.5 day | Schema exists (`practice_dependencies`), 0 rows seeded. Focus portfolio works without it, just isn't smart about prerequisites. |
| Round-over-round trends | Backend, this repo | 1 day | `src/engines/operating-debt.ts:122` has a `// placeholder` — `debt_trend` hardcoded to `'stable'`. Single round is fine for first 30 days. |
| Weekly digest email | Backend (Supabase scheduled function) | 1 day | No notifications today. CEO must open the app to see what changed. |

---

## 4. v2 — deferred

- Audit log (no `audit_log` table — score changes / approvals not historically tracked)
- Mobile-optimized layouts
- PDF board-pack export
- Cross-org benchmarks at same lifecycle stage

---

## 5. Release sequence

| # | Task | Where | Effort |
|---|---|---|---|
| 1 | Invitations table + invite edge function | Backend (this repo) | 0.5 day |
| 2 | Compass / "This week" landing page | Lovable (`apps/web`) | 0.5 day |
| 3 | Onboarding checklist + rubric tooltips + empty states | Lovable (`apps/web`) | 1 day |
| 4 | End-to-end test: invite → score → compute OPI → portfolio → grade evidence → approve | Both | 0.5 day |
| 5 | Seed 20 practice dependencies | Backend (this repo) | 0.5 day (post-launch ok) |

**Total to v1**: ~2.5 days of focused work.

---

## 6. Lovable integration status

- Lovable repo: `wbardawil/strategy-spark-86`
- Integration target: `apps/web/` in `wbardawil/bds-os` (monorepo)
- Working branch: `chore/integrate-lovable`
- Method: copy current Lovable tree into `apps/web/` (squash-import, no nested `.git`)
- **Required after merge**: reconfigure Lovable to push to `wbardawil/bds-os` under
  `apps/web/` instead of the standalone repo, otherwise the two diverge.

---

## 7. Verification checklist (before handing to CEO)

- [ ] CEO can be invited via email and accept without manual DB work
- [ ] CEO can invite at least 2 leaders who can score their own areas
- [ ] First-run flow gets a brand-new org from sign-up to first OPI in < 30 minutes
- [ ] Compass landing page loads with sensible content even with zero data
- [ ] Scoring screen shows the maturity rubric inline — no need to leave the page
- [ ] OPI results page groups by Phase 1/2/3 and flags risk floors visibly
- [ ] Focus portfolio respects the WIP cap and shows selection rationale per practice
- [ ] Evidence upload → AI grade → score change request → approval works end-to-end
- [ ] All three governance views (executive, board, functional) render real data
- [ ] RLS verified: a user from org A cannot read any data from org B
