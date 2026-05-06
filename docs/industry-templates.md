# Industry Templates — Suggestions Within the MECE Framework

**Read `docs/framework.md` first.** That defines the 8 universal pillars (Direction, Customer, Delivery, Economics, People, Technology, Governance, Innovation) that every operating + monitoring system in this platform uses. Pillars are MECE and **not customer-customisable**.

This file contains **suggested practices and KPIs by industry**. Templates are starting points — customers can edit any practice, drop any practice, add their own, or build from scratch without using a template at all.

Each template provides:
- ~5 suggested practices per pillar (so ~40 practices total)
- ~3–4 suggested KPIs per pillar (so ~25–30 metrics total)
- Multi-site practices tagged `*.system.*` for organisations that operate multiple facilities or campuses

References behind these templates:
- **Hospital**: Joint Commission, Magnet, HFMA, HCAHPS, AHA leadership competencies, AHRQ
- **University**: SACSCOC / MSCHE / regional accreditation, AGB governance, NACUBO finance, IPEDS, Title IX/FERPA

---

## Multi-site model

Both pilot customers operate multiple sites (hospital is multi-facility, university is multi-campus). Two patterns supported:

1. **Each site is its own company** in Lovable (default for v1) — the take-over CEO sees N companies in their dashboard, can compare across sites. Lovable already supports this; only the 3-company-per-user cap needs lifting for the pilot.
2. **Hierarchical** — parent company with child sites rolling up. Deferred to v2 (requires schema additions: `sites` table, `site_id` on responses, rollup math in `compute-opi`).

Practice statements tagged `*.system.*` are intended to be scored once at the system level when multiple sites exist. In v1 (each site = own company) these can be entered as a separate "system" company that the same owner manages.

---

# Hospital Template

Sized for a hospital system around US$50M revenue, multi-facility (small system: 2–4 facilities, possibly with affiliated outpatient clinics).

## Pillar 1 — Direction (Strategy & Leadership)

**Practices:**
- `hospital.direction.1` — Vision, mission, and values are clearly articulated and consistently reinforced with clinical and administrative staff.
- `hospital.direction.2` — A documented multi-year strategic plan exists with annual measurable goals tied to community needs.
- `hospital.direction.3` — Service-line decisions (which clinical services to grow, sustain, or exit) are reviewed regularly with data.
- `hospital.direction.4` — A community health needs assessment is completed on cadence and informs strategic priorities.
- `hospital.direction.5` — Decision rights between board / CEO / facility leaders / department chairs are documented and respected.
- `hospital.direction.system.1` *(multi-facility)* — Service-line strategy is coordinated across facilities (avoiding duplication, leveraging centres of excellence).
- `hospital.direction.system.2` *(multi-facility)* — System-level capital allocation prioritises across facilities based on need and ROI, not equal distribution.

**KPIs:**
- % of strategic goals on track (quarterly review)
- Days from strategic decision to documented owner & first action
- Board engagement score (member self-rated annual)
- Employee % who can articulate top three strategic priorities (pulse survey)

## Pillar 2 — Customer (Patient & Stakeholder)

**Practices:**
- `hospital.customer.1` — HCAHPS performance is monitored monthly with action plans for the lowest-scoring dimensions.
- `hospital.customer.2` — Care coordination across inpatient, outpatient, and post-acute settings is measured and improving.
- `hospital.customer.3` — Shared decision-making and informed consent are practiced and audited, not just documented.
- `hospital.customer.4` — Access metrics (third-next-available appointment, ED wait, OR scheduling lead time) are tracked and managed.
- `hospital.customer.5` — A service-recovery process exists and front-line staff are empowered to use it.

**KPIs:**
- HCAHPS Top Box (overall + each dimension)
- ED LWBS (Left Without Being Seen) %
- Average door-to-doctor time
- 30-day readmission rate
- Patient complaints per 1,000 discharges

## Pillar 3 — Delivery (Operations & Quality)

**Practices:**
- `hospital.delivery.1` — Emergency department patient flow is measured and actively managed (door-to-doctor, door-to-disposition).
- `hospital.delivery.2` — Operating room utilisation and turnover times are tracked with specific improvement targets.
- `hospital.delivery.3` — Average length of stay is benchmarked by service line and managed through case management.
- `hospital.delivery.4` — Hospital-acquired infection rates (CLABSI, CAUTI, SSI, C. diff) are tracked and reduced via formal prevention bundles.
- `hospital.delivery.5` — Medication safety includes reconciliation at admission, transfer, and discharge with measured error rates.
- `hospital.delivery.system.1` *(multi-facility)* — Patient transfers between facilities follow defined protocols (transfer agreements, capacity sharing) without bottlenecks.
- `hospital.delivery.system.2` *(multi-facility)* — Centralised supply-chain leverage (group purchasing across facilities) is realised, not lost to local procurement decisions.

**KPIs:**
- Average length of stay (overall + by service line)
- Operating room utilisation %
- Hospital-acquired infection rate (CLABSI, CAUTI, SSI per 1,000 patient-days)
- Mortality index (observed vs expected, e.g., HSMR)
- Supply spend as % of net patient revenue

## Pillar 4 — Economics (Financial Performance)

**Practices:**
- `hospital.economics.1` — Revenue cycle is managed against targets (denial rate, days in AR, clean-claim rate, point-of-service collection).
- `hospital.economics.2` — Cost per case is tracked by service line and benchmarked externally.
- `hospital.economics.3` — Payer mix is monitored and contracts are renegotiated on a defined cadence.
- `hospital.economics.4` — Capital planning is disciplined (multi-year capital plan, ROI requirements, deferred maintenance tracked).
- `hospital.economics.5` — Productivity (FTE per adjusted patient day, hours per unit of service) is benchmarked and managed.

**KPIs:**
- Operating margin %
- Days cash on hand
- Days in accounts receivable
- Denial rate %
- Cost per adjusted discharge

## Pillar 5 — People (Workforce & Culture)

**Practices:**
- `hospital.people.1` — Clinical staff turnover is tracked by role and unit; targeted retention programs exist for highest-risk roles.
- `hospital.people.2` — Burnout and wellness are measured (e.g., MBI) and resourced with concrete programs, not just statements.
- `hospital.people.3` — Diversity, equity, and inclusion are part of hiring, promotion, and clinician-patient communication training.
- `hospital.people.4` — A leadership development pipeline exists (charge nurses, mid-level managers, succession plans for key clinical leaders).
- `hospital.people.5` — Just-culture and psychological safety principles are practiced — staff report concerns without fear of retaliation.

**KPIs:**
- Annual nursing turnover %
- Annual physician turnover %
- Engagement score (Press Ganey or equivalent)
- Time-to-fill for clinical vacancies
- % of leadership positions with documented successor

## Pillar 6 — Technology (Systems & Information)

**Practices:**
- `hospital.technology.1` — EHR is optimised for clinician workflow; clinician satisfaction with the EHR is measured and acted on.
- `hospital.technology.2` — Clinical analytics and decision support tools are used at the point of care.
- `hospital.technology.3` — Cybersecurity posture is independently assessed annually; security awareness training is mandatory.
- `hospital.technology.4` — Interoperability with referring physicians, payers, and post-acute partners exists for key data flows.
- `hospital.technology.5` — IT investment governance prioritises value over individual department wishlists.

**KPIs:**
- EHR uptime %
- Clinician EHR satisfaction score
- Cybersecurity incidents (count, severity)
- IT spend as % of net revenue
- Days to onboard a new clinician to all systems

## Pillar 7 — Governance (Compliance & Risk)

**Practices:**
- `hospital.governance.1` — Joint Commission readiness is continuous, not a fire drill before survey.
- `hospital.governance.2` — HIPAA privacy and security program is documented, audited, and includes regular workforce training.
- `hospital.governance.3` — Regulatory and CMS condition-of-participation changes are tracked and implemented systematically.
- `hospital.governance.4` — Risk management and incident response process exists with claims tracking and root-cause analysis.
- `hospital.governance.5` — Quality reporting (CMS IQR, OQR, value-based programs) is accurate, on time, and used to drive improvement.

**KPIs:**
- Joint Commission survey findings (count, by severity)
- HIPAA breaches (count)
- Open compliance corrective actions
- Malpractice claims pending (count, reserve)
- CMS quality reporting % on time

## Pillar 8 — Innovation (Learning & Growth)

**Practices:**
- `hospital.innovation.1` — New clinical programs and service offerings are evaluated against community need and viability before launch.
- `hospital.innovation.2` — Continuous learning (clinical research, evidence-based practice updates, CME) is structured.
- `hospital.innovation.3` — Strategic partnerships (academic affiliations, payer collaborations, community organisations) are actively cultivated.
- `hospital.innovation.4` — Digital health and AI initiatives are explored with a clear evaluation framework.
- `hospital.innovation.5` — A learning health system mindset (rapid-cycle quality improvement, feedback loops) is embedded.

**KPIs:**
- # of new clinical programs launched in past 24 months
- Continuing-education hours per clinician
- # of active strategic partnerships
- # of QI projects completed in past 12 months
- Patient outcome improvements attributable to QI initiatives

---

# University Template

Sized for an institution around US$6M revenue, multi-campus (main + branch campuses, or a small consortium).

## Pillar 1 — Direction (Strategy & Leadership)

**Practices:**
- `university.direction.1` — A documented multi-year strategic plan exists with measurable annual goals.
- `university.direction.2` — Programs and investments are evaluated against mission alignment, not just enrolment.
- `university.direction.3` — The Board of Trustees is engaged as a working board, not just a ceremonial one.
- `university.direction.4` — Accreditation strategy is proactive, not reactive (regional + program-level).
- `university.direction.5` — Decision rights between board / president / provost / deans are documented and respected.
- `university.direction.system.1` *(multi-campus)* — System-level strategic priorities are coordinated; campuses are not pursuing divergent strategies.

**KPIs:**
- % of strategic goals on track
- Board engagement score (member self-rated)
- Days from strategic decision to documented owner & first action
- Faculty / staff % who can articulate top three strategic priorities

## Pillar 2 — Customer (Student & Stakeholder)

**Practices:**
- `university.customer.1` — Recruitment and admissions strategy is defined and aligned with institutional capacity.
- `university.customer.2` — First-year retention programs (advising, early-alert, first-year seminars) exist and are measured.
- `university.customer.3` — Six-year graduation rate is tracked and managed against a target.
- `university.customer.4` — Student support services (advising, tutoring, mental health, accessibility) are funded appropriately.
- `university.customer.5` — Career outcomes (placement, graduate school, salary) are tracked and reported.
- `university.customer.6` — Alumni engagement is structured (events, communications, giving programs).
- `university.customer.7` — Community engagement and partnerships are part of the institution's identity and operations.

**KPIs:**
- 1-year retention %
- 6-year graduation %
- Student satisfaction score (NSSE or equivalent)
- Career placement rate at 6 months post-graduation
- Alumni giving participation %

## Pillar 3 — Delivery (Academic Operations)

**Practices:**
- `university.delivery.1` — Curricula are reviewed on a defined cycle and updated for currency, relevance, and learning outcomes.
- `university.delivery.2` — Faculty quality (credentials, ongoing development, teaching evaluations) is intentionally managed.
- `university.delivery.3` — Learning outcomes are defined per program and assessed with closing-the-loop processes.
- `university.delivery.4` — Pedagogical innovation and instructional design support exist and are used.
- `university.delivery.5` — Program review identifies underperforming programs and acts on the findings.
- `university.delivery.system.1` *(multi-campus)* — Programs are coordinated across campuses (consistent learning outcomes, shared course offerings, articulated transfer pathways).

**KPIs:**
- Faculty/student ratio
- Course evaluation average score
- % of programs with assessed learning outcomes
- Time-to-degree (avg semesters)
- Transfer credit acceptance rate

## Pillar 4 — Economics (Financial Sustainability)

**Practices:**
- `university.economics.1` — Tuition strategy and discount rate are managed with multi-year financial modelling.
- `university.economics.2` — Endowment performance and spending policy are formalised; restricted vs unrestricted is well managed.
- `university.economics.3` — Operational efficiency is reviewed (shared services, vendor consolidation, energy costs).
- `university.economics.4` — Auxiliary services (housing, dining, athletics) are evaluated for net contribution to mission.
- `university.economics.5` — Capital planning addresses deferred maintenance with a formal multi-year plan.
- `university.economics.system.1` *(multi-campus)* — Shared services (IT, HR, finance, procurement) are leveraged across campuses to reduce duplication.
- `university.economics.system.2` *(multi-campus)* — Each campus's financial contribution to the system (subsidising or being subsidised) is transparent and managed.

**KPIs:**
- Operating margin %
- Days cash on hand
- Discount rate %
- Endowment per FTE student
- Tuition dependence ratio (% of revenue from net tuition)

## Pillar 5 — People (Workforce & Governance)

**Practices:**
- `university.people.1` — Faculty recruitment, retention, and compensation strategies exist and are competitive for the institution's segment.
- `university.people.2` — Staff engagement and retention are measured; turnover by role is tracked.
- `university.people.3` — Shared governance is functional — senate, faculty, administration, and board interact effectively.
- `university.people.4` — Compensation strategy aligns with market data (CUPA-HR or equivalent benchmarks).
- `university.people.5` — Leadership succession planning exists for the President, Provost, and key VPs.

**KPIs:**
- Faculty turnover %
- Staff turnover %
- Engagement score (faculty + staff)
- Time-to-fill for faculty positions
- % of leadership positions with documented successor

## Pillar 6 — Technology (Systems & Infrastructure)

**Practices:**
- `university.technology.1` — Learning management system (LMS) effectiveness is measured (faculty adoption, student usage, learning outcomes).
- `university.technology.2` — Student information system (SIS) is used effectively for advising, registration, financial aid, retention.
- `university.technology.3` — Cybersecurity and data privacy (FERPA, research data, payment data) are independently assessed annually.
- `university.technology.4` — Digital transformation roadmap exists with prioritised investments.
- `university.technology.5` — Physical infrastructure (classrooms, labs, residence halls, technology rooms) is maintained on a planned cycle, not reactively.

**KPIs:**
- LMS uptime %
- SIS data quality score
- Cybersecurity incidents (count)
- IT spend as % of operating budget
- Deferred maintenance backlog (USD or % of plant value)

## Pillar 7 — Governance (Compliance & Risk)

**Practices:**
- `university.governance.1` — Regional accreditation continuous improvement is part of the operating cadence.
- `university.governance.2` — FERPA, Title IX, ADA, and other federal compliance programs are documented, trained, and audited.
- `university.governance.3` — Risk management process exists (insurance, claims, incident response, crisis communication).
- `university.governance.4` — IPEDS reporting and other federal data submissions are accurate and on time.
- `university.governance.5` — Government relations and advocacy (state higher-ed boards, federal aid policy) are coordinated.

**KPIs:**
- Accreditation findings (count, severity)
- Open compliance corrective actions
- Title IX incidents (count, resolution time)
- IPEDS submissions on time %
- Insurance claims filed (count, USD)

## Pillar 8 — Innovation (Learning, Research & Growth)

**Practices:**
- `university.innovation.1` — Faculty productivity (teaching, scholarship, service) is reviewed against documented criteria.
- `university.innovation.2` — External funding (grants, foundations, industry, fellowships) is pursued where mission-aligned.
- `university.innovation.3` — Research compliance (IRB, sponsored research, export controls if applicable) is maintained.
- `university.innovation.4` — Faculty-student research and creative-work opportunities are part of the student experience.
- `university.innovation.5` — Reputation management (rankings, media, recruitment marketing) is intentional.

**KPIs:**
- External funding $ (annual, multi-year)
- Faculty publications + creative works (count, weighted)
- Undergraduate research participation %
- New programs launched in past 36 months
- Reputation indicators (rankings, media mentions)

---

# Customisation guidance for the pilot

After the company picks a template, the company owner / admin can:
- **Edit** any practice statement to fit context (a religious university rephrasing mission language; a community hospital removing references to research).
- **Drop** practices that don't apply (a $6M university dropping research-heavy items; a single-facility hospital dropping `*.system.*` items).
- **Add** custom practices in any pillar (up to ~10 per pillar to keep the assessment manageable).
- **Edit / drop / add** KPIs in the same way.

Lovable UI for editing should:
- Show the original template language as a reference when a practice or KPI is edited
- Mark customised items visually
- Allow soft-deletion (hide vs. destroy) so the original template can be restored

---

# Maintenance

These templates are starting points, not gospel. Update them based on what we learn from the pilots:
- If hospital pilot keeps editing a pillar significantly, rewrite that pillar in this template.
- If a pillar gets dropped entirely by both pilots, consider whether the framework's coverage of that pillar is correctly suggesting practices.
- New industry templates (services, SaaS, professional services, manufacturing, non-profit) are added to this file as they're authored.

Per `CLAUDE.md` rule (validate front + back before adding logic), check Lovable's existing schema (`question_sets`, `practices`, `metrics` tables) before adding new templates — they may already exist with different content.
