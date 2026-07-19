<script setup>
/**
 * Brand Security page (Alerts tab).
 *
 * Findings-first: background scans check what LLMs, search pages, and
 * social discussions say about the brand — using keywords built from the
 * brand terms below and benchmarked against the reference material on the
 * Brand Input tab. This page only shows what those scans captured, with
 * each finding labeled by capture type (narrative watch, sentiment issue,
 * inaccurate claim, look-alike brand, ...). There is no agent management
 * surface here by design.
 */
import { ref, computed, watch, onMounted, onBeforeUnmount, reactive } from 'vue'
import { ChevronRight, Play, RefreshCw, BookOpen, ArrowRight } from '@lucide/vue'

import { useAppStore } from '@/stores/app'
import { useToast } from '@/composables/useToast'
import brandSecurity from '@/api/brandSecurity'
import ragApi from '@/api/rag'
import { CAPTURE_TYPES } from '@/constants/captureTypes'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import AlertsTable from '@/components/brand_security/AlertsTable.vue'
import MonitoringConfigPanel from '@/components/brand_security/MonitoringConfigPanel.vue'

const appStore = useAppStore()
const toast = useToast()
const websiteId = computed(() => appStore.activeWebsite?.id || null)

const alerts = ref([])
const config = ref({ brand_terms: [], negative_keywords: [] })
const loadingAlerts = ref(false)

// null = not loaded yet; 0 = first visit, no reference content ingested.
const brandSourcesTotal = ref(null)

const scanning = ref(false)
const scanStartedAt = ref(null)
const lastRunAt = ref(null)

const filter = reactive({ types: [], severity: [], status: 'open' })

onMounted(async () => {
  if (websiteId.value) await initPage()
})
watch(websiteId, async (v) => {
  if (v) await initPage()
})
onBeforeUnmount(stopScanPolling)

async function initPage() {
  await Promise.all([
    loadAlerts(),
    loadConfig(),
    loadBrandSourceStats(),
    syncScanStatus(),
  ])
}

async function loadAlerts() {
  loadingAlerts.value = true
  try {
    // URLSearchParams so multi-value filters serialize as repeated bare
    // keys (issue=a&issue=b) — what DRF's getlist() reads. Axios' default
    // array serialization (issue[]=a) would be silently ignored.
    const params = new URLSearchParams()
    filter.types
      .flatMap((key) => CAPTURE_TYPES.find((t) => t.key === key)?.issues || [])
      .forEach((issue) => params.append('issue', issue))
    filter.severity.forEach((sev) => params.append('severity', sev))
    if (filter.status) params.append('status', filter.status)
    const { data } = await brandSecurity.alerts(websiteId.value, params)
    alerts.value = data.results || data
  } catch {
    toast.error('Failed to load findings')
  } finally {
    loadingAlerts.value = false
  }
}

async function loadConfig() {
  try {
    const { data } = await brandSecurity.config(websiteId.value)
    config.value = data
  } catch {
    /* config lazily created — ignore */
  }
}

// The first-visit guide keys off whether any reference content exists in
// the RAG knowledge base. One source is enough to consider setup done.
async function loadBrandSourceStats() {
  try {
    const res = await ragApi.listSources(websiteId.value, { page: 1, page_size: 1 })
    brandSourcesTotal.value = res.meta?.stats?.total ?? (res.data?.length || 0)
  } catch {
    // Unknown — do not block the page on the guide check.
    brandSourcesTotal.value = null
  }
}

const isFirstVisit = computed(() => brandSourcesTotal.value === 0)

// ── Filters ─────────────────────────────────────────────────────────────

function toggleTypeFilter(key) {
  const idx = filter.types.indexOf(key)
  if (idx === -1) filter.types.push(key)
  else filter.types.splice(idx, 1)
  loadAlerts()
}
function toggleSeverityFilter(sev) {
  const idx = filter.severity.indexOf(sev)
  if (idx === -1) filter.severity.push(sev)
  else filter.severity.splice(idx, 1)
  loadAlerts()
}
function setStatus(s) {
  filter.status = s
  loadAlerts()
}

// ── Scan lifecycle ──────────────────────────────────────────────────────
// POST /scan/ queues the work on a background worker and returns 202.
// We then poll /scan/status/ until running flips false, so the button
// reflects real progress instead of guessing at a duration.

let scanPollTimer = null
const SCAN_POLL_MS = 3000
const SCAN_POLL_MAX = 200 // 10 minutes

let scanPollCount = 0

const scanElapsed = ref(0)
let elapsedTimer = null

async function runScan() {
  scanning.value = true
  scanStartedAt.value = Date.now()
  startElapsedTicker()
  try {
    const { data } = await brandSecurity.runScan(websiteId.value)
    if (!data?.queued) {
      toast.error('Nothing to scan — monitoring is not configured yet')
      finishScan()
      return
    }
    toast.success('Scan started — findings will appear below as they come in')
    startScanPolling()
  } catch {
    toast.error('Failed to start scan')
    finishScan()
  }
}

function startScanPolling() {
  stopScanPolling()
  scanPollCount = 0
  scanPollTimer = setInterval(async () => {
    scanPollCount += 1
    try {
      const { data } = await brandSecurity.scanStatus(websiteId.value)
      lastRunAt.value = data.last_run_at
      if (!data.running) {
        finishScan()
        await loadAlerts()
        toast.success(`Scan complete — ${data.open_alerts} open finding${data.open_alerts === 1 ? '' : 's'}`)
      } else if (scanPollCount >= SCAN_POLL_MAX) {
        finishScan()
        await loadAlerts()
        toast.error('The scan is taking longer than expected. Findings will keep appearing — refresh later.')
      }
    } catch {
      /* transient poll failure — keep trying until the cap */
    }
  }, SCAN_POLL_MS)
}

// On page load, resume the scanning state if a scan is already running
// (e.g. the user refreshed mid-scan or a scheduled scan is in flight).
async function syncScanStatus() {
  try {
    const { data } = await brandSecurity.scanStatus(websiteId.value)
    lastRunAt.value = data.last_run_at
    if (data.running) {
      scanning.value = true
      scanStartedAt.value = Date.now()
      startElapsedTicker()
      startScanPolling()
    }
  } catch {
    /* status endpoint unavailable — leave the button usable */
  }
}

function finishScan() {
  scanning.value = false
  stopScanPolling()
  stopElapsedTicker()
}

function stopScanPolling() {
  if (scanPollTimer) {
    clearInterval(scanPollTimer)
    scanPollTimer = null
  }
}

function startElapsedTicker() {
  stopElapsedTicker()
  scanElapsed.value = 0
  elapsedTimer = setInterval(() => {
    if (scanStartedAt.value) {
      scanElapsed.value = Math.round((Date.now() - scanStartedAt.value) / 1000)
    }
  }, 1000)
}
function stopElapsedTicker() {
  if (elapsedTimer) {
    clearInterval(elapsedTimer)
    elapsedTimer = null
  }
}

// ── Finding actions ─────────────────────────────────────────────────────

async function resolveAlert(alert) {
  try {
    await brandSecurity.resolveAlert(alert.id)
    await loadAlerts()
  } catch { toast.error('Failed to resolve') }
}
async function dismissAlert(alert) {
  try {
    await brandSecurity.dismissAlert(alert.id)
    await loadAlerts()
  } catch { toast.error('Failed to dismiss') }
}

async function saveConfig(payload) {
  try {
    await brandSecurity.saveConfig(websiteId.value, payload)
    toast.success('Configuration saved')
    await loadConfig()
  } catch { toast.error('Failed to save configuration') }
}

function formatLastRun(v) {
  if (!v) return null
  return new Date(v).toLocaleString()
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- ── Header / breadcrumb row ── -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2 text-sm text-muted-foreground">
        <span class="font-medium text-foreground">LLM Dashboard</span>
        <ChevronRight class="size-3.5" />
        <span class="font-semibold text-foreground">Brand Security</span>
      </div>
      <div class="flex items-center gap-3">
        <span v-if="scanning" class="text-xs text-muted-foreground">
          Scanning for {{ scanElapsed }}s — findings update when it completes
        </span>
        <span v-else-if="formatLastRun(lastRunAt)" class="text-xs text-muted-foreground">
          Last checked {{ formatLastRun(lastRunAt) }}
        </span>
        <Button :disabled="scanning || !websiteId" @click="runScan">
          <RefreshCw v-if="scanning" class="size-3.5 animate-spin" />
          <Play v-else class="size-3.5" />
          {{ scanning ? 'Scanning...' : 'Scan now' }}
        </Button>
      </div>
    </div>

    <!-- ── Tab strip: siblings of the same feature ── -->
    <div class="flex items-center gap-1 border-b border-border">
      <router-link
        :to="`/llm-ranking/${websiteId}/brand-security`"
        class="border-b-2 border-foreground px-3 py-2 text-sm font-semibold text-foreground"
      >Alerts</router-link>
      <router-link
        :to="`/llm-ranking/${websiteId}/brand-input`"
        class="border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >Brand Input</router-link>
    </div>

    <!-- ── First-visit guide: no reference content yet ── -->
    <Card v-if="isFirstVisit" class="border-dashed">
      <CardContent class="pt-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-start gap-3">
            <div class="rounded-lg bg-secondary p-2.5">
              <BookOpen class="size-5 text-foreground" />
            </div>
            <div>
              <h2 class="text-base font-bold text-foreground">Start by teaching us your brand</h2>
              <p class="mt-1 max-w-2xl text-sm text-muted-foreground">
                Before we can tell you what is wrong out there, we need to know what is right.
                Add your site pages, docs, or paste brand copy on the Brand Input tab — that
                reference content is the benchmark every finding on this page is checked against.
              </p>
            </div>
          </div>
          <router-link :to="`/llm-ranking/${websiteId}/brand-input`">
            <Button>
              Add reference content
              <ArrowRight class="size-3.5" />
            </Button>
          </router-link>
        </div>
      </CardContent>
    </Card>

    <!-- ── Intro ── -->
    <div>
      <h2 class="text-lg font-bold text-foreground">Findings</h2>
      <p class="text-sm text-muted-foreground">
        We check LLM answers, search pages and AI overviews for keywords about your brand,
        your content and your description
        <template v-if="config.brand_terms?.length">
          ({{ config.brand_terms.slice(0, 4).join(', ') }}<template v-if="config.brand_terms.length > 4"> and {{ config.brand_terms.length - 4 }} more</template>)
        </template>
        and benchmark what we find against your Brand Input material. Each finding below is
        labeled with the type of capture.
      </p>
    </div>

    <Card>
      <CardContent class="pt-6">
        <!-- Filter row: status segmented control + capture-type chips + severity chips -->
        <div class="mb-4 flex flex-wrap items-center gap-2">
          <!-- Status: segmented control -->
          <div class="flex items-center rounded-lg border border-border p-0.5">
            <button
              v-for="s in ['open', 'resolved', 'dismissed']" :key="s"
              class="rounded-md px-2.5 py-1 text-xs font-semibold capitalize transition-colors"
              :class="filter.status === s
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground'"
              @click="setStatus(s)"
            >{{ s }}</button>
          </div>

          <!-- Capture-type chips -->
          <button
            v-for="t in CAPTURE_TYPES" :key="t.key"
            class="inline-flex items-center rounded-lg border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:border-ring"
            :class="filter.types.includes(t.key)
              ? 'border-ring text-foreground'
              : 'border-border text-muted-foreground'"
            :title="t.blurb"
            @click="toggleTypeFilter(t.key)"
          >{{ t.label }}</button>

          <!-- Severity chips -->
          <button
            v-for="sev in ['high', 'medium', 'low']" :key="sev"
            class="inline-flex items-center rounded-lg border bg-card px-3 py-1.5 text-xs font-medium capitalize transition-colors hover:border-ring"
            :class="filter.severity.includes(sev)
              ? 'border-ring text-foreground'
              : 'border-border text-muted-foreground'"
            @click="toggleSeverityFilter(sev)"
          >{{ sev }}</button>
        </div>

        <AlertsTable
          :alerts="alerts"
          :loading="loadingAlerts"
          @resolve="resolveAlert"
          @dismiss="dismissAlert"
        />
      </CardContent>
    </Card>

    <!-- ── Monitoring config ── -->
    <div>
      <h2 class="text-lg font-bold text-foreground">What we watch</h2>
      <p class="text-sm text-muted-foreground">
        Brand terms and negative keywords the scans search for across LLMs, search pages and social
      </p>
    </div>
    <MonitoringConfigPanel
      :config="config"
      @save="saveConfig"
    />
  </div>
</template>
