<script setup>
import { ref, computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS, Title, Tooltip, Legend, LineElement, PointElement,
  CategoryScale, LinearScale, Filler,
} from 'chart.js'
import { Card } from '@/components/ui/card'
import { fallbackBrands } from './placeholders'

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale, Filler)

const props = defineProps({
  brands: { type: Array, default: null },
  activeName: { type: String, default: '' },
})

const view = ref('both')
const tabs = [
  { key: 'brand', label: 'Brand' },
  { key: 'competitors', label: 'Competitors' },
  { key: 'both', label: 'Both' },
]

const POINTS = 12
const LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const BRAND_COLOR = '#FF385C'
const COMP_COLOR = '#00A699'

function cssVar(name, fallback) {
  if (typeof window === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}
function withAlpha(hex, alpha) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex
  return hex + Math.round(alpha * 255).toString(16).padStart(2, '0')
}
function gradientFor(color) {
  return (ctx) => {
    const { chart } = ctx
    const { ctx: c, chartArea } = chart
    if (!chartArea) return withAlpha(color, 0.12)
    const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
    g.addColorStop(0, withAlpha(color, 0.16))
    g.addColorStop(1, withAlpha(color, 0))
    return g
  }
}

const brandList = computed(() => (props.brands?.length ? props.brands : fallbackBrands(props.activeName)))

function series(base, seed) {
  return Array.from({ length: POINTS }, (_, i) => {
    const drift = (i / (POINTS - 1)) * base * 0.18
    const wobble = Math.sin((i + seed) * 0.8) * Math.min(2.5, base * 0.06)
    return Math.max(0, +(base - base * 0.1 + drift + wobble).toFixed(1))
  })
}

const brandSeries = computed(() => series(brandList.value[0]?.visibility ?? 60, 1))
const compSeries = computed(() => {
  const rest = brandList.value.slice(1)
  const avg = rest.length ? rest.reduce((s, b) => s + b.visibility, 0) / rest.length : 4
  return series(avg, 4)
})

const avg = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0)
const brandAvg = computed(() => Math.round(avg(brandSeries.value)))
const compAvg = computed(() => Math.round(avg(compSeries.value)))

const baseDataset = {
  fill: true,
  tension: 0.4,
  cubicInterpolationMode: 'monotone',
  borderWidth: 2.5,
  pointRadius: 0,
  pointHoverRadius: 5,
  pointHoverBorderWidth: 2.5,
  pointHoverBorderColor: '#fff',
}

const chartData = computed(() => {
  const datasets = []
  if (view.value === 'both' || view.value === 'brand') {
    datasets.push({
      ...baseDataset, label: 'Your Brand', data: brandSeries.value,
      borderColor: BRAND_COLOR, backgroundColor: gradientFor(BRAND_COLOR), pointHoverBackgroundColor: BRAND_COLOR,
    })
  }
  if (view.value === 'both' || view.value === 'competitors') {
    datasets.push({
      ...baseDataset, label: 'Competitor Avg', data: compSeries.value,
      borderColor: COMP_COLOR, backgroundColor: gradientFor(COMP_COLOR), pointHoverBackgroundColor: COMP_COLOR,
    })
  }
  return { labels: LABELS.slice(0, POINTS), datasets }
})

const chartOptions = computed(() => {
  const text = cssVar('--muted-foreground', '#717171')
  const popover = cssVar('--popover', '#ffffff')
  const popoverFg = cssVar('--popover-foreground', '#222222')
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        usePointStyle: true,
        backgroundColor: popover,
        titleColor: text,
        bodyColor: popoverFg,
        borderColor: '#EBEBEB',
        borderWidth: 1,
        cornerRadius: 12,
        padding: 12,
        boxPadding: 6,
        titleFont: { weight: '600', size: 12 },
        bodyFont: { weight: '600', size: 13 },
        callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y}%` },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: text, font: { size: 12, weight: '600' }, padding: 8 } },
      y: {
        grid: { color: '#F0F0F0' },
        border: { display: false },
        ticks: { color: '#B0B0B0', font: { size: 11 }, callback: (v) => `${v}%`, maxTicksLimit: 5, padding: 6 },
      },
    },
  }
})
</script>

<template>
  <Card class="overflow-hidden rounded-2xl border-border p-0 shadow-none">
    <div class="px-7 pt-6">
      <div class="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 class="text-[22px] font-extrabold leading-tight tracking-tight text-foreground">Visibility Overview</h2>
          <p class="mt-1 text-sm text-muted-foreground">Showing brand visibility for the last 12 months</p>
        </div>
        <div class="flex gap-0.5 rounded-[10px] bg-muted p-[3px]">
          <button
            v-for="t in tabs"
            :key="t.key"
            type="button"
            class="rounded-lg px-4 py-1.5 text-[13px] font-bold transition-colors"
            :class="view === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
            @click="view = t.key"
          >{{ t.label }}</button>
        </div>
      </div>

      <div class="mb-1 flex gap-6">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Brand Visibility</p>
          <div class="mt-0.5 flex items-baseline gap-2">
            <span class="text-[28px] font-extrabold text-foreground">{{ brandAvg }}%</span>
            <span class="rounded-md bg-[#E8F5E9] px-2 py-0.5 text-[13px] font-bold text-[#008A05]">+14.2%</span>
          </div>
        </div>
        <div class="w-px bg-border" />
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Competitor Avg</p>
          <div class="mt-0.5 flex items-baseline gap-2">
            <span class="text-[28px] font-extrabold text-foreground">{{ compAvg }}%</span>
            <span class="rounded-md bg-[#E8F5E9] px-2 py-0.5 text-[13px] font-bold text-[#008A05]">+3.1%</span>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-4 h-px w-full bg-border" />

    <div class="py-4 pl-0 pr-2">
      <div class="h-[300px]">
        <Line :data="chartData" :options="chartOptions" />
      </div>
    </div>
  </Card>
</template>
