<template>
  <div class="insights-page">
    <!-- Header + query bar -->
    <div class="ip-header">
      <div>
        <h1 class="text-xl font-semibold">Search Insights</h1>
        <p class="text-sm text-muted-foreground">
          Trace a search from the sources that answer it to the brands they
          recommend, the issues people raise, and where you can chip in.
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

      <div class="ip-body">
        <!-- Recent scans rail (collapsed by default, expands on hover
             with a delay so it doesn't slam shut the moment the cursor
             brushes past) -->
        <aside
          class="ip-rail"
          :class="{ open: railOpen }"
          @mouseenter="onRailEnter"
          @mouseleave="onRailLeave"
        >
          <h2 class="ip-rail-title">Recent scans</h2>
          <p v-if="!scans.length" class="ip-rail-empty">No scans yet.</p>
          <button
            v-for="scan in scans"
            :key="scan.id"
            class="ip-scan-item"
            :class="{ active: scan.id === activeScanId }"
            :title="scan.query"
            @click="openScan(scan.id)"
          >
            <span class="ip-scan-dot" :class="scan.status"></span>
            <span class="ip-scan-query">{{ scan.query }}</span>
          </button>
        </aside>

        <!-- Main area -->
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
            <h3 class="ip-empty-title">Map a search conversation</h3>
            <p class="ip-empty-text">
              Enter a query your customers would search. FetchBot reads the top
              sources (Reddit threads, reviews, articles), extracts the brands
              and complaints inside, and draws the pathway.
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
            <div v-if="scanRunning" class="ip-progress">
              <span class="ip-progress-spinner"></span>
              Reading sources… {{ analyzedCount }}/{{ activeScan.results_count || '?' }} analyzed
            </div>
            <div class="ip-canvas-row">
              <InsightFlowCanvas
                :nodes="styledGraph.nodes"
                :edges="styledGraph.edges"
                class="ip-canvas"
                @node-click="selectedNode = $event"
                @pane-click="selectedNode = null"
              />
              <NodeDetailPanel
                v-if="selectedNode"
                :node="selectedNode"
                :max-score="maxBrandScore"
                class="ip-detail"
                @close="selectedNode = null"
              />
            </div>
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
import citationsApi from '@/api/citations'
import InsightFlowCanvas from '@/components/search_insights/InsightFlowCanvas.vue'
import NodeDetailPanel from '@/components/search_insights/NodeDetailPanel.vue'
import { buildGraph } from '@/components/search_insights/buildGraph'

const route = useRoute()
const toast = useToast()

const websiteId = computed(() => route.params.websiteId)

const configured = ref(null) // null until the list endpoint answers
const scans = ref([])
const query = ref('')
const activeScanId = ref(null)
const activeScan = ref(null)
const selectedNode = ref(null)

// Rail hover-expand state. Small close-delay so it doesn't collapse the
// instant the cursor grazes off during a click; longer than a "sticky
// hover" (~600ms) so it feels intentional.
const railOpen = ref(false)
let railCloseTimer = null
function onRailEnter() {
  if (railCloseTimer) {
    clearTimeout(railCloseTimer)
    railCloseTimer = null
  }
  railOpen.value = true
}
function onRailLeave() {
  if (railCloseTimer) clearTimeout(railCloseTimer)
  railCloseTimer = setTimeout(() => {
    railOpen.value = false
    railCloseTimer = null
  }, 600)
}

const exampleQueries = [
  'best bagels in Dallas',
  'top CRM for small business',
  'most reliable running shoes',
]

const scanRunning = computed(() =>
  ['pending', 'running'].includes(activeScan.value?.status),
)
const analyzedCount = computed(
  () => (activeScan.value?.rows || []).filter((r) => (r.brands || []).length).length,
)
const graph = computed(() => buildGraph(activeScan.value))
const maxBrandScore = computed(() =>
  Math.max(...(activeScan.value?.brands || []).map((b) => b.weighted_score || 0), 0.0001),
)

// Undirected BFS from the selected node so the whole query → source →
// brand → leaf chain (plus opportunity nodes hanging off sources) lights
// up as a single flow, not just the one-hop neighbourhood.
const flowSet = computed(() => {
  const sel = selectedNode.value
  if (!sel) return null
  const adj = new Map()
  for (const e of graph.value.edges) {
    if (!adj.has(e.source)) adj.set(e.source, [])
    if (!adj.has(e.target)) adj.set(e.target, [])
    adj.get(e.source).push(e.target)
    adj.get(e.target).push(e.source)
  }
  const visited = new Set([sel.id])
  const queue = [sel.id]
  while (queue.length) {
    const cur = queue.shift()
    for (const nb of adj.get(cur) || []) {
      if (!visited.has(nb)) {
        visited.add(nb)
        queue.push(nb)
      }
    }
  }
  return visited
})

const styledGraph = computed(() => {
  const set = flowSet.value
  if (!set) return graph.value
  const nodes = graph.value.nodes.map((n) => ({
    ...n,
    style: {
      ...(n.style || {}),
      opacity: set.has(n.id) ? 1 : 0.18,
      transition: 'opacity 0.2s',
    },
  }))
  const edges = graph.value.edges.map((e) => {
    const on = set.has(e.source) && set.has(e.target)
    const base = e.style || {}
    return {
      ...e,
      animated: on ? true : false,
      style: {
        ...base,
        opacity: on ? 1 : 0.08,
        strokeWidth: on ? Math.max(2.5, (base.strokeWidth || 1) + 1) : base.strokeWidth || 1,
        filter: on ? 'drop-shadow(0 0 3px currentColor)' : 'none',
        transition: 'opacity 0.2s, stroke-width 0.2s',
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

// Poll every 2.5s while a scan runs; rows land incrementally so the
// pathway grows in front of the user. Cap at ~2.5 minutes.
function startPolling() {
  stopPolling()
  pollAttempts = 0
  pollTimer = setInterval(async () => {
    pollAttempts += 1
    try {
      const scan = await loadDetail(activeScanId.value)
      if (!['pending', 'running'].includes(scan.status) || pollAttempts >= 60) {
        stopPolling()
        await loadScans()
      }
    } catch {
      stopPolling()
    }
  }, 2500)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
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
  if (railCloseTimer) clearTimeout(railCloseTimer)
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

.ip-body {
  display: flex;
  gap: 14px;
  flex: 1;
  min-height: 0;
}

/* Recent scans rail — narrow strip that expands on hover */
.ip-rail {
  width: 44px;
  flex-shrink: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: width 0.18s ease;
  border-right: 1px solid var(--border);
  padding-right: 4px;
}
.ip-rail.open { width: 210px; }
.ip-rail-title {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted-foreground);
  margin-bottom: 6px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.ip-rail.open .ip-rail-title { opacity: 1; }
.ip-rail-empty {
  font-size: 12px;
  color: var(--muted-foreground);
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.ip-rail.open .ip-rail-empty { opacity: 1; }
.ip-scan-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  text-align: left;
  transition: background 0.15s;
  min-height: 30px;
}
.ip-scan-item:hover { background: var(--muted); }
.ip-scan-item.active { background: var(--muted); }
/* Query label hidden when the rail is collapsed; the status dot alone
   still tells you which scans are running/complete/failed. Title
   attribute on the button gives you a native tooltip. */
.ip-rail.open .ip-scan-query { opacity: 1; }
.ip-scan-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; background: var(--border); }
.ip-scan-dot.complete { background: var(--chart-2); }
.ip-scan-dot.failed { background: var(--destructive); }
.ip-scan-dot.running, .ip-scan-dot.pending {
  background: var(--primary);
  animation: dot-pulse 1s ease infinite;
}
@keyframes dot-pulse { 50% { opacity: 0.35; } }
.ip-scan-query {
  font-size: 12px;
  font-weight: 500;
  color: var(--foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.15s ease;
}

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
.ip-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--primary);
  flex-shrink: 0;
}
.ip-progress-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid color-mix(in srgb, var(--primary) 25%, transparent);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.ip-canvas-row { display: flex; gap: 14px; flex: 1; min-height: 0; }
.ip-canvas { flex: 1; min-width: 0; }
.ip-detail { width: 400px; flex-shrink: 0; max-height: 100%; }

@media (max-width: 1024px) {
  .insights-page { height: auto; }
  .ip-body { flex-direction: column; }
  /* On narrow viewports the rail becomes a horizontal chip strip and
     is always fully visible — the collapse/expand behaviour only makes
     sense as a vertical side rail. */
  .ip-rail, .ip-rail.open {
    width: 100%;
    flex-direction: row;
    overflow-x: auto;
    border-right: 0;
    border-bottom: 1px solid var(--border);
    padding-right: 0;
  }
  .ip-rail-title, .ip-rail-empty, .ip-scan-query { opacity: 1; }
  .ip-scan-item { flex-shrink: 0; max-width: 220px; }
  .ip-canvas-row { flex-direction: column; }
  .ip-canvas { height: 460px; }
  .ip-detail { width: 100%; }
}
</style>
