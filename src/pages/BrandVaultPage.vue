<template>
  <div class="p-6 text-foreground">
    <!-- Header --------------------------------------------------------- -->
    <header id="bv-header" class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <div class="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-chart-1/10 px-2.5 py-[3px] text-[10.5px] font-bold uppercase tracking-[0.08em] text-chart-1">
          <Vault :size="12" :stroke-width="2"/>
          <span>Source of truth</span>
        </div>
        <h1 class="text-2xl font-bold -tracking-[0.02em] text-foreground">Brand Vault</h1>
        <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
          The single source of truth our AI agents read when they answer
          questions about
          <strong class="font-semibold text-foreground">{{ websiteName || 'your brand' }}</strong>.
          <span v-if="lastExtractedAt" class="text-muted-foreground">
            · Last scanned {{ relativeTime(lastExtractedAt) }}
          </span>
        </p>
      </div>
      <div class="flex flex-shrink-0 items-center gap-2">
        <Button variant="outline" @click="importOpen = true">
          <Upload :size="14" :stroke-width="1.8"/>
          Import facts
        </Button>
        <Button
          :disabled="extracting"
          @click="onReExtract"
        >
          <RefreshCcw v-if="!extracting" :size="14" :stroke-width="1.8"/>
          {{ extracting ? 'Queuing…' : 'Re-scan from sources' }}
        </Button>
      </div>
    </header>

    <!-- KPI strip ------------------------------------------------------ -->
    <BrandVaultStatsStrip
      :stats="stats"
      :coverage-score="coverage.score"
      :stale-count="stats.stale"
      class="mb-4"
    />

    <!-- Two-up widget grid. Each widget is a self-contained card and
         drills into a fuller view on click. -->
    <div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
      <BrandBacklinksCard
        :items="backlinks.items"
        :total-mentions="backlinks.total"
        :loading="loadingBacklinks"
        :brand-name="websiteName"
      />
      <KeywordRepositoryWidget
        :items="keywords.items"
        :total-mentions="keywords.total"
        :loading="loadingKeywords"
        @expand="keywordsOpen = true"
      />
    </div>

    <KeywordRepositoryModal
      v-model:open="keywordsOpen"
      :items="keywords.items"
      :total-mentions="keywords.total"
      @analyze="onAnalyzeTopic"
      @edit="onEditTopic"
      @delete="onDeleteTopic"
    />

    <!-- Contradictions banner ---------------------------------------- -->
    <div
      v-if="contradictions.length"
      class="mb-4 flex items-center gap-3.5 rounded-xl border border-chart-3/30 bg-chart-3/10 px-4 py-3 text-sm text-foreground"
    >
      <div
        class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-chart-3/20 text-chart-3 font-bold"
        aria-hidden="true"
      >!</div>
      <div class="min-w-0 flex-1 leading-snug">
        <strong class="font-semibold">{{ contradictions.length }} contradiction{{ contradictions.length === 1 ? '' : 's' }} found.</strong>
        Multiple approved facts claim different things about the same subject — review them before models read conflicting grounding.
      </div>
      <Button variant="outline" size="sm" @click="activeTab = 'map'; mapFilter = 'contradictions'">
        Review
      </Button>
    </div>

    <!-- Tab bar -------------------------------------------------------- -->
    <div class="mb-5 flex gap-1 border-b border-border" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="inline-flex items-center gap-2 border-b-2 border-transparent px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        :class="{ 'border-primary text-foreground': activeTab === tab.id }"
        :aria-selected="activeTab === tab.id"
        role="tab"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
        <Badge
          v-if="tab.badge"
          :variant="activeTab === tab.id ? 'default' : 'secondary'"
        >{{ tab.badge }}</Badge>
      </button>
    </div>

    <!-- Tab bodies --------------------------------------------------- -->
    <FactReviewQueue
      v-if="activeTab === 'review'"
      :website-id="websiteId"
      :pending-facts="pendingFacts"
      :loading="loadingPending"
      @approve="onApprove"
      @reject="onReject"
      @edit-click="onEditClick"
      @bulk-approve="onBulkApprove"
      @bulk-reject="onBulkReject"
      @refresh="loadPending"
    />

    <KnowledgeMap
      v-if="activeTab === 'map'"
      :website-id="websiteId"
      :facts="mapFacts"
      :loading="loadingMap"
      :product-lines="productLines"
      :topics="topics"
      :contradictions="contradictions"
      v-model:filter="mapFilter"
      @approve="onApprove"
      @reject="onReject"
      @edit-click="onEditClick"
      @open-detail="onOpenDetail"
    />

    <ToneOfVoicePanel
      v-if="activeTab === 'tone'"
      :website-id="websiteId"
      :samples="toneSamples"
      :loading="loadingTone"
      @refresh="loadToneSamples"
    />

    <RevisionTimeline
      v-if="activeTab === 'history'"
      :revisions="revisions"
      :loading="loadingRevisions"
      @refresh="loadRevisions"
    />

    <!-- Modals + drawer --------------------------------------------- -->
    <EditFactModal
      v-model:open="editOpen"
      :fact="editFact"
      @saved="onEditSaved"
    />
    <ImportFactsModal
      v-model:open="importOpen"
      :website-id="websiteId"
      @imported="onImported"
    />
    <FactDetailDrawer
      v-model:open="detailOpen"
      :fact="detailFact"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { RefreshCcw, Upload, Vault } from '@lucide/vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useToast } from '@/composables/useToast'
import brandVaultApi from '@/api/brandVault'

import BrandVaultStatsStrip from '@/components/brand_vault/BrandVaultStatsStrip.vue'
import BrandBacklinksCard from '@/components/brand_vault/BrandBacklinksCard.vue'
import KeywordRepositoryWidget from '@/components/brand_vault/KeywordRepositoryWidget.vue'
import KeywordRepositoryModal from '@/components/brand_vault/KeywordRepositoryModal.vue'
import FactReviewQueue from '@/components/brand_vault/FactReviewQueue.vue'
import KnowledgeMap from '@/components/brand_vault/KnowledgeMap.vue'
import ToneOfVoicePanel from '@/components/brand_vault/ToneOfVoicePanel.vue'
import RevisionTimeline from '@/components/brand_vault/RevisionTimeline.vue'
import FactDetailDrawer from '@/components/brand_vault/FactDetailDrawer.vue'
import EditFactModal from '@/components/brand_vault/EditFactModal.vue'
import ImportFactsModal from '@/components/brand_vault/ImportFactsModal.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const route = useRoute()
const appStore = useAppStore()
const toast = useToast()
const websiteId = route.params.websiteId

const websiteName = computed(() => appStore.activeWebsite?.name || '')

// ── Stats / contradictions / coverage ─────────────────────────────────
const stats = reactive({ pending: 0, approved: 0, rejected: 0, auto: 0, total: 0, stale: 0 })
const coverage = reactive({ score: 0, buckets: [] })
const contradictions = ref([])
const backlinks = reactive({ items: [], total: 0 })
const loadingBacklinks = ref(false)
const keywords = reactive({ items: [], total: 0 })
const loadingKeywords = ref(false)
const keywordsOpen = ref(false)
const productLines = ref([])
const topics = ref([])
const lastExtractedAt = ref(null)

// ── Tabs ──────────────────────────────────────────────────────────────
const activeTab = ref('review')
const tabs = computed(() => [
  { id: 'review', label: 'Review queue', badge: stats.pending || null },
  { id: 'map', label: 'Knowledge map', badge: stats.approved + stats.auto || null },
  { id: 'tone', label: 'Tone of voice', badge: toneSamples.value.length || null },
  { id: 'history', label: 'History' },
])

// ── Review queue (pending) ───────────────────────────────────────────
const pendingFacts = ref([])
const loadingPending = ref(true)

// ── Knowledge map (approved + auto) ──────────────────────────────────
const mapFacts = ref([])
const loadingMap = ref(true)
const mapFilter = ref('all') // 'all' | 'contradictions' | <productLine> | <topic>

// ── Tone of voice ────────────────────────────────────────────────────
const toneSamples = ref([])
const loadingTone = ref(false)

// ── History ──────────────────────────────────────────────────────────
const revisions = ref([])
const loadingRevisions = ref(false)

// ── Modal state ──────────────────────────────────────────────────────
const editOpen = ref(false)
const editFact = ref(null)
const importOpen = ref(false)
const detailOpen = ref(false)
const detailFact = ref(null)
const extracting = ref(false)

// ── Extract status polling ───────────────────────────────────────────
let pollTimer = null
function startExtractPolling() {
  stopExtractPolling()
  pollTimer = setInterval(async () => {
    try {
      const { data } = await brandVaultApi.extractStatus(websiteId)
      const body = data?.data || data || {}
      if (body.last_extracted_at && body.last_extracted_at !== lastExtractedAt.value) {
        lastExtractedAt.value = body.last_extracted_at
        loadStats()
        loadPending()
        loadContradictions()
        loadCoverage()
        loadBacklinks()
        loadKeywords()
      }
    } catch (_) {
      // ignore polling errors — next tick tries again
    }
  }, 5000)
  // Auto-stop after 90s so we're not pinging forever for a finished extract.
  setTimeout(stopExtractPolling, 90_000)
}
function stopExtractPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

// ── Loaders ──────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const { data } = await brandVaultApi.stats(websiteId)
    const body = data?.data || data || {}
    const bs = body.by_status || {}
    stats.pending = bs.pending || 0
    stats.approved = bs.approved || 0
    stats.rejected = bs.rejected || 0
    stats.auto = bs.auto || 0
    stats.total = body.total || 0
    stats.stale = body.stale_count || 0
    productLines.value = Object.keys(body.by_product_line || {})
    topics.value = Object.keys(body.by_topic || {})
    lastExtractedAt.value = body.last_extracted_at || lastExtractedAt.value
  } catch (e) {
    console.error('stats failed', e)
  }
}

async function loadPending() {
  loadingPending.value = true
  try {
    const { data } = await brandVaultApi.facts(websiteId, {
      status: 'pending',
      only_current: 1,
    })
    const body = data?.data || data || {}
    pendingFacts.value = body.results || body || []
  } catch (e) {
    console.error('pending facts failed', e)
    pendingFacts.value = []
  } finally {
    loadingPending.value = false
  }
}

async function loadMap() {
  loadingMap.value = true
  try {
    const params = { only_current: 1 }
    if (mapFilter.value && !['all', 'contradictions'].includes(mapFilter.value)) {
      // Treat the filter as either a product line or topic — backend
      // ignores empty matches so passing both is safe.
      params.product_line = mapFilter.value
    }
    const { data } = await brandVaultApi.facts(websiteId, params)
    const body = data?.data || data || {}
    let rows = body.results || body || []
    // Filter to approved + auto only on the client so we don't double
    // the API surface; the volume per website is small enough.
    rows = rows.filter((f) => f.status === 'approved' || f.status === 'auto')
    if (mapFilter.value === 'contradictions') {
      const ids = new Set()
      for (const c of contradictions.value) {
        for (const f of c.facts || []) ids.add(f.id)
      }
      rows = rows.filter((f) => ids.has(f.id))
    }
    mapFacts.value = rows
  } catch (e) {
    console.error('map facts failed', e)
    mapFacts.value = []
  } finally {
    loadingMap.value = false
  }
}

async function loadBacklinks() {
  loadingBacklinks.value = true
  try {
    const { data } = await brandVaultApi.backlinks(websiteId)
    const body = data?.data || data || {}
    backlinks.items = body.items || []
    backlinks.total = body.total_mentions || 0
  } catch (_) {
    backlinks.items = []
    backlinks.total = 0
  } finally {
    loadingBacklinks.value = false
  }
}

async function loadKeywords() {
  loadingKeywords.value = true
  try {
    const { data } = await brandVaultApi.keywords(websiteId)
    const body = data?.data || data || {}
    keywords.items = body.items || []
    keywords.total = body.total_mentions || 0
  } catch (_) {
    keywords.items = []
    keywords.total = 0
  } finally {
    loadingKeywords.value = false
  }
}

// Filter the Knowledge map to facts with a given topic. Mirrors the
// contradiction-link UX so the menu actions in the keyword modal
// have real destinations.
function onAnalyzeTopic(row) {
  keywordsOpen.value = false
  activeTab.value = 'map'
  mapFilter.value = row.topic
}

// Edit nudges the user toward the Knowledge map view so they can
// pick the fact they actually want to mutate; we don't (yet)
// support topic-level rename atomically because every fact's topic
// is a free-text field.
function onEditTopic(row) {
  onAnalyzeTopic(row)
}

// "Delete topic" is a soft operation — Brand Vault has no topic
// entity per se; archiving the underlying facts is what really
// happens. Tell the user what's about to happen so they don't
// expect a hard delete.
function onDeleteTopic(row) {
  keywordsOpen.value = false
  toast.info(`Open the Knowledge map and archive the "${row.topic}" facts you no longer want.`)
  activeTab.value = 'map'
  mapFilter.value = row.topic
}

async function loadContradictions() {
  try {
    const { data } = await brandVaultApi.contradictions(websiteId)
    const body = data?.data || data || {}
    contradictions.value = body.clusters || []
  } catch (_) {
    contradictions.value = []
  }
}

async function loadCoverage() {
  try {
    const { data } = await brandVaultApi.coverage(websiteId)
    const body = data?.data || data || {}
    coverage.score = body.score || 0
    coverage.buckets = body.buckets || []
  } catch (_) {
    // leave defaults
  }
}

async function loadToneSamples() {
  loadingTone.value = true
  try {
    const { data } = await brandVaultApi.toneSamples(websiteId)
    const body = data?.data || data || {}
    toneSamples.value = body.results || body || []
  } catch (_) {
    toneSamples.value = []
  } finally {
    loadingTone.value = false
  }
}

async function loadRevisions() {
  loadingRevisions.value = true
  try {
    const { data } = await brandVaultApi.revisions(websiteId)
    const body = data?.data || data || {}
    revisions.value = body.results || body || []
  } catch (_) {
    revisions.value = []
  } finally {
    loadingRevisions.value = false
  }
}

// ── Actions ──────────────────────────────────────────────────────────
async function onApprove(fact) {
  try {
    await brandVaultApi.approve(fact.id)
    toast.success('Fact approved.')
    pendingFacts.value = pendingFacts.value.filter((f) => f.id !== fact.id)
    loadStats()
    if (activeTab.value === 'map') loadMap()
    loadContradictions()
    loadCoverage()
  } catch (e) {
    toast.error(e.displayMessage || 'Could not approve fact.')
  }
}

async function onReject(fact) {
  try {
    await brandVaultApi.reject(fact.id)
    toast.success('Fact rejected.')
    pendingFacts.value = pendingFacts.value.filter((f) => f.id !== fact.id)
    if (activeTab.value === 'map') {
      mapFacts.value = mapFacts.value.filter((f) => f.id !== fact.id)
    }
    loadStats()
    loadContradictions()
    loadCoverage()
  } catch (e) {
    toast.error(e.displayMessage || 'Could not reject fact.')
  }
}

async function onBulkApprove(ids) {
  if (!ids.length) return
  try {
    await brandVaultApi.bulkAction(websiteId, ids, 'approve')
    toast.success(`${ids.length} fact${ids.length === 1 ? '' : 's'} approved.`)
    const idSet = new Set(ids)
    pendingFacts.value = pendingFacts.value.filter((f) => !idSet.has(f.id))
    loadStats()
    loadContradictions()
    loadCoverage()
  } catch (e) {
    toast.error(e.displayMessage || 'Bulk approve failed.')
  }
}

async function onBulkReject(ids) {
  if (!ids.length) return
  try {
    await brandVaultApi.bulkAction(websiteId, ids, 'reject')
    toast.success(`${ids.length} fact${ids.length === 1 ? '' : 's'} rejected.`)
    const idSet = new Set(ids)
    pendingFacts.value = pendingFacts.value.filter((f) => !idSet.has(f.id))
    loadStats()
    loadContradictions()
  } catch (e) {
    toast.error(e.displayMessage || 'Bulk reject failed.')
  }
}

function onEditClick(fact) {
  editFact.value = fact
  editOpen.value = true
}

function onOpenDetail(fact) {
  detailFact.value = fact
  detailOpen.value = true
}

function onEditSaved(newFact) {
  if (newFact) {
    pendingFacts.value.unshift(newFact)
  }
  loadStats()
  loadPending()
  loadMap()
  loadContradictions()
}

function onImported() {
  loadStats()
  loadPending()
  loadMap()
  loadCoverage()
}

async function onReExtract() {
  extracting.value = true
  try {
    await brandVaultApi.triggerExtract(websiteId)
    toast.success('Re-scan queued. New facts will land in the Review queue.')
    activeTab.value = 'review'
    startExtractPolling()
  } catch (e) {
    toast.error(e.displayMessage || 'Could not queue extraction.')
  } finally {
    extracting.value = false
  }
}

// ── Helpers ──────────────────────────────────────────────────────────
function relativeTime(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  if (diff < 0) return 'just now'
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Tour ─────────────────────────────────────────────────────────────
// ── Lifecycle ────────────────────────────────────────────────────────
onMounted(() => {
  loadStats()
  loadPending()
  loadContradictions()
  loadCoverage()
  loadBacklinks()
  loadKeywords()
})

watch(activeTab, (tab) => {
  if (tab === 'map' && !mapFacts.value.length) loadMap()
  if (tab === 'tone' && !toneSamples.value.length) loadToneSamples()
  if (tab === 'history' && !revisions.value.length) loadRevisions()
})

watch(mapFilter, () => {
  if (activeTab.value === 'map') loadMap()
})

onBeforeUnmount(() => {
  stopExtractPolling()
})
</script>
