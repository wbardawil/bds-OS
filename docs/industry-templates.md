# Industry Templates

Practice statements grouped by category, phrased for scoring on **importance** (1–5) × **competency** (1–5). Each practice is a thing a well-run organisation does; the leadership team rates how important it is to their context AND how well they currently do it. Gap = competency − importance (positive = strength, negative = priority).

These templates seed a customer's `question_set`. After picking a template, a customer can edit, drop, or add practices.

Sizing:
- **Hospital template**: tuned for a hospital system around US$50M revenue, **multi-facility** (small system: 2–4 facilities, possibly with affiliated outpatient clinics). References: Joint Commission, Magnet, HFMA, HCAHPS, AHA leadership competencies.
- **University template**: tuned for an institution around US$6M revenue, **multi-campus** (main + branch campuses, or a small consortium). References: SACSCOC / MSCHE / regional accreditation standards, AGB governance principles, NACUBO, IPEDS, Title IX/FERPA compliance.

## Multi-facility / multi-campus model

For both pilots, the customer organisation has **multiple sites**. The platform supports this via two patterns:

1. **Each site is its own company** in Lovable, with the same parent owner/admin. The take-over CEO sees N companies in their dashboard — one per facility / campus — and can compare. This is the **default** for week 1 because Lovable already supports it (the 3-company-per-user cap can be lifted for the pilots).

2. **Hierarchical**: a parent `company` with child `sites` rolling up. Each practice is scored at site level; system-level rollup is computed. **Deferred to v2** — requires schema changes (`sites` table, `site_id` on `round_responses`, rollup in `compute-opi`).

Practice statements below include **system-level** practices in addition to facility-level ones, so a multi-site customer can score both. Tag is in the practice ID: `*.system.*` for system-wide, default for facility/campus.

---

## Hospital Template (40 practices, 8 categories)

### Category 1 — Strategic Planning & Leadership
- `hospital.strategic_planning.1` — Vision, mission, and values are clearly articulated and consistently reinforced with clinical and administrative staff.
- `hospital.strategic_planning.2` — A documented multi-year strategic plan exists with annual measurable goals tied to community needs.
- `hospital.strategic_planning.3` — Service-line decisions (which clinical services to grow, sustain, or exit) are reviewed regularly with data.
- `hospital.strategic_planning.4` — A community health needs assessment is completed and informs strategic priorities.
- `hospital.strategic_planning.5` — The board is actively engaged in strategic direction, not just ratifying decisions.
- `hospital.strategic_planning.system.1` *(multi-facility)* — Service-line strategy is coordinated across facilities (avoiding duplication, leveraging centres of excellence) rather than each facility competing.
- `hospital.strategic_planning.system.2` *(multi-facility)* — System-level capital allocation prioritises across facilities based on need and ROI, not equal distribution.

### Category 2 — Operations & Throughput
- `hospital.operations.1` — Emergency department patient flow (door-to-doctor, door-to-disposition) is measured and actively managed.
- `hospital.operations.2` — Operating room utilisation and turnover times are tracked with specific improvement targets.
- `hospital.operations.3` — Average length of stay is benchmarked by service line and managed through case management.
- `hospital.operations.4` — Discharge planning starts at admission and reduces readmission risk.
- `hospital.operations.5` — Clinical and non-clinical supply chain (PPE, pharmaceuticals, devices) is reliable with managed contracts.
- `hospital.operations.system.1` *(multi-facility)* — Patient transfers between facilities follow defined protocols (transfer agreements, capacity sharing) without bottlenecks.
- `hospital.operations.system.2` *(multi-facility)* — Centralised supply-chain leverage (group purchasing across facilities) is realised, not lost to local procurement decisions.

### Category 3 — Clinical Quality & Safety
- `hospital.clinical_quality.1` — Hospital-acquired infection rates (CLABSI, CAUTI, SSI, C. diff) are tracked and reduced via formal prevention bundles.
- `hospital.clinical_quality.2` — Medication safety includes reconciliation at admission, transfer, and discharge with measured error rates.
- `hospital.clinical_quality.3` — Mortality and morbidity reviews happen on a defined cadence with accountability and follow-through.
- `hospital.clinical_quality.4` — Evidence-based clinical pathways are adopted, monitored for adherence, and updated.
- `hospital.clinical_quality.5` — A non-punitive event-reporting culture exists; safety events surface and lead to system change.

### Category 4 — Patient Experience
- `hospital.patient_experience.1` — HCAHPS performance is monitored monthly with action plans for the lowest-scoring dimensions.
- `hospital.patient_experience.2` — Care coordination across inpatient, outpatient, and post-acute settings is measured and improving.
- `hospital.patient_experience.3` — Shared decision-making and informed consent are practiced and audited, not just documented.
- `hospital.patient_experience.4` — Access metrics (third-next-available appointment, wait times) are tracked and managed.
- `hospital.patient_experience.5` — A service-recovery process exists and front-line staff are empowered to use it.

### Category 5 — Workforce & Culture
- `hospital.workforce.1` — Clinical staff turnover is tracked by role and unit; targeted retention programs exist for highest-risk roles.
- `hospital.workforce.2` — Burnout and wellness are measured (e.g., Maslach, MBI) and resourced with concrete programs, not just statements.
- `hospital.workforce.3` — Diversity, equity, and inclusion are part of hiring, promotion, and clinician-patient communication training.
- `hospital.workforce.4` — A leadership development pipeline exists (charge nurses, mid-level managers, succession plans for key clinical leaders).
- `hospital.workforce.5` — Just-culture and psychological safety principles are practiced — staff report concerns without fear of retaliation.

### Category 6 — Financial Performance
- `hospital.financial.1` — Revenue cycle is managed against targets (denial rate, days in AR, clean-claim rate, point-of-service collection).
- `hospital.financial.2` — Cost per case is tracked by service line and benchmarked externally.
- `hospital.financial.3` — Payer mix is monitored and contracts are renegotiated on a defined cadence.
- `hospital.financial.4` — Capital planning is disciplined (multi-year capital plan, ROI requirements, deferred maintenance tracked).
- `hospital.financial.5` — Productivity (FTE per adjusted patient day, hours per unit of service) is benchmarked and managed.

### Category 7 — Compliance & Accreditation
- `hospital.compliance.1` — Joint Commission readiness is continuous, not a fire drill before survey.
- `hospital.compliance.2` — HIPAA privacy and security program is documented, audited, and includes regular workforce training.
- `hospital.compliance.3` — Regulatory and CMS condition-of-participation changes are tracked and implemented systematically.
- `hospital.compliance.4` — Risk management and incident response process exists with claims tracking and root-cause analysis.
- `hospital.compliance.5` — Quality reporting (CMS IQR, OQR, value-based programs) is accurate, on time, and used to drive improvement.

### Category 8 — Technology & Information Systems
- `hospital.technology.1` — EHR is optimised for clinician workflow; clinician satisfaction with the EHR is measured and acted on.
- `hospital.technology.2` — Clinical analytics and decision support tools are used at the point of care.
- `hospital.technology.3` — Cybersecurity posture is independently assessed annually; security awareness training is mandatory.
- `hospital.technology.4` — Interoperability with referring physicians, payers, and post-acute partners exists for key data flows.
- `hospital.technology.5` — IT investment governance prioritises value over individual department wishlists.

---

## University Template (40 practices, 8 categories)

### Category 1 — Academic Excellence
- `university.academic.1` — Curricula are reviewed on a defined cycle and updated for currency, relevance, and learning outcomes.
- `university.academic.2` — Faculty quality (credentials, ongoing development, teaching evaluations) is intentionally managed.
- `university.academic.3` — Learning outcomes are defined per program and assessed with closing-the-loop processes.
- `university.academic.4` — Pedagogical innovation and instructional design support exist and are used.
- `university.academic.5` — Program review identifies underperforming programs and acts on the findings.
- `university.academic.system.1` *(multi-campus)* — Programs are coordinated across campuses (consistent learning outcomes, shared course offerings, articulated transfer pathways).
- `university.academic.system.2` *(multi-campus)* — Faculty governance includes representation from all campuses, not just the main one.

### Category 2 — Student Success
- `university.student_success.1` — Recruitment and admissions strategy is defined and aligned with institutional capacity.
- `university.student_success.2` — First-year retention programs (advising, early-alert, first-year seminars) exist and are measured.
- `university.student_success.3` — Six-year graduation rate is tracked and managed against a target.
- `university.student_success.4` — Student support services (advising, tutoring, mental health, accessibility) are funded appropriately.
- `university.student_success.5` — Career outcomes (placement, graduate school, salary) are tracked and reported.

### Category 3 — Research, Scholarship & Faculty Productivity
*(adapted for small institution — research may be teaching-focused rather than R1)*
- `university.research.1` — Faculty productivity (teaching, scholarship, service) is reviewed against documented criteria.
- `university.research.2` — External funding (grants, foundations, industry, fellowships) is pursued where mission-aligned.
- `university.research.3` — Research compliance (IRB, sponsored research, export controls if applicable) is maintained.
- `university.research.4` — Faculty-student research and creative-work opportunities are part of the student experience.
- `university.research.5` — Tenure / promotion criteria and processes are documented and applied consistently.

### Category 4 — Financial Sustainability
- `university.financial.1` — Tuition strategy and discount rate are managed with multi-year financial modelling.
- `university.financial.2` — Endowment performance and spending policy are formalised; restricted vs unrestricted is well managed.
- `university.financial.3` — Operational efficiency is reviewed (shared services, vendor consolidation, energy costs).
- `university.financial.4` — Auxiliary services (housing, dining, athletics) are evaluated for net contribution to mission.
- `university.financial.5` — Capital planning addresses deferred maintenance with a formal multi-year plan.
- `university.financial.system.1` *(multi-campus)* — Shared services (IT, HR, finance, procurement) are leveraged across campuses to reduce duplication.
- `university.financial.system.2` *(multi-campus)* — Each campus's financial contribution to the system (subsidising or being subsidised) is transparent and managed.

### Category 5 — Workforce & Governance
- `university.workforce.1` — Faculty recruitment, retention, and compensation strategies exist and are competitive for the institution's segment.
- `university.workforce.2` — Staff engagement and retention are measured; turnover by role is tracked.
- `university.workforce.3` — Shared governance is functional — senate, faculty, administration, and board interact effectively.
- `university.workforce.4` — Compensation strategy aligns with market data (CUPA-HR or equivalent benchmarks).
- `university.workforce.5` — Leadership succession planning exists for the President, Provost, and key VPs.

### Category 6 — Strategic Planning & Mission
- `university.strategic.1` — A documented multi-year strategic plan exists with measurable annual goals.
- `university.strategic.2` — Programs and investments are evaluated against mission alignment, not just enrolment.
- `university.strategic.3` — The Board of Trustees is engaged as a working board, not just a ceremonial one.
- `university.strategic.4` — Accreditation strategy is proactive, not reactive (regional + program-level).
- `university.strategic.5` — Stakeholder engagement (faculty, staff, students, alumni) is structured and ongoing.

### Category 7 — External Engagement
- `university.external.1` — Alumni engagement is structured (events, communications, giving programs).
- `university.external.2` — Fundraising performance is tracked against goals; donor cultivation and stewardship are managed.
- `university.external.3` — Community engagement and partnerships are part of the institution's identity and operations.
- `university.external.4` — Reputation management (rankings, media, recruitment marketing) is intentional.
- `university.external.5` — Government relations and advocacy (state higher-ed boards, federal aid policy) are coordinated.

### Category 8 — Technology & Infrastructure
- `university.technology.1` — Learning management system (LMS) effectiveness is measured (faculty adoption, student usage, learning outcomes).
- `university.technology.2` — Student information system (SIS) is used effectively for advising, registration, financial aid, retention.
- `university.technology.3` — Cybersecurity and data privacy (FERPA, research data, payment data) are independently assessed annually.
- `university.technology.4` — Digital transformation roadmap exists with prioritised investments.
- `university.technology.5` — Physical infrastructure (classrooms, labs, residence halls, technology rooms) is maintained on a planned cycle, not reactively.

---

## Customisation guidance for the pilot

After the company picks a template, the company owner / admin can:
- **Edit** any practice statement to fit their context (e.g., a religious university might rephrase mission-alignment language).
- **Drop** practices that don't apply (e.g., the $6M university with no research budget can drop research-heavy items).
- **Add** custom practices in any category (up to ~10 per category to keep the assessment manageable).

The Lovable UI for editing should:
- Show the original template language as a reference when a practice is edited
- Mark customised practices visually
- Allow soft-deletion (hide vs. destroy) so the original template can be restored

## Maintenance

These templates are starting points, not gospel. Update them based on what we learn from the pilots:
- If hospital pilot keeps editing a category significantly, rewrite that category in this template
- If a category gets dropped entirely by both pilots, consider removing
- New industry templates (services, SaaS, professional services, etc.) are added to this file as they're authored

Per `CLAUDE.md` rule #6 (validate front + back before adding logic), check Lovable's `question_sets` and `practice_statements` tables before adding new templates — they may already exist with different content.
