import api from './client'

// Brand Security is a findings feed with no scan step. Findings are derived
// from the AI answers an audit already collected — the response auditor runs
// as each audit completes, so an alert exists the moment the answer that
// caused it does. There is nothing for the user to trigger.
export default {
  // Findings --------------------------------------------------------------
  // params: { status, severity: [], issue: [], source: [], result, source_prompt }
  alerts: (websiteId, params = {}) =>
    api.get(`/brand-security/websites/${websiteId}/alerts/`, { params }),
  // Findings raised from the audit responses for one library prompt. Used by
  // the prompt detail page so a reader sees the risk attached to the exact
  // answers shown on that page.
  alertsForPrompt: (websiteId, promptId) =>
    api.get(`/brand-security/websites/${websiteId}/alerts/`, {
      params: { source_prompt: promptId },
    }),
  resolveAlert: (alertId) =>
    api.post(`/brand-security/alerts/${alertId}/resolve/`),
  dismissAlert: (alertId) =>
    api.post(`/brand-security/alerts/${alertId}/dismiss/`),

  // Monitoring config -----------------------------------------------------
  config: (websiteId) =>
    api.get(`/brand-security/websites/${websiteId}/config/`),
  saveConfig: (websiteId, payload) =>
    api.put(`/brand-security/websites/${websiteId}/config/`, payload),
}
