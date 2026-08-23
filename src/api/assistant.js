import api from './client'

export default {
  // Feature availability (entitlement / maintenance switch).
  // res.data = {enabled, message}.
  status: () => api.get('/assistant/status/', { _silentError: true }),

  // Ask a question about the active website's data. `history` is the
  // prior turns [{role, content}]; the server grounds the answer in the
  // tenant's own facts + RAG. Response envelope: res.data = {answer, grounded}.
  ask: (websiteId, question, history = []) =>
    api.post(`/assistant/${websiteId}/ask/`, { question, history }),
}
