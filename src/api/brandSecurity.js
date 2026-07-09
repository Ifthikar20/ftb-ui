import api from './client'

export default {
  overview: (websiteId) =>
    api.get(`/brand-security/websites/${websiteId}/overview/`),

  // Agents ---------------------------------------------------------------
  agents: (websiteId) =>
    api.get(`/brand-security/websites/${websiteId}/agents/`),
  updateAgent: (websiteId, agentId, payload) =>
    api.patch(
      `/brand-security/websites/${websiteId}/agents/${agentId}/`,
      payload,
    ),
  runAgent: (websiteId, agentId) =>
    api.post(`/brand-security/websites/${websiteId}/agents/${agentId}/run/`),

  // Scans ----------------------------------------------------------------
  runScan: (websiteId, only = null) =>
    api.post(`/brand-security/websites/${websiteId}/scan/`, only ? { only } : {}),

  // Alerts ---------------------------------------------------------------
  alerts: (websiteId, params = {}) =>
    api.get(`/brand-security/websites/${websiteId}/alerts/`, { params }),
  resolveAlert: (alertId) =>
    api.post(`/brand-security/alerts/${alertId}/resolve/`),
  dismissAlert: (alertId) =>
    api.post(`/brand-security/alerts/${alertId}/dismiss/`),

  // Config ---------------------------------------------------------------
  config: (websiteId) =>
    api.get(`/brand-security/websites/${websiteId}/config/`),
  saveConfig: (websiteId, payload) =>
    api.put(`/brand-security/websites/${websiteId}/config/`, payload),

  // Prompts (LLM Truth) --------------------------------------------------
  prompts: (websiteId) =>
    api.get(`/brand-security/websites/${websiteId}/prompts/`),
  createPrompt: (websiteId, text) =>
    api.post(`/brand-security/websites/${websiteId}/prompts/`, { text }),
  deletePrompt: (promptId) =>
    api.delete(`/brand-security/prompts/${promptId}/`),
}
