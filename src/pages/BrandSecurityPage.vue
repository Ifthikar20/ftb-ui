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
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2 text-sm text-muted-foreground">
        <span class="font-medium">LLM Dashboard</span>
        <ChevronRight class="size-3.5" />
        <span class="font-semibold text-foreground">Brand Security</span>
      </div>
      <Button :disabled="scanRunning" @click="runFullScan">
        <RefreshCw v-if="scanRunning" class="size-3.5 animate-spin" />
        <Play v-else class="size-3.5" />
        {{ scanRunning ? 'Scanning...' : 'Run all agents' }}
      </Button>
    </div>

    <div>
      <h1 class="text-2xl font-bold">Brand Security</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Independent agents watch your brand across LLMs, SERPs, social and
        trends. Each alert is stamped with the agent that caught it.
      </p>
    </div>

    <HealthScoreCard :overview="overview" />

    <div class="space-y-6">
      <div>
        <div class="mb-2 flex items-baseline justify-between">
          <div class="text-sm font-semibold">
            Active agents
            <span class="ml-1 font-normal text-muted-foreground">
              ({{ activeAgents.length }})
            </span>
          </div>
          <div class="text-xs text-muted-foreground">
            Run automatically on their schedule
          </div>
        </div>
        <div v-if="activeAgents.length" class="space-y-2">
          <AgentsGrid
            :agents="activeAgents"
            :running-ids="runningAgentIds"
            @run="runOneAgent"
            @configure="openConfigure"
          />
        </div>
        <div v-else class="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No agents active yet. Activate one below to start monitoring.
        </div>
      </div>

      <div v-if="inactiveAgents.length">
        <div class="mb-2 flex items-baseline justify-between">
          <div class="text-sm font-semibold">
            Not active
            <span class="ml-1 font-normal text-muted-foreground">
              ({{ inactiveAgents.length }})
            </span>
          </div>
          <div class="text-xs text-muted-foreground">
            Click a card to activate
          </div>
        </div>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <InactiveAgentCard
            v-for="agent in inactiveAgents"
            :key="agent.agent_id"
            :agent="agent"
            :busy="activatingIds.has(agent.agent_id)"
            @activate="activateAgent"
          />
        </div>
      </div>
    </div>

    <div class="space-y-3">
      <div class="flex flex-wrap items-center gap-2">
        <div class="text-sm font-semibold">Alerts</div>
        <div class="ml-2 flex gap-1">
          <button
            v-for="s in ['open', 'resolved', 'dismissed']" :key="s"
            :class="[
              'rounded px-2 py-0.5 text-xs font-medium',
              filter.status === s
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:bg-muted/70',
            ]"
            @click="setStatus(s)"
          >{{ s }}</button>
        </div>
        <span class="mx-2 text-muted-foreground/50">|</span>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="agent in agents" :key="agent.agent_id"
            :class="[
              'rounded px-2 py-0.5 text-xs font-medium',
              filter.agent_id.includes(agent.agent_id)
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:bg-muted/70',
            ]"
            @click="toggleAgentFilter(agent.agent_id)"
          >{{ agent.display_name }}</button>
        </div>
        <span class="mx-2 text-muted-foreground/50">|</span>
        <div class="flex gap-1">
          <button
            v-for="sev in ['high', 'medium', 'low']" :key="sev"
            :class="[
              'rounded px-2 py-0.5 text-xs font-medium capitalize',
              filter.severity.includes(sev)
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:bg-muted/70',
            ]"
            @click="toggleSeverityFilter(sev)"
          >{{ sev }}</button>
        </div>
      </div>

      <AlertsTable
        :alerts="alerts"
        :agents-by-id="agentsById"
        :loading="loading.alerts"
        @resolve="resolveAlert"
        @dismiss="dismissAlert"
      />
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
