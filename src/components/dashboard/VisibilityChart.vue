<script setup>
import { ref, computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title, Tooltip, Legend, LineElement, PointElement,
  CategoryScale, LinearScale, Filler,
} from 'chart.js'
import { TrendingUp, TrendingDown } from '@lucide/vue'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale, Filler)

const props = defineProps({
  series: { type: Object, default: null },
})

const resolution = ref('day')

// Placeholder series shaped like a visibility-over-time view.
// Replaced by `series` prop once the analytics chart endpoint is wired.
const SAMPLE = {
  day: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    brand: [38, 41, 39, 44, 47, 45, 48],
    competitor: [52, 50, 51, 49, 48, 47, 46],
  },
  week: {
    labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'],
    brand: [31, 34, 36, 35, 39, 42, 44, 47],
    competitor: [55, 54, 52, 53, 50, 49, 48, 46],
  },
  month: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    brand: [22, 27, 31, 36, 41, 47],
    competitor: [58, 56, 53, 51, 49, 46],
  },
}

function cssVar(name, fallback) {
  if (typeof window === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

// Append an alpha channel to a #rrggbb hex string.
function withAlpha(hex, alpha) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0')
  return hex + a
}

function gradientFor(color) {
  return (ctx) => {
    const { chart } = ctx
    const { ctx: c, chartArea } = chart
    if (!chartArea) return withAlpha(color, 0.25)
    const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
    g.addColorStop(0, withAlpha(color, 0.4))
    g.addColorStop(1, withAlpha(color, 0.02))
    return g
  }
}

const active = computed(() => (props.series?.[resolution.value]) || SAMPLE[resolution.value])

const chartData = computed(() => {
  const c1 = cssVar('--chart-1', '#5b8def')
  const c4 = cssVar('--chart-4', '#8b5cf6')
  const common = {
    fill: true,
    tension: 0.4,
    cubicInterpolationMode: 'monotone',
    pointRadius: 0,
    pointHoverRadius: 4,
    pointHoverBorderWidth: 2,
    borderWidth: 2,
  }
  return {
    labels: active.value.labels,
    datasets: [
      {
        ...common,
        label: 'Your Brand',
        data: active.value.brand,
        borderColor: c1,
        backgroundColor: gradientFor(c1),
        pointHoverBackgroundColor: c1,
        pointHoverBorderColor: cssVar('--card', '#ffffff'),
      },
      {
        ...common,
        label: 'Competitor Avg.',
        data: active.value.competitor,
        borderColor: c4,
        backgroundColor: gradientFor(c4),
        pointHoverBackgroundColor: c4,
        pointHoverBorderColor: cssVar('--card', '#ffffff'),
      },
    ],
  }
})

const chartOptions = computed(() => {
  const grid = cssVar('--border', 'rgba(0,0,0,0.08)')
  const text = cssVar('--muted-foreground', '#64748b')
  const popover = cssVar('--popover', '#ffffff')
  const popoverFg = cssVar('--popover-foreground', '#0f172a')
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        usePointStyle: true,
        backgroundColor: popover,
        titleColor: popoverFg,
        bodyColor: popoverFg,
        borderColor: grid,
        borderWidth: 1,
        cornerRadius: 8,
        padding: 10,
        boxPadding: 4,
        callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y}%` },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: text, font: { size: 12 }, padding: 8 },
      },
      y: { display: false, beginAtZero: false },
    },
  }
})

// Trend summary for the footer (shadcn area-chart pattern).
const trend = computed(() => {
  const b = active.value.brand
  if (!b?.length) return { dir: 'up', pct: '0.0' }
  const first = b[0] || 1
  const last = b[b.length - 1]
  const pct = (((last - first) / Math.abs(first)) * 100)
  return { dir: pct >= 0 ? 'up' : 'down', pct: Math.abs(pct).toFixed(1) }
})

const rangeLabel = computed(() => ({
  day: 'last 7 days',
  week: 'last 8 weeks',
  month: 'last 6 months',
}[resolution.value]))
</script>

<template>
  <Card>
    <CardHeader class="flex-row items-start justify-between gap-4 space-y-0">
      <div>
        <CardTitle>Visibility over time</CardTitle>
        <CardDescription>Share of AI answers mentioning your brand</CardDescription>
      </div>
      <Tabs v-model="resolution" default-value="day">
        <TabsList>
          <TabsTrigger value="day">Day</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="month">Month</TabsTrigger>
        </TabsList>
      </Tabs>
    </CardHeader>
    <CardContent>
      <div class="h-72">
        <Line :data="chartData" :options="chartOptions" />
      </div>
    </CardContent>
    <CardFooter class="flex-col items-start gap-2 text-sm">
      <div class="flex items-center gap-1.5 font-medium text-card-foreground">
        <template v-if="trend.dir === 'up'">
          Trending up by {{ trend.pct }}% this period <TrendingUp class="size-4" />
        </template>
        <template v-else>
          Down {{ trend.pct }}% this period <TrendingDown class="size-4" />
        </template>
      </div>
      <div class="flex items-center gap-4 text-muted-foreground">
        <span class="flex items-center gap-1.5">
          <span class="size-2 rounded-full" :style="{ background: 'var(--chart-1)' }" />
          Your Brand
        </span>
        <span class="flex items-center gap-1.5">
          <span class="size-2 rounded-full" :style="{ background: 'var(--chart-4)' }" />
          Competitor Avg.
        </span>
        <span class="ml-auto">Showing visibility for the {{ rangeLabel }}</span>
      </div>
    </CardFooter>
  </Card>
</template>
