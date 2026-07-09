<script setup>
import { Plus } from '@lucide/vue'
import AgentBadge from './AgentBadge.vue'

defineProps({
  agent: { type: Object, required: true },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['activate'])

const sourceLabel = {
  llms: 'LLM answers',
  serp: 'Google search results',
  reddit: 'Reddit discussions',
  trends: 'Google Trends',
  x: 'X (Twitter) posts',
}
</script>

<template>
  <button
    type="button"
    :disabled="busy"
    class="group flex w-full flex-col gap-2 rounded-lg border border-dashed bg-card p-4 text-left transition hover:border-solid hover:bg-muted/40 disabled:opacity-60"
    @click="emit('activate', agent)"
  >
    <div class="flex items-center justify-between">
      <AgentBadge
        :agent-id="agent.agent_id"
        :display-name="agent.display_name"
        :color="agent.color"
      />
      <span class="flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground">
        <Plus class="size-3.5" />
        {{ busy ? 'Activating…' : 'Activate' }}
      </span>
    </div>

    <p class="text-xs text-muted-foreground">{{ agent.tagline }}</p>

    <div class="flex flex-wrap gap-1 pt-1">
      <span
        v-for="s in agent.sources" :key="s"
        class="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground"
      >
        {{ sourceLabel[s] || s }}
      </span>
    </div>
  </button>
</template>
