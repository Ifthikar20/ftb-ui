<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@/stores/app'
import agentsApi from '@/api/agents'
import AgentCard from '@/components/agents/AgentCard.vue'
import HireAgentModal from '@/components/agents/HireAgentModal.vue'

const router = useRouter()
const appStore = useAppStore()
const { activeWebsite } = storeToRefs(appStore)

const specs = ref([])
const capacity = ref({ max_agents: 0, hired_count: 0, can_hire: false })
const hired = ref([])
const loading = ref(true)

const hireOpen = ref(false)
const hireSpec = ref(null)

const websiteId = computed(() => activeWebsite.value?.id || null)
const hiredByKey = computed(() => {
  const map = {}
  for (const h of hired.value) map[h.agent_key] = h
  return map
})

async function loadCatalog() {
  const { data } = await agentsApi.catalog()
  specs.value = data?.data || []
  capacity.value = data?.capacity || capacity.value
}

async function loadHired() {
  if (!websiteId.value) { hired.value = []; return }
  const { data } = await agentsApi.listHired(websiteId.value)
  hired.value = data?.data || []
}

async function loadAll() {
  loading.value = true
  try {
    await Promise.all([loadCatalog(), loadHired()])
  } finally {
    loading.value = false
  }
}

function openHire(spec) {
  hireSpec.value = spec
  hireOpen.value = true
}

async function onHired() {
  await Promise.all([loadCatalog(), loadHired()])
}

function openAgent(agent) {
  router.push({ name: 'agent-detail', params: { hiredId: agent.id } })
}

onMounted(loadAll)
</script>

<template>
  <div class="ap">
    <header class="ap-head">
      <div>
        <h1 class="ap-title">Agents</h1>
        <p class="ap-sub">Hire AI teammates that watch your data and report in daily.</p>
      </div>
      <div class="ap-cap" v-if="capacity.max_agents !== 0">
        {{ capacity.hired_count }}/{{ capacity.max_agents === -1 ? '∞' : capacity.max_agents }} hired
      </div>
    </header>

    <div v-if="!websiteId" class="ap-note">
      Select a project to hire and manage agents.
    </div>

    <section v-if="hired.length" class="ap-section">
      <h2 class="ap-section-title">Your agents</h2>
      <div class="ap-grid">
        <AgentCard
          v-for="h in hired"
          :key="h.id"
          :spec="h.spec"
          :hired="h"
          @open="openAgent"
        />
      </div>
    </section>

    <section class="ap-section">
      <h2 class="ap-section-title">Marketplace</h2>
      <div v-if="loading" class="ap-note">Loading agents…</div>
      <div v-else class="ap-grid">
        <AgentCard
          v-for="s in specs"
          :key="s.key"
          :spec="s"
          :hired="hiredByKey[s.key] || null"
          :can-hire="!!websiteId && (capacity.can_hire || !!hiredByKey[s.key])"
          @hire="openHire"
          @open="openAgent"
        />
      </div>
    </section>

    <HireAgentModal
      v-model="hireOpen"
      :spec="hireSpec"
      :website-id="websiteId"
      @hired="onHired"
    />
  </div>
</template>

<style scoped>
.ap { padding: 24px; max-width: 1100px; margin: 0 auto; }
.ap-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
.ap-title { font-size: 22px; font-weight: 700; color: var(--text-primary); margin: 0; }
.ap-sub { font-size: 14px; color: var(--text-secondary); margin: 4px 0 0; }
.ap-cap { font-size: 13px; color: var(--text-muted); white-space: nowrap; }
.ap-note { color: var(--text-muted); font-size: 14px; padding: 12px 0; }
.ap-section { margin-bottom: 28px; }
.ap-section-title { font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin: 0 0 12px; }
.ap-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
</style>
