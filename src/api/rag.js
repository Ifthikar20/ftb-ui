import api from './client'

// Wraps the RAG "knowledge sources" endpoints backing the Brand Input
// page. Every URL you register here gets chunked, embedded, and stored
// against (user, website) — the retrieve endpoint later queries these
// chunks to check LLM answers against what your brand actually says.
export default {
  // GET /rag/{websiteId}/sources/
  // params: { page, page_size, status, kind, domain, search }
  // Returns res.data as the array, res.meta.count/next/previous/stats.
  listSources: (websiteId, params = {}) =>
    api.get(`/rag/${websiteId}/sources/`, { params }),

  addSource: (websiteId, payload) =>
    // payload accepts:
    //   { url, kind?, title?, crawl?, page_cap?, depth? }
    // kind ∈ homepage | blog | product | docs | review | other
    // crawl=true crawls the site (up to page_cap pages at given depth)
    api.post(`/rag/${websiteId}/sources/`, payload),

  uploadText: (websiteId, payload) =>
    // Paste raw text or markdown into the knowledge base.
    // payload: { title, kind?, text }
    api.post(`/rag/${websiteId}/sources/upload/`, payload),

  getSource: (websiteId, sourceId) =>
    api.get(`/rag/${websiteId}/sources/${sourceId}/`),

  deleteSource: (websiteId, sourceId) =>
    api.delete(`/rag/${websiteId}/sources/${sourceId}/`),

  reingestSource: (websiteId, sourceId) =>
    // POST re-queues the URL for a fresh fetch + embed. Paste-uploaded
    // sources return 400 (user must re-upload to update pasted text).
    api.post(`/rag/${websiteId}/sources/${sourceId}/reingest/`),

  retrieve: (websiteId, { query, topK = 5, sourceId = null } = {}) => {
    // POST /rag/{websiteId}/retrieve/
    // Optional sourceId narrows the search to one KnowledgeSource, used
    // by the Brand Input detail drawer's "test this source" input.
    const body = { query, top_k: topK }
    if (sourceId) body.source_id = sourceId
    return api.post(`/rag/${websiteId}/retrieve/`, body)
  },
}
