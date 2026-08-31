/**
 * Lightweight client-side diagnostics for support tickets.
 *
 * - A stable per-browser-session client id, sent as X-Client-Id on every
 *   API request. The backend logs it per request, so support can grep
 *   server logs for exactly this user's traffic.
 * - Ring buffers of recent JS errors and failed API calls, attached to
 *   feedback-widget messages so "the prompt step is not loading" arrives
 *   with the evidence needed to reproduce it.
 *
 * No third-party calls, no PII beyond what the browser already sends.
 */

const CLIENT_ID_KEY = 'cs-client-id'
const MAX_ENTRIES = 8

let clientId = ''
const errors = []
const failedRequests = []

function freshId() {
    return 'web-' + Math.random().toString(36).slice(2, 10)
}

export function getClientId() {
    if (clientId) return clientId
    try {
        clientId = sessionStorage.getItem(CLIENT_ID_KEY) || ''
        if (!clientId) {
            clientId = freshId()
            sessionStorage.setItem(CLIENT_ID_KEY, clientId)
        }
    } catch {
        // Private mode etc. — a non-persistent id still correlates
        // everything within this page's lifetime.
        clientId = freshId()
    }
    return clientId
}

function push(buffer, entry) {
    buffer.push(entry)
    if (buffer.length > MAX_ENTRIES) buffer.shift()
}

export function recordFailedRequest({ method, url, status, requestId }) {
    push(failedRequests, {
        at: new Date().toISOString(),
        method: String(method || 'GET').toUpperCase(),
        url: String(url || '').slice(0, 200),
        status: status || 0,
        request_id: String(requestId || '').slice(0, 64),
    })
}

export function installDiagnostics() {
    getClientId()
    window.addEventListener('error', (event) => {
        push(errors, {
            at: new Date().toISOString(),
            message: String(event.message || 'Script error').slice(0, 300),
            source: `${event.filename || ''}:${event.lineno || 0}`,
        })
    })
    window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason
        push(errors, {
            at: new Date().toISOString(),
            message: ('unhandled rejection: '
                + (reason?.message || String(reason ?? 'unknown'))).slice(0, 300),
        })
    })
}

/** Snapshot attached to every feedback message. */
export function diagnosticsSnapshot() {
    return {
        client_id: getClientId(),
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        user_agent: navigator.userAgent,
        errors: errors.slice(),
        failed_requests: failedRequests.slice(),
    }
}
