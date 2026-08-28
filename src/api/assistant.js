import api from './client'

export default {
  // Feature availability (entitlement / maintenance switch).
  // res.data = {enabled, message}.
  status: () => api.get('/assistant/status/', { _silentError: true }),

  // Ask a question about the active website's data. Pass conversationId to
  // continue a thread; omit it and the server opens one and returns its id.
  // History is read server-side from the stored thread, so it is not sent.
  // Response envelope: res.data = {answer, grounded, conversation_id}.
  ask: (websiteId, question, conversationId = null) =>
    api.post(`/assistant/${websiteId}/ask/`, {
      question,
      ...(conversationId ? { conversation_id: conversationId } : {}),
    }),

  // Chat threads for the sidebar list. res.data = {conversations: [...]}.
  conversations: (websiteId) =>
    api.get(`/assistant/${websiteId}/conversations/`, { _silentError: true }),

  createConversation: (websiteId) =>
    api.post(`/assistant/${websiteId}/conversations/`),

  // res.data = {id, title, message_count, messages: [...]}.
  conversation: (websiteId, conversationId) =>
    api.get(`/assistant/${websiteId}/conversations/${conversationId}/`),

  renameConversation: (websiteId, conversationId, title) =>
    api.patch(`/assistant/${websiteId}/conversations/${conversationId}/`, { title }),

  deleteConversation: (websiteId, conversationId) =>
    api.delete(`/assistant/${websiteId}/conversations/${conversationId}/`),
}
