# Lovable Prompt — Operator Campaign Landing Page

Paste the block below into Lovable's chat editor (in your `wbardawil/strategy-spark-86` Lovable project). Lovable will create a new page at `/operators`, register the route, and wire lead capture to your existing `submit-lead` edge function. **It will not modify any existing pages.**

**When to paste:** *after* tomorrow's CEO interview wraps. Don't push code changes the night before a paid engagement, even on a separate branch.

---

## The prompt (paste this)

```
Build a new landing page in this app at the route /operators. Do NOT modify the existing / Landing page or any other existing route, component, or function.

Audience: fund operators, portfolio-company CEOs, and operating partners who run management diagnostics with leadership teams. Tone: confident, operator-grade, McKinsey-clean (not startup-y).

POSITIONING (must come through on the page, not be softened):
"Stop scoring management practices. Start ranking them by dollar return."

PAGE STRUCTURE — implement these 7 sections in order, full-width, using the existing shadcn/ui components and existing Tailwind tokens. No new colors, no new fonts, no new design system.

1) HERO BAND
- Top-left: existing logo (import from @/assets/bds-logo.png)
- Headline (big, bold, tight): Stop scoring management practices. Start ranking them by dollar return.
- Subheadline (muted): An operator-grade diagnostic for fund partners and CEOs. Most tools tell you what's broken. We tell you which 5–9 things to fix this quarter, ranked by P&L impact, speed, and risk.
- Primary CTA button: Run the diagnostic with your team — scrolls to the lead-capture form at the bottom.
- Below button, smaller text: 30 minutes per leader. Results the same day.

2) FOUR OUTCOME LENSES (2x2 grid of Cards)
Heading: Read every gap through four lenses
Subheading: Practices that hit two or more lenses are your highest-leverage moves.
- Quadrant 1: icon TrendingUp — "Makes money" — If we close this gap, what new revenue opens up?
- Quadrant 2: icon Banknote — "Saves money" — If we close this gap, what costs disappear?
- Quadrant 3: icon Clock — "Saves time" — If we close this gap, what hours come back to leadership?
- Quadrant 4: icon ShieldAlert — "Preserves money or time" — If we don't close this gap, what gets destroyed?

3) FOUR-LAYER VALUE STACK (horizontal flow, 4 numbered blocks)
Heading: From assessment to quarterly plan in four steps
1. Diagnose — 75–85 questions across 8 domains, importance vs competency. Reveals revenue leaks and operational friction the team can't see from inside.
2. Prioritize — The OPI engine ranks every practice by P&L impact × speed × dependency × risk × company stage. Tells you exactly where the next leadership hour earns the highest return.
3. Execute — A focus portfolio picks 5–9 practices for the quarter under WIP limits matched to your lifecycle stage. Prevents scattered effort, the silent killer of operator time and money.
4. Verify — Every maturity upgrade requires evidence, AI-graded, senior-approved. Credible upgrades become credible board reporting, which is credible fundraising signal.

4) COMPARISON TABLE
Heading: Why operators pick this over the alternatives
Three columns: Tool | What they tell you | What we tell you
Rows:
- Scaling Up / EOS | "Score yourself, work on it." | "Here are the 5–9 specific practices to fix this quarter, ranked by dollar return."
- McKinsey / BCG diagnostics | "A 60-page deck three months later." | "A live priority list in the same week, recomputable as you progress."
- Generic maturity assessments | "You're at level 2, get to level 3." | "Going from 2 to 3 here is worth $X. Going from 2 to 3 over there isn't. Do this first."

5) FIVE INTERVIEW PROBES (vertical list with icons)
Heading: Five questions to ask your team — beyond the assessment
Subheading: The assessment captures what they think. These probe whether they operate like it.
1. Pricing power. When was the last time we raised prices, and what happened?
2. Unit-economics literacy. Without looking it up, what's our blended CAC and customer LTV?
3. WIP discipline. How many strategic initiatives are in flight right now? More than nine = scattered effort = quiet money loss.
4. Forecast accuracy. Last quarter's pipeline forecast vs. actual — how close were we?
5. Performance honesty. When did you last move on from a B-player who was blocking an A-player?

6) SOCIAL PROOF SLOT (placeholder)
A single Card with subtle background and italic placeholder text: "Quotes from operators who've run this diagnostic — coming soon." Leave clean structure we can replace later with one quote + name + fund/company.

7) LEAD CAPTURE
Heading: Run it with your leadership team this quarter
Subheading: Drop your details. We'll send you a share-code link your team can use, plus a brief on how to read the results before you sit down with them.
Form fields: Name, Email, Company name, optional checkbox "I'd like to talk before I run it."
On submit, call the existing submit-lead edge function with the same payload shape it already accepts (use the existing leads table). On success, show a success state in place of the form: "Check your inbox in a moment." Reuse the existing LeadCapture / LeadGateModal pattern — do not invent a new flow.

ROUTING
Add the route /operators in src/App.tsx (or wherever routes are registered). Do not change any existing route.

STYLING
Match the existing app's styling exactly. Use container width, spacing, type scale, and color tokens that already exist. No new colors, no new fonts. The page should feel like it belongs in the same product.

LANGUAGE
English only for now. Spanish translation in a follow-up.

CONSTRAINT
Do NOT touch the existing / Landing page, the existing assessment flow, RoundAssessment, RoundDetail, or any existing edge functions other than calling submit-lead from the new form. Strict scope: only add the new /operators page and register its route.
```

---

## After Lovable runs it

1. Lovable will commit the new page to your GitHub repo automatically and open a PR (or push directly, depending on your setup).
2. Review the preview in Lovable, edit copy in chat if needed.
3. Merge to `main`. Page is live at `https://[your-domain]/operators`.
4. Test the lead-capture form once with your own email — confirm a row lands in the `leads` table and the email arrives.
