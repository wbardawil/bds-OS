-- BDS OS: Performance Indexes
-- Optimized for the primary query patterns of each engine

-- OPI Engine: phase-based queries and org-scoped ranking
CREATE INDEX idx_opi_scores_round_phase ON opi_scores(round_id, phase_number);
CREATE INDEX idx_opi_scores_org_round ON opi_scores(organization_id, round_id);
CREATE INDEX idx_opi_scores_final_opi ON opi_scores(final_opi DESC);

-- Practice Metadata: fast lookups during OPI computation
CREATE INDEX idx_practice_metadata_practice ON practice_metadata(practice_id);

-- Score Change Requests: pending queue and per-practice history
CREATE INDEX idx_score_change_requests_status ON score_change_requests(status);
CREATE INDEX idx_score_change_requests_org_practice ON score_change_requests(organization_id, practice_id);

-- Initiatives: Kanban board queries and practice-linked lookups
CREATE INDEX idx_initiatives_org_status ON initiatives(organization_id, status);
CREATE INDEX idx_initiatives_practice ON initiatives(practice_id);

-- Assessment: round-scoped response queries
CREATE INDEX idx_round_responses_round_org ON round_responses(round_id, organization_id);

-- Evidence: per-initiative evidence retrieval
CREATE INDEX idx_evidence_initiative ON evidence(initiative_id);

-- Focus Portfolios: quarterly lookups
CREATE INDEX idx_focus_portfolios_org_quarter ON focus_portfolios(organization_id, quarter);

-- Governance: meeting lookups by org and type
CREATE INDEX idx_meetings_org_type ON meetings(organization_id, type);

-- KPIs: org-scoped time-series queries
CREATE INDEX idx_kpis_org_period ON kpis(organization_id, period);

-- Adoption Metrics: practice-level health tracking
CREATE INDEX idx_adoption_metrics_org ON adoption_metrics(organization_id);
CREATE INDEX idx_adoption_metrics_practice ON adoption_metrics(practice_id);

-- Users: org membership lookups
CREATE INDEX idx_users_organization ON users(organization_id);

-- Assessment Rounds: org-scoped round listing
CREATE INDEX idx_assessment_rounds_org ON assessment_rounds(organization_id);

-- Practice Dependencies: dependency graph traversal
CREATE INDEX idx_practice_dependencies_practice ON practice_dependencies(practice_id);
CREATE INDEX idx_practice_dependencies_depends_on ON practice_dependencies(depends_on_practice_id);
