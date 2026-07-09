<script setup>
import AgentCard from './AgentCard.vue'

defineProps({
  agents: { type: Array, required: true },
  runningIds: { type: Set, default: () => new Set() },
})
const emit = defineEmits(['run', 'configure'])
</script>

<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
    <AgentCard
      v-for="agent in agents"
      :key="agent.agent_id"
      :agent="agent"
      :running="runningIds.has(agent.agent_id)"
      @run="emit('run', $event)"
      @configure="emit('configure', $event)"
    />
  </div>
</template>
