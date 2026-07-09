import api from './client'

export default {
  auditCitations: (auditId, params = {}) =>
    api.get(`/citations/audits/${auditId}/citations/`, { params }),
  auditSourceInfluence: (auditId) =>
    api.get(`/citations/audits/${auditId}/source-influence/`),
  websiteSourceInfluence: (websiteId, params = {}) =>
    api.get(`/citations/websites/${websiteId}/source-influence/`, { params }),
  websiteCitations: (websiteId, params = {}) =>
    api.get(`/citations/websites/${websiteId}/citations/`, { params }),
  websiteUrls: (websiteId, params = {}) =>
    api.get(`/citations/websites/${websiteId}/urls/`, { params }),
  websiteUrlDetail: (websiteId, url, params = {}) =>
    api.get(`/citations/websites/${websiteId}/urls/detail/`, { params: { url, ...params } }),
  chatDetail: (websiteId, resultId) =>
    api.get(`/citations/websites/${websiteId}/chats/${resultId}/`),
  globalInfluence: (params = {}) =>
    api.get(`/citations/source-influence/global/`, { params }),
  // Source Intelligence scans (Search Insights page)
  sourceScans: (websiteId) =>
    api.get(`/citations/websites/${websiteId}/source-scans/`),
  createSourceScan: (websiteId, query) =>
    api.post(`/citations/websites/${websiteId}/source-scans/`, { query }),
  sourceScanDetail: (websiteId, scanId) =>
    api.get(`/citations/websites/${websiteId}/source-scans/${scanId}/`),
  brandLookup: (name) =>
    api.get(`/citations/brand-lookup/`, { params: { name } }),
}
