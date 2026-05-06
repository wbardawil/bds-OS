-- BDS OS: Seed maturity rubrics for top-5 practices per pillar across the 3 beta templates.
--
-- Strategy:
--   1. Generate generic 5-level rubrics for all top-5 practices in hospital, university, fund.
--      That's 5 practices × 8 pillars × 3 templates × 5 levels = 600 rubric rows.
--      Levels follow the universal naming: Emerging / Formalising / Measuring / Optimising / Innovating.
--   2. Override the highest-impact practices with industry-specific authored rubrics
--      so customers see what well-authored content looks like.
--   3. Customers can edit any rubric after picking a template.
--
-- Multi-site (.system.) practices are skipped for v1 rubrics — they're tagged
-- but their rubrics will be authored in v1.1 along with the multi-site rollup UI.
--
-- Style guide: see docs/industry-templates.md "Rubric authoring style guide".

-- ============================================================================
-- 1. GENERIC RUBRICS for top-5 practices per pillar in the 3 beta templates
-- ============================================================================

INSERT INTO maturity_rubrics (practice_id, level, descriptor, evidence_criteria)
SELECT
  p.id,
  l.level,
  CASE l.level
    WHEN 1 THEN 'Practice is informal, undocumented, or absent. Outcomes depend on individual judgment and ad-hoc effort.'
    WHEN 2 THEN 'Practice is documented but not consistently followed. Activity is reactive rather than systematic.'
    WHEN 3 THEN 'Practice is documented, consistently followed, and measured against defined targets on a regular cadence.'
    WHEN 4 THEN 'Practice is benchmarked against peers or external standards; continuous improvement produces measurable gains.'
    WHEN 5 THEN 'Practice sets the standard others follow; contributes to the industry''s body of knowledge through case studies, talks, or published frameworks.'
  END AS descriptor,
  CASE l.level
    WHEN 1 THEN 'No documented evidence; no formal measurement; reliance on individual recall when asked.'
    WHEN 2 THEN 'Documentation exists; usage is inconsistent; measurement is ad-hoc or absent.'
    WHEN 3 THEN 'Documentation + KPI tracking + monthly or quarterly review minutes with named owners.'
    WHEN 4 THEN 'External benchmark data + improvement plan with quantified goals + before/after metrics for at least one cycle.'
    WHEN 5 THEN 'Industry recognition (case study, conference talk, framework contribution); peers reference this approach by name.'
  END AS evidence_criteria
FROM practices p
CROSS JOIN (VALUES (1), (2), (3), (4), (5)) AS l(level)
WHERE p.template_id IN ('hospital', 'university', 'fund')
  AND p.is_system_level = false
  AND p.sort_order <= 5
ON CONFLICT (practice_id, level) DO NOTHING;

-- ============================================================================
-- 2. INDUSTRY-SPECIFIC OVERRIDES for highest-impact practices
-- ============================================================================
-- These replace the generic rubric where the practice is so material that
-- generic descriptors would feel hand-wavy. Customers see what good content
-- looks like and can model their customisations after these.

-- ----------------------------------------------------------------------------
-- HOSPITAL
-- ----------------------------------------------------------------------------

-- hospital.direction.1 — Vision/mission articulation
UPDATE maturity_rubrics SET descriptor =
  CASE level
    WHEN 1 THEN 'Vision/mission is not documented; clinical and administrative staff describe the org''s purpose differently.'
    WHEN 2 THEN 'Vision/mission is documented in onboarding materials but rarely referenced in operations or decisions.'
    WHEN 3 THEN 'Vision/mission is cited monthly in leadership communications; new hires receive it during onboarding; staff can recite it.'
    WHEN 4 THEN 'Vision/mission visibly drives strategic decisions and trade-offs; performance reviews reference it; staff identify with it.'
    WHEN 5 THEN 'Vision/mission is a competitive identity in the local market; new hires cite it as a reason for joining; community stakeholders know it.'
  END,
  evidence_criteria =
  CASE level
    WHEN 1 THEN 'Inconsistent answers when staff are asked "what does this hospital stand for?"'
    WHEN 2 THEN 'Mission statement on the website and in HR materials; not referenced in board minutes or operational meetings.'
    WHEN 3 THEN 'Mission referenced in monthly leadership comms + onboarding curriculum + 70%+ of staff can articulate it in surveys.'
    WHEN 4 THEN 'Strategic decisions documented with mission alignment rationale; performance review templates include mission-fit dimension.'
    WHEN 5 THEN 'Local press / patient testimonials / employer-of-choice surveys cite the mission; recruiting funnel includes mission-aligned candidates.'
  END
WHERE practice_id IN (SELECT id FROM practices WHERE external_id = 'hospital.direction.1');

-- hospital.delivery.1 — ED throughput
UPDATE maturity_rubrics SET descriptor =
  CASE level
    WHEN 1 THEN 'ED patient flow is not measured; throughput depends on shift staffing and volume luck.'
    WHEN 2 THEN 'Door-to-doctor and door-to-disposition times are tracked but not actively managed; no targets or huddles.'
    WHEN 3 THEN 'Throughput targets are set, monitored monthly, and discussed in operations review with charge-nurse flow huddles.'
    WHEN 4 THEN 'Throughput is benchmarked against peer hospitals; quarterly improvement initiatives produce measurable gains.'
    WHEN 5 THEN 'Predictive analytics anticipate surges; pre-emptive staffing and pathways deployed; cited as a model by peer hospitals.'
  END,
  evidence_criteria =
  CASE level
    WHEN 1 THEN 'No published door-to-doctor or door-to-disposition metrics; no flow huddle.'
    WHEN 2 THEN 'Monthly metric report exists; targets not documented; no action plan when metrics worsen.'
    WHEN 3 THEN 'Documented targets + monthly review minutes + active charge-nurse flow huddle with documented escalations.'
    WHEN 4 THEN 'External benchmark report (e.g., CMS, peer cohort) + quarterly improvement plan with measurable goals.'
    WHEN 5 THEN 'ML/analytics dashboard for surge prediction; peer-recognised process (case study, conference presentation, or referenced framework).'
  END
WHERE practice_id IN (SELECT id FROM practices WHERE external_id = 'hospital.delivery.1');

-- hospital.delivery.4 — Hospital-acquired infection prevention
UPDATE maturity_rubrics SET descriptor =
  CASE level
    WHEN 1 THEN 'HAI rates are not systematically tracked; prevention bundles are inconsistently applied.'
    WHEN 2 THEN 'CLABSI / CAUTI / SSI / C. diff rates are tracked but prevention-bundle compliance is not measured.'
    WHEN 3 THEN 'HAI rates are tracked monthly with formal prevention bundles whose compliance is audited.'
    WHEN 4 THEN 'HAI rates benchmark in the top-quartile of peer hospitals; bundle non-compliance triggers root-cause analysis.'
    WHEN 5 THEN 'Hospital is cited as a low-HAI-rate exemplar; bundle innovations published in peer-reviewed journals.'
  END,
  evidence_criteria =
  CASE level
    WHEN 1 THEN 'No CLABSI/CAUTI/SSI dashboards; bundle protocols absent or unread.'
    WHEN 2 THEN 'Monthly NHSN-equivalent rate reports; no bundle compliance audit log.'
    WHEN 3 THEN 'Monthly rate trending + audited bundle compliance >85% + documented response plan when rates rise.'
    WHEN 4 THEN 'Peer-comparison data showing top-quartile rates + RCA reports for any non-compliance event.'
    WHEN 5 THEN 'Published case studies / journal articles / conference presentations referencing the hospital''s HAI prevention model.'
  END
WHERE practice_id IN (SELECT id FROM practices WHERE external_id = 'hospital.delivery.4');

-- hospital.economics.1 — Revenue cycle
UPDATE maturity_rubrics SET descriptor =
  CASE level
    WHEN 1 THEN 'Revenue cycle metrics are not tracked; denials and AR aging accumulate without systematic intervention.'
    WHEN 2 THEN 'Days in AR and denial rate are tracked but no targets are set; collections are reactive.'
    WHEN 3 THEN 'Targets exist for denial rate, days in AR, clean-claim rate, and POS collection; performance reviewed monthly.'
    WHEN 4 THEN 'Revenue cycle metrics rank in the top quartile of comparable hospitals; root-cause analysis on every denial category.'
    WHEN 5 THEN 'Revenue cycle is cited as a model; participates in industry rev-cycle benchmarking communities (HFMA MAP Keys, etc.).'
  END,
  evidence_criteria =
  CASE level
    WHEN 1 THEN 'No published days-in-AR or denial rate; no documented escalation path for aged receivables.'
    WHEN 2 THEN 'Monthly metric report; no targets; no documented improvement plan.'
    WHEN 3 THEN 'Documented targets + monthly review + denial categorisation + POS collection programme.'
    WHEN 4 THEN 'HFMA MAP Keys top-quartile placement + root-cause documentation per denial category.'
    WHEN 5 THEN 'Conference presentations / industry recognition for revenue cycle excellence.'
  END
WHERE practice_id IN (SELECT id FROM practices WHERE external_id = 'hospital.economics.1');

-- hospital.governance.1 — Joint Commission readiness
UPDATE maturity_rubrics SET descriptor =
  CASE level
    WHEN 1 THEN 'Joint Commission preparation is a fire drill in the weeks before survey; mock surveys reveal gaps.'
    WHEN 2 THEN 'Some standards are tracked continuously but readiness is uneven across departments.'
    WHEN 3 THEN 'A continuous-readiness program with mock tracers and accountability for each Joint Commission chapter exists.'
    WHEN 4 THEN 'Hospital passes Joint Commission survey with zero conditional findings; tracer methodology is internal-led.'
    WHEN 5 THEN 'Hospital is sought out as a peer survey training site; Joint Commission examiners cite the readiness program as exemplary.'
  END,
  evidence_criteria =
  CASE level
    WHEN 1 THEN 'No mock tracers in past 12 months; no chapter ownership assignments documented.'
    WHEN 2 THEN 'Some chapters have documented ownership; mock tracers occur but inconsistently.'
    WHEN 3 THEN 'Continuous-readiness calendar + mock tracers across all chapters + documented findings/follow-up logs.'
    WHEN 4 THEN 'Last Joint Commission survey: zero conditional findings; internal tracer team rated by external assessor.'
    WHEN 5 THEN 'Hosting peer institutions for survey-prep training; Joint Commission communications cite the readiness model.'
  END
WHERE practice_id IN (SELECT id FROM practices WHERE external_id = 'hospital.governance.1');

-- ----------------------------------------------------------------------------
-- UNIVERSITY
-- ----------------------------------------------------------------------------

-- university.customer.2 — First-year retention
UPDATE maturity_rubrics SET descriptor =
  CASE level
    WHEN 1 THEN 'First-year retention is not actively managed; the institution learns the rate after the fact.'
    WHEN 2 THEN 'Retention rate is tracked but interventions are limited to advising; no early-alert system.'
    WHEN 3 THEN 'Early-alert system flags at-risk students; advising + tutoring + first-year seminar program in place; retention measured.'
    WHEN 4 THEN 'Retention exceeds peer-institution averages; data-driven interventions show measurable lift; targeted to specific risk cohorts.'
    WHEN 5 THEN 'Retention strategy is cited as best practice; published research on intervention effectiveness; predictive models guide outreach.'
  END,
  evidence_criteria =
  CASE level
    WHEN 1 THEN 'Retention rate published only after each academic year ends; no formal intervention program.'
    WHEN 2 THEN 'Annual retention report; advising program in place; no early-alert system or first-year seminar.'
    WHEN 3 THEN 'Early-alert dashboard + first-year seminar curriculum + advising program with case load metrics.'
    WHEN 4 THEN 'Peer benchmark data showing top-decile retention + cohort analysis showing intervention lift.'
    WHEN 5 THEN 'Published research / conference talks on retention model; predictive ML model in production for outreach prioritisation.'
  END
WHERE practice_id IN (SELECT id FROM practices WHERE external_id = 'university.customer.2');

-- university.economics.1 — Tuition strategy
UPDATE maturity_rubrics SET descriptor =
  CASE level
    WHEN 1 THEN 'Tuition is set annually with little modeling; discount rate drifts upward without strategic intent.'
    WHEN 2 THEN 'Tuition and discount rate are tracked but multi-year modeling is absent; aid policy is incremental.'
    WHEN 3 THEN 'Multi-year tuition + discount rate model exists, reviewed annually with the board, aligned to enrolment plan.'
    WHEN 4 THEN 'Tuition strategy demonstrates net revenue improvement over 3 years; discount rate optimised for mission + sustainability.'
    WHEN 5 THEN 'Tuition strategy is published as a peer-reference model; participates in regional / national tuition strategy benchmarking.'
  END,
  evidence_criteria =
  CASE level
    WHEN 1 THEN 'No multi-year tuition model; aid awards driven by competitive pressure rather than modeled outcomes.'
    WHEN 2 THEN 'Annual review of tuition + discount rate; no multi-year projection or scenario modeling.'
    WHEN 3 THEN '3-year tuition + discount rate model + annual board review documents + aid policy aligned to enrolment plan.'
    WHEN 4 THEN '3-year actuals showing net revenue improvement + discount rate optimisation analysis with cohort-level data.'
    WHEN 5 THEN 'Conference presentations / NACUBO peer recognition for tuition strategy excellence.'
  END
WHERE practice_id IN (SELECT id FROM practices WHERE external_id = 'university.economics.1');

-- university.governance.1 — Regional accreditation
UPDATE maturity_rubrics SET descriptor =
  CASE level
    WHEN 1 THEN 'Accreditation work happens in the months before reaffirmation; gaps surface during the visit.'
    WHEN 2 THEN 'Accreditation requirements are partially mapped; ownership is unclear across departments.'
    WHEN 3 THEN 'Continuous-improvement framework is institutionalised; each standard has named owners; quarterly self-assessment.'
    WHEN 4 THEN 'Accreditation reaffirmed with zero recommendations; QEP/strategic plan tightly integrated with accreditor expectations.'
    WHEN 5 THEN 'Cited by accreditor as a peer-mentor institution; QEP/improvement work referenced in published accreditor case studies.'
  END,
  evidence_criteria =
  CASE level
    WHEN 1 THEN 'No documented owner per standard; last reaffirmation surfaced multiple recommendations or warnings.'
    WHEN 2 THEN 'Some standards have owners; quarterly self-assessment cadence inconsistent.'
    WHEN 3 THEN 'Quarterly self-assessment artefacts + documented owner per standard + improvement-tracking dashboard.'
    WHEN 4 THEN 'Last reaffirmation: zero recommendations + QEP integrated with strategic plan + interim reports clean.'
    WHEN 5 THEN 'Accreditor publications / conference talks reference the institution''s improvement model.'
  END
WHERE practice_id IN (SELECT id FROM practices WHERE external_id = 'university.governance.1');

-- ----------------------------------------------------------------------------
-- FUND
-- ----------------------------------------------------------------------------

-- fund.delivery.1 — Sourcing pipeline
UPDATE maturity_rubrics SET descriptor =
  CASE level
    WHEN 1 THEN 'Sourcing is opportunistic; conversion data is not tracked; deals come from inbound and personal networks.'
    WHEN 2 THEN 'Pipeline is logged but stage definitions are loose; conversion rates are not measured.'
    WHEN 3 THEN 'Sourcing pipeline is structured with defined stages; conversion metrics tracked monthly; sourcing channels evaluated.'
    WHEN 4 THEN 'Pipeline conversion rates exceed peer-fund benchmarks; sourcing channels are systematically optimised.'
    WHEN 5 THEN 'Sourcing methodology is cited as a model in industry forums (ILPA, SBAI, AIMA); deal-flow quality compounds across vintages.'
  END,
  evidence_criteria =
  CASE level
    WHEN 1 THEN 'Deals tracked in email or scattered spreadsheets; no documented stage gates or conversion data.'
    WHEN 2 THEN 'CRM logs deals; stage definitions exist but are inconsistently applied; no conversion-rate dashboard.'
    WHEN 3 THEN 'CRM with documented stage gates + monthly conversion-rate review + channel-by-channel attribution.'
    WHEN 4 THEN 'Peer-fund benchmark data (e.g., from PEI / ILPA studies) showing top-quartile conversion + documented channel optimisation experiments.'
    WHEN 5 THEN 'Industry presentations / published deal-flow methodology; deal-quality metrics compound vintage over vintage.'
  END
WHERE practice_id IN (SELECT id FROM practices WHERE external_id = 'fund.delivery.1');

-- fund.economics.1 — Fund returns tracking
UPDATE maturity_rubrics SET descriptor =
  CASE level
    WHEN 1 THEN 'Fund returns are calculated only when LP reports are due; vintage benchmarking is absent.'
    WHEN 2 THEN 'Returns calculated quarterly but methodology is not standardised; no vintage comparison.'
    WHEN 3 THEN 'IRR / MOIC / DPI / RVPI / TVPI calculated monthly with documented methodology; vintage-quartile benchmarks tracked.'
    WHEN 4 THEN 'Net IRR ranks in top-quartile of vintage benchmarks; attribution analysis explains performance vs peers.'
    WHEN 5 THEN 'Fund returns + attribution methodology is cited in industry research; LPs reference this fund as a benchmark.'
  END,
  evidence_criteria =
  CASE level
    WHEN 1 THEN 'No documented IRR/MOIC methodology; reports compiled only at LP-report deadlines.'
    WHEN 2 THEN 'Quarterly return reports; methodology informal; no vintage-quartile context.'
    WHEN 3 THEN 'Monthly returns dashboard + documented calculation methodology (audited annually) + vintage benchmark comparison.'
    WHEN 4 THEN 'PEI / Cambridge Associates / Pitchbook benchmark showing top-quartile placement + per-deal attribution analysis.'
    WHEN 5 THEN 'Industry research cites fund as benchmark; LP marketing materials in peer funds reference vintage performance.'
  END
WHERE practice_id IN (SELECT id FROM practices WHERE external_id = 'fund.economics.1');

-- ============================================================================
-- 3. NOTE ON FOLLOW-UP AUTHORING
-- ============================================================================
-- The remaining ~115 practices currently use the generic rubric (which is
-- still useful and editable by customers). Industry-specific authoring for
-- the next tier of practices ships in v1.1 — additional UPDATE statements
-- like the ones above, no schema changes needed.
