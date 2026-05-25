<script setup>
import { ref, computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS, Title, Tooltip, Legend, LineElement, PointElement,
  CategoryScale, LinearScale, Filler,
} from 'chart.js'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { fallbackBrands } from './placeholders'

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale, Filler)

const props = defineProps({
  brands: { type: Array, default: null },
  activeName: { type: String, default: '' },
})

const resolution = ref('day')

const POINTS = { day: 7, week: 8, month: 6 }
const LABELS = {
  day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  week: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'],
  month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
}
const PALETTE = ['--chart-1', '--chart-2', '--chart-4', '--chart-3', '--chart-5']

function cssVar(name, fallback) {
  if (typeof window === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

const brandList = computed(() => (props.brands?.length ? props.brands : fallbackBrands(props.activeName)).slice(0, 7))

// Deterministic gentle variation around each brand's baseline visibility.
function seriesFor(base, n, seed) {
  return Array.from({ length: n }, (_, i) => {
    const wobble = Math.sin((i + seed) * 0.9) * Math.min(3, base * 0.08)
    return Math.max(0, +(base + wobble).toFixed(1))
  })
}

const chartData = computed(() => {
  const n = POINTS[resolution.value]
  const fg = cssVar('--foreground', '#0f172a')
  return {
    labels: LABELS[resolution.value].slice(0, n),
    datasets: brandList.value.map((b, idx) => {
      const isTop = idx === 0
      const color = isTop ? fg : cssVar(PALETTE[(idx - 1) % PALETTE.length], '#5b8def')
      return {
        label: b.name,
        data: seriesFor(b.visibility, n, idx + 1),
        borderColor: color,
        backgroundColor: color,
        borderWidth: isTop ? 2.5 : 1.5,
        tension: 0.4,
        cubicInterpolationMode: 'monotone',
        pointRadius: 0,
        pointHoverRadius: 4,
      }
    }),
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
        callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y}%` },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: text, font: { size: 12 } } },
      y: {
        grid: { color: grid },
        border: { display: false },
        ticks: { color: text, callback: (v) => `${v}%`, maxTicksLimit: 4 },
      },
    },
  }
})

const rangeLabel = computed(() => ({ day: '7 days', week: '8 weeks', month: '6 months' }[resolution.value]))
</script>

<template>
  <Card>
    <CardHeader class="flex-row items-center justify-between space-y-0">
      <CardTitle class="text-base">Visibility</CardTitle>
      <Tabs v-model="resolution" default-value="day">
        <TabsList class="h-8">
          <TabsTrigger value="day" class="text-xs">D</TabsTrigger>
          <TabsTrigger value="week" class="text-xs">W</TabsTrigger>
          <TabsTrigger value="month" class="text-xs">M</TabsTrigger>
        </TabsList>
      </Tabs>
    </CardHeader>
    <CardContent>
      <div class="h-[300px]">
        <Line :data="chartData" :options="chartOptions" />
      </div>
    </CardContent>
    <CardFooter class="text-sm text-muted-foreground">
      Showing data for the last {{ rangeLabel }}
    </CardFooter>
  </Card>
</template>
