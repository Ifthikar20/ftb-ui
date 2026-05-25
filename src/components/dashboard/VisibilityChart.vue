<script setup>
import { ref, computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
} from 'chart.js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
)

const props = defineProps({
  series: { type: Object, default: null },
})

const resolution = ref('day')

// Placeholder series shaped like Peec's visibility-over-time view.
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

function cssVar(name) {
  if (typeof window === 'undefined') return '#5b8def'
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

const active = computed(() => (props.series?.[resolution.value]) || SAMPLE[resolution.value])

const chartData = computed(() => {
  const c1 = cssVar('--chart-1') || '#5b8def'
  const c4 = cssVar('--chart-4') || '#8b5cf6'
  return {
    labels: active.value.labels,
    datasets: [
      {
        label: 'Your Brand',
        data: active.value.brand,
        borderColor: c1,
        backgroundColor: c1 + '22',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        borderWidth: 2.5,
      },
      {
        label: 'Competitor Avg.',
        data: active.value.competitor,
        borderColor: c4,
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        borderWidth: 2,
        borderDash: [5, 5],
      },
    ],
  }
})

const chartOptions = computed(() => {
  const grid = cssVar('--border') || 'rgba(0,0,0,0.08)'
  const text = cssVar('--muted-foreground') || '#64748b'
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: { usePointStyle: true, boxWidth: 8, color: text, font: { size: 12 } },
      },
      tooltip: {
        callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y}%` },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: text } },
      y: {
        grid: { color: grid },
        border: { display: false },
        ticks: { color: text, callback: (v) => `${v}%` },
      },
    },
  }
})
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
  </Card>
</template>
