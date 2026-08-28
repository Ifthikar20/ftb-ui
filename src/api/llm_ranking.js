import api from './client'

export default {
    previewPrompts: (wid, params) => api.get(`/llm-ranking/${wid}/preview-prompts/`, { params }),
    // Usage metering
    usage: (wid, params) => api.get(`/llm-ranking/${wid}/usage/`, { params }),
    // Per-provider configuration / health (only implemented providers returned)
    providerHealth: (wid) => api.get(`/llm-ranking/${wid}/provider-health/`),
    // Schedule endpoints
    getSchedule: (wid) => api.get(`/llm-ranking/${wid}/schedule/`),
    saveSchedule: (wid, data) => api.post(`/llm-ranking/${wid}/schedule/`, data),
    deleteSchedule: (wid) => api.delete(`/llm-ranking/${wid}/schedule/`),
    scheduleETA: (wid) => api.get(`/llm-ranking/${wid}/schedule/eta/`),
    runScheduleNow: (wid) => api.post(`/llm-ranking/${wid}/schedule/run-now/`),
    // Selectable model variants (provider + submodel) for the Add Prompt
    // "Models" tab. Each entry: {id, provider, model_id, label, is_default,
    // configured}.
    modelVariants: (wid) => api.get(`/llm-ranking/${wid}/model-variants/`),
    // Model Test + GEO endpoints removed 2026-07 — the multi-provider
    // probe use case moves under the Prompts page auto-measurement flow.
    // 12-month visibility series + headline values for the dashboard
    // Visibility Overview card.
    visibilityOverview: (wid) => api.get(`/llm-ranking/${wid}/visibility-overview/`),
}
