// BDS OS — Default OPI Weight Profiles by Lifecycle Stage
// W1–W5 must sum to 1.000 for each stage.
//
// The weights control how the OPI formula prioritizes different factors:
//   OPI = [(Gap × W1) + (P&L × W2) + (Speed × W3) + (Dependency × W4) + (Risk × W5)] × Lifecycle_Mod
//
// Startup:  Close gaps fast, prioritize speed — W1 (gap) and W3 (speed) dominate
// Growth:   Balance with P&L emphasis — W2 (P&L) rises, speed stays relevant
// Scale:    Dependencies and risk matter — W4 (dependency) and W5 (risk) increase
// Mature:   Governance and risk floor focus — W5 (risk) and W4 (dependency) dominate

import type { LifecycleStage } from '../types/database.js';
import type { LifecycleWeights } from '../types/opi.js';

export const DEFAULT_LIFECYCLE_WEIGHTS: Record<LifecycleStage, LifecycleWeights> = {
  startup: {
    w1_gap: 0.350,
    w2_pnl: 0.200,
    w3_speed: 0.250,
    w4_dependency: 0.100,
    w5_risk: 0.100,
  },
  growth: {
    w1_gap: 0.250,
    w2_pnl: 0.300,
    w3_speed: 0.200,
    w4_dependency: 0.125,
    w5_risk: 0.125,
  },
  scale: {
    w1_gap: 0.200,
    w2_pnl: 0.250,
    w3_speed: 0.150,
    w4_dependency: 0.200,
    w5_risk: 0.200,
  },
  mature: {
    w1_gap: 0.150,
    w2_pnl: 0.200,
    w3_speed: 0.100,
    w4_dependency: 0.250,
    w5_risk: 0.300,
  },
};

// Lifecycle modifier: a multiplier applied to the OPI score based on stage.
// Startups get a boost (speed of iteration matters more);
// mature orgs get a slight penalty (stabilization > acceleration).
export const LIFECYCLE_MODIFIERS: Record<LifecycleStage, number> = {
  startup: 1.200,
  growth: 1.100,
  scale: 1.000,
  mature: 0.900,
};
