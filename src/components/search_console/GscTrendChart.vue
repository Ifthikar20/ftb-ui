<template>
  <Card>
    <CardHeader class="flex flex-row items-center justify-between space-y-0">
      <div>
        <CardTitle>Search performance</CardTitle>
        <CardDescription>Daily totals from Google Search Console</CardDescription>
      </div>
      <div class="flex gap-1">
        <button
          v-for="metric in toggleMetrics"
          :key="metric.key"
          class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
          :class="enabled[metric.key] ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'"
          @click="enabled[metric.key] = !enabled[metric.key]"
        >
          {{ metric.label }}
        </button>
      </div>
    </CardHeader>
    <CardContent>
      <div v-if="series.length" class="h-72">
        <Line :data="chartData" :options="chartOptions" />
      </div>
      <p v-else class="py-12 text-center text-sm text-muted-foreground">
        No data in this date range yet.
      </p>
    </CardContent>
  </Card>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { Line } from 'vue-chartjs'
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale, Filler)

const props = defineProps({
  series: { type: Array, default: () => [] },
})

const toggleMetrics = [
  { key: 'clicks', label: 'Clicks' },
  { key: 'impressions', label: 'Impressions' },
  { key: 'ctr', label: 'CTR' },
  { key: 'position', label: 'Position' },
]

const enabled = reactive({ clicks: true, impressions: true, ctr: false, position: false })

function cssVar(name, fallback) {
  if (typeof window === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

const COLORS = {
  clicks: () => cssVar('--chart-1', '#5b8def'),
  impressions: () => cssVar('--chart-4', '#8b5cf6'),
  ctr: () => cssVar('--chart-2', '#22c55e'),
  position: () => cssVar('--chart-5', '#f59e0b'),
}

const chartData = computed(() => {
  const labels = props.series.map((row) => row.date)
  const datasets = []
  if (enabled.clicks) {
    datasets.push({
      label: 'Clicks',
      data: props.series.map((row) => row.clicks),
      borderColor: COLORS.clicks(),
      backgroundColor: 'transparent',
      tension: 0.35,
      pointRadius: 0,
      pointHoverRadius: 4,
      yAxisID: 'y',
    })
  }
  if (enabled.impressions) {
    datasets.push({
      label: 'Impressions',
      data: props.series.map((row) => row.impressions),
      borderColor: COLORS.impressions(),
      backgroundColor: 'transparent',
      tension: 0.35,
      pointRadius: 0,
      pointHoverRadius: 4,
      yAxisID: 'yImpressions',
    })
  }
  if (enabled.ctr) {
    datasets.push({
      label: 'CTR (%)',
      data: props.series.map((row) => +(row.ctr * 100).toFixed(2)),
      borderColor: COLORS.ctr(),
      backgroundColor: 'transparent',
      tension: 0.35,
      pointRadius: 0,
      pointHoverRadius: 4,
      yAxisID: 'ySmall',
    })
  }
  if (enabled.position) {
    datasets.push({
      label: 'Avg position',
      data: props.series.map((row) => +row.position.toFixed(1)),
      borderColor: COLORS.position(),
      backgroundColor: 'transparent',
      tension: 0.35,
      pointRadius: 0,
      pointHoverRadius: 4,
      yAxisID: 'yPosition',
    })
  }
  return { labels, datasets }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: true, position: 'bottom', labels: { boxWidth: 12, usePointStyle: true } },
  },
  scales: {
    x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } },
    y: {
      display: enabled.clicks,
      position: 'left',
      beginAtZero: true,
      grid: { color: 'rgba(128,128,128,0.1)' },
    },
    yImpressions: {
      display: enabled.impressions,
      position: 'right',
      beginAtZero: true,
      grid: { drawOnChartArea: false },
    },
    ySmall: {
      display: enabled.ctr,
      position: 'right',
      beginAtZero: true,
      grid: { drawOnChartArea: false },
    },
    yPosition: {
      display: enabled.position,
      position: 'right',
      // Position 1 is the top of Google, so the axis is reversed:
      // a line moving up means ranking improved.
      reverse: true,
      grid: { drawOnChartArea: false },
    },
  },
}))
</script>
