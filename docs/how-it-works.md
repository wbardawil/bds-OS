# How BDS OS works

A plain-English guide to what each piece of the system does, how they connect, and how we keep them aligned. Read this first if you're confused about why we have multiple repos and what does what.

---

## The three pieces

### 1. Lovable — the frontend
Lovable is a visual app builder. You describe what you want in plain English (*"add a button that lets the user score this practice 1–5"*) and Lovable generates the actual UI — the buttons, forms, and pages your friend will see in the browser.

Lovable's code lives in its own repo: `wbardawil/strategy-spark-86`.

### 2. Supabase — the backend
Supabase is where your data lives. Every assessment score, every initiative, every approval goes into Supabase's database. Supabase also handles login (sign-up with email and password) and runs small server-side scripts called **edge functions**.

You have one Supabase project. It's linked to Lovable. Lovable knows how to talk to it.

### 3. bds-OS (this repo) — the brains
The clever parts of the product live here as code:
- The OPI scoring math
- The AI evidence grader
- The focus-portfolio selector
- The lifecycle weights

This repo also contains:
- The **database schema** (so Supabase knows what tables to create)
- The **edge functions** (so Supabase knows what scripts to run)
- The **seed data** (the 82 practices, 8 areas, 410 rubric entries)

When this repo is deployed to Supabase, Supabase gets all the brains.

---

## How they connect

```
   Your friend's browser
            │
            ▼
       Lovable UI         ← what your friend sees and clicks
            │
            ▼
        Supabase          ← stores data + runs server scripts
            ▲
            │
         bds-OS           ← the source code that defines what Supabase does
```

Your friend never touches `bds-OS` directly. They use Lovable's UI, which talks to Supabase, which runs the code we wrote in this repo.

---

## What can go wrong: drift

Lovable and Supabase are separate systems. If you change one, the other does **not** automatically update.

| If you change... | Effect |
|---|---|
| Add a button in Lovable that saves data | Supabase needs a place to store it — *or the button breaks* |
| Add a column in Supabase | Lovable doesn't know the column exists — *nothing in the UI uses it* |
| Change a database rule in Supabase | Lovable's queries can silently fail |

This mismatch is called **drift**. Preventing it is the main reason we keep two sync artifacts (next section).

---

## How we prevent drift: the two sync artifacts

Both kept up to date in this repo. Lovable consumes both.

### `src/types/Database.ts`
A code file listing every table, every column, every type. Lovable **copies** this file into its own codebase. When Lovable writes code that talks to the database, it uses these types — so if Lovable accidentally tries to read a column that doesn't exist, the build fails immediately instead of silently breaking in production.

### `docs/frontend-contract.md`
A plain-English contract that lists:
- Every edge function (URL, what it expects, what it returns)
- The recommended user flow (which screen calls which function in what order)
- Auth rules (who can do what — admin vs leader vs functional_lead)

You **paste** this contract into Lovable's chat as a one-time instruction. Lovable rebuilds its UI to match.

When the backend changes, we update both files and you re-paste the diff into Lovable. That's the entire sync loop.

---

## Decisions we've made (durable rules)

1. **Source of truth = this repo.** Lovable consumes our contract, not the other way around.
2. **`bds-OS` owns the smart code** — engines, edge functions, schema migrations, seed data. These are versioned and reviewable.
3. **Lovable owns the UI** — pages, forms, styling, navigation, empty states.
4. **Schema changes go through `bds-OS` first**, then propagate to Lovable via the contract.
5. **Lovable's Supabase-MCP feature is OFF** for now. (That feature lets Lovable write migrations directly. Useful, but if turned on, Lovable becomes the source of truth for the database, and `bds-OS` drifts. We can revisit later.)
6. **No copy-pasting tokens or running long shell commands** between systems. Sync happens via paste-once contract files, not CLI gymnastics.

---

## Common terms (glossary)

- **Backend**: the server-side code and database (Supabase + this repo)
- **Frontend**: what the user sees in their browser (Lovable's output)
- **Edge function**: a small server-side script that runs on Supabase when called via HTTP
- **Migration**: a file that describes a database change (add a table, add a column)
- **Schema**: the structure of the database — what tables exist and what columns they have
- **RLS (Row Level Security)**: rules in the database that decide which rows each logged-in user can read or write. Example: *"users can only see records belonging to their organization."*
- **PostgREST**: a built-in Supabase feature that lets the frontend read and write database tables directly, without us writing custom backend code for every operation
- **Service role**: a special Supabase key that bypasses RLS — used by edge functions to do things on behalf of users
- **JWT**: the token a logged-in user carries with every request to prove who they are
- **Contract**: the agreement between frontend and backend about what endpoints exist and what shape data takes
- **Drift**: when frontend and backend get out of sync (one was changed without updating the other)

---

## When in doubt

- "Where do I add a database column?" → migration in this repo, then update the contract
- "Where do I change how a page looks?" → Lovable
- "Where do I change scoring logic?" → an engine file in this repo (`src/engines/`)
- "How does my friend get into the app?" → they sign up via Lovable's UI, which calls Supabase Auth, which creates them in the database via the `create-organization` edge function
- "What if Lovable and the backend drift?" → re-paste the latest `docs/frontend-contract.md` into Lovable
