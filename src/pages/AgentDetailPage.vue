<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import agentsApi from '@/api/agents'
import AgentInsightCard from '@/components/agents/AgentInsightCard.vue'
import AgentActionApproval from '@/components/agents/AgentActionApproval.vue'
import AgentChatWindow from '@/components/agents/AgentChatWindow.vue'
import { useToast } from '@/composables/useToast'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const hiredId = computed(() => route.params.hiredId)
const agent = ref(null)
const insights = ref([])
const actions = ref([])
const tab = ref('insights')
const loading = ref(true)
const running = ref(false)

const pendingActions = computed(() => actions.value.filter((a) => a.status === 'proposed'))

async function loadAgent() {
  const { data } = await agentsApi.getHired(hiredId.value)
  agent.value = data?.data || data
}
async function loadInsights() {
  const { data } = await agentsApi.insights(hiredId.value)
  insights.value = Array.isArray(data) ? data : (data?.data || [])
}
async function loadActions() {
  const { data } = await agentsApi.actions(hiredId.value)
  actions.value = data?.data || []
}

async function loadAll() {
  loading.value = true
  try {
    await Promise.all([loadAgent(), loadInsights(), loadActions()])
  } catch (_) {
    toast.error('Could not load agent.')
  } finally {
    loading.value = false
  }
}

async function runNow() {
  running.value = true
  try {
    await agentsApi.runNow(hiredId.value)
    toast.success('Run queued — insights will appear shortly.')
  } catch (e) {
    toast.error(e.displayMessage || 'Could not start a run.')
  } finally {
    running.value = false
  }
}

async function togglePause() {
  try {
    const { data } = await agentsApi.updateHired(hiredId.value, { is_active: !agent.value.is_active })
    agent.value = data?.data || data
  } catch (e) {
    toast.error(e.displayMessage || 'Could not update agent.')
  }
}

function onActionUpdated() { loadActions() }

onMounted(loadAll)
</script>

<template>
  <div class="ad">
    <button class="ad-back" @click="router.push({ name: 'agents' })">← Agents</button>

    <div v-if="loading" class="ad-note">Loading…</div>

    <template v-else-if="agent">
      <header class="ad-head">
        <div>
          <h1 class="ad-title">{{ agent.spec?.name || agent.agent_key }}</h1>
          <p class="ad-sub">{{ agent.spec?.tagline }}</p>
          <div class="ad-meta">
            <Badge :variant="agent.is_active ? 'default' : 'outline'">
              {{ agent.is_active ? 'Active' : 'Paused' }}
            </Badge>
            <span class="ad-freq">{{ agent.frequency }} · {{ agent.website_name }}</span>
          </div>
        </div>
        <div class="ad-actions">
          <Button size="sm" variant="outline" @click="togglePause">
            {{ agent.is_active ? 'Pause' : 'Resume' }}
          </Button>
          <Button size="sm" :disabled="running" @click="runNow">
            {{ running ? 'Running…' : 'Run now' }}
          </Button>
        </div>
      </header>

      <nav class="ad-tabs">
        <button :class="{ on: tab === 'insights' }" @click="tab = 'insights'">Insights</button>
        <button :class="{ on: tab === 'actions' }" @click="tab = 'actions'">
          Actions<span v-if="pendingActions.length" class="ad-badge">{{ pendingActions.length }}</span>
        </button>
        <button :class="{ on: tab === 'chat' }" @click="tab = 'chat'">Chat</button>
      </nav>

      <section v-show="tab === 'insights'" class="ad-list">
        <div v-if="!insights.length" class="ad-note">
          No insights yet. Click “Run now” to generate the first one.
        </div>
        <AgentInsightCard v-for="i in insights" :key="i.id" :insight="i" />
      </section>

      <section v-show="tab === 'actions'" class="ad-list">
        <div v-if="!actions.length" class="ad-note">No actions proposed yet.</div>
        <AgentActionApproval
          v-for="a in actions"
          :key="a.id"
          :action="a"
          @updated="onActionUpdated"
        />
      </section>

      <section v-show="tab === 'chat'">
        <AgentChatWindow :hired-id="hiredId" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.ad { padding: 24px; max-width: 880px; margin: 0 auto; }
.ad-back { background: none; border: none; cursor: pointer; color: var(--text-secondary); font-size: 13px; padding: 0 0 16px; }
.ad-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.ad-title { font-size: 22px; font-weight: 700; color: var(--text-primary); margin: 0; }
.ad-sub { font-size: 14px; color: var(--text-secondary); margin: 4px 0 0; }
.ad-meta { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
.ad-freq { font-size: 12px; color: var(--text-muted); text-transform: capitalize; }
.ad-actions { display: flex; gap: 8px; flex-shrink: 0; }
.ad-tabs { display: flex; gap: 18px; border-bottom: 1px solid var(--border-color); margin: 20px 0; }
.ad-tabs button { background: none; border: none; cursor: pointer; font-size: 14px; color: var(--text-secondary); padding: 0 0 10px; border-bottom: 2px solid transparent; display: inline-flex; align-items: center; gap: 6px; }
.ad-tabs button.on { color: var(--text-primary); border-bottom-color: var(--brand-accent); font-weight: 600; }
.ad-badge { background: var(--brand-accent); color: #fff; border-radius: 999px; font-size: 11px; padding: 0 6px; }
.ad-list { display: flex; flex-direction: column; gap: 12px; }
.ad-note { color: var(--text-muted); font-size: 14px; padding: 12px 0; }
</style>
