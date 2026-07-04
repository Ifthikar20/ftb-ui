<template>
  <div class="space-y-6 p-6">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">Search Performance</h1>
        <p class="text-sm text-muted-foreground">
          Real Google Search data for your site, synced nightly from Search Console.
        </p>
      </div>
      <div v-if="state === 'ready'" class="flex items-center gap-2">
        <div class="flex rounded-lg border p-0.5">
          <button
            v-for="preset in RANGE_PRESETS"
            :key="preset.key"
            class="rounded-md px-3 py-1 text-xs font-medium transition-colors"
            :class="rangeKey === preset.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
            @click="setRange(preset.key)"
          >
            {{ preset.label }}
          </button>
        </div>
        <Button variant="ghost" size="sm" @click="confirmDisconnect">Disconnect</Button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="state === 'loading'" class="py-16 text-center text-sm text-muted-foreground">
      Loading...
    </div>

    <!-- Server missing OAuth credentials -->
    <Card v-else-if="state === 'not_configured'" class="max-w-2xl mx-auto">
      <CardContent class="pt-6 text-sm text-muted-foreground">
        Google Search Console is not configured on this server. An administrator needs to set
        the Google OAuth credentials before connections can be made.
      </CardContent>
    </Card>

    <!-- Disconnected: connect card -->
    <ConnectGscCard
      v-else-if="state === 'disconnected'"
      :connecting="connecting"
      @connect="startConnect"
    />

    <!-- Connected, first sync still running -->
    <Card v-else-if="state === 'syncing'" class="max-w-2xl mx-auto">
      <CardContent class="pt-6 text-center">
        <p class="text-sm font-medium">Connected to {{ statusData?.site_url }}</p>
        <p class="mt-2 text-sm text-muted-foreground">
          The first sync is running. Data usually appears within a few minutes.
          Google finalizes Search Console data with a 2-3 day delay, so the most
          recent days are never shown.
        </p>
        <p v-if="!statusData?.is_active" class="mt-3 text-sm text-red-600 dark:text-red-400">
          Access was revoked in Google. Reconnect to resume syncing.
        </p>
        <Button v-if="!statusData?.is_active" class="mt-3" @click="startConnect">Reconnect</Button>
      </CardContent>
    </Card>

    <!-- Ready: dashboard -->
    <template v-else-if="state === 'ready'">
      <GscSummaryCards :summary="summary" />
      <GscTrendChart :series="series" />
      <Card>
        <CardHeader class="pb-3">
          <div class="flex gap-1">
            <button
              v-for="tab in TABS"
              :key="tab.key"
              class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
              :class="activeTab === tab.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
              @click="switchTab(tab.key)"
            >
              {{ tab.label }}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <GscQueryTable
            :dimension="activeTab === 'queries' ? 'query' : 'page'"
            :rows="tableRows"
            :count="tableCount"
            :limit="tableLimit"
            :offset="tableOffset"
            :loading="tableLoading"
            :search="tableSearch"
            :sort-field="sortField"
            :sort-desc="sortDesc"
            @sort="onSort"
            @search="onSearch"
            @page="onPage"
          />
        </CardContent>
      </Card>
    </template>

    <!-- Property picker -->
    <PropertyPickerModal
      v-model="showPropertyPicker"
      :properties="properties"
      :saving="savingProperty"
      @select="selectProperty"
    />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useToast } from '@/composables/useToast'
import searchConsoleApi from '@/api/searchConsole'
import ConnectGscCard from '@/components/search_console/ConnectGscCard.vue'
import PropertyPickerModal from '@/components/search_console/PropertyPickerModal.vue'
import GscSummaryCards from '@/components/search_console/GscSummaryCards.vue'
import GscTrendChart from '@/components/search_console/GscTrendChart.vue'
import GscQueryTable from '@/components/search_console/GscQueryTable.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const websiteId = computed(() => route.params.websiteId)

// GSC data lags 2-3 days; ranges always end 3 days ago.
const DATA_LAG_DAYS = 3
const RANGE_PRESETS = [
  { key: '7d', label: '7d', days: 7 },
  { key: '28d', label: '28d', days: 28 },
  { key: '3m', label: '3m', days: 90 },
]
const TABS = [
  { key: 'queries', label: 'Top queries' },
  { key: 'pages', label: 'Top pages' },
]

const state = ref('loading') // loading | not_configured | disconnected | syncing | ready
const statusData = ref(null)
const connecting = ref(false)

const showPropertyPicker = ref(false)
const properties = ref([])
const savingProperty = ref(false)

const rangeKey = ref('28d')
const summary = ref(null)
const series = ref([])

const activeTab = ref('queries')
const tableRows = ref([])
const tableCount = ref(0)
const tableLimit = 50
const tableOffset = ref(0)
const tableSearch = ref('')
const sortField = ref('clicks')
const sortDesc = ref(true)
const tableLoading = ref(false)

let syncPollTimer = null

function rangeParams() {
  const preset = RANGE_PRESETS.find((p) => p.key === rangeKey.value) || RANGE_PRESETS[1]
  const end = new Date()
  end.setDate(end.getDate() - DATA_LAG_DAYS)
  const start = new Date(end)
  start.setDate(start.getDate() - (preset.days - 1))
  const iso = (d) => d.toISOString().slice(0, 10)
  return { start: iso(start), end: iso(end) }
}

function resolveState() {
  const s = statusData.value
  if (!s) return 'loading'
  if (!s.configured) return 'not_configured'
  if (!s.connected) return 'disconnected'
  if (s.pending_property_selection) return 'syncing' // picker opens on top
  if (!s.has_data) return 'syncing'
  return 'ready'
}

async function loadStatus() {
  try {
    const { data } = await searchConsoleApi.status(websiteId.value)
    statusData.value = data
    state.value = resolveState()
    return data
  } catch {
    state.value = 'disconnected'
    return null
  }
}

async function loadDashboard() {
  const params = rangeParams()
  try {
    const [summaryRes, seriesRes] = await Promise.all([
      searchConsoleApi.summary(websiteId.value, params),
      searchConsoleApi.timeseries(websiteId.value, params),
    ])
    summary.value = summaryRes.data
    series.value = seriesRes.data.series || []
  } catch {
    // Interceptor already toasts; keep whatever was rendered.
  }
  await loadTable()
}

async function loadTable() {
  tableLoading.value = true
  const params = {
    ...rangeParams(),
    order: `${sortDesc.value ? '-' : ''}${sortField.value}`,
    limit: tableLimit,
    offset: tableOffset.value,
  }
  if (tableSearch.value) params.search = tableSearch.value
  try {
    const fetcher = activeTab.value === 'queries' ? searchConsoleApi.queries : searchConsoleApi.pages
    const { data } = await fetcher(websiteId.value, params)
    tableRows.value = data.rows || []
    tableCount.value = data.count || 0
  } finally {
    tableLoading.value = false
  }
}

function setRange(key) {
  rangeKey.value = key
  tableOffset.value = 0
  loadDashboard()
}

function switchTab(key) {
  activeTab.value = key
  tableOffset.value = 0
  tableSearch.value = ''
  sortField.value = 'clicks'
  sortDesc.value = true
  loadTable()
}

function onSort({ field, desc }) {
  sortField.value = field
  sortDesc.value = desc
  tableOffset.value = 0
  loadTable()
}

function onSearch(value) {
  tableSearch.value = value
  tableOffset.value = 0
  loadTable()
}

function onPage(newOffset) {
  tableOffset.value = newOffset
  loadTable()
}

// -- Connect / disconnect flow ----------------------------------------------

async function startConnect() {
  connecting.value = true
  try {
    const { data } = await searchConsoleApi.connectStart(websiteId.value)
    window.location.href = data.authorize_url
  } catch {
    connecting.value = false
  }
}

async function openPropertyPicker() {
  try {
    const { data } = await searchConsoleApi.properties(websiteId.value)
    properties.value = data.properties || []
    showPropertyPicker.value = true
  } catch {
    // toasted by interceptor
  }
}

async function selectProperty(siteUrl) {
  savingProperty.value = true
  try {
    const { data } = await searchConsoleApi.selectProperty(websiteId.value, siteUrl)
    statusData.value = data
    showPropertyPicker.value = false
    state.value = 'syncing'
    toast.success('Property saved. First sync is running.')
    startSyncPolling()
  } finally {
    savingProperty.value = false
  }
}

function confirmDisconnect() {
  if (!window.confirm('Disconnect Google Search Console? Synced history is kept, but nightly updates stop.')) return
  disconnect()
}

async function disconnect() {
  try {
    await searchConsoleApi.disconnect(websiteId.value)
    toast.success('Google Search Console disconnected.')
    statusData.value = null
    state.value = 'loading'
    await loadStatus()
  } catch {
    // toasted by interceptor
  }
}

// Poll status for a couple of minutes after connect until data lands.
function startSyncPolling() {
  stopSyncPolling()
  let attempts = 0
  syncPollTimer = setInterval(async () => {
    attempts += 1
    const s = await loadStatus()
    if (s?.has_data) {
      stopSyncPolling()
      await loadDashboard()
    } else if (attempts >= 12) {
      stopSyncPolling()
    }
  }, 10000)
}

function stopSyncPolling() {
  if (syncPollTimer) {
    clearInterval(syncPollTimer)
    syncPollTimer = null
  }
}

// -- OAuth return handling ----------------------------------------------------

async function handleOAuthReturn() {
  const outcome = route.query.gsc
  if (!outcome) return
  const reason = route.query.reason
  router.replace({ query: {} })

  if (outcome === 'connected') {
    toast.success('Google Search Console connected. First sync is running; Google data has a 2-3 day delay.')
    startSyncPolling()
  } else if (outcome === 'select_property') {
    await openPropertyPicker()
  } else if (outcome === 'error') {
    const messages = {
      denied: 'Google access was declined. Connect again when ready.',
      invalid_state: 'The sign-in link expired. Please try connecting again.',
      exchange_failed: 'Google did not accept the authorization. Please try again.',
    }
    toast.error(messages[reason] || 'Connecting Google Search Console failed. Please try again.')
  }
}

onMounted(async () => {
  await loadStatus()
  await handleOAuthReturn()
  if (state.value === 'ready') {
    await loadDashboard()
  } else if (state.value === 'syncing' && statusData.value?.is_active && !statusData.value?.pending_property_selection) {
    startSyncPolling()
  } else if (statusData.value?.pending_property_selection) {
    await openPropertyPicker()
  }
})

onBeforeUnmount(stopSyncPolling)
</script>
