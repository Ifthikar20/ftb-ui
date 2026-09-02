import api from './client'

export default {
    list: (config) => api.get('/websites/', config),
    create: (data) => api.post('/websites/', data),
    get: (id) => api.get(`/websites/${id}/`),
    update: (id, data) => api.put(`/websites/${id}/`, data),
    delete: (id) => api.delete(`/websites/${id}/`),
    getPixel: (id) => api.get(`/websites/${id}/pixel/`),
    verifyPixel: (id) => api.post(`/websites/${id}/pixel/verify/`),
    getHealth: (id) => api.get(`/websites/${id}/health/`),
    getSettings: (id) => api.get(`/websites/${id}/settings/`),
    updateSettings: (id, data) => api.put(`/websites/${id}/settings/`, data),
    // Team management lives at the organization level — see api/orgs.js.
    // Onboarding assist (AI-powered)
    onboardingAssist: (id, data) => api.post(`/websites/${id}/onboarding/assist/`, data),
}

