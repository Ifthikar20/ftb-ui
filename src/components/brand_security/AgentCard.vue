<script setup>
import { computed } from 'vue'
import { Play, Settings2, CircleDot } from '@lucide/vue'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import AgentBadge from './AgentBadge.vue'

const props = defineProps({
  agent: { type: Object, required: true },
  running: { type: Boolean, default: false },
})
const emit = defineEmits(['run', 'configure'])

const statusDotClass = computed(() => {
  if (props.running || props.agent.last_status === 'running') return 'bg-blue-500 animate-pulse'
  if (props.agent.last_status === 'error') return 'bg-red-500'
  if (!props.agent.enabled) return 'bg-slate-300'
  return 'bg-emerald-500'
})

const lastRunLabel = computed(() => {
  if (!props.agent.last_run_at) return 'Never run'
  const d = new Date(props.agent.last_run_at)
  const delta = (Date.now() - d.getTime()) / 1000
  if (delta < 60) return 'Just now'
  if (delta < 3600) return `${Math.round(delta / 60)}m ago`
  if (delta < 86400) return `${Math.round(delta / 3600)}h ago`
  return `${Math.round(delta / 86400)}d ago`
})
</script>

<template>
  <Card>
    <CardHeader class="flex flex-row items-start justify-between gap-2">
      <div class="flex-1 space-y-1">
        <div class="flex items-center gap-2">
          <span class="inline-block size-2 rounded-full" :class="statusDotClass" />
          <AgentBadge
            :agent-id="agent.agent_id"
            :display-name="agent.display_name"
            :color="agent.color"
          />
        </div>
        <p class="text-xs text-muted-foreground">{{ agent.tagline }}</p>
      </div>
      <div v-if="!agent.enabled" class="text-xs text-muted-foreground">Paused</div>
    </CardHeader>
    <CardContent>
      <div class="flex items-end justify-between gap-3">
        <div>
          <div class="text-3xl font-semibold leading-none">{{ agent.open_alerts }}</div>
          <div class="mt-1 text-xs text-muted-foreground">open alerts</div>
        </div>
        <div class="flex gap-1.5 text-xs font-medium">
          <span v-if="agent.open_high" class="rounded bg-red-50 px-1.5 py-0.5 text-red-700">{{ agent.open_high }} high</span>
          <span v-if="agent.open_medium" class="rounded bg-amber-50 px-1.5 py-0.5 text-amber-800">{{ agent.open_medium }} med</span>
          <span v-if="agent.open_low" class="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">{{ agent.open_low }} low</span>
        </div>
      </div>

      <div class="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>{{ lastRunLabel }}</span>
        <div class="flex gap-1">
          <Button size="sm" variant="ghost" :disabled="running" @click="emit('run', agent)">
            <Play class="size-3.5" />
            Run now
          </Button>
          <Button size="sm" variant="ghost" @click="emit('configure', agent)">
            <Settings2 class="size-3.5" />
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
