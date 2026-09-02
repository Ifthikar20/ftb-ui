// Shared builders for the full-page IdP redirects. Every page that offers
// "Continue with Google/Microsoft" (login, /sso, invite) goes through
// these so the state keys, callback paths, and deep-link stash never
// drift between surfaces.
//
// Returns an error string when the provider isn't configured (caller
// renders it inline); returns '' and navigates away on success.

import api from '@/api/client'

export function startGoogleSso({ loginHint = '', hd = '', postAuthRedirect = '' } = {}) {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) return 'Google sign-in is not configured on this deployment.'

    const state = crypto.randomUUID()
    sessionStorage.setItem('google-oauth-state', state)
    if (postAuthRedirect) {
        sessionStorage.setItem('cs-post-auth-redirect', postAuthRedirect)
    }
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: `${window.location.origin}/auth/google/callback`,
        response_type: 'code',
        scope: 'openid email profile',
        state,
    })
    // UX niceties only — Google pre-selects the account/domain. The backend
    // never trusts these; it verifies hd from the signed id_token.
    if (loginHint) params.set('login_hint', loginHint)
    if (hd) params.set('hd', hd)
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
    return ''
}

export function startMicrosoftSso({ loginHint = '', postAuthRedirect = '' } = {}) {
    const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID
    if (!clientId) return 'Microsoft sign-in is not configured on this deployment.'

    const state = crypto.randomUUID()
    sessionStorage.setItem('ms-oauth-state', state)
    if (postAuthRedirect) {
        sessionStorage.setItem('cs-post-auth-redirect', postAuthRedirect)
    }
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: `${window.location.origin}/auth/microsoft/callback`,
        response_type: 'code',
        scope: 'openid email profile',
        response_mode: 'query',
        state,
    })
    if (loginHint) params.set('login_hint', loginHint)
    // `organizations` authority = work accounts only (no personal MSAs).
    window.location.href = `https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?${params}`
    return ''
}

// SAML differs from the OAuth lanes: the backend owns the round trip.
// We ask it where to send the browser (a WorkOS authorize URL) and the
// return leg lands on /auth/sso/complete with a one-time code — so
// there is no client id or state nonce to manage here. Async because
// of the lookup; same contract as the others ('' on success, error
// string for the caller to render inline).
export async function startSamlSso(email, { postAuthRedirect = '' } = {}) {
    try {
        const { data } = await api.post('/auth/saml/start/', { email }, { _silentError: true })
        if (postAuthRedirect) {
            sessionStorage.setItem('cs-post-auth-redirect', postAuthRedirect)
        }
        window.location.href = data.redirect
        return ''
    } catch (e) {
        const status = e?.response?.status
        if (status === 503) return 'Company SSO is temporarily unavailable — contact your admin.'
        if (status === 404) return "Single sign-on isn't set up for this email domain."
        return e?.response?.data?.error?.message || 'Company sign-in failed to start. Please try again.'
    }
}
