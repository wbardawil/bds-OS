-- BDS OS: Framework seed data
--
-- Seeds the 8 universal pillars (locked) and the 4 templates (suggestions).
-- Practice/metric content per template is seeded in subsequent migrations
-- once the content is finalised.

-- ============================================================================
-- UNIVERSAL PILLARS (locked at platform level, MECE)
-- ============================================================================

INSERT INTO universal_pillars (id, code, name, description, sort_order) VALUES
  (1, 'direction',  'Direction',  'Strategy, vision, mission, planning, decision rights.', 1),
  (2, 'customer',   'Customer',   'Who we serve and how well — customers, patients, students, members, LPs, partners.', 2),
  (3, 'delivery',   'Delivery',   'Operations, processes, throughput, quality, supply.', 3),
  (4, 'economics',  'Economics',  'Financial discipline, capital allocation, P&L, sustainability.', 4),
  (5, 'people',     'People',     'Talent, culture, engagement, leadership, succession.', 5),
  (6, 'technology', 'Technology', 'Systems, data, security, interoperability, automation.', 6),
  (7, 'governance', 'Governance', 'Board, compliance, risk, accountability, ethics.', 7),
  (8, 'innovation', 'Innovation', 'Learning, R&D, new offerings, adaptation, future readiness.', 8)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TEMPLATES (industry suggestions — content seeded in subsequent migrations)
-- ============================================================================

INSERT INTO templates (id, name, description, industry, sort_order, is_active) VALUES
  ('smb-default',
   'General SMB',
   'A general-purpose set of management practices for small and mid-sized businesses across industries. Use this if no industry template fits.',
   'general', 1, true),

  ('hospital',
   'Hospital / Health System',
   'Practices and KPIs for community hospitals and small hospital systems. Grounded in Joint Commission, Magnet, HFMA, HCAHPS, AHA leadership competencies.',
   'healthcare', 2, true),

  ('university',
   'University / Higher Education',
   'Practices and KPIs for colleges and universities. Grounded in regional accreditation (SACSCOC / MSCHE / NWCCU / WSCUC / HLC), AGB governance principles, NACUBO finance, IPEDS, FERPA / Title IX.',
   'higher-education', 3, true),

  ('fund',
   'Investment Fund / Professional Services',
   'Practices and KPIs for private investment funds, family offices, and professional-services firms. Grounded in ILPA, SBAI, AIMA, ESG Data Convergence Initiative.',
   'financial-services', 4, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DEFAULT ROLE_LENS for existing company_members
-- ============================================================================
-- Existing members default to 'viewer'; they can update themselves to a more
-- specific role lens via the customisation UI.
UPDATE company_members SET role_lens = 'viewer' WHERE role_lens IS NULL;
