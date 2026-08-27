<script setup>
import { ref, computed } from 'vue'
import { Chart as ChartRender } from 'vue-chartjs'
import {
  Chart as ChartJS, Title, Tooltip, Legend,
  LineElement, PointElement, BarElement, BarController, LineController,
  CategoryScale, LinearScale, Filler,
} from 'chart.js'
import { Info, TrendingUp, TrendingDown } from '@lucide/vue'
import { Card } from '@/components/ui/card'
import { cssVar } from '@/lib/theme'

ChartJS.register(
  Title, Tooltip, Legend,
  LineElement, PointElement, BarElement, BarController, LineController,
  CategoryScale, LinearScale, Filler,
)

const props = defineProps({
  // chartData rows from the analytics store: [{ label, visitors, pageviews }, ...]
  chartData: { type: Array, default: () => [] },
  periodLabel: { type: String, default: 'this period' },
})

// ── view tabs ──────────────────────────────────────────────────────────────
const view = ref('both')
const tabs = [
  { key: 'visitors', label: 'Visitors' },
  { key: 'pageviews', label: 'Pageviews' },
  { key: 'both', label: 'Both' },
]
const showVisitors = computed(() => view.value === 'both' || view.value === 'visitors')
const showPageviews = computed(() => view.value === 'both' || view.value === 'pageviews')

// ── colors (Airbnb-style) ──────────────────────────────────────────────────
// House chart palette: visitors lead in dark blue, pageviews overlay in
// orange (see src/lib/chartTheme.js).
import { CHART_COLORS } from '@/lib/chartTheme'
const VISITORS_COLOR = CHART_COLORS.blue
const PAGEVIEWS_COLOR = CHART_COLORS.orange

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

// ── series ────────────────────────────────────────────────────────────────
const labels = computed(() => props.chartData.map(d => d.label))
const visitorsSeries = computed(() => props.chartData.map(d => d.visitors || 0))
const pageviewsSeries = computed(() => props.chartData.map(d => d.pageviews || 0))

const hasData = computed(() =>
  visitorsSeries.value.some(v => v > 0) || pageviewsSeries.value.some(v => v > 0),
)

// Headline value = the last data point. Delta = mean(last 3 buckets) vs
// mean(prior 3 buckets), as a percentage change of the prior window. Same
// formula the Visibility Overview card uses so the two read in step.
function lastOf(series) {
  if (!series?.length) return 0
  return Math.round(series[series.length - 1])
}
function avg(arr) { return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0 }
function trendDelta(series) {
  if (!series || series.length < 2) return 0
  if (series.length >= 6) {
    const tail = series.slice(-3)
    const prev = series.slice(-6, -3)
    const tailAvg = avg(tail)
    const prevAvg = avg(prev)
    if (prevAvg === 0) return 0
    return ((tailAvg - prevAvg) / prevAvg) * 100
  }
  const first = series[0] || 1
  const last = series[series.length - 1]
  return ((last - first) / Math.abs(first)) * 100
}

const visitorsCurrent = computed(() => lastOf(visitorsSeries.value))
const pageviewsCurrent = computed(() => lastOf(pageviewsSeries.value))
const visitorsDelta = computed(() => trendDelta(visitorsSeries.value))
const pageviewsDelta = computed(() => trendDelta(pageviewsSeries.value))

function fmtDelta(d) {
  if (!Number.isFinite(d) || d === 0) return '0%'
  const sign = d > 0 ? '+' : '−'
  return `${sign}${Math.abs(d).toFixed(1)}%`
}
function fmtCount(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

// ── chart ─────────────────────────────────────────────────────────────────
// Bars carry the primary metric and the overlay line carries the secondary.
// When only one tab is active that one metric becomes the bar; in "Both" mode
// Visitors are bars (the value we care about) and Pageviews ride over the top
// as a smooth thin line — a Stripe / Linear / Plausible style combo chart.
const primaryMetric = computed(() => {
  if (view.value === 'pageviews') {
    return { label: 'Pageviews', series: pageviewsSeries.value, color: PAGEVIEWS_COLOR }
  }
  return { label: 'Visitors', series: visitorsSeries.value, color: VISITORS_COLOR }
})
const overlayMetric = computed(() => {
  if (view.value !== 'both') return null
  return { label: 'Pageviews', series: pageviewsSeries.value, color: PAGEVIEWS_COLOR }
})

const chartConfig = computed(() => {
  const datasets = [
    {
      type: 'bar',
      label: primaryMetric.value.label,
      data: primaryMetric.value.series,
      backgroundColor: gradientFor(primaryMetric.value.color),
      hoverBackgroundColor: primaryMetric.value.color,
      borderRadius: 6,
      borderSkipped: false,
      barPercentage: 0.78,
      categoryPercentage: 0.86,
      order: 2,
    },
  ]
  if (overlayMetric.value) {
    datasets.push({
      type: 'line',
      label: overlayMetric.value.label,
      data: overlayMetric.value.series,
      borderColor: overlayMetric.value.color,
      backgroundColor: 'transparent',
      borderWidth: 2,
      tension: 0.4,
      cubicInterpolationMode: 'monotone',
      pointRadius: 0,
      pointHoverRadius: 4,
      pointHoverBackgroundColor: overlayMetric.value.color,
      pointHoverBorderColor: '#fff',
      pointHoverBorderWidth: 2,
      fill: false,
      order: 1,
    })
  }
  return { labels: labels.value, datasets }
})

const chartOptions = computed(() => {
  const text = cssVar('--muted-foreground', '#717171')
  const popover = cssVar('--popover', '#ffffff')
  const popoverFg = cssVar('--popover-foreground', '#222222')
  return {
    responsive: true,
    maintainAspectRatio: false,
    // 'nearest' on x lets the hover snap to the bar under the cursor — the
    // entire bar+line column lights up together, Plausible-style.
    interaction: { mode: 'index', axis: 'x', intersect: false },
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
        callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${fmtCount(ctx.parsed.y)}` },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: text, font: { size: 12, weight: '600' }, padding: 8, maxTicksLimit: 8 },
      },
      y: {
        grid: { color: '#F0F0F0' },
        border: { display: false },
        ticks: { color: '#B0B0B0', font: { size: 11 }, callback: (v) => fmtCount(v), maxTicksLimit: 5, padding: 6 },
        beginAtZero: true,
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
          <h2 class="inline-flex items-center gap-1.5 text-[22px] font-extrabold leading-tight tracking-tight text-foreground">
            Traffic Overview
            <span
              class="inline-flex"
              title="Visitors and pageviews recorded by the FetchBot pixel for the selected time range. The delta is the average of the last three buckets vs the prior three buckets."
            >
              <Info class="size-4 text-muted-foreground" />
            </span>
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">
            Visitor sessions and pageviews · {{ periodLabel }}
            <span
              v-if="!hasData"
              class="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
            >No data yet</span>
          </p>
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
        <div v-if="showVisitors">
          <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Visitors</p>
          <div class="mt-0.5 flex items-baseline gap-2">
            <span class="text-[28px] font-extrabold text-foreground">{{ fmtCount(visitorsCurrent) }}</span>
            <span
              class="inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-[13px] font-bold"
              :class="visitorsDelta >= 0
                ? 'bg-[#E8F5E9] text-[#008A05] dark:bg-[#4ade80]/15 dark:text-[#4ade80]'
                : 'bg-[#FDECEA] text-[#C02926] dark:bg-[#f87171]/15 dark:text-[#f87171]'"
            >
              <TrendingUp v-if="visitorsDelta >= 0" class="size-3.5" />
              <TrendingDown v-else class="size-3.5" />
              {{ fmtDelta(visitorsDelta) }}
            </span>
          </div>
        </div>
        <div v-if="showVisitors && showPageviews" class="w-px bg-border" />
        <div v-if="showPageviews">
          <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pageviews</p>
          <div class="mt-0.5 flex items-baseline gap-2">
            <span class="text-[28px] font-extrabold text-foreground">{{ fmtCount(pageviewsCurrent) }}</span>
            <span
              class="inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-[13px] font-bold"
              :class="pageviewsDelta >= 0
                ? 'bg-[#E8F5E9] text-[#008A05] dark:bg-[#4ade80]/15 dark:text-[#4ade80]'
                : 'bg-[#FDECEA] text-[#C02926] dark:bg-[#f87171]/15 dark:text-[#f87171]'"
            >
              <TrendingUp v-if="pageviewsDelta >= 0" class="size-3.5" />
              <TrendingDown v-else class="size-3.5" />
              {{ fmtDelta(pageviewsDelta) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-4 h-px w-full bg-border" />

    <div class="py-4 pl-0 pr-2">
      <div class="h-[320px]">
        <ChartRender v-if="hasData" type="bar" :data="chartConfig" :options="chartOptions" />
        <div v-else class="flex h-full items-center justify-center text-sm text-muted-foreground">
          No chart data yet
        </div>
      </div>
    </div>
  </Card>
</template>
