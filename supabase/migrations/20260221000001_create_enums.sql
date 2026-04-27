-- BDS OS: Custom PostgreSQL Enum Types
-- These enums define the domain vocabulary for the entire operating system.

-- Organization lifecycle stage (derived from revenue + employee count)
CREATE TYPE lifecycle_stage AS ENUM (
  'startup',
  'growth',
  'scale',
  'mature'
);

-- Initiative Kanban workflow status
-- Enforced progression: backlog → planned → in_progress → evidence_ready → ai_pre_graded → pending_verification → approved
CREATE TYPE initiative_status AS ENUM (
  'backlog',
  'planned',
  'in_progress',
  'evidence_ready',
  'ai_pre_graded',
  'pending_verification',
  'approved'
);

-- Score change request review status
CREATE TYPE score_change_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

-- Governance meeting cadence
CREATE TYPE meeting_type AS ENUM (
  'weekly',
  'monthly',
  'quarterly'
);

-- User role within an organization
CREATE TYPE user_role AS ENUM (
  'admin',
  'leader',
  'functional_lead'
);

-- OPI phase classification
-- Phase 1 (Proof): high-priority, immediate action
-- Phase 2 (Structure): mid-priority, build foundations
-- Phase 3 (Scale): lower-priority, competitive advantage
CREATE TYPE opi_phase AS ENUM (
  'proof',
  'structure',
  'scale_phase'
);
