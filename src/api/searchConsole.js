import api from './client'

// Google Search Console integration.
// Connection lifecycle + ingested Search Analytics data, all scoped
// to a website. The OAuth consent itself happens via a full-page
// redirect to the authorize_url returned by connectStart; Google
// redirects back through the backend callback, which lands on
// /app/integrations?gsc=... (GSC is managed from the Integrations page).
export default {
    status: (wid) => api.get(`/search-console/${wid}/status/`),
    connectStart: (wid) => api.post(`/search-console/${wid}/connect/`),
    properties: (wid) => api.get(`/search-console/${wid}/properties/`),
    selectProperty: (wid, siteUrl) => api.post(`/search-console/${wid}/property/`, { site_url: siteUrl }),
    disconnect: (wid) => api.delete(`/search-console/${wid}/connection/`),
    summary: (wid, params) => api.get(`/search-console/${wid}/summary/`, { params }),
}
