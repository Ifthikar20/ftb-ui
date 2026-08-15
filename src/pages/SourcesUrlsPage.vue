<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title, Tooltip, Legend, LineElement, PointElement,
  CategoryScale, LinearScale, Filler,
} from 'chart.js'
import {
  Bookmark, Search, ChevronLeft, ChevronRight, MoreHorizontal,
  ArrowUpDown, Upload, Settings2, Maximize2, Info, Flag, Check,
  ChevronDown, Users, Loader2,
} from '@lucide/vue'
import { useAppStore } from '@/stores/app'
import citationsApi from '@/api/citations'
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from '@/components/ui/card'

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale, Filler)

const appStore = useAppStore()
const route = useRoute()
const router = useRouter()
const websiteId = computed(() => route.params.websiteId)
const brandLabel = computed(() => appStore.activeWebsite?.name || 'this brand')

function cssVar(name, fallback) {
  if (typeof window === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

/* ── Remote state ── */
const loading = ref(true)
const error = ref('')
const resolution = ref('D')

const DOMAIN_PALETTE = [
  '#475569', '#8b5cf6', '#5b8def', '#ec4899', '#f59e0b',
  '#22c55e', '#06b6d4', '#f97316', '#14b8a6', '#eab308',
]

/* Overview chart (populated from the API). */
const domainSeries = ref([])
const chartLabels = ref([])

const chartData = computed(() => ({
  labels: chartLabels.value,
  datasets: domainSeries.value.map(d => ({
    label: d.label,
    data: d.data,
    borderColor: d.color,
    backgroundColor: d.color,
    pointHoverBackgroundColor: d.color,
    pointHoverBorderColor: cssVar('--card', '#fff'),
    tension: 0.4,
    cubicInterpolationMode: 'monotone',
    pointRadius: 0,
    pointHoverRadius: 4,
    pointHoverBorderWidth: 2,
    borderWidth: 2,
    fill: false,
  })),
}))

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
        padding: 12,
        boxPadding: 4,
        callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y}` },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: text, font: { size: 12 }, padding: 8 },
      },
      y: {
        beginAtZero: true,
        suggestedMax: 81,
        grid: { color: grid, drawBorder: false },
        border: { display: false },
        ticks: { color: text, font: { size: 12 }, padding: 8, stepSize: 25 },
      },
    },
  }
})

/* ── URL movers ── */
const moverTab = ref('Top')
const moverTabs = ['Top', 'New', 'Trending', 'Losing']
const movers = ref({ Top: [], New: [], Trending: [], Losing: [] })
const moverRows = computed(() => movers.value[moverTab.value] || [])
const moverMax = computed(() => Math.max(1, ...moverRows.value.map(r => r.retrievals)))

const urlTypes = ref([])
const totalRetrievals = ref(0)

/* ── AI models for the mentions column (with graceful fallback) ── */
const MODELS = {
  chatgpt: { label: 'ChatGPT', color: '#10a37f', initial: 'C' },
  perplexity: { label: 'Perplexity', color: '#8b5cf6', initial: 'P' },
  gemini: { label: 'Gemini', color: '#5b8def', initial: 'G' },
  claude: { label: 'Claude', color: '#f97316', initial: 'A' },
  copilot: { label: 'Copilot', color: '#06b6d4', initial: 'M' },
  grok: { label: 'Grok', color: '#0f172a', initial: 'X' },
  deepseek: { label: 'DeepSeek', color: '#2563eb', initial: 'D' },
  mistral: { label: 'Mistral', color: '#ef4444', initial: 'M' },
  cohere: { label: 'Cohere', color: '#d946ef', initial: 'O' },
  llama: { label: 'Llama', color: '#0ea5e9', initial: 'L' },
  nova: { label: 'Nova', color: '#64748b', initial: 'N' },
}
function modelStyle(key) {
  return MODELS[key] || { label: key, color: '#94a3b8', initial: (key || '?')[0].toUpperCase() }
}

const DOMAIN_TYPE_STYLES = {
  Reference: { bg: 'rgba(168,85,247,0.12)', fg: '#a855f7' },
  Corporate: { bg: 'rgba(249,115,22,0.12)', fg: '#f97316' },
  Editorial: { bg: 'rgba(91,141,239,0.12)', fg: '#5b8def' },
  UGC: { bg: 'rgba(34,197,94,0.12)', fg: '#22c55e' },
}
function domainStyle(type) {
  return DOMAIN_TYPE_STYLES[type] || { bg: 'rgba(100,116,139,0.12)', fg: '#64748b' }
}

/* ── Global filters (topic = prompt bundle, model = provider) ── */
const topics = ref([])
const selectedTopic = ref(route.query.topic || null)
const selectedModel = ref(null)
const openMenu = ref(null)

const MODEL_OPTIONS = [
  { value: 'gpt4', label: 'ChatGPT' },
  { value: 'perplexity', label: 'Perplexity' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'claude', label: 'Claude' },
  { value: 'grok', label: 'Grok' },
  { value: 'deepseek', label: 'DeepSeek' },
]
const selectedModelLabel = computed(() =>
  MODEL_OPTIONS.find(m => m.value === selectedModel.value)?.label || 'All Models')
const topicsTotal = computed(() => topics.value.reduce((s, t) => s + (t.count || 0), 0))

function toggleMenu(name) {
  openMenu.value = openMenu.value === name ? null : name
}
function closeMenus() { openMenu.value = null }
function selectTopic(name) {
  selectedTopic.value = name
  closeMenus()
  router.replace({ query: { ...route.query, topic: name || undefined } })
  load()
}
function selectModel(value) {
  selectedModel.value = value
  closeMenus()
  load()
}

/* ── URLs table ── */
const gapAnalysis = ref(true)
const search = ref('')
const urls = ref([])

const filteredUrls = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return urls.value
  return urls.value.filter(u =>
    (u.title || '').toLowerCase().includes(q) || (u.path || '').toLowerCase().includes(q))
})

/* ── Data fetch ── */
function mapRow(r) {
  const models = Array.isArray(r.models) ? r.models : []
  return {
    title: r.title,
    path: r.path,
    url: r.url,
    normalizedUrl: r.normalized_url,
    type: r.url_type,
    domainType: r.domain_type,
    models: models.slice(0, 4),
    extra: Math.max(0, models.length - 4),
    retrievals: r.retrievals,
    citationRate: r.citation_rate ?? 0,
    gap: r.gap_score ?? 0,
    isTarget: r.is_target,
    isCompetitor: r.is_competitor,
    bookmarked: false,
    flagged: r.is_competitor,
    verified: r.is_target,
  }
}

async function load() {
  if (!websiteId.value) return
  loading.value = true
  error.value = ''
  try {
    const params = {}
    if (selectedTopic.value) params.topic = selectedTopic.value
    if (selectedModel.value) params.provider = selectedModel.value
    const res = await citationsApi.websiteUrls(websiteId.value, params)
    const data = res.data?.data || res.data || {}
    topics.value = data.topics || []
    chartLabels.value = data.overview?.labels || []
    domainSeries.value = (data.overview?.series || []).map((s, i) => ({
      key: s.label,
      label: s.label,
      color: s.color || DOMAIN_PALETTE[i % DOMAIN_PALETTE.length],
      data: s.data || [],
    }))
    movers.value = {
      Top: data.movers?.Top || [],
      New: data.movers?.New || [],
      Trending: data.movers?.Trending || [],
      Losing: data.movers?.Losing || [],
    }
    urlTypes.value = (data.url_types || []).map(t => ({ type: t.type, pct: t.pct, color: t.color }))
    totalRetrievals.value = data.total_retrievals || 0
    urls.value = (data.urls || []).map(mapRow)
  } catch (e) {
    error.value = e?.displayMessage || 'Failed to load URL analytics.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  load()
  document.addEventListener('click', onDocClick)
})
onUnmounted(() => document.removeEventListener('click', onDocClick))
watch(websiteId, load)

function onDocClick(e) {
  if (!e.target.closest?.('[data-filter-menu]')) closeMenus()
}

function openDetail(row) {
  router.push({
    name: 'sources-url-detail',
    params: { websiteId: websiteId.value },
    query: {
      url: row.normalizedUrl || row.url,
      ...(selectedTopic.value ? { topic: selectedTopic.value } : {}),
      ...(selectedModel.value ? { provider: selectedModel.value } : {}),
    },
  })
}

function toggleBookmark(row) {
  row.bookmarked = !row.bookmarked
}

function faviconFor(path) {
  const domain = (path || '').split('/')[0]
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
}
function onFaviconError(e) {
  e.target.style.visibility = 'hidden'
}

function totalRetrievalsLabel() {
  const n = totalRetrievals.value
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- ── Header / breadcrumb row ── -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2 text-sm text-muted-foreground">
        <span class="font-medium text-foreground">Sources</span>
        <ChevronRight class="size-3.5" />
        <span class="font-semibold text-foreground">URLs</span>
      </div>
    </div>

    <!-- ── Global filter pills ── -->
    <div class="flex flex-wrap items-center gap-2">
      <button v-for="pill in [brandLabel, 'All time', 'All Tags']" :key="pill"
        class="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-ring">
        <span>{{ pill }}</span>
        <ChevronDown class="size-3.5 text-muted-foreground" />
      </button>

      <!-- Models filter (AI provider) -->
      <div class="relative" data-filter-menu>
        <button @click="toggleMenu('models')"
          class="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-ring"
          :class="selectedModel ? 'border-ring' : 'border-border'">
          <span>{{ selectedModelLabel }}</span>
          <ChevronDown class="size-3.5 text-muted-foreground" />
        </button>
        <div v-if="openMenu === 'models'"
          class="absolute left-0 z-20 mt-1 w-52 rounded-lg border border-border bg-popover p-1 shadow-md">
          <button @click="selectModel(null)"
            class="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-sm hover:bg-secondary"
            :class="!selectedModel ? 'font-semibold text-foreground' : 'text-muted-foreground'">All Models</button>
          <button v-for="m in MODEL_OPTIONS" :key="m.value" @click="selectModel(m.value)"
            class="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-sm hover:bg-secondary"
            :class="selectedModel === m.value ? 'font-semibold text-foreground' : 'text-muted-foreground'">
            <span>{{ m.label }}</span>
            <Check v-if="selectedModel === m.value" class="size-3.5 text-[color:var(--chart-1)]" />
          </button>
        </div>
      </div>

      <!-- Topics filter (prompt bundle) -->
      <div class="relative" data-filter-menu>
        <button @click="toggleMenu('topics')"
          class="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-ring"
          :class="selectedTopic ? 'border-ring' : 'border-border'">
          <span>{{ selectedTopic || 'All Topics' }}</span>
          <ChevronDown class="size-3.5 text-muted-foreground" />
        </button>
        <div v-if="openMenu === 'topics'"
          class="absolute left-0 z-20 mt-1 w-60 rounded-lg border border-border bg-popover p-1 shadow-md">
          <button @click="selectTopic(null)"
            class="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-sm hover:bg-secondary"
            :class="!selectedTopic ? 'font-semibold text-foreground' : 'text-muted-foreground'">
            <span>All Topics</span><span class="text-xs text-muted-foreground">{{ topicsTotal }}</span>
          </button>
          <button v-for="t in topics" :key="t.name" @click="selectTopic(t.name)"
            class="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-sm hover:bg-secondary"
            :class="selectedTopic === t.name ? 'font-semibold text-foreground' : 'text-muted-foreground'">
            <span class="truncate">{{ t.name }}</span><span class="ml-2 shrink-0 text-xs text-muted-foreground">{{ t.count }}</span>
          </button>
          <div v-if="!topics.length" class="px-2.5 py-2 text-xs text-muted-foreground">No topics yet. Group prompts into topics on the Prompts page.</div>
        </div>
      </div>
    </div>

    <div v-if="error" class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {{ error }}
    </div>
    <div v-if="loading" class="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 class="size-4 animate-spin" /> Loading URL analytics…
    </div>

    <!-- ── Overview ── -->
    <div>
      <h2 class="text-lg font-bold text-foreground">Overview</h2>
      <p class="text-sm text-muted-foreground">How often each URL appears in AI answers</p>
    </div>

    <Card>
      <CardHeader class="flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle class="text-base">Source retrievals over time</CardTitle>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex items-center rounded-lg border border-border p-0.5">
            <button v-for="r in ['D', 'W', 'M']" :key="r"
              class="rounded-md px-2.5 py-1 text-xs font-semibold transition-colors"
              :class="resolution === r ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'"
              @click="resolution = r">{{ r }}</button>
          </div>
          <button class="rounded-md p-1.5 text-muted-foreground hover:bg-secondary">
            <MoreHorizontal class="size-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div class="h-72">
          <Line :data="chartData" :options="chartOptions" />
        </div>
        <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span v-for="d in domainSeries" :key="d.key"
            class="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span class="size-2 rounded-full" :style="{ background: d.color }" />
            {{ d.label }}
          </span>
          <span v-if="!domainSeries.length && !loading" class="text-xs text-muted-foreground">No retrievals in this period yet.</span>
        </div>
      </CardContent>
    </Card>

    <!-- ── URL Movers ── -->
    <div>
      <h2 class="text-lg font-bold text-foreground">URL Movers</h2>
      <p class="text-sm text-muted-foreground">How often each URL and URL type is retrieved</p>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <!-- Rankings -->
      <Card>
        <CardHeader class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <button v-for="t in moverTabs" :key="t"
                class="text-sm font-medium transition-colors"
                :class="moverTab === t ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'"
                @click="moverTab = t">{{ t }}</button>
              <Info class="size-3.5 text-muted-foreground" />
            </div>
            <span class="text-xs font-medium text-muted-foreground">Retrievals</span>
          </div>
        </CardHeader>
        <CardContent class="space-y-1.5">
          <div v-for="(row, i) in moverRows" :key="i"
            class="relative flex items-center justify-between gap-3 overflow-hidden rounded-md px-3 py-2">
            <div class="absolute inset-y-0 left-0 rounded-md bg-secondary"
              :style="{ width: (row.retrievals / moverMax * 100) + '%' }" />
            <span class="relative z-10 min-w-0 truncate text-sm text-foreground" :title="row.title">{{ row.title }}</span>
            <span class="relative z-10 shrink-0 text-sm font-semibold tabular-nums text-foreground">{{ row.retrievals }}</span>
          </div>
        </CardContent>
      </Card>

      <!-- URL types -->
      <Card>
        <CardHeader class="flex-row items-center justify-between space-y-0">
          <div class="flex items-center gap-1.5">
            <CardTitle class="text-base">URL types</CardTitle>
            <Info class="size-3.5 text-muted-foreground" />
          </div>
          <span class="text-xs text-muted-foreground">Total retrievals: {{ totalRetrievalsLabel() }}</span>
        </CardHeader>
        <CardContent class="space-y-3">
          <div v-for="t in urlTypes" :key="t.type"
            class="relative flex items-center justify-between gap-3 overflow-hidden rounded-md px-3 py-2">
            <div class="absolute inset-y-0 left-0 rounded-md bg-secondary"
              :style="{ width: (t.pct * 3) + '%' }" />
            <span class="relative z-10 inline-flex items-center gap-2 text-sm text-foreground">
              <span class="size-2 rounded-full" :style="{ background: t.color }" />
              {{ t.type }}
            </span>
            <span class="relative z-10 text-sm font-semibold tabular-nums text-foreground">{{ t.pct }}%</span>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- ── URLs table ── -->
    <div class="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 class="text-lg font-bold text-foreground">URLs</h2>
        <p class="text-sm text-muted-foreground">Every page AI used for this brand</p>
      </div>
      <label class="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
        <button type="button" role="switch" :aria-checked="gapAnalysis"
          class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
          :class="gapAnalysis ? 'bg-[color:var(--chart-2)]' : 'bg-input'"
          @click="gapAnalysis = !gapAnalysis">
          <span class="inline-block size-4 transform rounded-full bg-white transition-transform"
            :class="gapAnalysis ? 'translate-x-4' : 'translate-x-0.5'" />
        </button>
        Gap Analysis
      </label>
    </div>

    <Card>
      <CardContent class="pt-6">
        <!-- filter row -->
        <div class="mb-4 flex flex-wrap items-center gap-2">
          <div class="relative flex-1 min-w-[200px]">
            <Search class="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input v-model="search" placeholder="Search"
              class="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <button class="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:border-ring">
            <Users class="size-4 text-muted-foreground" /> Min 1 Competitor
            <ChevronDown class="size-3.5 text-muted-foreground" />
          </button>
          <button class="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:border-ring">
            <Bookmark class="size-4 text-muted-foreground" /> Bookmarked
          </button>
          <button class="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:border-ring">
            Other <ChevronDown class="size-3.5 text-muted-foreground" />
          </button>
          <button class="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:border-ring">
            All Domain types <ChevronDown class="size-3.5 text-muted-foreground" />
          </button>
          <button class="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:border-ring"><Maximize2 class="size-4" /></button>
          <button class="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:border-ring"><Upload class="size-4" /></button>
          <button class="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:border-ring"><Settings2 class="size-4" /></button>
        </div>

        <!-- table -->
        <div class="overflow-x-auto">
          <table class="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr class="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <th class="w-8 py-2"></th>
                <th class="w-[40%] py-2 pr-3">URL</th>
                <th class="py-2 pr-3">URL type</th>
                <th class="py-2 pr-3">Domain type</th>
                <th class="py-2 pr-3">Mentions</th>
                <th class="py-2 pr-3">
                  <span class="inline-flex items-center gap-1">Retrievals <ArrowUpDown class="size-3" /></span>
                </th>
                <th class="py-2 pr-3">
                  <span class="inline-flex items-center gap-1">Citation rate <ArrowUpDown class="size-3" /></span>
                </th>
                <th v-if="gapAnalysis" class="py-2 pr-3 text-right">
                  <span class="inline-flex items-center gap-1">Gap score <ArrowUpDown class="size-3" /></span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in filteredUrls" :key="i"
                @click="openDetail(row)"
                class="cursor-pointer border-b border-border/60 transition-colors hover:bg-muted/50">
                <td class="py-3 pl-1">
                  <button @click.stop="toggleBookmark(row)" class="text-muted-foreground hover:text-foreground">
                    <Bookmark class="size-4" :class="row.bookmarked ? 'fill-[color:var(--chart-3)] text-[color:var(--chart-3)]' : ''" />
                  </button>
                </td>
                <td class="py-3 pr-3">
                  <div class="flex items-center gap-2.5">
                    <Flag v-if="row.flagged" class="size-3.5 shrink-0 fill-[color:var(--chart-3)] text-[color:var(--chart-3)]" />
                    <span v-else-if="row.verified" class="flex size-4 shrink-0 items-center justify-center rounded-full bg-[color:var(--chart-1)] text-white">
                      <Check class="size-2.5" />
                    </span>
                    <img :src="faviconFor(row.path)" alt="" class="size-4 shrink-0 rounded-sm" @error="onFaviconError" />
                    <div class="min-w-0">
                      <div class="truncate font-medium text-foreground" :title="row.title">{{ row.title }}</div>
                      <div class="truncate text-xs text-muted-foreground" :title="row.path">{{ row.path }}</div>
                    </div>
                  </div>
                </td>
                <td class="py-3 pr-3 text-muted-foreground">{{ row.type }}</td>
                <td class="py-3 pr-3">
                  <span class="rounded-md px-2 py-0.5 text-xs font-semibold"
                    :style="{ background: domainStyle(row.domainType).bg, color: domainStyle(row.domainType).fg }">
                    {{ row.domainType }}
                  </span>
                </td>
                <td class="py-3 pr-3">
                  <div class="flex items-center -space-x-1.5">
                    <span v-for="m in row.models" :key="m"
                      class="flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-card"
                      :style="{ background: modelStyle(m).color }" :title="modelStyle(m).label">
                      {{ modelStyle(m).initial }}
                    </span>
                    <span v-if="row.extra"
                      class="flex h-5 items-center justify-center rounded-full bg-secondary px-1.5 text-[10px] font-bold text-muted-foreground ring-2 ring-card">
                      +{{ row.extra }}
                    </span>
                  </div>
                </td>
                <td class="py-3 pr-3 tabular-nums text-foreground">
                  {{ row.retrievals }} <span class="text-muted-foreground">–</span>
                </td>
                <td class="py-3 pr-3 tabular-nums text-foreground">
                  {{ row.citationRate.toFixed(1) }} <span class="text-muted-foreground">–</span>
                </td>
                <td v-if="gapAnalysis" class="py-3 pr-3 text-right tabular-nums font-semibold text-foreground">{{ row.gap }}</td>
              </tr>
              <tr v-if="!loading && !filteredUrls.length">
                <td :colspan="gapAnalysis ? 8 : 7" class="py-10 text-center text-sm text-muted-foreground">
                  No URLs found{{ search ? ' for this search.' : ' yet. Run an LLM ranking audit to start collecting sources.' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- pagination -->
        <div class="mt-4 flex items-center justify-end text-sm text-muted-foreground">
          <span>{{ filteredUrls.length }} items</span>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
