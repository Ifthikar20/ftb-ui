import api from './client'

// REST client for the hireable-agents feature. Backend mounts these routes at
// /api/v1/agents/ — see apps/agents/api/v1/urls.py. Responses pass through the
// global success/data envelope; callers unwrap `.data` as needed.
export default {
    // Marketplace
    catalog: () => api.get('/agents/catalog/'),

    // Hire / manage
    hire: (payload) => api.post('/agents/hire/', payload),
    listHired: (websiteId) =>
        api.get('/agents/hired/', { params: websiteId ? { website: websiteId } : {} }),
    getHired: (id) => api.get(`/agents/hired/${id}/`),
    updateHired: (id, payload) => api.patch(`/agents/hired/${id}/`, payload),
    disconnect: (id) => api.delete(`/agents/hired/${id}/`),
    runNow: (id) => api.post(`/agents/hired/${id}/run/`),

    // Insights
    insights: (id) => api.get(`/agents/hired/${id}/insights/`),

    // Chat
    chatHistory: (id) => api.get(`/agents/hired/${id}/chat/`),
    sendMessage: (id, message) => api.post(`/agents/hired/${id}/chat/`, { message }),

    // Actions (human-approval gated)
    actions: (id) => api.get(`/agents/hired/${id}/actions/`),
    decideAction: (actionId, decision) =>
        api.post(`/agents/actions/${actionId}/${decision}/`),
}
