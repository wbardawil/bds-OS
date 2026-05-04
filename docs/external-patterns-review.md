# External Patterns Review — gstack & gsd-2

Audit of two repos imported into `imports/` on the `chore/import-gstack-gsd` branch:

- **`gstack`** (~40 MB): an AI-agent / Claude Code tooling framework — skills, model overlays, browser automation, Supabase telemetry.
- **`gsd-2`** (~34 MB): an Electron + Next.js IDE for managing AI coding sessions.

Both are unrelated products to `bds-OS` (a P&L management-maturity tool). **They are not merged as code.** This document records which transferable patterns are worth extracting, and which to skip.

Once the four ABSORB items below are implemented in `bds-OS`, the `imports/` directory and the `chore/import-gstack-gsd` branch can be deleted.

---

## ABSORB — high value, do these

### A1. Audit log + RLS tightening (Supabase)
- **Source**: `imports/gstack/supabase/migrations/001_telemetry.sql`, `002_tighten_rls.sql`
- **Why**: `bds-OS` has zero audit trail today. Score changes, evidence approvals, initiative status changes are all unrecorded historically. This is listed as a deferred v2 gap in `docs/v1-plan.md` — gstack's pattern makes it a 1–2 hour job, so we should pull it forward.
- **Pattern**:
  - `audit_log` table: `(id, user_id, action, resource_type, resource_id, before jsonb, after jsonb, created_at)`
  - Indexes on `(user_id, created_at)` and `(resource_type, resource_id)`
  - RLS: authenticated users INSERT + SELECT their own rows; service_role SELECT all
  - Tighten existing RLS in a separate migration — never broad DROP, narrow incrementally
- **Effort**: ~2 hours
- **Action**: new migration `supabase/migrations/<date>_create_audit_log.sql`; trigger writes from edge functions on score-change approvals, evidence grading, initiative status transitions.

### A2. Onboarding wizard (frontend, blocks v1)
- **Source**: `imports/gsd-2/web/components/gsd/onboarding/`, `onboarding-gate.tsx`, `wizard-stepper.tsx`
- **Why**: This directly maps to v1 blocker #3 (onboarding / empty states / first-run flow). gsd-2's wizard is well-structured: step array, locked/unlocked steps, AnimatePresence for transitions, gate component that wraps the whole app until onboarding is complete.
- **Pattern**:
  - `wizard-stepper.tsx` (reusable, framework-only — no business logic, port verbatim)
  - Step components per concern (welcome, mode, provider, ready, etc.)
  - `onboarding-gate.tsx` wrapper that renders the wizard until a state flag flips
- **Adapt for `bds-OS`**: steps become `welcome → set-lifecycle → invite-team → first-assessment → ready`
- **Effort**: ~8–12 hours in Lovable (`apps/web/`)
- **Action**: do this **after** A3 (invitations) lands — the team-invite step depends on it.

### A3. Bearer-token middleware for protected routes
- **Source**: `imports/gsd-2/web/middleware.ts`, `web/lib/auth.ts`, `web/lib/auth-guard.ts`
- **Why**: `bds-OS` will need to expose protected API routes for the invitation flow (v1 blocker #1). Supabase Auth handles user sessions, but we'll have routes that need a second-layer guard.
- **Caveat**: Only adopt if we end up with non-Supabase API routes. If the invitation flow is built entirely as Supabase edge functions with the user's session JWT, this is unnecessary.
- **Effort**: ~2–3 hours if needed; skip otherwise.
- **Decision needed**: defer until A4 (invitations) is being implemented.

### A4. Minimal CI gate
- **Source**: inspired by `imports/gstack/.github/workflows/` — don't copy verbatim, take the tier concept
- **Why**: `bds-OS` has zero CI today. A new commit can break typecheck, migrations, or seed data and we won't notice until someone runs locally.
- **Minimum viable gate** (runs on every PR):
  - `tsc --noEmit` (already wired as `npm run typecheck`)
  - SQL migration sanity (currently no tooling — start with a `supabase db reset` dry-run inside CI)
  - Secret scan (GitHub's push protection covers this for us already, but a CI scan adds redundancy)
- **Effort**: ~3–4 hours for a single workflow file
- **Action**: new `.github/workflows/gate.yml`. Defer the "periodic" tier (LLM evals, end-to-end) until later — overkill for v1.

---

## INSPIRE — concept worth borrowing, don't copy verbatim

### I1. Documentation depth (`gstack/CLAUDE.md`, `AGENTS.md`, `ETHOS.md`)
gstack maintains 750+ line CLAUDE.md, separate AGENTS.md for AI collaboration norms, ETHOS.md for product principles. Our `CLAUDE.md` is 100 lines and intentionally scoped. The structural takeaway: split as the project grows — a separate `AGENTS.md` for AI-specific conventions (when/how to call subagents, when to write docs, branch naming) keeps `CLAUDE.md` focused on "what is this project."

**When to act**: only when the team grows beyond solo + Claude. Premature now.

### I2. Tiered test strategy
gstack splits tests into gate (free, fast, blocks merge), periodic (paid LLM evals, weekly cron), experimental (long-running, non-blocking). Useful framing if `bds-OS` ever adds expensive end-to-end tests against a real Supabase instance. Skip until we have that problem.

### I3. Telemetry table for product analytics
Beyond audit logging (A1), gstack has a separate `telemetry` table for anonymous product usage. For `bds-OS` this could surface "which assessment areas get scored first," "where users drop off in onboarding." Defer to post-v1.

---

## SKIP — does not apply

| Pattern | Source | Why skip |
|---|---|---|
| Skill template system (`SKILL.md`, `gen-skill-docs.ts`) | gstack | We're not building a skills platform |
| Browser automation, prompt-injection ML defenses | gstack `browse/` | We don't drive untrusted browsers |
| Electron + TUI architecture | gsd-2 | Wrong tech stack — we're a web app |
| Multi-package monorepo with 20+ workspaces | gsd-2 | Premature for our size; revisit if we add a CLI |
| MCP client / coding-agent session management | gsd-2 | Different product entirely |
| Complex test harnesses (CLI subprocess, NDJSON parsing) | gsd-2 | Wrong shape for a Supabase backend |

---

## Updated v1 sequence (incorporating this audit)

The v1 plan in `docs/v1-plan.md` was 5 items. This audit doesn't change the v1 blockers, but it changes *how* we do them and adds a cheap pre-v1 quality bar.

1. **Pre-v1 hygiene** (new — from this audit)
   - A4: minimal CI gate (3–4h)
   - A1: audit log migration (2h, can ship pre-v1 since it's additive)
2. **Invitations** (v1 blocker #1, unchanged from `docs/v1-plan.md`)
   - Add `invitations` table + edge function (~0.5 day)
   - Decide A3 (bearer middleware) here based on architecture
3. **Compass landing page** (v1 blocker #2, in Lovable)
4. **Onboarding wizard** (v1 blocker #3, in Lovable)
   - Use A2 pattern as the architectural template
5. **End-to-end test pass**
6. **Cleanup**: delete `imports/` and the `chore/import-gstack-gsd` branch

Total: ~3 days of focused work, ~half a day longer than the original plan because of the CI gate and audit log additions. Worth it for the long-term health of the codebase.

---

## Deletion plan for `imports/`

Once A1, A2, A4 are implemented (A3 conditional):

```bash
git checkout main
git branch -D chore/import-gstack-gsd  # local
git push origin --delete chore/import-gstack-gsd  # remote
```

`imports/` only exists on `chore/import-gstack-gsd`, so deleting that branch removes everything. No cleanup commit needed on `main`.
