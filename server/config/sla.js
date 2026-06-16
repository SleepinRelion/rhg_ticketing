// SLA defaults per priority (in minutes)
// These are loaded from the database sla_configs table at runtime
// This file serves as fallback defaults
export const SLA_DEFAULTS = {
  critical: { response: 30, resolution: 240, escalation: 15 },
  high: { response: 120, resolution: 1440, escalation: 60 },
  medium: { response: 480, resolution: 4320, escalation: 480 },
  low: { response: 1440, resolution: 10080, escalation: 1440 },
};

// Percentage of SLA time elapsed before marking as "at_risk"
export const AT_RISK_THRESHOLD = 0.75;

// Timezone for SLA calculations (GMT+4 Mauritius)
export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Indian/Mauritius';
