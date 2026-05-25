<script setup>
import { computed } from 'vue'
import { TrendingUp, TrendingDown } from '@lucide/vue'
import { Card, CardContent } from '@/components/ui/card'

const props = defineProps({
  stats: { type: Array, default: () => [] },
})

// Peec-style KPI tiles. Falls back to representative metrics when the
// dashboard API returns no stats yet.
const FALLBACK = [
  { label: 'Visibility', value: '42.8%', change: '6.2%', direction: 'up' },
  { label: 'Avg. Position', value: '3.4', change: '0.7', direction: 'up' },
  { label: 'Mentions', value: '1,284', change: '12.1%', direction: 'up' },
  { label: 'Sentiment', value: '78', change: '2.4%', direction: 'down' },
]

const tiles = computed(() => (props.stats?.length ? props.stats : FALLBACK))
</script>

<template>
  <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
    <Card v-for="tile in tiles" :key="tile.label" class="overflow-hidden">
      <CardContent class="p-5">
        <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {{ tile.label }}
        </p>
        <div class="mt-2 flex items-end justify-between">
          <span class="text-2xl font-bold text-card-foreground">{{ tile.value }}</span>
          <span
            class="inline-flex items-center gap-1 text-xs font-semibold"
            :class="tile.direction === 'up' ? 'text-[color:var(--chart-2)]' : 'text-destructive'"
          >
            <component :is="tile.direction === 'up' ? TrendingUp : TrendingDown" class="size-3.5" />
            {{ tile.change }}
          </span>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
