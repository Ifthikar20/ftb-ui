<script setup>
/**
 * Brand Security page.
 *
 * Independent agents inspect the brand across specific vectors (LLMs, SERPs,
 * social, trends, impersonation). Every alert on this page is stamped with
 * the agent that raised it via `AgentBadge`, so the user always sees *what*
 * was caught and *who* caught it.
 */
import { ref, computed, watch, onMounted, onBeforeUnmount, reactive } from 'vue'
import { ChevronRight, Play, RefreshCw } from '@lucide/vue'

import { useAppStore } from '@/stores/app'
import { useToast } from '@/composables/useToast'
import brandSecurity from '@/api/brandSecurity'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import HealthScoreCard from '@/components/brand_security/HealthScoreCard.vue'
import AgentsGrid from '@/components/brand_security/AgentsGrid.vue'
import InactiveAgentCard from '@/components/brand_security/InactiveAgentCard.vue'
import AlertsTable from '@/components/brand_security/AlertsTable.vue'
import AgentConfigDrawer from '@/components/brand_security/AgentConfigDrawer.vue'
import MonitoringConfigPanel from '@/components/brand_security/MonitoringConfigPanel.vue'

const appStore = useAppStore()
const toast = useToast()
const websiteId = computed(() => appStore.activeWebsite?.id || null)

const overview = ref({})
const agents = ref([])
const alerts = ref([])
const config = ref({ brand_terms: [], negative_keywords: [] })
const prompts = ref([])

const loading = reactive({ overview: false, agents: false, alerts: false })
const scanRunning = ref(false)
const runningAgentIds = ref(new Set())
const drawerOpen = ref(false)
const drawerAgent = ref(null)

const filter = reactive({ agent_id: [], severity: [], status: 'open' })

const agentsById = computed(() =>
  Object.fromEntries(agents.value.map((a) => [a.agent_id, a])),
)
const activeAgents = computed(() => agents.value.filter((a) => a.enabled))
const inactiveAgents = computed(() => agents.value.filter((a) => !a.enabled))
const activatingIds = ref(new Set())

let pollTimer = null

onMounted(async () => {
  if (websiteId.value) await refreshAll()
})
watch(websiteId, async (v) => {
  if (v) await refreshAll()
})
onBeforeUnmount(stopPolling)

async function refreshAll() {
  await Promise.all([
    loadOverview(),
    loadAgents(),
    loadAlerts(),
    loadConfig(),
    loadPrompts(),
  ])
}

async function loadOverview() {
  loading.overview = true
  try {
    const { data } = await brandSecurity.overview(websiteId.value)
    overview.value = data
  } catch {
    toast.error('Failed to load overview')
  } finally {
    loading.overview = false
  }
}
async function loadAgents() {
  loading.agents = true
  try {
    const { data } = await brandSecurity.agents(websiteId.value)
    agents.value = data
  } catch {
    toast.error('Failed to load agents')
  } finally {
    loading.agents = false
  }
}
async function loadAlerts() {
  loading.alerts = true
  try {
    const params = {}
    if (filter.agent_id.length) params.agent_id = filter.agent_id
    if (filter.severity.length) params.severity = filter.severity
    if (filter.status) params.status = filter.status
    const { data } = await brandSecurity.alerts(websiteId.value, params)
    alerts.value = data.results || data
  } catch {
    toast.error('Failed to load alerts')
  } finally {
    loading.alerts = false
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
async function loadPrompts() {
  try {
    const { data } = await brandSecurity.prompts(websiteId.value)
    prompts.value = data.results || data
  } catch {
    /* empty prompt list is fine */
  }
}

// ── Filters ─────────────────────────────────────────────────────────────

function toggleAgentFilter(agentId) {
  const idx = filter.agent_id.indexOf(agentId)
  if (idx === -1) filter.agent_id.push(agentId)
  else filter.agent_id.splice(idx, 1)
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

// ── Actions ─────────────────────────────────────────────────────────────

async function runFullScan() {
  scanRunning.value = true
  try {
    await brandSecurity.runScan(websiteId.value)
    toast.success('Scan started')
    startPolling()
  } catch {
    toast.error('Failed to start scan')
    scanRunning.value = false
  }
}

async function runOneAgent(agent) {
  runningAgentIds.value = new Set(runningAgentIds.value).add(agent.agent_id)
  try {
    await brandSecurity.runAgent(websiteId.value, agent.agent_id)
    toast.success(`${agent.display_name} ran`)
    await Promise.all([loadOverview(), loadAgents(), loadAlerts()])
  } catch {
    toast.error(`${agent.display_name} failed`)
  } finally {
    const next = new Set(runningAgentIds.value)
    next.delete(agent.agent_id)
    runningAgentIds.value = next
  }
}

function openConfigure(agent) {
  drawerAgent.value = agent
  drawerOpen.value = true
}
async function saveAgentConfig(payload) {
  if (!drawerAgent.value) return
  try {
    await brandSecurity.updateAgent(websiteId.value, drawerAgent.value.agent_id, payload)
    await loadAgents()
    toast.success('Agent updated')
  } catch {
    toast.error('Failed to update agent')
  }
}

async function activateAgent(agent) {
  activatingIds.value = new Set(activatingIds.value).add(agent.agent_id)
  try {
    await brandSecurity.updateAgent(
      websiteId.value, agent.agent_id, { enabled: true },
    )
    toast.success(`${agent.display_name} is now active`)
    await Promise.all([loadAgents(), loadPrompts()])
  } catch {
    toast.error(`Failed to activate ${agent.display_name}`)
  } finally {
    const next = new Set(activatingIds.value)
    next.delete(agent.agent_id)
    activatingIds.value = next
  }
}

async function resolveAlert(alert) {
  try {
    await brandSecurity.resolveAlert(alert.id)
    await Promise.all([loadAlerts(), loadOverview(), loadAgents()])
  } catch { toast.error('Failed to resolve') }
}
async function dismissAlert(alert) {
  try {
    await brandSecurity.dismissAlert(alert.id)
    await Promise.all([loadAlerts(), loadOverview(), loadAgents()])
  } catch { toast.error('Failed to dismiss') }
}

async function saveConfig(payload) {
  try {
    await brandSecurity.saveConfig(websiteId.value, payload)
    toast.success('Configuration saved')
    await loadConfig()
  } catch { toast.error('Failed to save configuration') }
}
async function addPrompt(text, agentId = 'llm_truth') {
  try {
    await brandSecurity.createPrompt(websiteId.value, text, agentId)
    await loadPrompts()
  } catch { toast.error('Failed to add prompt') }
}
async function deletePrompt(prompt) {
  try {
    await brandSecurity.deletePrompt(prompt.id)
    await loadPrompts()
  } catch { toast.error('Failed to delete prompt') }
}

// ── Polling while a scan is running ────────────────────────────────────

let pollAttempts = 0
function startPolling() {
  stopPolling()
  pollAttempts = 0
  pollTimer = setInterval(async () => {
    pollAttempts += 1
    await Promise.all([loadOverview(), loadAgents(), loadAlerts()])
    const anyRunning = agents.value.some((a) => a.last_status === 'running')
    if (!anyRunning || pollAttempts >= 60) {
      stopPolling()
      scanRunning.value = false
    }
  }, 2500)
}
function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- ── Header / breadcrumb row (matches URLs page) ── -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2 text-sm text-muted-foreground">
        <span class="font-medium text-foreground">LLM Dashboard</span>
        <ChevronRight class="size-3.5" />
        <span class="font-semibold text-foreground">Brand Security</span>
      </div>
      <Button :disabled="scanRunning" @click="runFullScan">
        <RefreshCw v-if="scanRunning" class="size-3.5 animate-spin" />
        <Play v-else class="size-3.5" />
        {{ scanRunning ? 'Scanning...' : 'Run all agents' }}
      </Button>
    </div>

    <!-- ── Intro ── -->
    <div>
      <h2 class="text-lg font-bold text-foreground">Brand Security</h2>
      <p class="text-sm text-muted-foreground">
        Independent agents watch your brand across LLMs, SERPs, social and trends.
        Each alert is stamped with the agent that caught it.
      </p>
    </div>

    <!-- ── Health score ── -->
    <HealthScoreCard :overview="overview" />

    <!-- ── Active agents ── -->
    <div class="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 class="text-lg font-bold text-foreground">Active agents</h2>
        <p class="text-sm text-muted-foreground">
          {{ activeAgents.length }} agent{{ activeAgents.length === 1 ? '' : 's' }} running on their schedule
        </p>
      </div>
    </div>
    <Card v-if="activeAgents.length">
      <CardContent class="pt-6">
        <AgentsGrid
          :agents="activeAgents"
          :running-ids="runningAgentIds"
          @run="runOneAgent"
          @configure="openConfigure"
        />
      </CardContent>
    </Card>
    <div v-else class="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
      No agents active yet. Activate one below to start monitoring.
    </div>

    <!-- ── Not active ── -->
    <template v-if="inactiveAgents.length">
      <div>
        <h2 class="text-lg font-bold text-foreground">Not active</h2>
        <p class="text-sm text-muted-foreground">Click a card to activate an agent</p>
      </div>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <InactiveAgentCard
          v-for="agent in inactiveAgents"
          :key="agent.agent_id"
          :agent="agent"
          :busy="activatingIds.has(agent.agent_id)"
          @activate="activateAgent"
        />
      </div>
    </template>

    <!-- ── Alerts ── -->
    <div>
      <h2 class="text-lg font-bold text-foreground">Alerts</h2>
      <p class="text-sm text-muted-foreground">Every issue caught by your active agents</p>
    </div>

    <Card>
      <CardContent class="pt-6">
        <!-- Filter row: status segmented control + agent chips + severity chips -->
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

          <!-- Agent chips -->
          <button
            v-for="agent in agents" :key="agent.agent_id"
            class="inline-flex items-center rounded-lg border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:border-ring"
            :class="filter.agent_id.includes(agent.agent_id)
              ? 'border-ring text-foreground'
              : 'border-border text-muted-foreground'"
            @click="toggleAgentFilter(agent.agent_id)"
          >{{ agent.display_name }}</button>

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
          :agents-by-id="agentsById"
          :loading="loading.alerts"
          @resolve="resolveAlert"
          @dismiss="dismissAlert"
        />
      </CardContent>
    </Card>

    <!-- ── Monitoring config ── -->
    <div>
      <h2 class="text-lg font-bold text-foreground">Monitoring</h2>
      <p class="text-sm text-muted-foreground">Brand terms and negative keywords the agents watch for</p>
    </div>
    <MonitoringConfigPanel
      :config="config"
      @save="saveConfig"
    />

    <AgentConfigDrawer
      v-model:open="drawerOpen"
      :agent="drawerAgent"
      :prompts="prompts"
      :running="drawerAgent ? runningAgentIds.has(drawerAgent.agent_id) : false"
      @save="saveAgentConfig"
      @run="runOneAgent"
      @add-prompt="addPrompt"
      @delete-prompt="deletePrompt"
    />
  </div>
</template>
