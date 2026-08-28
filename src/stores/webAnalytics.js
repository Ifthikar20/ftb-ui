import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import webAnalyticsApi from '@/api/webAnalytics'

// Connection status for the external traffic sources (GA4 / hosted
// Google tag / Cloudflare). The traffic DATA itself is not fetched
// here: the backend's source resolver feeds it straight into the
// regular SEO Analytics endpoints, so the dashboard renders external
// sources through the exact same store/components as pixel data.
export const useWebAnalyticsStore = defineStore('webAnalytics', () => {
    const activeWebsiteId = ref(null)

    // Connection status per source (shape mirrors the backend payloads).
    const ga4 = ref(null)
    const hosted = ref(null)
    const cloudflare = ref(null)

    const statusLoaded = ref(false)

    // Dark-launch gate (assistant-store pattern): default visible, hidden
    // when the backend reports the feature off — it 404s, caught below.
    const featureEnabled = ref(true)

    const ga4Connected = computed(() => Boolean(ga4.value?.is_active && ga4.value?.property_id))
    const ga4PendingProperty = computed(() => Boolean(ga4.value?.pending_property_selection))
    const hostedEnabled = computed(() => Boolean(hosted.value?.enabled))
    const cfConnected = computed(() => Boolean(cloudflare.value?.is_active && cloudflare.value?.zone_id))
    const anyConnected = computed(() => ga4Connected.value || hostedEnabled.value || cfConnected.value)

    function _reset() {
        ga4.value = null
        hosted.value = null
        cloudflare.value = null
        statusLoaded.value = false
    }

    async function loadStatuses(wid) {
        wid = wid || activeWebsiteId.value
        if (!wid) return
        const calls = [
            webAnalyticsApi.ga4Status(wid).then(({ data }) => { ga4.value = data }),
            webAnalyticsApi.hostedStatus(wid).then(({ data }) => { hosted.value = data }),
            webAnalyticsApi.cfStatus(wid).then(({ data }) => { cloudflare.value = data }),
        ]
        const results = await Promise.allSettled(calls)
        // All three 404 together only when WEB_ANALYTICS_ENABLED is off.
        const all404 = results.every(
            (r) => r.status === 'rejected' && r.reason?.response?.status === 404
        )
        if (all404) featureEnabled.value = false
        statusLoaded.value = true
    }

    async function ensureStatuses(wid) {
        if (wid && wid !== activeWebsiteId.value) {
            activeWebsiteId.value = wid
            _reset()
        }
        await loadStatuses(wid)
    }

    return {
        activeWebsiteId,
        ga4, hosted, cloudflare,
        statusLoaded, featureEnabled,
        ga4Connected, ga4PendingProperty, hostedEnabled, cfConnected, anyConnected,
        loadStatuses, ensureStatuses,
    }
})
