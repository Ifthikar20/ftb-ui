import api from './client'

export default {
    getCurrent: (config) => api.get('/billing/', config),
    getPlans: () => api.get('/billing/plans/'),
    checkout: (data) => api.post('/billing/checkout/', data),
    // Post-redirect verification of a completed Polar checkout.
    confirm: (checkoutId) => api.post('/billing/confirm/', { checkout_id: checkoutId }),
    // "Continue with the free plan" on the paywall — persists the
    // dismissal so next_route stops returning 'paywall'.
    dismissPaywall: () => api.post('/billing/paywall/dismiss/'),
    cancel: () => api.post('/billing/cancel/'),
    resume: () => api.post('/billing/resume/'),
    portal: () => api.post('/billing/portal/'),
    invoices: () => api.get('/billing/invoices/'),
    // Window is always the current billing period (server-defined).
    tokenUsage: () => api.get('/billing/token-usage/'),
}
