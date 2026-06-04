<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS, Title, Tooltip, Legend, LineElement, PointElement,
  CategoryScale, LinearScale, Filler,
} from 'chart.js'
import { Info, TrendingUp, TrendingDown } from '@lucide/vue'
import { Card } from '@/components/ui/card'
import { fallbackBrands } from './placeholders'
import llmRanking from '@/api/llm_ranking'

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale, Filler)

const props = defineProps({
  brands: { type: Array, default: null },
  activeName: { type: String, default: '' },
  websiteId: { type: String, default: '' },
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

// Real series from the backend, when a websiteId is supplied. Shape:
// { labels, brand[], competitor[], brand_current, competitor_current,
//   brand_delta_pct, competitor_delta_pct, has_data }
const overview = ref(null)

async function loadOverview() {
  if (!props.websiteId) return
  try {
    const { data } = await llmRanking.visibilityOverview(props.websiteId)
    overview.value = data
  } catch (err) {
    overview.value = null
    console.warn('Failed to load visibility overview', err)
  }
}

onMounted(loadOverview)
watch(() => props.websiteId, loadOverview)

function syntheticSeries(base, seed) {
  return Array.from({ length: POINTS }, (_, i) => {
    const drift = (i / (POINTS - 1)) * base * 0.18
    const wobble = Math.sin((i + seed) * 0.8) * Math.min(2.5, base * 0.06)
    return Math.max(0, +(base - base * 0.1 + drift + wobble).toFixed(1))
  })
}

const labels = computed(() => overview.value?.labels?.length ? overview.value.labels : LABELS.slice(0, POINTS))

const brandSeries = computed(() => {
  if (overview.value?.has_data) return overview.value.brand
  return syntheticSeries(brandList.value[0]?.visibility ?? 60, 1)
})
const compSeries = computed(() => {
  if (overview.value?.has_data) return overview.value.competitor
  const rest = brandList.value.slice(1)
  const compAvg = rest.length ? rest.reduce((s, b) => s + b.visibility, 0) / rest.length : 4
  return syntheticSeries(compAvg, 4)
})

const avg = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0)

// Headline value is the current month — what readers expect above a trendline.
// Backend hands us a computed `brand_current` already; fall back to the last
// series point when there's no real data.
const brandCurrent = computed(() => {
  if (overview.value?.has_data) return Math.round(overview.value.brand_current)
  const s = brandSeries.value
  return s.length ? Math.round(s[s.length - 1]) : 0
})
const compCurrent = computed(() => {
  if (overview.value?.has_data) return Math.round(overview.value.competitor_current)
  const s = compSeries.value
  return s.length ? Math.round(s[s.length - 1]) : 0
})

// Delta = last 3-month mean vs prior 3-month mean, as a % change of the
// prior window. Falls back to first-vs-last for shorter series. Sign drives
// the badge color and arrow direction in the template.
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

const brandDelta = computed(() => {
  if (overview.value?.has_data) return overview.value.brand_delta_pct ?? 0
  return trendDelta(brandSeries.value)
})
const compDelta = computed(() => {
  if (overview.value?.has_data) return overview.value.competitor_delta_pct ?? 0
  return trendDelta(compSeries.value)
})

function fmtDelta(d) {
  if (!Number.isFinite(d) || d === 0) return '0%'
  const sign = d > 0 ? '+' : '−'
  return `${sign}${Math.abs(d).toFixed(1)}%`
}

const showBrand = computed(() => view.value === 'both' || view.value === 'brand')
const showComp = computed(() => view.value === 'both' || view.value === 'competitors')

const usingSampleData = computed(() => !overview.value?.has_data)

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

// Distinct colors for per-competitor lines on the "Competitors" tab.
// Brand + competitor-avg already use the two strong tones above; these are
// muted enough that the avg line still reads as the primary.
const COMPETITOR_PALETTE = ['#FC642D', '#5B8DEF', '#A36BE5', '#0F8F76', '#D03A6B']
const competitorList = computed(() => overview.value?.competitors || [])

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
  // Drill down to per-competitor lines only on the dedicated tab. On
  // "Both" we keep just the avg to avoid drowning out the brand line.
  if (view.value === 'competitors' && competitorList.value.length) {
    competitorList.value.forEach((c, i) => {
      const color = COMPETITOR_PALETTE[i % COMPETITOR_PALETTE.length]
      datasets.push({
        ...baseDataset,
        label: c.name,
        data: c.series,
        borderColor: color,
        backgroundColor: 'transparent',
        pointHoverBackgroundColor: color,
        fill: false,
        borderWidth: 1.5,
        borderDash: [4, 4],
      })
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
          <h2 class="inline-flex items-center gap-1.5 text-[22px] font-extrabold leading-tight tracking-tight text-foreground">
            Visibility Overview
            <span
              class="inline-flex"
              title="Visibility = share of scanned AI answers that mention your brand. Measured across Claude, GPT-4, Gemini, and Perplexity for prompts in your tracked categories."
            >
              <Info class="size-4 text-muted-foreground" />
            </span>
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">
            % of scanned AI answers mentioning your brand · last 12 months
            <span
              v-if="usingSampleData"
              class="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
            >Sample data</span>
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
        <div v-if="showBrand">
          <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Brand Visibility</p>
          <div class="mt-0.5 flex items-baseline gap-2">
            <span class="text-[28px] font-extrabold text-foreground">{{ brandCurrent }}%</span>
            <span
              class="inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-[13px] font-bold"
              :class="brandDelta >= 0
                ? 'bg-[#E8F5E9] text-[#008A05]'
                : 'bg-[#FDECEA] text-[#C02926]'"
            >
              <TrendingUp v-if="brandDelta >= 0" class="size-3.5" />
              <TrendingDown v-else class="size-3.5" />
              {{ fmtDelta(brandDelta) }}
            </span>
          </div>
        </div>
        <div v-if="showBrand && showComp" class="w-px bg-border" />
        <div v-if="showComp">
          <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Competitor Avg</p>
          <div class="mt-0.5 flex items-baseline gap-2">
            <span class="text-[28px] font-extrabold text-foreground">{{ compCurrent }}%</span>
            <span
              class="inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-[13px] font-bold"
              :class="compDelta >= 0
                ? 'bg-[#E8F5E9] text-[#008A05]'
                : 'bg-[#FDECEA] text-[#C02926]'"
            >
              <TrendingUp v-if="compDelta >= 0" class="size-3.5" />
              <TrendingDown v-else class="size-3.5" />
              {{ fmtDelta(compDelta) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-4 h-px w-full bg-border" />

    <div class="py-4 pl-0 pr-2">
      <div class="h-[300px]">
        <Line :data="chartData" :options="chartOptions" />
      </div>
      <div
        v-if="view === 'competitors' && competitorList.length"
        class="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-7"
      >
        <span
          v-for="(c, i) in competitorList"
          :key="c.name"
          class="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <span
            class="size-2 rounded-full"
            :style="{ background: COMPETITOR_PALETTE[i % COMPETITOR_PALETTE.length] }"
          />
          <span class="font-medium text-foreground">{{ c.name }}</span>
          <span class="tabular-nums">{{ c.current }}%</span>
        </span>
      </div>
    </div>
  </Card>
</template>
