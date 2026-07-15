import api from './client'

// Wraps the RAG "knowledge sources" endpoints backing the Brand Input
// page. Every URL you register here gets chunked, embedded, and stored
// against (user, website) — the retrieve endpoint later queries these
// chunks to check LLM answers against what your brand actually says.
export default {
  listSources: (websiteId) =>
    api.get(`/rag/${websiteId}/sources/`),

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

  retrieve: (websiteId, query, topK = 5) =>
    api.post(`/rag/${websiteId}/retrieve/`, { query, top_k: topK }),
}
