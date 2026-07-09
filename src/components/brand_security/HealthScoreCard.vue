<script setup>
import { computed } from 'vue'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ShieldCheck, AlertOctagon, Clock, Bell } from '@lucide/vue'

const props = defineProps({
  overview: { type: Object, default: () => ({}) },
})

const health = computed(() => props.overview.health_score ?? 100)
const healthTone = computed(() => {
  const h = health.value
  if (h >= 85) return 'text-emerald-600'
  if (h >= 60) return 'text-amber-600'
  return 'text-red-600'
})
const lastRun = computed(() => {
  const v = props.overview.last_run_at
  if (!v) return 'No scans yet'
  return new Date(v).toLocaleString()
})
</script>

<template>
  <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
    <Card>
      <CardHeader class="flex flex-row items-center gap-2 pb-2">
        <ShieldCheck class="size-4 text-muted-foreground" />
        <span class="text-sm font-medium text-muted-foreground">Health score</span>
      </CardHeader>
      <CardContent>
        <div class="text-3xl font-semibold" :class="healthTone">{{ health }}</div>
        <div class="mt-1 text-xs text-muted-foreground">0-100, lower means more open issues</div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex flex-row items-center gap-2 pb-2">
        <AlertOctagon class="size-4 text-muted-foreground" />
        <span class="text-sm font-medium text-muted-foreground">Open alerts</span>
      </CardHeader>
      <CardContent>
        <div class="text-3xl font-semibold">{{ overview.open_alerts ?? 0 }}</div>
        <div class="mt-1 text-xs text-muted-foreground">
          <span class="text-red-700">{{ overview.by_severity?.high ?? 0 }} high</span>
          ·
          <span class="text-amber-700">{{ overview.by_severity?.medium ?? 0 }} med</span>
          ·
          <span>{{ overview.by_severity?.low ?? 0 }} low</span>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex flex-row items-center gap-2 pb-2">
        <Bell class="size-4 text-muted-foreground" />
        <span class="text-sm font-medium text-muted-foreground">Prompts monitored</span>
      </CardHeader>
      <CardContent>
        <div class="text-3xl font-semibold">{{ overview.prompts_monitored ?? 0 }}</div>
        <div class="mt-1 text-xs text-muted-foreground">Used by the LLM Truth agent</div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex flex-row items-center gap-2 pb-2">
        <Clock class="size-4 text-muted-foreground" />
        <span class="text-sm font-medium text-muted-foreground">Last scan</span>
      </CardHeader>
      <CardContent>
        <div class="text-lg font-medium">{{ lastRun }}</div>
        <div class="mt-1 text-xs text-muted-foreground">
          Next: {{ overview.next_run_at ? new Date(overview.next_run_at).toLocaleString() : 'On demand' }}
        </div>
      </CardContent>
    </Card>
  </div>
</template>
