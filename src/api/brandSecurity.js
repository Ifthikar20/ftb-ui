import api from './client'

// Brand Security is presented to the user as a findings feed: scans run
// in the background (scheduled, or kicked off with runScan) and every
// issue they catch lands in the alerts list. Agent management endpoints
// exist server-side but are intentionally not exposed in the UI anymore.
export default {
  // Scans -----------------------------------------------------------------
  // POST returns 202 {queued: true, agents: [...]} — the scan runs on a
  // background worker. Poll scanStatus() until running flips to false.
  runScan: (websiteId, only = null) =>
    api.post(`/brand-security/websites/${websiteId}/scan/`, only ? { only } : {}),
  scanStatus: (websiteId) =>
    api.get(`/brand-security/websites/${websiteId}/scan/status/`),

  // Findings --------------------------------------------------------------
  // params: { status, severity: [], issue: [], source: [] }
  alerts: (websiteId, params = {}) =>
    api.get(`/brand-security/websites/${websiteId}/alerts/`, { params }),
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
