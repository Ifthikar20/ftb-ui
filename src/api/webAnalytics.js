import api from './client'

// External traffic sources (backend: apps/web_analytics).
// Three per-website sources, all serving cached snapshots — the backend
// never stores raw analytics rows for these:
//   - ga4:    the client's own GA4 property, connected via OAuth. The
//             consent happens via full-page redirect to authorize_url;
//             Google redirects back through the backend callback, which
//             lands on /websites/:id?ga4=...
//   - hosted: a Cansee-owned GA4 property behind our Google tag —
//             the client just pastes a gtag snippet.
//   - cloudflare: tenant-supplied zone API token (Zone→Analytics→Read).
// Polling reads are _silentError: a 409 simply means "not connected yet"
// and stale periods should never spam toasts.
export default {
    ga4Status: (wid) => api.get(`/web-analytics/ga4/${wid}/status/`, { _silentError: true }),
    ga4ConnectStart: (wid) => api.post(`/web-analytics/ga4/${wid}/connect/`),
    ga4Properties: (wid) => api.get(`/web-analytics/ga4/${wid}/properties/`),
    ga4SelectProperty: (wid, propertyId) => api.post(`/web-analytics/ga4/${wid}/property/`, { property_id: propertyId }),
    ga4Disconnect: (wid) => api.delete(`/web-analytics/ga4/${wid}/connection/`),
    ga4Realtime: (wid) => api.get(`/web-analytics/ga4/${wid}/realtime/`, { _silentError: true }),

    hostedStatus: (wid) => api.get(`/web-analytics/ga4/hosted/${wid}/status/`, { _silentError: true }),
    hostedEnable: (wid) => api.post(`/web-analytics/ga4/hosted/${wid}/enable/`),
    hostedDisable: (wid) => api.delete(`/web-analytics/ga4/hosted/${wid}/connection/`),
    hostedRealtime: (wid) => api.get(`/web-analytics/ga4/hosted/${wid}/realtime/`, { _silentError: true }),

    cfConnect: (wid, apiToken) => api.post(`/web-analytics/cloudflare/${wid}/connect/`, { api_token: apiToken }),
    cfStatus: (wid) => api.get(`/web-analytics/cloudflare/${wid}/status/`, { _silentError: true }),
    cfZones: (wid) => api.get(`/web-analytics/cloudflare/${wid}/zones/`),
    cfSelectZone: (wid, zoneId) => api.post(`/web-analytics/cloudflare/${wid}/zone/`, { zone_id: zoneId }),
    cfDisconnect: (wid) => api.delete(`/web-analytics/cloudflare/${wid}/connection/`),
    cfSnapshot: (wid) => api.get(`/web-analytics/cloudflare/${wid}/snapshot/`, { _silentError: true }),
}
