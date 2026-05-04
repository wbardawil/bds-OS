# BDS OS — Frontend Contract

**Audience**: Lovable (and any other frontend that talks to the bds-OS Supabase backend).

**Purpose**: the single source of truth for what endpoints exist, what shapes data takes, what auth is required, and the canonical user journey. The frontend should not deviate from this contract. When the contract changes, this file is updated and the diff is re-pasted into Lovable.

Companion file: `src/types/Database.ts` — the TypeScript types Lovable should use with `createClient<Database>(...)`.

---

## 1. Project setup

Lovable needs two environment values:

| Variable | Where to find it | What it's for |
|---|---|---|
| `VITE_SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) | Supabase project → Settings → API → Project URL | The backend host |
| `VITE_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`) | Supabase project → Settings → API → anon public key | Client-safe key. RLS enforces what each user can see. |

Initialise the client once:

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types/Database';

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
```

---

## 2. Authentication

### Sign-up
Use Supabase Auth's standard email + password sign-up:

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'newuser@example.com',
  password: '...',
  options: { data: { name: 'New User' } },
});
```

After sign-up the user has an `auth.users` row but **no `users` row in our application schema yet**. They cannot read or write any organisation-scoped data until either:
- They call **`create-organization`** (first-time setup), or
- They call **`accept-invitation`** with a token they were emailed.

### Sign-in (returning user)
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'returning@example.com',
  password: '...',
});
```

### Session token
Every request carries the user's JWT automatically (the Supabase client handles it). Edge functions read it from the `Authorization: Bearer <jwt>` header.

---

## 3. The canonical user journey

### Path A — first-time admin (creates an organisation)

1. **Sign up** via `supabase.auth.signUp` (above).
2. **Land on a "create your organisation" screen**. Required field: name. Optional: industry, revenue_range, employee_count, years_in_operation.
3. **Call `create-organization`** (edge function — see §5). On success the user becomes an admin of the new org.
4. **Set lifecycle**: call `determine-lifecycle` to compute the org's lifecycle stage.
5. **Start a new round**: insert a row into `assessment_rounds`.
6. **Score practices**: for each of the 82 practices, upsert into `round_responses` with `importance_score` and `competency_score` (1–5 each).
7. **Compute OPI**: call `compute-opi` once all 82 scored.
8. **View results**: read from `opi_scores` grouped by `phase_number` (1=Proof, 2=Structure, 3=Scale).
9. **Build focus portfolio** (optional this round): call `select-focus-portfolio` with a quarter string.

### Path B — invited teammate (joins an existing organisation)

1. **Receive invitation email** with a link `https://app.../accept-invite?token=...`.
2. **Open link**. Frontend reads the token from the URL.
3. **Sign up or sign in** via Supabase Auth using the same email the invitation was sent to.
4. **Call `accept-invitation`** with the token. On success the user is added to the org with the role specified in the invitation.
5. From here the user can score practices, see results, etc., scoped to their org.

### Path C — returning user (already a member)

1. **Sign in** via `signInWithPassword`.
2. **Read their `users` row** to get `organization_id` and `role`:
   ```typescript
   const { data: user } = await supabase.from('users').select('*').single();
   ```
3. Route to dashboard. RLS scopes everything else to their organisation automatically.

---

## 4. Direct database access (PostgREST)

These tables are safe for the frontend to read/write directly via the Supabase JS client. RLS enforces organisation scoping.

### Reference data — read-only for everyone authenticated

| Table | Use |
|---|---|
| `areas` | list 8 areas to group practices for the scoring UI |
| `practices` | list 82 practices, joined to `area_id` |
| `practice_metadata` | needed for advanced UIs (rarely read directly) |
| `maturity_levels` | display rubric descriptors and evidence criteria when scoring or uploading evidence |
| `practice_dependencies` | currently empty in seed; safe to query |
| `lifecycle_weights` | reference, rarely needed by frontend |

### Organisation-scoped tables — read/write subject to RLS

| Table | Frontend read | Frontend write |
|---|---|---|
| `organizations` | own org only | UPDATE own org (e.g. revenue_range, employee_count) |
| `users` | own org's users | not directly — use `create-organization` / `accept-invitation` |
| `assessment_rounds` | own org's rounds | INSERT to start a new round |
| `round_responses` | own org's responses | INSERT/UPDATE — upsert by (round_id, practice_id) |
| `opi_scores` | own org's scores | **read-only** — only edge function `compute-opi` writes here |
| `focus_portfolios` | own org's portfolios | **read-only** — only edge function `select-focus-portfolio` writes here |
| `initiatives` | own org's initiatives | INSERT/UPDATE allowed |
| `evidence` | own org's evidence (via initiative) | INSERT allowed; grading is via `grade-evidence` |
| `score_change_requests` | own org's requests | INSERT/UPDATE for state transitions |
| `approvals` | own org's approvals (via score_change_request) | INSERT allowed |
| `meetings`, `kpis`, `adoption_metrics` | own org's | INSERT allowed |
| `audit_log` | own org's audit entries | INSERT allowed but normally written by edge functions |
| `invitations` | own org's invitations (to show pending list) | **never INSERT/UPDATE directly** — use edge functions |

### Example: list practices grouped by area

```typescript
const { data: areas } = await supabase
  .from('areas')
  .select('id, name, sort_order, practices(id, name, sort_order)')
  .order('sort_order');
```

### Example: upsert a score response

```typescript
const { error } = await supabase
  .from('round_responses')
  .upsert(
    {
      round_id,
      organization_id, // from current user's row
      practice_id,
      importance_score, // 1..5
      competency_score, // 1..5
      responded_by: user.id,
    },
    { onConflict: 'round_id,practice_id' },
  );
```

---

## 5. Edge functions reference

All edge functions live at:
```
{SUPABASE_URL}/functions/v1/{function-name}
```

The Supabase JS client wraps this:
```typescript
const { data, error } = await supabase.functions.invoke('compute-opi', {
  body: { round_id, organization_id },
});
```

The client adds the `Authorization: Bearer <jwt>` header automatically.

### `create-organization`
First-time setup for a freshly signed-up user. Creates an organisation and makes the caller its admin.

| | |
|---|---|
| **Method** | POST |
| **Auth** | required (JWT) |
| **Caller** | must NOT already be in any org |
| **Body** | `{ name: string, industry?: string, revenue_range?: string, employee_count?: number, years_in_operation?: number }` |
| **Response** | `{ organization_id, organization_name, user_id, role: 'admin' }` |
| **Errors** | 401 unauthenticated, 409 already in an org, 400 missing name |

### `determine-lifecycle`
Computes the org's lifecycle stage from revenue range and employee count. Updates `organizations.lifecycle_stage` if changed.

| | |
|---|---|
| **Method** | POST |
| **Auth** | required (JWT, member of org) |
| **Body** | `{ organization_id: string }` |
| **Response** | `{ organization_id, previous_stage, current_stage, changed: boolean, inputs: { revenue_range, employee_count } }` |

### `compute-opi`
Computes OPI scores for all practices in a round and writes them to `opi_scores`.

| | |
|---|---|
| **Method** | POST |
| **Auth** | required (JWT, member of org) |
| **Body** | `{ round_id: string, organization_id: string }` |
| **Response** | `{ organization_id, round_id, lifecycle_stage, lifecycle_mod, total_practices, phase_summary: { proof: number, structure: number, scale: number }, scores: OPIScore[] }` |
| **Errors** | 400 if not all practices scored; 404 if round not found |

After a successful call, frontend should read from `opi_scores` directly to display.

### `select-focus-portfolio`
Picks the practices to actively work on for a given quarter, applying WIP cap and selection rules.

| | |
|---|---|
| **Method** | POST |
| **Auth** | required (JWT, member of org) |
| **Body** | `{ organization_id: string, round_id: string, quarter: string }` (quarter format: `'2026-Q2'`) |
| **Response** | `{ organization_id, round_id, quarter, lifecycle_stage, max_active, selected_practices: [{ practice_id, practice_name, selection_reason, final_opi, phase_number }], initiatives_created: number }` |

### `grade-evidence`
AI-grades a piece of evidence against the practice's maturity rubric. Updates `evidence` and advances initiative status to `ai_pre_graded`.

| | |
|---|---|
| **Method** | POST |
| **Auth** | required (JWT, member of org) |
| **Body** | `{ evidence_id: string }` |
| **Response** | grading result with `rubric_mapping`, `completeness_score`, `quality_score`, `risk_flags`, `level_proposal`, `confidence`, `rationale`, `recommendation` |

### `governance-report`
Returns one of the three governance views.

| | |
|---|---|
| **Method** | POST |
| **Auth** | required (JWT, member of org) |
| **Body** | `{ organization_id: string, view_type: 'executive' \| 'board' \| 'functional', user_id?: string, reporting_period?: string }` |
| **Response** | view-specific summary (executive: active practices + risk alerts; board: area maturity + operating debt; functional: owned practices + pending evidence) |

### `invite-user`
Admin-only. Creates an invitation and emails the link via Resend.

| | |
|---|---|
| **Method** | POST |
| **Auth** | required (JWT, **role='admin'**) |
| **Body** | `{ email: string, role: 'admin' \| 'leader' \| 'functional_lead' }` |
| **Response** | `{ invitation_id, email, role, expires_at, email_sent: boolean }` — if `email_sent === false`, an `invite_url` is returned for fallback manual delivery |

### `accept-invitation`
Used by an invited user (just signed up via Supabase Auth) to claim their invitation and join an org.

| | |
|---|---|
| **Method** | POST |
| **Auth** | required (JWT, email must match invitation email) |
| **Body** | `{ token: string }` (from the invite URL) |
| **Response** | `{ user_id, organization_id, role }` |
| **Errors** | 404 token not found, 410 expired or already accepted, 403 email mismatch, 409 user already in an org |

---

## 6. RLS rules summary (what the frontend can/cannot do)

- **Cross-org reads are impossible** — every organisation-scoped table filters by `organization_id = get_user_organization_id()` automatically.
- **A user with no `users` row sees nothing** (apart from reference tables and their own `auth.users` record). This is the state immediately after sign-up; they must call `create-organization` or `accept-invitation` to get past it.
- **`opi_scores` and `focus_portfolios` are read-only for the frontend.** Compute them via their respective edge functions.
- **`invitations` cannot be written via PostgREST.** Use `invite-user` and `accept-invitation`.
- **`audit_log` is intentionally append-only** — frontend can SELECT and INSERT but never UPDATE/DELETE.

---

## 7. Error handling

Standard pattern from the Supabase JS client:

```typescript
const { data, error } = await supabase.from('round_responses').insert(...);
if (error) {
  // error.code, error.message, error.details
}
```

For edge functions:

```typescript
const { data, error } = await supabase.functions.invoke('compute-opi', { body });
if (error) {
  // error.context contains the HTTP response
}
```

Common errors and how to surface them:

| HTTP | Meaning | UI suggestion |
|---|---|---|
| 401 | Not authenticated | Bounce to sign-in screen |
| 403 | RLS denied or role insufficient | "You don't have permission for that" |
| 404 | Resource not found | "Not found" toast or redirect |
| 409 | Conflict (already exists, already in an org) | Show specific message |
| 410 | Gone (invite expired or used) | "This invitation is no longer valid" |
| 500 | Server error | "Something went wrong, try again" |

---

## 8. What the frontend should NEVER do

- Write directly to `opi_scores`, `focus_portfolios`, or `invitations`.
- Bypass `create-organization` by inserting into `organizations` and `users` directly. (RLS allows the org INSERT for owner self-creation in some patterns, but the `users` insert links to `auth.users`, and doing both client-side risks orphaned rows on partial failure.)
- Hard-code `organization_id` from the URL or local storage. Always read it from the authenticated user's `users` row.
- Cache JWTs anywhere except the Supabase client's built-in storage.
- Try to call edge functions without an Authorization header.

---

## 9. When this contract changes

Updates to this file happen when:
- A migration adds/changes a table or column
- An edge function gains/loses a parameter
- An RLS rule changes
- The user journey adds a step

Workflow:
1. The change lands in this repo.
2. `src/types/Database.ts` is regenerated.
3. This file is updated.
4. The user pastes the diff (or the whole updated section) into Lovable's chat with the prompt: *"Update the frontend to match this contract change."*
5. Lovable rebuilds the affected screens.

That's the whole sync loop.
