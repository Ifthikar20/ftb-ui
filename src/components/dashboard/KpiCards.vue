<script setup>
import { computed } from 'vue'
import { TrendingUp, TrendingDown } from '@lucide/vue'
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const props = defineProps({
  stats: { type: Array, default: () => [] },
})

// Trend-style KPI tiles (shadcn dashboard starter pattern). Falls back to
// representative metrics when the dashboard API returns no stats yet.
const FALLBACK = [
  { label: 'Visibility', value: '42.8%', change: '6.2%', direction: 'up', trendNote: 'Trending up this month', subtext: 'Share of AI answers you appear in' },
  { label: 'Avg. Position', value: '3.4', change: '0.7', direction: 'up', trendNote: 'Improved ranking', subtext: 'Average placement across prompts' },
  { label: 'Mentions', value: '1,284', change: '12.1%', direction: 'up', trendNote: 'Strong growth', subtext: 'Brand mentions in the last 30 days' },
  { label: 'Sentiment', value: '78', change: '2.4%', direction: 'down', trendNote: 'Down vs last period', subtext: 'Net sentiment score (0–100)' },
]

const tiles = computed(() => (props.stats?.length ? props.stats : FALLBACK))
</script>

<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <Card v-for="tile in tiles" :key="tile.label">
      <CardHeader class="relative">
        <CardDescription>{{ tile.label }}</CardDescription>
        <CardTitle class="text-2xl font-semibold tabular-nums">{{ tile.value }}</CardTitle>
        <div class="absolute right-6 top-6">
          <Badge variant="outline" class="gap-1">
            <component :is="tile.direction === 'up' ? TrendingUp : TrendingDown" class="size-3" />
            {{ tile.direction === 'up' ? '+' : '-' }}{{ tile.change }}
          </Badge>
        </div>
      </CardHeader>
      <CardFooter class="flex-col items-start gap-1 text-sm">
        <div class="flex items-center gap-1.5 font-medium text-card-foreground">
          {{ tile.trendNote || (tile.direction === 'up' ? 'Trending up' : 'Trending down') }}
          <component :is="tile.direction === 'up' ? TrendingUp : TrendingDown" class="size-4" />
        </div>
        <div class="text-muted-foreground">{{ tile.subtext || 'vs. previous period' }}</div>
      </CardFooter>
    </Card>
  </div>
</template>
