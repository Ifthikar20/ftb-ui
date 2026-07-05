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
        <!-- Recent scans rail -->
        <aside class="ip-rail">
          <h2 class="ip-rail-title">Recent scans</h2>
          <p v-if="!scans.length" class="ip-rail-empty">No scans yet.</p>
          <button
            v-for="scan in scans"
            :key="scan.id"
            class="ip-scan-item"
            :class="{ active: scan.id === activeScanId }"
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
                :nodes="graph.nodes"
                :edges="graph.edges"
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

onBeforeUnmount(stopPolling)
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

/* Recent scans rail */
.ip-rail {
  width: 210px;
  flex-shrink: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ip-rail-title {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted-foreground);
  margin-bottom: 6px;
}
.ip-rail-empty { font-size: 12px; color: var(--muted-foreground); }
.ip-scan-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  text-align: left;
  transition: background 0.15s;
}
.ip-scan-item:hover { background: var(--muted); }
.ip-scan-item.active { background: var(--muted); }
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
.ip-detail { width: 300px; flex-shrink: 0; max-height: 100%; }

@media (max-width: 1024px) {
  .insights-page { height: auto; }
  .ip-body { flex-direction: column; }
  .ip-rail { width: 100%; flex-direction: row; overflow-x: auto; }
  .ip-scan-item { flex-shrink: 0; max-width: 220px; }
  .ip-canvas-row { flex-direction: column; }
  .ip-canvas { height: 460px; }
  .ip-detail { width: 100%; }
}
</style>
