<template>
  <!--
    Provider agreement scatter.

    Picks the two providers that ran the most prompts and plots a dot
    per shared prompt with X = provider A rank, Y = provider B rank.
    Dots near the diagonal mean the two LLMs agree about how the
    target ranks; off-diagonal dots flag prompts where coverage is
    uneven (Claude loves us, GPT-4 ignores us — or vice versa).

    Misses on either axis are pinned to a "miss" rail at rank 0 so
    they're visible without distorting the rank scale.
  -->
  <Card v-if="hasData" class="h-full flex flex-col">
    <CardHeader>
      <CardTitle class="text-sm">Do {{ axisLabels.x }} and {{ axisLabels.y }} agree?</CardTitle>
      <CardDescription>
        Each dot is one prompt. Dots near the diagonal mean the two
        models rank you the same; off-diagonal dots are where they
        disagree most.
      </CardDescription>
    </CardHeader>
    <CardContent class="relative flex-1 min-h-[280px]">
      <Scatter :data="chartData" :options="chartOptions" />
    </CardContent>
    <CardFooter class="flex flex-wrap gap-4 text-xs text-muted-foreground">
      <span>
        <strong class="text-foreground tabular-nums">{{ stats.agree }}</strong> agree
        <span class="text-muted-foreground">(within ±2 ranks)</span>
      </span>
      <span>
        <strong class="text-foreground tabular-nums">{{ stats.disagree }}</strong> disagree
      </span>
      <span>
        <strong class="text-foreground tabular-nums">{{ stats.onlyX }}</strong> only on {{ axisLabels.x }}
      </span>
      <span>
        <strong class="text-foreground tabular-nums">{{ stats.onlyY }}</strong> only on {{ axisLabels.y }}
      </span>
    </CardFooter>
  </Card>
</template>

<script setup>
import { computed } from 'vue'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Scatter } from 'vue-chartjs'
import {
  Chart as ChartJS,
  LinearScale, PointElement, Tooltip, Legend,
} from 'chart.js'

ChartJS.register(LinearScale, PointElement, Tooltip, Legend)

const props = defineProps({
  results: { type: Array, default: () => [] },
  providerLabel: { type: Function, default: (p) => p },
})

// Pick the two providers with the most successful results — that's
// where the disagreement signal is densest. Falls back to the two
// most-frequent overall if a provider has < 3 successes.
const topProviders = computed(() => {
  const counts = {}
  for (const r of props.results) {
    if (!r.provider) continue
    counts[r.provider] = (counts[r.provider] || 0) + 1
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([p]) => p)
})

const axisLabels = computed(() => ({
  x: props.providerLabel(topProviders.value[0] || ''),
  y: props.providerLabel(topProviders.value[1] || ''),
}))

// Group by prompt; return an object per prompt with both providers'
// ranks (or null if the provider didn't run / didn't mention).
const byPrompt = computed(() => {
  const [px, py] = topProviders.value
  if (!px || !py) return []
  const map = new Map()
  for (const r of props.results) {
    const k = (r.prompt || '').trim()
    if (!k) continue
    let bucket = map.get(k)
    if (!bucket) { bucket = { prompt: k, x: null, y: null }; map.set(k, bucket) }
    if (r.provider === px) bucket.x = rankOf(r)
    if (r.provider === py) bucket.y = rankOf(r)
  }
  return Array.from(map.values())
})

function rankOf(r) {
  if (!r.query_succeeded) return null
  if (!r.is_mentioned) return 'miss'
  return r.mention_rank ?? 'miss'
}

// Convert ranks to coordinates. Misses pinned to 0 for visibility;
// real ranks plotted as positive ints. Y-axis inverted so rank #1 is
// at the top — matches user intuition.
const chartData = computed(() => {
  const points = []
  for (const row of byPrompt.value) {
    if (row.x == null || row.y == null) continue
    const x = row.x === 'miss' ? 0 : Number(row.x)
    const y = row.y === 'miss' ? 0 : Number(row.y)
    points.push({ x, y, prompt: row.prompt })
  }
  return {
    datasets: [{
      label: 'Prompts',
      data: points,
      backgroundColor: 'rgba(255, 106, 44, 0.6)',
      borderColor: 'rgba(255, 106, 44, 1)',
      borderWidth: 1,
      pointRadius: 6,
      pointHoverRadius: 8,
    }],
  }
})

const stats = computed(() => {
  let agree = 0, disagree = 0, onlyX = 0, onlyY = 0
  for (const row of byPrompt.value) {
    const xMiss = row.x === 'miss' || row.x == null
    const yMiss = row.y === 'miss' || row.y == null
    if (xMiss && yMiss) continue
    if (xMiss) { onlyY += 1; continue }
    if (yMiss) { onlyX += 1; continue }
    if (Math.abs(Number(row.x) - Number(row.y)) <= 2) agree += 1
    else disagree += 1
  }
  return { agree, disagree, onlyX, onlyY }
})

const hasData = computed(() => topProviders.value.length === 2 && byPrompt.value.length > 0)

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => {
          const p = ctx.raw
          const xLabel = p.x === 0 ? 'miss' : `#${p.x}`
          const yLabel = p.y === 0 ? 'miss' : `#${p.y}`
          return [
            `${axisLabels.value.x}: ${xLabel}`,
            `${axisLabels.value.y}: ${yLabel}`,
            (p.prompt || '').slice(0, 60),
          ]
        },
      },
    },
  },
  scales: {
    x: {
      type: 'linear',
      title: { display: true, text: `${axisLabels.value.x} rank (0 = miss)` },
      reverse: true,
      ticks: { stepSize: 1, callback: (v) => v === 0 ? 'miss' : `#${v}` },
      grid: { color: 'rgba(0,0,0,0.05)' },
    },
    y: {
      type: 'linear',
      title: { display: true, text: `${axisLabels.value.y} rank (0 = miss)` },
      reverse: true,
      ticks: { stepSize: 1, callback: (v) => v === 0 ? 'miss' : `#${v}` },
      grid: { color: 'rgba(0,0,0,0.05)' },
    },
  },
}))
</script>

