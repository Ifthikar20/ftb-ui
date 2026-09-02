<template>
  <div class="insights-page">
    <!-- Header -->
    <div class="ip-header">
      <div>
        <h1 class="text-xl font-semibold ip-heading">
          Brand Research
          <span
            class="ip-info"
            tabindex="0"
            aria-label="What is Brand Research"
            :data-tip="tooltip"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </span>
        </h1>
        <p class="text-sm text-muted-foreground">
          Trace a search across web results, community threads and AI engines
          to the brands they recommend, the sentiment people carry, and where
          you can join the conversation.
        </p>
      </div>
    </div>

    <!-- Server missing the search key -->
    <Card v-if="configured === false" class="mx-auto max-w-2xl">
      <CardContent class="pt-6 text-sm text-muted-foreground">
        Web search is not configured on this server. An administrator needs to
        set PERPLEXITY_API_KEY before insight scans can run.
      </CardContent>
    </Card>

    <template v-else>
      <!-- Query bar: the page's primary action, sitting at the top -->
      <form class="ip-querybar" @submit.prevent="startScan">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="ip-query-icon"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
        <input
          v-model="query"
          class="ip-query-input"
          placeholder="What do people search for in your space? e.g. best bagels in Dallas"
          maxlength="500"
          :disabled="scanRunning"
        />
        <Button type="submit" size="sm" :disabled="!query.trim() || scanRunning">
          {{ scanRunning ? 'Scanning…' : 'Scan' }}
        </Button>
      </form>

      <!-- Recent scans: a horizontal history strip directly under the
           search, so past queries read left-to-right and the results
           below get the full width of the page. Hidden until the first
           scan exists — the empty state is the invitation to start. -->
      <div v-if="scans.length" class="ip-history">
        <span class="ip-history-label">Recent</span>
        <div class="ip-history-track">
          <button
            v-for="scan in scans"
            :key="scan.id"
            class="ip-history-card"
            :class="{ active: scan.id === activeScanId }"
            :title="scan.query"
            @click="openScan(scan.id)"
          >
            <span class="ip-scan-dot" :class="scan.status"></span>
            <span class="ip-history-body">
              <span class="ip-history-query">{{ scan.query }}</span>
              <span class="ip-history-meta">{{ scanMeta(scan) }}</span>
            </span>
          </button>
        </div>
      </div>

      <!-- Main results area — now full width -->
      <div class="ip-main">
        <!-- Empty state -->
        <div v-if="!activeScan" class="ip-empty">
          <div class="ip-empty-art">
            <span class="ip-empty-node q"></span>
            <span class="ip-empty-line"></span>
            <span class="ip-empty-node s"></span>
            <span class="ip-empty-line"></span>
            <span class="ip-empty-node b"></span>
          </div>
          <h3 class="ip-empty-title">Research a conversation</h3>
          <p class="ip-empty-text">
            Enter a query your customers would search. Cansee reads the web
            results, the community threads behind them, and what the AI
            engines answer — then maps the brands, the sentiment, and the
            places you can speak up.
          </p>
          <div class="ip-chips">
            <button
              v-for="example in exampleQueries"
              :key="example"
              class="ip-chip"
              @click="query = example"
            >
              {{ example }}
            </button>
          </div>
        </div>

        <!-- Failed -->
        <Card v-else-if="activeScan.status === 'failed'" class="mx-auto mt-10 max-w-xl">
          <CardContent class="pt-6 text-center">
            <p class="text-sm font-medium">This scan failed</p>
            <p class="mt-2 text-sm text-muted-foreground">{{ activeScan.error }}</p>
            <Button class="mt-4" size="sm" @click="retryScan">Try again</Button>
          </CardContent>
        </Card>

        <!-- Graph -->
        <div v-else class="ip-graph-wrap">
          <div class="ip-graph-head">
            <StageStrip
              :stages="activeScan.stages"
              :scan-status="activeScan.status"
              class="ip-stages"
            />
            <div class="ip-viewtoggle" role="tablist" aria-label="Result view">
              <button
                type="button"
                class="ip-vt-btn"
                :class="{ on: viewMode === 'dashboard' }"
                role="tab"
                :aria-selected="viewMode === 'dashboard'"
                @click="setView('dashboard')"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>
                Dashboard
              </button>
              <button
                type="button"
                class="ip-vt-btn"
                :class="{ on: viewMode === 'table' }"
                role="tab"
                :aria-selected="viewMode === 'table'"
                @click="setView('table')"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h18v14H3zM3 10h18M9 10v9" /></svg>
                Table
              </button>
              <button
                type="button"
                class="ip-vt-btn"
                :class="{ on: viewMode === 'graph' }"
                role="tab"
                :aria-selected="viewMode === 'graph'"
                @click="setView('graph')"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="6" r="2" /><circle cx="5" cy="18" r="2" /><circle cx="19" cy="12" r="2" /><path d="M7 6h5a3 3 0 0 1 3 3M7 18h5a3 3 0 0 0 3-3" /></svg>
                Graph
              </button>
            </div>
          </div>
          <div class="ip-canvas-row">
            <!-- The research dashboard: the places you can act on, as cards.
                 Full width — it carries its own detail, so no side panel. -->
            <ResearchDashboard
              v-if="viewMode === 'dashboard'"
              :opportunities="activeScan?.opportunities || []"
              :rows="activeScan?.rows || []"
              :brands="activeScan?.brands || []"
              :serp-features="activeScan?.serp_features || {}"
              :running="scanRunning"
              class="ip-canvas"
              @research-query="onResearchQuery"
            />
            <InsightFlowCanvas
              v-else-if="viewMode === 'graph'"
              :nodes="styledGraph.nodes"
              :edges="styledGraph.edges"
              class="ip-canvas"
              @node-click="onNodeClick"
              @pane-click="selectedNode = null"
            />
            <ScanTable
              v-else
              :brands="activeScan?.brands || []"
              :engines="activeScan?.engines || []"
              :max-score="maxBrandScore"
              :running="scanRunning"
              :active-name="activeBrandName"
              class="ip-canvas"
              @select-brand="selectBrandFromTable"
            />
            <!-- Graph and table pair with the detail panel; the dashboard
                 does not. With nothing selected it shows the ranked chip-in
                 list, so the page never dead-ends on an empty rail. -->
            <NodeDetailPanel
              v-if="viewMode !== 'dashboard'"
              :node="selectedNode"
              :max-score="maxBrandScore"
              :scan-rows="activeScan?.rows || []"
              :engines="activeScan?.engines || []"
              :opportunities="activeScan?.opportunities || []"
              :serp-features="activeScan?.serp_features || {}"
              :stages="activeScan?.stages || {}"
              class="ip-detail"
              @close="selectedNode = null"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/composables/useToast'
import { timeAgo } from '@/utils/timeAgo'
import citationsApi from '@/api/citations'
import InsightFlowCanvas from '@/components/brand_research/InsightFlowCanvas.vue'
import NodeDetailPanel from '@/components/brand_research/NodeDetailPanel.vue'
import ResearchDashboard from '@/components/brand_research/ResearchDashboard.vue'
import ScanTable from '@/components/brand_research/ScanTable.vue'
import StageStrip from '@/components/brand_research/StageStrip.vue'
import { buildGraph } from '@/components/brand_research/buildGraph'

const route = useRoute()
const toast = useToast()

const websiteId = computed(() => route.params.websiteId)

const configured = ref(null) // null until the list endpoint answers
const scans = ref([])
const query = ref('')
const activeScanId = ref(null)
const activeScan = ref(null)
const selectedNode = ref(null)

// Result view. The dashboard of places-to-act is the default — it is what
// the page is for — with the graph and table as alternate reads. Remembered
// per browser so a returning user lands back in their preferred view.
const VIEW_KEY = 'cs-br-view'
const VIEWS = ['dashboard', 'table', 'graph']
const viewMode = ref((() => {
  try {
    const v = localStorage.getItem(VIEW_KEY)
    return VIEWS.includes(v) ? v : 'dashboard'
  } catch { return 'dashboard' }
})())
function setView(mode) {
  viewMode.value = mode
  try { localStorage.setItem(VIEW_KEY, mode) } catch { /* private mode — the choice just won't persist */ }
}

// A related-search card asks to research that query next: drop it into the
// search box so the user can fire it with one click.
function onResearchQuery(q) {
  query.value = q
}

// Key of the brand the detail panel is showing, so the table can mark the
// matching row while a brand is selected.
const activeBrandName = computed(() =>
  selectedNode.value?.type === 'brand'
    ? (selectedNode.value.data.brand.name || '').trim().toLowerCase()
    : '',
)

// Selecting a brand from the table drives the same detail panel the graph
// uses, by synthesising the node the panel expects.
function selectBrandFromTable(brand) {
  selectedNode.value = {
    id: `brand-${(brand.name || '').trim().toLowerCase()}`,
    type: 'brand',
    data: { brand },
  }
}

const exampleQueries = [
  'best bagels in Dallas',
  'top CRM for small business',
  'most reliable running shoes',
]

const tooltip =
  'Maps a customer search query across three channels — web results, ' +
  'community threads, and what the AI engines themselves recommend — to ' +
  'the brands each one points at and the sentiment real people carry, so ' +
  'you can see who owns the conversation and where you can join it.'

// One-line summary shown under each recent-scan query: status while it
// runs, otherwise how long ago it ran plus how many brands it surfaced.
function scanMeta(scan) {
  if (['pending', 'running'].includes(scan.status)) return 'Scanning…'
  if (scan.status === 'failed') return 'Failed'
  const when = timeAgo(scan.created_at)
  const n = (scan.brands || []).length
  const brands = n ? `${n} brand${n === 1 ? '' : 's'}` : ''
  return [when, brands].filter(Boolean).join(' · ')
}

const scanRunning = computed(() =>
  ['pending', 'running'].includes(activeScan.value?.status),
)
const graph = computed(() => buildGraph(activeScan.value))
const maxBrandScore = computed(() =>
  Math.max(...(activeScan.value?.brands || []).map((b) => b.weighted_score || 0), 0.0001),
)

// DIRECTED BFS from the selected node: forward along outgoing edges
// and backward along incoming edges. The graph flows query → source →
// brand → leaf, so clicking a source lights up (query → this source →
// its brands → their leaves) without pulling in OTHER sources that
// share a brand. Clicking a brand lights up (query → its sources →
// this brand → its leaves). Clicking a leaf lights up (query →
// mentioning sources → parent brand → this leaf). The old undirected
// walk was leaking every source that shared a brand into the flow.
const flowSet = computed(() => {
  const sel = selectedNode.value
  if (!sel) return null
  const outAdj = new Map()
  const inAdj = new Map()
  for (const e of graph.value.edges) {
    if (!outAdj.has(e.source)) outAdj.set(e.source, [])
    outAdj.get(e.source).push(e.target)
    if (!inAdj.has(e.target)) inAdj.set(e.target, [])
    inAdj.get(e.target).push(e.source)
  }
  const visited = new Set([sel.id])
  function walk(startId, adj) {
    const q = [startId]
    while (q.length) {
      const cur = q.shift()
      for (const nb of adj.get(cur) || []) {
        if (!visited.has(nb)) {
          visited.add(nb)
          q.push(nb)
        }
      }
    }
  }
  walk(sel.id, outAdj)
  walk(sel.id, inAdj)
  return visited
})

// Pick a single "path colour" when exactly one brand sits in the flow.
// Zero or many brands in the flow → fall back to per-edge colours
// (sentiment, destructive for issue leaves, etc.).
const flowBrandColor = computed(() => {
  const set = flowSet.value
  if (!set) return null
  const brandNodes = graph.value.nodes.filter(
    (n) => n.type === 'brand' && set.has(n.id),
  )
  if (brandNodes.length !== 1) return null
  return brandNodes[0].data?.color || null
})

const styledGraph = computed(() => {
  const set = flowSet.value
  if (!set) return graph.value
  const brandColor = flowBrandColor.value
  const nodes = graph.value.nodes.map((n) => ({
    ...n,
    style: {
      ...(n.style || {}),
      opacity: set.has(n.id) ? 1 : 0.14,
      transition: 'opacity 0.2s',
    },
  }))
  const edges = graph.value.edges.map((e) => {
    const on = set.has(e.source) && set.has(e.target)
    const base = e.style || {}
    // In-flow edges stay thin (professional feel). They stand out
    // through opacity + saturation, not thickness or drop-shadow.
    // If exactly one brand is in the flow, the whole path adopts that
    // brand's colour — makes the trace read as a coherent story.
    return {
      ...e,
      animated: on ? true : false,
      style: {
        ...base,
        stroke: on && brandColor ? brandColor : base.stroke,
        opacity: on ? 0.95 : 0.05,
        strokeWidth: on
          ? Math.max(1.2, (base.strokeWidth || 1) + 0.4)
          : base.strokeWidth || 0.8,
        transition: 'opacity 0.2s, stroke-width 0.2s, stroke 0.2s',
      },
    }
  })
  return { nodes, edges }
})

let pollTimer = null
let pollAttempts = 0

async function loadScans() {
  try {
    const { data } = await citationsApi.sourceScans(websiteId.value)
    scans.value = data.scans || []
    configured.value = data.configured !== false
  } catch {
    scans.value = []
  }
}

async function loadDetail(scanId) {
  const { data } = await citationsApi.sourceScanDetail(websiteId.value, scanId)
  activeScan.value = data
  return data
}

// Placeholder nodes carry no data worth a panel. Vue Flow still emits a
// click for them even with selectable:false, so filter here.
const NON_INTERACTIVE = ['skeleton', 'lane']
function onNodeClick(node) {
  if (NON_INTERACTIVE.includes(node?.type)) return
  selectedNode.value = node
}

async function openScan(scanId) {
  activeScanId.value = scanId
  selectedNode.value = null
  stopPolling()
  try {
    const scan = await loadDetail(scanId)
    if (['pending', 'running'].includes(scan.status)) startPolling()
  } catch {
    // toasted by interceptor
  }
}

async function startScan() {
  const q = query.value.trim()
  if (!q) return
  try {
    const { data } = await citationsApi.createSourceScan(websiteId.value, q)
    query.value = ''
    await loadScans()
    await openScan(data.id)
  } catch (e) {
    if (e.response?.status === 429) {
      toast.warning('Three scans are already running for this project. Give them a moment.')
    }
    // Other errors are toasted by the interceptor.
  }
}

function retryScan() {
  if (activeScan.value?.query) {
    query.value = activeScan.value.query
    startScan()
  }
}

// Poll while a scan runs; rows land incrementally so the pathway grows in
// front of the user. Fast at first (the discovery lanes settle in seconds
// and that is when the graph changes shape), then backs off for the long
// analysis loop. Four lanes plus per-URL reads no longer fit in the old
// 2.5-minute ceiling.
const POLL_FAST_MS = 2500
const POLL_SLOW_MS = 5000
const POLL_FAST_ATTEMPTS = 20
const POLL_MAX_ATTEMPTS = 76 // ~20*2.5s + 56*5s = ~5.7 minutes

function scheduleNextPoll() {
  const delay = pollAttempts < POLL_FAST_ATTEMPTS ? POLL_FAST_MS : POLL_SLOW_MS
  pollTimer = setTimeout(async () => {
    pollTimer = null
    pollAttempts += 1
    try {
      const scan = await loadDetail(activeScanId.value)
      if (!['pending', 'running'].includes(scan.status) || pollAttempts >= POLL_MAX_ATTEMPTS) {
        await loadScans()
        return
      }
    } catch {
      return
    }
    scheduleNextPoll()
  }, delay)
}

function startPolling() {
  stopPolling()
  pollAttempts = 0
  scheduleNextPoll()
}

function stopPolling() {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
}

watch(websiteId, () => {
  stopPolling()
  activeScan.value = null
  activeScanId.value = null
  selectedNode.value = null
  loadScans()
})

onMounted(async () => {
  await loadScans()
  // Auto-open the most recent scan so returning users land on content.
  if (scans.value.length) openScan(scans.value[0].id)
})

onBeforeUnmount(() => {
  stopPolling()
})
</script>

<style scoped>
.insights-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 0px);
  padding: 24px;
  gap: 16px;
}
.ip-header { flex-shrink: 0; }
.ip-heading { display: inline-flex; align-items: center; gap: 8px; }
.ip-info {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: var(--muted-foreground);
  cursor: help;
  border-radius: 50%;
  position: relative;
  outline: none;
  transition: color 0.15s;
}
.ip-info:hover, .ip-info:focus-visible { color: var(--primary); }
.ip-info::after {
  content: attr(data-tip);
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 20;
  width: 300px;
  padding: 10px 12px;
  background: var(--foreground);
  color: var(--background);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.45;
  letter-spacing: 0;
  text-transform: none;
  white-space: normal;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
  opacity: 0;
  pointer-events: none;
  transform: translateY(-4px);
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.ip-info:hover::after, .ip-info:focus-visible::after {
  opacity: 1;
  transform: translateY(0);
}

.ip-querybar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 6px 6px 14px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  flex-shrink: 0;
}
.ip-query-icon { color: var(--muted-foreground); flex-shrink: 0; }
.ip-query-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 13.5px;
  color: var(--foreground);
  padding: 8px 0;
}

/* Recent scans — horizontal history strip under the search bar */
.ip-history {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  min-width: 0;
}
.ip-history-label {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--muted-foreground);
  flex-shrink: 0;
}
.ip-history-track {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  flex: 1;
  min-width: 0;
  padding-bottom: 2px;
  scrollbar-width: thin;
}
.ip-history-card {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-shrink: 0;
  width: 200px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card);
  text-align: left;
  transition: border-color 0.15s, background 0.15s, transform 0.15s;
}
.ip-history-card:hover { border-color: var(--muted-foreground); transform: translateY(-1px); }
.ip-history-card.active { border-color: var(--primary); background: var(--muted); }
.ip-history-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.ip-history-query {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ip-history-meta {
  font-size: 10.5px;
  color: var(--muted-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* Scan status dot (shared by the history cards) */
.ip-scan-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; background: var(--border); }
.ip-scan-dot.complete { background: var(--chart-2); }
.ip-scan-dot.failed { background: var(--destructive); }
.ip-scan-dot.running, .ip-scan-dot.pending {
  background: var(--primary);
  animation: dot-pulse 1s ease infinite;
}
@keyframes dot-pulse { 50% { opacity: 0.35; } }

.ip-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }

/* Empty state */
.ip-empty {
  margin: auto;
  max-width: 460px;
  text-align: center;
  padding: 40px 0;
}
.ip-empty-art {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin-bottom: 22px;
}
.ip-empty-node { width: 16px; height: 16px; border-radius: 50%; }
.ip-empty-node.q { background: var(--primary); animation: art-pulse 2s ease infinite; }
.ip-empty-node.s { background: var(--muted-foreground); animation: art-pulse 2s ease infinite 0.3s; }
.ip-empty-node.b { background: var(--chart-2); animation: art-pulse 2s ease infinite 0.6s; }
.ip-empty-line { width: 54px; height: 1.5px; background: var(--border); }
@keyframes art-pulse { 50% { transform: scale(1.35); } }
.ip-empty-title { font-size: 16px; font-weight: 700; color: var(--foreground); }
.ip-empty-text {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.55;
  color: var(--muted-foreground);
}
.ip-chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 18px; }
.ip-chip {
  font-size: 12px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--foreground);
  transition: all 0.15s;
}
.ip-chip:hover { border-color: var(--primary); color: var(--primary); }

/* Graph area */
.ip-graph-wrap { display: flex; flex-direction: column; flex: 1; min-height: 0; gap: 10px; }
.ip-stages { flex-shrink: 0; }
.ip-graph-head { display: flex; align-items: center; gap: 12px; flex-shrink: 0; flex-wrap: wrap; }
.ip-graph-head .ip-stages { flex: 0 1 auto; min-width: 0; }
.ip-viewtoggle {
  margin-left: auto;
  flex-shrink: 0;
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  background: var(--muted);
  border-radius: 9px;
}
.ip-vt-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted-foreground);
  transition: background 0.15s, color 0.15s;
}
.ip-vt-btn:hover { color: var(--foreground); }
.ip-vt-btn.on {
  background: var(--card);
  color: var(--foreground);
  box-shadow: 0 1px 2px rgba(0, 0, 0, .08);
}
.ip-canvas-row { display: flex; gap: 14px; flex: 1; min-height: 0; }
.ip-canvas { flex: 1; min-width: 0; }
.ip-detail { width: 400px; flex-shrink: 0; max-height: 100%; }

@media (max-width: 1024px) {
  .insights-page { height: auto; }
  .ip-canvas-row { flex-direction: column; }
  .ip-canvas { height: 460px; }
  .ip-detail { width: 100%; }
}
</style>
