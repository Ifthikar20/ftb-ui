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
}
