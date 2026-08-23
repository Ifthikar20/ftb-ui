<script setup>
/**
 * Protection summary: health ring with band label on the left, the open
 * counts by severity as plain centered text (clickable to filter), and
 * the last-checked time on the right. No card chrome — this is a line of
 * facts, not a widget. Renders nothing (not zeros) when the overview
 * endpoint is unavailable.
 */
import { computed } from 'vue'

import { Skeleton } from '@/components/ui/skeleton'
import { SEVERITY_META } from '@/constants/severity'
import { timeAgo } from '@/utils/timeAgo.js'

const props = defineProps({
  overview: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  activeSeverity: { type: String, default: '' },
})
const emit = defineEmits(['filter-severity'])

const RING_RADIUS = 16
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

const score = computed(() => {
  const raw = props.overview?.health_score
  return Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : null
})

const band = computed(() => {
  if (score.value === null) return null
  if (score.value >= 80) return { label: 'Healthy', color: 'var(--chart-2)' }
  if (score.value >= 50) return { label: 'Needs attention', color: 'var(--chart-3)' }
  return { label: 'At risk', color: 'var(--severity-high)' }
})

const dash = computed(() => {
  if (score.value === null) return `0 ${RING_CIRCUMFERENCE}`
  return `${(score.value / 100) * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`
})

const counts = computed(() => {
  const by = props.overview?.by_severity || {}
  return ['high', 'medium', 'low'].map((key) => ({
    key,
    label: SEVERITY_META[key].label,
    dotClass: SEVERITY_META[key].dotClass,
    count: by[key] || 0,
  }))
})

const lastChecked = computed(() => {
  const at = props.overview?.last_checked_at || props.overview?.last_run_at
  return at ? timeAgo(at) : ''
})
</script>

<template>
  <div v-if="loading && !overview" class="flex items-center gap-4">
    <Skeleton class="size-10 rounded-full" />
    <Skeleton class="h-4 w-48" />
  </div>

  <div
    v-else-if="overview"
    class="flex flex-wrap items-center gap-x-6 gap-y-3"
  >
    <!-- Health ring + band -->
    <div class="flex items-center gap-3">
      <svg
        width="40" height="40" viewBox="0 0 40 40" role="img"
        :aria-label="score === null ? 'Protection score unavailable' : `Protection score ${score} out of 100`"
      >
        <circle
          cx="20" cy="20" :r="RING_RADIUS" fill="none"
          stroke="var(--muted)" stroke-width="4"
        />
        <circle
          v-if="score !== null"
          cx="20" cy="20" :r="RING_RADIUS" fill="none"
          :stroke="band.color" stroke-width="4" stroke-linecap="round"
          :stroke-dasharray="dash" transform="rotate(-90 20 20)"
        />
        <text
          x="20" y="21.5" text-anchor="middle" dominant-baseline="middle"
          class="fill-[color:var(--foreground)] text-[12px] font-bold"
        >{{ score === null ? '-' : score }}</text>
      </svg>
      <div>
        <span class="text-sm font-bold text-foreground">Brand protection</span>
        <span
          v-if="band"
          class="ml-2 text-xs font-semibold"
          :style="{ color: band.color }"
        >{{ band.label }}</span>
        <p class="text-xs text-muted-foreground">
          based on {{ overview.open_alerts }} open finding{{ overview.open_alerts === 1 ? '' : 's' }}
        </p>
      </div>
    </div>

    <!-- Severity counts: plain centered text, click to filter -->
    <div class="flex items-center gap-1 sm:mx-auto">
      <button
        v-for="item in counts"
        :key="item.key"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        :class="activeSeverity === item.key ? 'bg-muted font-semibold text-foreground' : 'text-foreground/90'"
        :aria-pressed="activeSeverity === item.key"
        :aria-label="`${item.count} open ${item.label.toLowerCase()}-severity findings — filter`"
        @click="emit('filter-severity', item.key)"
      >
        <span class="size-1.5 rounded-full" :class="item.dotClass" aria-hidden="true"></span>
        {{ item.label }}
        <span class="font-bold tabular-nums">{{ item.count }}</span>
      </button>
    </div>

    <span v-if="lastChecked" class="text-xs text-muted-foreground sm:ml-auto">
      Last check: {{ lastChecked }}
    </span>
  </div>
</template>
