<template>
  <section v-if="store.featureEnabled">
    <div class="mb-4">
      <h2 class="text-lg font-semibold tracking-tight text-foreground">More data sources</h2>
      <p class="mt-0.5 text-sm text-muted-foreground">
        The pixel above is the richest source (it powers AI-traffic attribution). These
        alternatives read traffic from systems you already run — nothing is stored on our servers.
      </p>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Ga4ConnectCard
        :status="store.ga4"
        :busy="busy.ga4"
        @connect="connectGa4"
        @disconnect="disconnectGa4"
        @choose-property="openPropertyPicker"
      />
      <CloudflareConnectCard
        :status="store.cloudflare"
        :zones="cfZones"
        :busy="busy.cloudflare"
        @connect="connectCloudflare"
        @select-zone="selectZone"
        @disconnect="disconnectCloudflare"
      />
      <Ga4HostedCard
        v-if="store.hosted?.configured"
        class="lg:col-span-2"
        :status="store.hosted"
        :host-label="hostLabel"
        :busy="busy.hosted"
        @enable="enableHosted"
        @disable="disableHosted"
      />
    </div>

    <!-- Confirmation only — the live data itself renders on SEO Analytics. -->
    <Card v-if="store.anyConnected" class="mt-6">
      <CardContent class="flex flex-wrap items-center justify-between gap-4 pt-6">
        <div class="min-w-0">
          <div class="flex items-center gap-2 text-sm font-medium text-foreground">
            <span class="relative flex size-2 shrink-0">
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--chart-4)] opacity-60" />
              <span class="relative inline-flex size-2 rounded-full bg-[color:var(--chart-4)]" />
            </span>
            Live traffic is readable
          </div>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <span v-if="store.ga4Connected" class="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
              Google Analytics · {{ store.ga4?.property_display_name || store.ga4?.property_id }}
            </span>
            <span v-if="store.hostedEnabled" class="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
              Google tag · {{ store.hosted?.measurement_id }}
            </span>
            <span v-if="store.cfConnected" class="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
              Cloudflare · {{ store.cloudflare?.zone_name }}
            </span>
          </div>
        </div>
        <Button variant="secondary" size="sm" @click="$router.push(`/analytics/${websiteId}`)">
          View live traffic in SEO Analytics
        </Button>
      </CardContent>
    </Card>

    <Ga4PropertyPickerModal
      v-model="pickerOpen"
      :properties="ga4Properties"
      :saving="busy.ga4"
      @select="confirmProperty"
    />
  </section>
</template>

<script setup>
import { onActivated, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import webAnalyticsApi from '@/api/webAnalytics'
import { useWebAnalyticsStore } from '@/stores/webAnalytics'
import { useToast } from '@/composables/useToast'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Ga4ConnectCard from './Ga4ConnectCard.vue'
import Ga4HostedCard from './Ga4HostedCard.vue'
import Ga4PropertyPickerModal from './Ga4PropertyPickerModal.vue'
import CloudflareConnectCard from './CloudflareConnectCard.vue'

const props = defineProps({
  websiteId: { type: String, required: true },
  hostLabel: { type: String, default: 'your site' },
})

const store = useWebAnalyticsStore()
const toast = useToast()
const route = useRoute()
const router = useRouter()

const busy = reactive({ ga4: false, hosted: false, cloudflare: false })
const pickerOpen = ref(false)
const ga4Properties = ref([])
const cfZones = ref([])

// This page only shows connection state — no snapshot polling here (the
// live cards and their 30s loop live on the SEO Analytics page).
onMounted(() => {
  store.ensureStatuses(props.websiteId)
  handleOauthReturn()
})
onActivated(() => store.ensureStatuses(props.websiteId))
watch(() => props.websiteId, (wid) => wid && store.ensureStatuses(wid))

// When the zone is pending, the picker needs the token's zone list.
watch(
  () => store.cloudflare?.pending_zone_selection,
  async (pending) => {
    if (!pending) return
    try {
      const { data } = await webAnalyticsApi.cfZones(props.websiteId)
      cfZones.value = data.zones || []
    } catch { /* toast already shown by the client */ }
  },
  { immediate: true }
)

// ── OAuth return (?ga4=connected|select_property|error&reason=...) ──
const GA4_ERRORS = {
  denied: 'Google access was declined — nothing was connected.',
  invalid_state: 'The sign-in link expired. Try connecting again.',
  exchange_failed: 'Google did not accept the sign-in. Try connecting again.',
}

function handleOauthReturn() {
  const outcome = route.query.ga4
  if (!outcome) return
  if (outcome === 'connected') {
    toast.success('Google Analytics connected')
  } else if (outcome === 'select_property') {
    toast.info('Google Analytics connected — pick the property for this website')
    openPropertyPicker()
  } else {
    toast.error(GA4_ERRORS[route.query.reason] || 'Connecting Google Analytics failed.')
  }
  const query = { ...route.query }
  delete query.ga4
  delete query.reason
  router.replace({ query })
}

// ── GA4 actions ──
async function connectGa4() {
  busy.ga4 = true
  try {
    const { data } = await webAnalyticsApi.ga4ConnectStart(props.websiteId)
    window.location.assign(data.authorize_url)
  } catch {
    busy.ga4 = false
  }
}

async function disconnectGa4() {
  busy.ga4 = true
  try {
    await webAnalyticsApi.ga4Disconnect(props.websiteId)
    toast.success('Google Analytics disconnected')
    await store.loadStatuses(props.websiteId)
  } finally {
    busy.ga4 = false
  }
}

async function openPropertyPicker() {
  pickerOpen.value = true
  try {
    const { data } = await webAnalyticsApi.ga4Properties(props.websiteId)
    ga4Properties.value = data.properties || []
  } catch { /* toast already shown by the client */ }
}

async function confirmProperty(propertyId) {
  busy.ga4 = true
  try {
    await webAnalyticsApi.ga4SelectProperty(props.websiteId, propertyId)
    pickerOpen.value = false
    toast.success('GA4 property linked')
    await store.loadStatuses(props.websiteId)
  } finally {
    busy.ga4 = false
  }
}

// ── Hosted tag actions ──
async function enableHosted() {
  busy.hosted = true
  try {
    await webAnalyticsApi.hostedEnable(props.websiteId)
    toast.success('Google tag ready — paste it into your site')
  } catch { /* provisioning_error surfaces on the card after reload */ }
  finally {
    await store.loadStatuses(props.websiteId)
    busy.hosted = false
  }
}

async function disableHosted() {
  busy.hosted = true
  try {
    await webAnalyticsApi.hostedDisable(props.websiteId)
    toast.success('Google tag disabled')
    await store.loadStatuses(props.websiteId)
  } finally {
    busy.hosted = false
  }
}

// ── Cloudflare actions ──
async function connectCloudflare(apiToken) {
  busy.cloudflare = true
  try {
    const { data } = await webAnalyticsApi.cfConnect(props.websiteId, apiToken)
    store.cloudflare = data
    if (data.zone_id) {
      toast.success(`Cloudflare connected — zone ${data.zone_name}`)
    } else {
      toast.info('Token accepted — pick the zone for this website')
    }
  } finally {
    busy.cloudflare = false
  }
}

async function selectZone(zoneId) {
  busy.cloudflare = true
  try {
    const { data } = await webAnalyticsApi.cfSelectZone(props.websiteId, zoneId)
    store.cloudflare = data
    toast.success(`Cloudflare zone linked — ${data.zone_name}`)
  } finally {
    busy.cloudflare = false
  }
}

async function disconnectCloudflare() {
  busy.cloudflare = true
  try {
    await webAnalyticsApi.cfDisconnect(props.websiteId)
    toast.success('Cloudflare disconnected')
    await store.loadStatuses(props.websiteId)
  } finally {
    busy.cloudflare = false
  }
}
</script>
