-- BDS OS: Seed practices + KPIs for hospital, university, fund templates.
--
-- Translates docs/industry-templates.md into rows in the practices and metrics
-- tables, owned by their respective templates (question_set_id / metric_set_id
-- are NULL because these are reference seeds, not customer instances).
--
-- When a customer picks a template, the application clones these rows into a
-- new question_set / metric_set scoped to their company.
--
-- Universal pillar IDs (from 20260506000002_seed_framework.sql):
--   1=direction 2=customer 3=delivery 4=economics
--   5=people    6=technology 7=governance 8=innovation
--
-- The SMB / Lovable-default template's practices are NOT seeded here — those
-- come from Lovable's existing src/data/questions.ts via the Day 4 refactor
-- (load practices from DB rather than hardcoded TS).

-- ============================================================================
-- HOSPITAL TEMPLATE
-- ============================================================================

INSERT INTO practices (template_id, universal_pillar_id, external_id, statement, description, is_system_level, sort_order) VALUES
-- Direction
('hospital', 1, 'hospital.direction.1', 'Vision, mission, and values are clearly articulated and consistently reinforced with clinical and administrative staff.', null, false, 1),
('hospital', 1, 'hospital.direction.2', 'A documented multi-year strategic plan exists with annual measurable goals tied to community needs.', null, false, 2),
('hospital', 1, 'hospital.direction.3', 'Service-line decisions (which clinical services to grow, sustain, or exit) are reviewed regularly with data.', null, false, 3),
('hospital', 1, 'hospital.direction.4', 'A community health needs assessment is completed on cadence and informs strategic priorities.', null, false, 4),
('hospital', 1, 'hospital.direction.5', 'Decision rights between board / CEO / facility leaders / department chairs are documented and respected.', null, false, 5),
('hospital', 1, 'hospital.direction.system.1', 'Service-line strategy is coordinated across facilities (avoiding duplication, leveraging centres of excellence).', 'Multi-facility', true, 6),
('hospital', 1, 'hospital.direction.system.2', 'System-level capital allocation prioritises across facilities based on need and ROI, not equal distribution.', 'Multi-facility', true, 7),

-- Customer
('hospital', 2, 'hospital.customer.1', 'HCAHPS performance is monitored monthly with action plans for the lowest-scoring dimensions.', null, false, 1),
('hospital', 2, 'hospital.customer.2', 'Care coordination across inpatient, outpatient, and post-acute settings is measured and improving.', null, false, 2),
('hospital', 2, 'hospital.customer.3', 'Shared decision-making and informed consent are practiced and audited, not just documented.', null, false, 3),
('hospital', 2, 'hospital.customer.4', 'Access metrics (third-next-available appointment, ED wait, OR scheduling lead time) are tracked and managed.', null, false, 4),
('hospital', 2, 'hospital.customer.5', 'A service-recovery process exists and front-line staff are empowered to use it.', null, false, 5),

-- Delivery (clinical operations + quality)
('hospital', 3, 'hospital.delivery.1', 'Emergency department patient flow is measured and actively managed (door-to-doctor, door-to-disposition).', null, false, 1),
('hospital', 3, 'hospital.delivery.2', 'Operating room utilisation and turnover times are tracked with specific improvement targets.', null, false, 2),
('hospital', 3, 'hospital.delivery.3', 'Average length of stay is benchmarked by service line and managed through case management.', null, false, 3),
('hospital', 3, 'hospital.delivery.4', 'Hospital-acquired infection rates (CLABSI, CAUTI, SSI, C. diff) are tracked and reduced via formal prevention bundles.', null, false, 4),
('hospital', 3, 'hospital.delivery.5', 'Medication safety includes reconciliation at admission, transfer, and discharge with measured error rates.', null, false, 5),
('hospital', 3, 'hospital.delivery.system.1', 'Patient transfers between facilities follow defined protocols (transfer agreements, capacity sharing) without bottlenecks.', 'Multi-facility', true, 6),
('hospital', 3, 'hospital.delivery.system.2', 'Centralised supply-chain leverage (group purchasing across facilities) is realised, not lost to local procurement decisions.', 'Multi-facility', true, 7),

-- Economics
('hospital', 4, 'hospital.economics.1', 'Revenue cycle is managed against targets (denial rate, days in AR, clean-claim rate, point-of-service collection).', null, false, 1),
('hospital', 4, 'hospital.economics.2', 'Cost per case is tracked by service line and benchmarked externally.', null, false, 2),
('hospital', 4, 'hospital.economics.3', 'Payer mix is monitored and contracts are renegotiated on a defined cadence.', null, false, 3),
('hospital', 4, 'hospital.economics.4', 'Capital planning is disciplined (multi-year capital plan, ROI requirements, deferred maintenance tracked).', null, false, 4),
('hospital', 4, 'hospital.economics.5', 'Productivity (FTE per adjusted patient day, hours per unit of service) is benchmarked and managed.', null, false, 5),

-- People
('hospital', 5, 'hospital.people.1', 'Clinical staff turnover is tracked by role and unit; targeted retention programs exist for highest-risk roles.', null, false, 1),
('hospital', 5, 'hospital.people.2', 'Burnout and wellness are measured (e.g., MBI) and resourced with concrete programs, not just statements.', null, false, 2),
('hospital', 5, 'hospital.people.3', 'Diversity, equity, and inclusion are part of hiring, promotion, and clinician-patient communication training.', null, false, 3),
('hospital', 5, 'hospital.people.4', 'A leadership development pipeline exists (charge nurses, mid-level managers, succession plans for key clinical leaders).', null, false, 4),
('hospital', 5, 'hospital.people.5', 'Just-culture and psychological safety principles are practiced — staff report concerns without fear of retaliation.', null, false, 5),

-- Technology
('hospital', 6, 'hospital.technology.1', 'EHR is optimised for clinician workflow; clinician satisfaction with the EHR is measured and acted on.', null, false, 1),
('hospital', 6, 'hospital.technology.2', 'Clinical analytics and decision support tools are used at the point of care.', null, false, 2),
('hospital', 6, 'hospital.technology.3', 'Cybersecurity posture is independently assessed annually; security awareness training is mandatory.', null, false, 3),
('hospital', 6, 'hospital.technology.4', 'Interoperability with referring physicians, payers, and post-acute partners exists for key data flows.', null, false, 4),
('hospital', 6, 'hospital.technology.5', 'IT investment governance prioritises value over individual department wishlists.', null, false, 5),

-- Governance
('hospital', 7, 'hospital.governance.1', 'Joint Commission readiness is continuous, not a fire drill before survey.', null, false, 1),
('hospital', 7, 'hospital.governance.2', 'HIPAA privacy and security program is documented, audited, and includes regular workforce training.', null, false, 2),
('hospital', 7, 'hospital.governance.3', 'Regulatory and CMS condition-of-participation changes are tracked and implemented systematically.', null, false, 3),
('hospital', 7, 'hospital.governance.4', 'Risk management and incident response process exists with claims tracking and root-cause analysis.', null, false, 4),
('hospital', 7, 'hospital.governance.5', 'Quality reporting (CMS IQR, OQR, value-based programs) is accurate, on time, and used to drive improvement.', null, false, 5),

-- Innovation
('hospital', 8, 'hospital.innovation.1', 'New clinical programs and service offerings are evaluated against community need and viability before launch.', null, false, 1),
('hospital', 8, 'hospital.innovation.2', 'Continuous learning (clinical research, evidence-based practice updates, CME) is structured.', null, false, 2),
('hospital', 8, 'hospital.innovation.3', 'Strategic partnerships (academic affiliations, payer collaborations, community organisations) are actively cultivated.', null, false, 3),
('hospital', 8, 'hospital.innovation.4', 'Digital health and AI initiatives are explored with a clear evaluation framework.', null, false, 4),
('hospital', 8, 'hospital.innovation.5', 'A learning health system mindset (rapid-cycle quality improvement, feedback loops) is embedded.', null, false, 5);

-- Hospital KPIs
INSERT INTO metrics (template_id, universal_pillar_id, external_id, name, unit, target_value, threshold_red, threshold_yellow, source, sort_order) VALUES
-- Direction
('hospital', 1, 'hospital.kpi.direction.1', '% of strategic goals on track', '%', 80, 50, 70, 'manual', 1),
('hospital', 1, 'hospital.kpi.direction.2', 'Days from strategic decision to first action', 'days', 14, 60, 30, 'manual', 2),
('hospital', 1, 'hospital.kpi.direction.3', 'Board engagement score (annual self-rated)', 'score', 4, 2, 3, 'manual', 3),
('hospital', 1, 'hospital.kpi.direction.4', 'Employee % aware of top 3 strategic priorities', '%', 75, 40, 60, 'manual', 4),

-- Customer
('hospital', 2, 'hospital.kpi.customer.1', 'HCAHPS Top Box overall', '%', 75, 60, 68, 'manual', 1),
('hospital', 2, 'hospital.kpi.customer.2', 'ED Left Without Being Seen %', '%', 1.5, 5, 3, 'manual', 2),
('hospital', 2, 'hospital.kpi.customer.3', 'Average door-to-doctor time', 'min', 25, 60, 40, 'manual', 3),
('hospital', 2, 'hospital.kpi.customer.4', '30-day readmission rate', '%', 12, 18, 15, 'manual', 4),
('hospital', 2, 'hospital.kpi.customer.5', 'Patient complaints per 1,000 discharges', 'per_1k', 3, 8, 5, 'manual', 5),

-- Delivery
('hospital', 3, 'hospital.kpi.delivery.1', 'Average length of stay (overall)', 'days', 4.5, 6.5, 5.5, 'manual', 1),
('hospital', 3, 'hospital.kpi.delivery.2', 'Operating room utilisation %', '%', 75, 55, 65, 'manual', 2),
('hospital', 3, 'hospital.kpi.delivery.3', 'Hospital-acquired infection rate (per 1,000 patient-days)', 'per_1k', 1, 3, 2, 'manual', 3),
('hospital', 3, 'hospital.kpi.delivery.4', 'Mortality index (observed vs expected)', 'ratio', 0.95, 1.15, 1.05, 'manual', 4),
('hospital', 3, 'hospital.kpi.delivery.5', 'Supply spend as % of net patient revenue', '%', 18, 25, 22, 'manual', 5),

-- Economics
('hospital', 4, 'hospital.kpi.economics.1', 'Operating margin %', '%', 3, -1, 1.5, 'manual', 1),
('hospital', 4, 'hospital.kpi.economics.2', 'Days cash on hand', 'days', 150, 60, 100, 'manual', 2),
('hospital', 4, 'hospital.kpi.economics.3', 'Days in accounts receivable', 'days', 45, 75, 60, 'manual', 3),
('hospital', 4, 'hospital.kpi.economics.4', 'Denial rate %', '%', 4, 12, 8, 'manual', 4),
('hospital', 4, 'hospital.kpi.economics.5', 'Cost per adjusted discharge', 'USD', 8500, 12000, 10000, 'manual', 5),

-- People
('hospital', 5, 'hospital.kpi.people.1', 'Annual nursing turnover %', '%', 12, 25, 18, 'manual', 1),
('hospital', 5, 'hospital.kpi.people.2', 'Annual physician turnover %', '%', 7, 15, 11, 'manual', 2),
('hospital', 5, 'hospital.kpi.people.3', 'Engagement score (Press Ganey or equivalent)', 'score', 4, 3, 3.5, 'manual', 3),
('hospital', 5, 'hospital.kpi.people.4', 'Time-to-fill clinical vacancies', 'days', 60, 120, 90, 'manual', 4),
('hospital', 5, 'hospital.kpi.people.5', '% of leadership positions with documented successor', '%', 70, 30, 50, 'manual', 5),

-- Technology
('hospital', 6, 'hospital.kpi.technology.1', 'EHR uptime %', '%', 99.9, 99, 99.5, 'manual', 1),
('hospital', 6, 'hospital.kpi.technology.2', 'Clinician EHR satisfaction score', 'score', 4, 2.5, 3.2, 'manual', 2),
('hospital', 6, 'hospital.kpi.technology.3', 'Cybersecurity incidents (count, last 90 days)', 'count', 0, 5, 2, 'manual', 3),
('hospital', 6, 'hospital.kpi.technology.4', 'IT spend as % of net revenue', '%', 4, 7, 5.5, 'manual', 4),
('hospital', 6, 'hospital.kpi.technology.5', 'Days to onboard a new clinician to all systems', 'days', 5, 21, 12, 'manual', 5),

-- Governance
('hospital', 7, 'hospital.kpi.governance.1', 'Joint Commission survey findings (count)', 'count', 0, 10, 5, 'manual', 1),
('hospital', 7, 'hospital.kpi.governance.2', 'HIPAA breaches (count, last 12 months)', 'count', 0, 2, 1, 'manual', 2),
('hospital', 7, 'hospital.kpi.governance.3', 'Open compliance corrective actions', 'count', 0, 10, 5, 'manual', 3),
('hospital', 7, 'hospital.kpi.governance.4', 'Malpractice claims pending (count)', 'count', 0, 8, 4, 'manual', 4),
('hospital', 7, 'hospital.kpi.governance.5', 'CMS quality reporting % on time', '%', 100, 90, 95, 'manual', 5),

-- Innovation
('hospital', 8, 'hospital.kpi.innovation.1', 'New clinical programs launched (last 24 months)', 'count', 3, 0, 1, 'manual', 1),
('hospital', 8, 'hospital.kpi.innovation.2', 'CE/CME hours per clinician', 'hours', 25, 10, 18, 'manual', 2),
('hospital', 8, 'hospital.kpi.innovation.3', '# of active strategic partnerships', 'count', 5, 0, 2, 'manual', 3),
('hospital', 8, 'hospital.kpi.innovation.4', 'QI projects completed (last 12 months)', 'count', 12, 3, 7, 'manual', 4),
('hospital', 8, 'hospital.kpi.innovation.5', 'Patient outcome improvements attributable to QI', 'count', 5, 0, 2, 'manual', 5);

-- ============================================================================
-- UNIVERSITY TEMPLATE
-- ============================================================================

INSERT INTO practices (template_id, universal_pillar_id, external_id, statement, description, is_system_level, sort_order) VALUES
-- Direction
('university', 1, 'university.direction.1', 'A documented multi-year strategic plan exists with measurable annual goals.', null, false, 1),
('university', 1, 'university.direction.2', 'Programs and investments are evaluated against mission alignment, not just enrolment.', null, false, 2),
('university', 1, 'university.direction.3', 'The Board of Trustees is engaged as a working board, not just a ceremonial one.', null, false, 3),
('university', 1, 'university.direction.4', 'Accreditation strategy is proactive, not reactive (regional + program-level).', null, false, 4),
('university', 1, 'university.direction.5', 'Decision rights between board / president / provost / deans are documented and respected.', null, false, 5),
('university', 1, 'university.direction.system.1', 'System-level strategic priorities are coordinated; campuses are not pursuing divergent strategies.', 'Multi-campus', true, 6),

-- Customer (students + alumni + community)
('university', 2, 'university.customer.1', 'Recruitment and admissions strategy is defined and aligned with institutional capacity.', null, false, 1),
('university', 2, 'university.customer.2', 'First-year retention programs (advising, early-alert, first-year seminars) exist and are measured.', null, false, 2),
('university', 2, 'university.customer.3', 'Six-year graduation rate is tracked and managed against a target.', null, false, 3),
('university', 2, 'university.customer.4', 'Student support services (advising, tutoring, mental health, accessibility) are funded appropriately.', null, false, 4),
('university', 2, 'university.customer.5', 'Career outcomes (placement, graduate school, salary) are tracked and reported.', null, false, 5),
('university', 2, 'university.customer.6', 'Alumni engagement is structured (events, communications, giving programs).', null, false, 6),
('university', 2, 'university.customer.7', 'Community engagement and partnerships are part of the institution''s identity and operations.', null, false, 7),

-- Delivery (academic operations)
('university', 3, 'university.delivery.1', 'Curricula are reviewed on a defined cycle and updated for currency, relevance, and learning outcomes.', null, false, 1),
('university', 3, 'university.delivery.2', 'Faculty quality (credentials, ongoing development, teaching evaluations) is intentionally managed.', null, false, 2),
('university', 3, 'university.delivery.3', 'Learning outcomes are defined per program and assessed with closing-the-loop processes.', null, false, 3),
('university', 3, 'university.delivery.4', 'Pedagogical innovation and instructional design support exist and are used.', null, false, 4),
('university', 3, 'university.delivery.5', 'Program review identifies underperforming programs and acts on the findings.', null, false, 5),
('university', 3, 'university.delivery.system.1', 'Programs are coordinated across campuses (consistent learning outcomes, shared course offerings, articulated transfer pathways).', 'Multi-campus', true, 6),

-- Economics
('university', 4, 'university.economics.1', 'Tuition strategy and discount rate are managed with multi-year financial modelling.', null, false, 1),
('university', 4, 'university.economics.2', 'Endowment performance and spending policy are formalised; restricted vs unrestricted is well managed.', null, false, 2),
('university', 4, 'university.economics.3', 'Operational efficiency is reviewed (shared services, vendor consolidation, energy costs).', null, false, 3),
('university', 4, 'university.economics.4', 'Auxiliary services (housing, dining, athletics) are evaluated for net contribution to mission.', null, false, 4),
('university', 4, 'university.economics.5', 'Capital planning addresses deferred maintenance with a formal multi-year plan.', null, false, 5),
('university', 4, 'university.economics.system.1', 'Shared services (IT, HR, finance, procurement) are leveraged across campuses to reduce duplication.', 'Multi-campus', true, 6),
('university', 4, 'university.economics.system.2', 'Each campus''s financial contribution to the system (subsidising or being subsidised) is transparent and managed.', 'Multi-campus', true, 7),

-- People
('university', 5, 'university.people.1', 'Faculty recruitment, retention, and compensation strategies exist and are competitive for the institution''s segment.', null, false, 1),
('university', 5, 'university.people.2', 'Staff engagement and retention are measured; turnover by role is tracked.', null, false, 2),
('university', 5, 'university.people.3', 'Shared governance is functional — senate, faculty, administration, and board interact effectively.', null, false, 3),
('university', 5, 'university.people.4', 'Compensation strategy aligns with market data (CUPA-HR or equivalent benchmarks).', null, false, 4),
('university', 5, 'university.people.5', 'Leadership succession planning exists for the President, Provost, and key VPs.', null, false, 5),

-- Technology
('university', 6, 'university.technology.1', 'Learning management system (LMS) effectiveness is measured (faculty adoption, student usage, learning outcomes).', null, false, 1),
('university', 6, 'university.technology.2', 'Student information system (SIS) is used effectively for advising, registration, financial aid, retention.', null, false, 2),
('university', 6, 'university.technology.3', 'Cybersecurity and data privacy (FERPA, research data, payment data) are independently assessed annually.', null, false, 3),
('university', 6, 'university.technology.4', 'Digital transformation roadmap exists with prioritised investments.', null, false, 4),
('university', 6, 'university.technology.5', 'Physical infrastructure (classrooms, labs, residence halls, technology rooms) is maintained on a planned cycle, not reactively.', null, false, 5),

-- Governance
('university', 7, 'university.governance.1', 'Regional accreditation continuous improvement is part of the operating cadence.', null, false, 1),
('university', 7, 'university.governance.2', 'FERPA, Title IX, ADA, and other federal compliance programs are documented, trained, and audited.', null, false, 2),
('university', 7, 'university.governance.3', 'Risk management process exists (insurance, claims, incident response, crisis communication).', null, false, 3),
('university', 7, 'university.governance.4', 'IPEDS reporting and other federal data submissions are accurate and on time.', null, false, 4),
('university', 7, 'university.governance.5', 'Government relations and advocacy (state higher-ed boards, federal aid policy) are coordinated.', null, false, 5),

-- Innovation (research + new programs)
('university', 8, 'university.innovation.1', 'Faculty productivity (teaching, scholarship, service) is reviewed against documented criteria.', null, false, 1),
('university', 8, 'university.innovation.2', 'External funding (grants, foundations, industry, fellowships) is pursued where mission-aligned.', null, false, 2),
('university', 8, 'university.innovation.3', 'Research compliance (IRB, sponsored research, export controls if applicable) is maintained.', null, false, 3),
('university', 8, 'university.innovation.4', 'Faculty-student research and creative-work opportunities are part of the student experience.', null, false, 4),
('university', 8, 'university.innovation.5', 'Reputation management (rankings, media, recruitment marketing) is intentional.', null, false, 5);

-- University KPIs
INSERT INTO metrics (template_id, universal_pillar_id, external_id, name, unit, target_value, threshold_red, threshold_yellow, source, sort_order) VALUES
('university', 1, 'university.kpi.direction.1', '% of strategic goals on track', '%', 80, 50, 70, 'manual', 1),
('university', 1, 'university.kpi.direction.2', 'Board engagement score (annual self-rated)', 'score', 4, 2, 3, 'manual', 2),
('university', 1, 'university.kpi.direction.3', 'Days from strategic decision to first action', 'days', 14, 60, 30, 'manual', 3),
('university', 1, 'university.kpi.direction.4', 'Faculty/staff aware of top 3 strategic priorities (%)', '%', 70, 30, 50, 'manual', 4),

('university', 2, 'university.kpi.customer.1', '1-year retention %', '%', 80, 65, 75, 'manual', 1),
('university', 2, 'university.kpi.customer.2', '6-year graduation %', '%', 60, 40, 50, 'manual', 2),
('university', 2, 'university.kpi.customer.3', 'Student satisfaction score (NSSE or equivalent)', 'score', 4, 3, 3.5, 'manual', 3),
('university', 2, 'university.kpi.customer.4', 'Career placement rate at 6 months post-grad', '%', 80, 60, 70, 'manual', 4),
('university', 2, 'university.kpi.customer.5', 'Alumni giving participation %', '%', 15, 5, 10, 'manual', 5),

('university', 3, 'university.kpi.delivery.1', 'Faculty/student ratio', 'ratio', 15, 25, 20, 'manual', 1),
('university', 3, 'university.kpi.delivery.2', 'Course evaluation average score', 'score', 4, 3, 3.5, 'manual', 2),
('university', 3, 'university.kpi.delivery.3', '% of programs with assessed learning outcomes', '%', 90, 60, 75, 'manual', 3),
('university', 3, 'university.kpi.delivery.4', 'Time-to-degree (avg semesters)', 'semesters', 8, 11, 9, 'manual', 4),
('university', 3, 'university.kpi.delivery.5', 'Transfer credit acceptance rate', '%', 80, 60, 70, 'manual', 5),

('university', 4, 'university.kpi.economics.1', 'Operating margin %', '%', 3, -2, 1, 'manual', 1),
('university', 4, 'university.kpi.economics.2', 'Days cash on hand', 'days', 120, 30, 75, 'manual', 2),
('university', 4, 'university.kpi.economics.3', 'Discount rate %', '%', 40, 60, 50, 'manual', 3),
('university', 4, 'university.kpi.economics.4', 'Endowment per FTE student (USD)', 'USD', 50000, 10000, 25000, 'manual', 4),
('university', 4, 'university.kpi.economics.5', 'Tuition dependence ratio (% of revenue)', '%', 60, 90, 75, 'manual', 5),

('university', 5, 'university.kpi.people.1', 'Faculty turnover %', '%', 8, 18, 12, 'manual', 1),
('university', 5, 'university.kpi.people.2', 'Staff turnover %', '%', 15, 30, 22, 'manual', 2),
('university', 5, 'university.kpi.people.3', 'Engagement score (faculty + staff)', 'score', 4, 3, 3.5, 'manual', 3),
('university', 5, 'university.kpi.people.4', 'Time-to-fill faculty positions (days)', 'days', 90, 180, 130, 'manual', 4),
('university', 5, 'university.kpi.people.5', '% of leadership positions with documented successor', '%', 60, 20, 40, 'manual', 5),

('university', 6, 'university.kpi.technology.1', 'LMS uptime %', '%', 99.5, 98, 99, 'manual', 1),
('university', 6, 'university.kpi.technology.2', 'SIS data quality score', 'score', 4, 2.5, 3.2, 'manual', 2),
('university', 6, 'university.kpi.technology.3', 'Cybersecurity incidents (count, last 90 days)', 'count', 0, 5, 2, 'manual', 3),
('university', 6, 'university.kpi.technology.4', 'IT spend as % of operating budget', '%', 5, 10, 7.5, 'manual', 4),
('university', 6, 'university.kpi.technology.5', 'Deferred maintenance backlog (% of plant value)', '%', 10, 25, 18, 'manual', 5),

('university', 7, 'university.kpi.governance.1', 'Accreditation findings (count)', 'count', 0, 8, 4, 'manual', 1),
('university', 7, 'university.kpi.governance.2', 'Open compliance corrective actions', 'count', 0, 10, 5, 'manual', 2),
('university', 7, 'university.kpi.governance.3', 'Title IX incidents (count, last 12 months)', 'count', 0, 10, 4, 'manual', 3),
('university', 7, 'university.kpi.governance.4', 'IPEDS submissions on time %', '%', 100, 80, 95, 'manual', 4),
('university', 7, 'university.kpi.governance.5', 'Insurance claims filed (count)', 'count', 0, 8, 4, 'manual', 5),

('university', 8, 'university.kpi.innovation.1', 'External funding $ (annual)', 'USD', 2000000, 500000, 1000000, 'manual', 1),
('university', 8, 'university.kpi.innovation.2', 'Faculty publications + creative works (count)', 'count', 50, 15, 30, 'manual', 2),
('university', 8, 'university.kpi.innovation.3', 'Undergraduate research participation %', '%', 40, 15, 25, 'manual', 3),
('university', 8, 'university.kpi.innovation.4', 'New programs launched (last 36 months)', 'count', 3, 0, 1, 'manual', 4),
('university', 8, 'university.kpi.innovation.5', 'Reputation indicators (e.g., rankings improvements)', 'count', 1, -2, 0, 'manual', 5);

-- ============================================================================
-- FUND TEMPLATE
-- ============================================================================

INSERT INTO practices (template_id, universal_pillar_id, external_id, statement, description, is_system_level, sort_order) VALUES
-- Direction
('fund', 1, 'fund.direction.1', 'Investment thesis is documented, reviewed annually, with measurable success criteria.', null, false, 1),
('fund', 1, 'fund.direction.2', 'Multi-vintage fund strategy is defined (target size, sector focus, fund family progression).', null, false, 2),
('fund', 1, 'fund.direction.3', 'Limited Partners (LPs) are engaged in strategic direction-setting, not just reporting recipients.', null, false, 3),
('fund', 1, 'fund.direction.4', 'Decision rights between Investment Committee, GPs, operating partners, and operating teams are documented and respected.', null, false, 4),
('fund', 1, 'fund.direction.5', 'Mission, values, and stakeholder commitments (impact, ESG, sustainability) are explicit and defended in investment decisions.', null, false, 5),

-- Customer (LPs + portfolio companies)
('fund', 2, 'fund.customer.1', 'LP relations cadence (quarterly reports, annual meeting, ad-hoc transparency) is defined and consistently delivered.', null, false, 1),
('fund', 2, 'fund.customer.2', 'LP satisfaction is measured (NPS, re-up rate, structured feedback) and acted upon.', null, false, 2),
('fund', 2, 'fund.customer.3', 'Portfolio companies receive defined value-add support beyond capital (operating partner network, talent, customer introductions, advisory).', null, false, 3),
('fund', 2, 'fund.customer.4', 'Co-investment opportunities are managed transparently with LPs.', null, false, 4),
('fund', 2, 'fund.customer.5', 'New LP development (cultivation, due diligence support, first-meeting cadence) follows a documented process.', null, false, 5),

-- Delivery (sourcing → investment → exit)
('fund', 3, 'fund.delivery.1', 'Sourcing pipeline is tracked end-to-end with conversion metrics by stage (sourced → screened → IC → closed).', null, false, 1),
('fund', 3, 'fund.delivery.2', 'Due diligence process is structured and produces consistent deal memos with clear go/no-go criteria.', null, false, 2),
('fund', 3, 'fund.delivery.3', 'Investment Committee process is documented (cadence, voting protocol, deal-team accountability, post-decision tracking).', null, false, 3),
('fund', 3, 'fund.delivery.4', 'Portfolio monitoring (KPIs, board cadence, intervention thresholds) is structured per investment thesis.', null, false, 4),
('fund', 3, 'fund.delivery.5', 'Exit planning is initiated at investment, not at exit time. Hold-period strategy is documented per portfolio company.', null, false, 5),

-- Economics
('fund', 4, 'fund.economics.1', 'Fund returns (Gross IRR, Net IRR, MOIC, DPI, RVPI, TVPI) are tracked against vintage / quartile benchmarks.', null, false, 1),
('fund', 4, 'fund.economics.2', 'Management fee budget is disciplined and reviewed annually against actual usage.', null, false, 2),
('fund', 4, 'fund.economics.3', 'Carry calculation methodology is documented, audited, and transparent to the team.', null, false, 3),
('fund', 4, 'fund.economics.4', 'Capital calls and distributions are forecast 6–12 months ahead with LP communication.', null, false, 4),
('fund', 4, 'fund.economics.5', 'Operating-partner / consultant / external-advisor spend is tracked against attributable value.', null, false, 5),

-- People
('fund', 5, 'fund.people.1', 'Investment team development (mentorship, deal allocation, attribution recognition) is structured.', null, false, 1),
('fund', 5, 'fund.people.2', 'Operating Partner network is curated (vetting, allocation by sector / capability, value-add tracking).', null, false, 2),
('fund', 5, 'fund.people.3', 'Carry distribution is transparent and aligned with deal sourcing, leadership, and value-creation contributions.', null, false, 3),
('fund', 5, 'fund.people.4', 'Succession planning for fund leadership (Managing Partner, GPs) exists with documented next-generation candidates.', null, false, 4),
('fund', 5, 'fund.people.5', 'Diversity, equity, and inclusion are embedded in hiring, team composition, and operating-partner network curation.', null, false, 5),

-- Technology
('fund', 6, 'fund.technology.1', 'CRM / deal-tracking system captures all sourcing, due diligence, IC decisions, and post-investment activity in one place.', null, false, 1),
('fund', 6, 'fund.technology.2', 'Portfolio company data (KPIs, financials, board materials) is centralised and refreshed quarterly minimum.', null, false, 2),
('fund', 6, 'fund.technology.3', 'LP reporting is automated as much as possible (not Excel-driven; templates + data pipeline).', null, false, 3),
('fund', 6, 'fund.technology.4', 'Cybersecurity for sensitive deal information (data rooms, IC materials, LP communications) is rigorously managed and independently audited.', null, false, 4),
('fund', 6, 'fund.technology.5', 'Data analytics on portfolio performance, sourcing patterns, and deal attribution is operationalised.', null, false, 5),

-- Governance
('fund', 7, 'fund.governance.1', 'Limited Partner Advisory Committee (LPAC) is engaged as designed (cadence, conflicts review, key consents).', null, false, 1),
('fund', 7, 'fund.governance.2', 'Compliance program (SEC registration if applicable, regulatory filings, AIFMD or local equivalents) is current and tested.', null, false, 2),
('fund', 7, 'fund.governance.3', 'ESG framework (e.g. ESG Data Convergence Initiative) is documented and applied to investment decisions and portfolio monitoring.', null, false, 3),
('fund', 7, 'fund.governance.4', 'Conflicts of interest (related-party transactions, shared investments, allocation conflicts) are formally identified and managed.', null, false, 4),
('fund', 7, 'fund.governance.5', 'Insurance, indemnification, fund-level risk management, and key-person provisions are reviewed annually.', null, false, 5),

-- Innovation
('fund', 8, 'fund.innovation.1', 'New investment-thesis areas are explored with structured discovery (industry research, expert networks, targeted sourcing).', null, false, 1),
('fund', 8, 'fund.innovation.2', 'New fund vehicles or strategies (continuation funds, sector-specialist funds, separate accounts, secondaries) are evaluated against fund mission.', null, false, 2),
('fund', 8, 'fund.innovation.3', 'Industry intelligence and thesis development feed back into deal sourcing prioritisation.', null, false, 3),
('fund', 8, 'fund.innovation.4', 'Operating-partner network is actively curated to evolve with portfolio needs (new sectors, new capabilities).', null, false, 4),
('fund', 8, 'fund.innovation.5', 'Lessons from past investments (post-mortems on losses, attribution analyses on wins) are captured and feed forward into future deal selection.', null, false, 5);

-- Fund KPIs
INSERT INTO metrics (template_id, universal_pillar_id, external_id, name, unit, target_value, threshold_red, threshold_yellow, source, sort_order) VALUES
('fund', 1, 'fund.kpi.direction.1', '% of strategic goals on track (annual review)', '%', 80, 50, 70, 'manual', 1),
('fund', 1, 'fund.kpi.direction.2', 'LP re-up rate (next vintage)', '%', 75, 40, 60, 'manual', 2),
('fund', 1, 'fund.kpi.direction.3', 'Days from IC decision to documented follow-up action', 'days', 7, 30, 14, 'manual', 3),
('fund', 1, 'fund.kpi.direction.4', 'IC meeting cadence and attendance %', '%', 90, 60, 75, 'manual', 4),

('fund', 2, 'fund.kpi.customer.1', 'LP NPS / satisfaction score (annual survey)', 'score', 50, 0, 30, 'manual', 1),
('fund', 2, 'fund.kpi.customer.2', 'LP re-up rate', '%', 75, 40, 60, 'manual', 2),
('fund', 2, 'fund.kpi.customer.3', 'Portfolio CEO satisfaction with the fund (annual)', 'score', 4, 2.5, 3.2, 'manual', 3),
('fund', 2, 'fund.kpi.customer.4', 'Average response time to LP inquiry (hours)', 'hours', 24, 96, 48, 'manual', 4),

('fund', 3, 'fund.kpi.delivery.1', 'Deals reviewed per quarter', 'count', 50, 10, 25, 'manual', 1),
('fund', 3, 'fund.kpi.delivery.2', 'Conversion rate (sourced → closed) %', '%', 2, 0.5, 1, 'manual', 2),
('fund', 3, 'fund.kpi.delivery.3', 'Average due diligence time (weeks)', 'weeks', 8, 20, 14, 'manual', 3),
('fund', 3, 'fund.kpi.delivery.4', 'Portfolio company KPI reporting on-time %', '%', 90, 60, 75, 'manual', 4),
('fund', 3, 'fund.kpi.delivery.5', 'Average hold period vs target (years)', 'years', 5, 8, 6.5, 'manual', 5),

('fund', 4, 'fund.kpi.economics.1', 'Net IRR (vintage to date) %', '%', 18, 5, 12, 'manual', 1),
('fund', 4, 'fund.kpi.economics.2', 'DPI (cash returned / cash drawn)', 'ratio', 1, 0.3, 0.6, 'manual', 2),
('fund', 4, 'fund.kpi.economics.3', 'MOIC (multiple of invested capital)', 'ratio', 2.5, 1.2, 1.8, 'manual', 3),
('fund', 4, 'fund.kpi.economics.4', 'Management fee burn vs budget %', '%', 95, 110, 102, 'manual', 4),
('fund', 4, 'fund.kpi.economics.5', 'Operating-cost ratio (% of AUM)', '%', 2, 5, 3.5, 'manual', 5),

('fund', 5, 'fund.kpi.people.1', 'Investment-team turnover %', '%', 10, 25, 18, 'manual', 1),
('fund', 5, 'fund.kpi.people.2', '% of deals with operating-partner support', '%', 70, 30, 50, 'manual', 2),
('fund', 5, 'fund.kpi.people.3', 'Carry attribution by deal team member (count of named contributors)', 'count', 3, 1, 2, 'manual', 3),
('fund', 5, 'fund.kpi.people.4', 'Diversity metrics (% women + URM in team)', '%', 40, 15, 25, 'manual', 4),

('fund', 6, 'fund.kpi.technology.1', 'Data freshness % across portfolio', '%', 90, 50, 70, 'manual', 1),
('fund', 6, 'fund.kpi.technology.2', 'CRM data quality score', 'score', 4, 2.5, 3.2, 'manual', 2),
('fund', 6, 'fund.kpi.technology.3', 'LP reporting automation %', '%', 70, 30, 50, 'manual', 3),
('fund', 6, 'fund.kpi.technology.4', 'Cybersecurity incidents (count, last 12 months)', 'count', 0, 3, 1, 'manual', 4),

('fund', 7, 'fund.kpi.governance.1', 'LPAC meetings on cadence (per year)', 'count', 4, 1, 2, 'manual', 1),
('fund', 7, 'fund.kpi.governance.2', 'Open compliance findings', 'count', 0, 8, 4, 'manual', 2),
('fund', 7, 'fund.kpi.governance.3', 'ESG criteria applied to % of investment decisions', '%', 100, 60, 80, 'manual', 3),
('fund', 7, 'fund.kpi.governance.4', 'Conflicts-of-interest register up to date (boolean as 0/1)', 'flag', 1, 0, 0, 'manual', 4),

('fund', 8, 'fund.kpi.innovation.1', 'New thesis areas explored per year', 'count', 3, 0, 1, 'manual', 1),
('fund', 8, 'fund.kpi.innovation.2', '% of fund deployed in new sectors / new thesis areas', '%', 25, 5, 15, 'manual', 2),
('fund', 8, 'fund.kpi.innovation.3', 'Post-mortem completion rate (% of material losses)', '%', 100, 50, 80, 'manual', 3),
('fund', 8, 'fund.kpi.innovation.4', 'Net new operating partners added per year', 'count', 3, 0, 1, 'manual', 4);
