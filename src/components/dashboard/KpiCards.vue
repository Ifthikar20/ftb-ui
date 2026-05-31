<script setup>
import { TrendingUp, TrendingDown } from '@lucide/vue'
import { Card, CardHeader, CardTitle, CardDescription, CardFooter, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const props = defineProps({
  stats: { type: Array, default: () => [] },
})

function showChange(tile) {
  return tile.change && tile.change !== '—'
}
</script>

<template>
  <div v-if="props.stats.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <Card v-for="tile in props.stats" :key="tile.label">
      <CardHeader class="relative">
        <CardDescription>{{ tile.label }}</CardDescription>
        <CardTitle class="text-2xl font-semibold tabular-nums">{{ tile.value }}</CardTitle>
        <div v-if="showChange(tile)" class="absolute right-6 top-6">
          <Badge variant="outline" class="gap-1">
            <component :is="tile.direction === 'up' ? TrendingUp : TrendingDown" class="size-3" />
            {{ tile.direction === 'up' ? '+' : '-' }}{{ tile.change }}
          </Badge>
        </div>
      </CardHeader>
      <CardFooter class="flex-col items-start gap-1 text-sm">
        <div class="flex items-center gap-1.5 font-medium text-card-foreground">
          {{ tile.trendNote || (tile.direction === 'up' ? 'Trending up' : 'Trending down') }}
          <component v-if="showChange(tile)" :is="tile.direction === 'up' ? TrendingUp : TrendingDown" class="size-4" />
        </div>
        <div class="text-muted-foreground">{{ tile.subtext || 'vs. previous period' }}</div>
      </CardFooter>
    </Card>
  </div>
  <Card v-else>
    <CardContent class="py-10 text-center">
      <div class="text-sm font-medium text-card-foreground">Nothing to show yet</div>
      <div class="mt-1 text-xs text-muted-foreground">
        Run your first audit to start tracking Visibility, Position, and Sentiment.
      </div>
    </CardContent>
  </Card>
</template>
