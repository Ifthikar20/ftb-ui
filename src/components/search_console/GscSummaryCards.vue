<template>
  <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
    <Card v-for="tile in tiles" :key="tile.key">
      <CardContent class="pt-6">
        <p class="text-sm text-muted-foreground">{{ tile.label }}</p>
        <div class="mt-1 flex items-baseline gap-2">
          <span class="text-2xl font-semibold tabular-nums">{{ tile.value }}</span>
          <span
            v-if="tile.delta !== null"
            class="flex items-center gap-0.5 text-xs font-medium"
            :class="tile.good ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'"
          >
            <TrendingUp v-if="tile.rising" class="h-3 w-3" />
            <TrendingDown v-else class="h-3 w-3" />
            {{ tile.delta }}
          </span>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { TrendingDown, TrendingUp } from '@lucide/vue'
import { Card, CardContent } from '@/components/ui/card'

const props = defineProps({
  summary: { type: Object, default: null },
})

function formatNumber(value) {
  if (value == null) return '0'
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M'
  if (value >= 10_000) return (value / 1_000).toFixed(1) + 'K'
  return String(Math.round(value))
}

function formatPct(delta) {
  if (delta == null) return null
  return `${Math.abs(delta * 100).toFixed(0)}%`
}

const tiles = computed(() => {
  const s = props.summary
  if (!s) return []
  const deltas = s.deltas || {}
  return [
    {
      key: 'clicks',
      label: 'Clicks',
      value: formatNumber(s.clicks),
      delta: formatPct(deltas.clicks),
      rising: (deltas.clicks || 0) >= 0,
      good: (deltas.clicks || 0) >= 0,
    },
    {
      key: 'impressions',
      label: 'Impressions',
      value: formatNumber(s.impressions),
      delta: formatPct(deltas.impressions),
      rising: (deltas.impressions || 0) >= 0,
      good: (deltas.impressions || 0) >= 0,
    },
    {
      key: 'ctr',
      label: 'Avg CTR',
      value: `${((s.ctr || 0) * 100).toFixed(1)}%`,
      delta: formatPct(deltas.ctr),
      rising: (deltas.ctr || 0) >= 0,
      good: (deltas.ctr || 0) >= 0,
    },
    {
      key: 'position',
      label: 'Avg position',
      // Lower position is better, so a falling number is the good case.
      value: (s.position || 0).toFixed(1),
      delta: formatPct(deltas.position),
      rising: (deltas.position || 0) >= 0,
      good: (deltas.position || 0) <= 0,
    },
  ]
})
</script>
