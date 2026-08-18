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
import { ref, computed, watch, onMounted, reactive } from 'vue'
import { ChevronRight, BookOpen, ArrowRight } from '@lucide/vue'

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

// Dropdown-backed filters: single value each, '' = no filter. Dropdowns
// (rather than chip rows) so option lists can grow as more capture types
// and modes are added.
const filter = reactive({ type: '', severity: '', status: 'open' })

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: '', label: 'All statuses' },
]

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  ...CAPTURE_TYPES.map((t) => ({ value: t.key, label: t.label })),
]

const SEVERITY_OPTIONS = [
  { value: '', label: 'All severities' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

onMounted(async () => {
  if (websiteId.value) await initPage()
})
watch(websiteId, async (v) => {
  if (v) await initPage()
})

async function initPage() {
  await Promise.all([
    loadAlerts(),
    loadConfig(),
    loadBrandSourceStats(),
  ])
}

async function loadAlerts() {
  loadingAlerts.value = true
  try {
    // URLSearchParams so a capture type's issue codes serialize as
    // repeated bare keys (issue=a&issue=b) — what DRF's getlist() reads.
    // Axios' default array serialization (issue[]=a) would be ignored.
    const params = new URLSearchParams()
    if (filter.type) {
      const type = CAPTURE_TYPES.find((t) => t.key === filter.type)
      ;(type?.issues || []).forEach((issue) => params.append('issue', issue))
    }
    if (filter.severity) params.append('severity', filter.severity)
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

// Monitoring settings (brand terms + negative keywords) live on this page:
// they configure what the security scans watch for, so they belong beside
// the findings those scans produce.
async function saveConfig(payload) {
  try {
    await brandSecurity.saveConfig(websiteId.value, payload)
    toast.success('Monitoring configuration saved')
    await loadConfig()
  } catch {
    toast.error('Failed to save configuration')
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

// Terms highlighted in finding snapshots: the configured brand terms plus
// the website's own name, so brand mentions light up even before any
// monitoring terms have been added.
const highlightBrandTerms = computed(() => {
  const terms = [...(config.value.brand_terms || [])]
  const name = appStore.activeWebsite?.name
  if (name && !terms.some((t) => t.toLowerCase() === name.toLowerCase())) {
    terms.push(name)
  }
  return terms
})

// ── Filters ─────────────────────────────────────────────────────────────

function setFilter(key, value) {
  filter[key] = value
  loadAlerts()
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

</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- ── Header / breadcrumb row ── -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2 text-sm text-muted-foreground">
        <span class="font-medium text-foreground">AI Visibility</span>
        <ChevronRight class="size-3.5" />
        <span class="font-semibold text-foreground">Brand Security</span>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-xs text-muted-foreground">
          Findings appear automatically as audits complete
        </span>
      </div>
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
                Add your site pages, docs, or paste brand copy on the Brand Input page — that
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
        <!-- Filter row: dropdowns so option lists can grow without
             crowding the toolbar as more capture types and modes ship. -->
        <div class="mb-4 flex flex-wrap items-center gap-2">
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
            <select
              :value="filter.status"
              class="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              @change="setFilter('status', $event.target.value)"
            >
              <option v-for="opt in STATUS_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Type</label>
            <select
              :value="filter.type"
              class="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              @change="setFilter('type', $event.target.value)"
            >
              <option v-for="opt in TYPE_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Severity</label>
            <select
              :value="filter.severity"
              class="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              @change="setFilter('severity', $event.target.value)"
            >
              <option v-for="opt in SEVERITY_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>

        <AlertsTable
          :alerts="alerts"
          :loading="loadingAlerts"
          :brand-terms="highlightBrandTerms"
          :negative-keywords="config.negative_keywords || []"
          @resolve="resolveAlert"
          @dismiss="dismissAlert"
        />
      </CardContent>
    </Card>

    <!-- ── Monitoring settings ── -->
    <div>
      <h2 class="text-lg font-bold text-foreground">Monitoring settings</h2>
      <p class="text-sm text-muted-foreground">
        Brand terms and negative keywords the scans watch for. Reference content the
        findings are checked against lives on the
        <router-link
          :to="`/llm-ranking/${websiteId}/brand-input`"
          class="font-medium text-foreground hover:underline"
        >Brand Input</router-link>
        page.
      </p>
    </div>
    <MonitoringConfigPanel
      :config="config"
      @save="saveConfig"
    />
  </div>
</template>
