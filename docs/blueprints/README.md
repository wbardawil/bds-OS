# Integration Blueprints

M1 deliverables for the bds-OS ↔ strategy-spark-86 integration. Each file here is **specification**, not deployed code. The deployed copies live in `wbardawil/strategy-spark-86/supabase/` and get there via PR (see `../integration-plan.md` D8).

## Layout

```
blueprints/
├── README.md                        (this file)
├── migrations/                      SQL to add to strategy-spark-86/supabase/migrations/
│   ├── 001_companies_lifecycle.sql
│   ├── 002_lifecycle_weights.sql
│   ├── 003_practice_metadata.sql
│   ├── 004_maturity_rubrics.sql
│   ├── 005_evaluation_rounds_mode.sql
│   ├── 006_opi_scores.sql
│   ├── 007_focus_portfolios.sql
│   ├── 008_initiatives_artifacts.sql
│   ├── 009_evidence.sql
│   ├── 010_score_change_requests_approvals.sql
│   ├── 011_audit_log.sql
│   └── 012_invitations.sql
└── functions/                       Deno edge function sources to add to strategy-spark-86/supabase/functions/
    ├── compute-opi.ts
    ├── select-focus-portfolio.ts
    ├── grade-evidence.ts
    ├── governance-report.ts
    └── determine-lifecycle.ts
```

## Conventions

- **Schema target**: Lovable Cloud's existing schema (`companies`, `company_members`, `evaluation_rounds`, `round_responses`, `profiles`, `leads`).
- **Tenant key**: `company_id uuid` everywhere. No `organization_id`.
- **Practice key**: `question_id text` (`'sp_1'`, `'ma_3'`, …) everywhere. No numeric `practice_id`.
- **RLS helper**: `public.has_company_role(auth.uid(), company_id, ARRAY[...]::public.company_role[])`. Don't use `get_user_organization_id()` — that's a bds-OS-only function and doesn't exist in Lovable's schema.
- **Reference data** (`practice_metadata`, `maturity_rubrics`, `lifecycle_weights`): readable by any authenticated user, no INSERT/UPDATE policies. Updated via migrations only.
- **Tenant data**: SELECT scoped by `has_company_role(...)`. INSERT/UPDATE either same scope or service-role only (for edge-function-managed tables like `opi_scores`).
- **Service-role-only writes**: `opi_scores`, `focus_portfolios`, `audit_log` (insert via member, but never edited), `invitations`. Edge functions own these.
- **No emojis** in code or comments.

## Apply order

Migrations are numbered 001–012. Apply in numeric order. 003 must precede 006/007/008/010 (they FK to `practice_metadata.question_id`). 011 (audit_log) and 012 (invitations) are independent and can land any time after 001.

## Seeds intentionally NOT included

- `practice_metadata` (75 rows): pnl_impact, speed_to_impact, dependency_score, risk_floor per question. Needs human curation. See `../integration-plan.md` open question 4.
- `maturity_rubrics` (375 rows): 5 levels × 75 questions of descriptor + evidence_criteria. Big content lift. See open question 5.

`002_lifecycle_weights.sql` ships with seed (4 rows) because the values come from `src/constants/lifecycle-weights.ts` and don't depend on Lovable's question ontology.

## Edge functions: porting notes

The blueprint files import from relative paths under `../../src/`. When porting to `strategy-spark-86/supabase/functions/<name>/index.ts`:

- The engine logic (`src/engines/opi.ts`) must travel along — either copy it into `supabase/functions/_shared/engines/opi.ts` or vendor a Deno-importable version.
- Same for `src/adapters/lovable-jsonb-to-opi-input.ts` and `src/constants/`.
- Replace bds-OS-style imports (`'../../src/engines/opi.ts'`) with the strategy-spark-86 layout (`'../_shared/engines/opi.ts'`).
- CORS headers must include `apikey` and `x-client-info` (Lovable convention; matched in the blueprint).
- Use `Deno.env.get('SUPABASE_URL')`, `SUPABASE_ANON_KEY` for user-context calls, and `SUPABASE_SERVICE_ROLE_KEY` for service writes.

The `grade-evidence` blueprint includes a TODO marker for the LLM call — wire it to the project's chosen provider (Anthropic via the Files API + a maturity-rubric prompt is the recommended default).
