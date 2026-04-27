// BDS OS — WIP Limits by Lifecycle Stage
// Controls the maximum number of active practices in the Quarterly Focus Portfolio.
//
// Startup:  3–5 practices (focus is survival)
// Growth:   5–7 practices (expanding but disciplined)
// Scale:    6–9 practices (building breadth)
// Mature:   7–9 practices (full operational coverage)

import type { LifecycleStage } from '../types/database.js';

export interface WIPLimitConfig {
  min_active_practices: number;
  max_active_practices: number;
}

export const WIP_LIMITS: Record<LifecycleStage, WIPLimitConfig> = {
  startup: { min_active_practices: 3, max_active_practices: 5 },
  growth: { min_active_practices: 5, max_active_practices: 7 },
  scale: { min_active_practices: 6, max_active_practices: 9 },
  mature: { min_active_practices: 7, max_active_practices: 9 },
};
