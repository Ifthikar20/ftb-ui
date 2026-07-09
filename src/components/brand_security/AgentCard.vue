<script setup>
import { computed } from 'vue'
import { Play, Settings2 } from '@lucide/vue'
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

function relative(ts) {
  if (!ts) return null
  const delta = (new Date(ts).getTime() - Date.now()) / 1000
  const abs = Math.abs(delta)
  const past = delta < 0
  let val
  if (abs < 60) val = 'now'
  else if (abs < 3600) val = `${Math.round(abs / 60)}m`
  else if (abs < 86400) val = `${Math.round(abs / 3600)}h`
  else val = `${Math.round(abs / 86400)}d`
  if (val === 'now') return 'just now'
  return past ? `${val} ago` : `in ${val}`
}

const lastRunLabel = computed(() => relative(props.agent.last_run_at) || 'never')
const nextRunLabel = computed(() => {
  if (!props.agent.enabled) return 'paused'
  if (props.agent.schedule === 'manual') return 'manual only'
  return relative(props.agent.next_run_at) || 'unscheduled'
})
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-2.5 hover:bg-muted/40 cursor-pointer"
    @click="emit('configure', agent)"
  >
    <span class="inline-block size-2 shrink-0 rounded-full" :class="statusDotClass" />

    <div class="flex min-w-[220px] flex-1 items-center gap-2">
      <AgentBadge
        :agent-id="agent.agent_id"
        :display-name="agent.display_name"
        :color="agent.color"
      />
      <span class="hidden truncate text-xs text-muted-foreground sm:inline">
        {{ agent.tagline }}
      </span>
    </div>

    <div class="flex items-center gap-1.5 text-xs font-medium">
      <span class="text-base font-semibold text-foreground">{{ agent.open_alerts }}</span>
      <span class="text-muted-foreground">open</span>
      <span v-if="agent.open_high" class="rounded bg-red-50 px-1.5 py-0.5 text-red-700">
        {{ agent.open_high }} high
      </span>
      <span v-if="agent.open_medium" class="rounded bg-amber-50 px-1.5 py-0.5 text-amber-800">
        {{ agent.open_medium }} med
      </span>
      <span v-if="agent.open_low" class="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
        {{ agent.open_low }} low
      </span>
    </div>

    <div class="hidden w-40 text-xs text-muted-foreground md:block">
      <div>ran {{ lastRunLabel }}</div>
      <div>next {{ nextRunLabel }}</div>
    </div>

    <div v-if="!agent.enabled" class="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
      Paused
    </div>

    <div class="flex gap-1" @click.stop>
      <Button size="sm" variant="ghost" :disabled="running" @click="emit('run', agent)">
        <Play class="size-3.5" />
        Run
      </Button>
      <Button size="sm" variant="ghost" @click="emit('configure', agent)">
        <Settings2 class="size-3.5" />
      </Button>
    </div>
  </div>
</template>
