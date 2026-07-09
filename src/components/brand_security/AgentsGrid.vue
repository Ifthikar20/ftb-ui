<script setup>
import AgentCard from './AgentCard.vue'

defineProps({
  agents: { type: Array, required: true },
  runningIds: { type: Set, default: () => new Set() },
})
const emit = defineEmits(['run', 'configure'])
</script>

<template>
  <div class="flex flex-col gap-2">
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
