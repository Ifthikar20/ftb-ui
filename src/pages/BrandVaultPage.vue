<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import brandVault from '@/api/brandVault'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title, Tooltip, Legend, LineElement, PointElement,
  CategoryScale, LinearScale, Filler,
} from 'chart.js'
import {
  ChevronRight, ChevronDown, Info, MoreHorizontal, Vault,
  Search, Copy, Check, Sparkles,
  ShieldCheck, AlertTriangle, Plus, X, Bell,
} from '@lucide/vue'
import { useAppStore } from '@/stores/app'
import { useToast } from '@/composables/useToast'
import {
  Card, CardHeader, CardContent,
} from '@/components/ui/card'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale, Filler)

const appStore = useAppStore()
const toast = useToast()
const brandLabel = computed(() => appStore.activeWebsite?.name || 'treasury')

function cssVar(name, fallback) {
  if (typeof window === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

/* ── Vaults = named competitor groups ──────────────────────────────── */
const MODELS_COLS = ['Grok', 'ChatGPT', 'Perplexity']

const VAULTS = {
  'budgeting-apps': {
    label: 'Budgeting apps',
    metrics: { visibility: 64.9, sentiment: 58, position: 6.5, sov: 94.7 },
    deltas: { visibility: 64.9, sentiment: 8.2, position: 6.5, sov: 94.7 },
    strongest: 'Perplexity',
    weakest: 'ChatGPT',
    series: {
      D: { labels: ['22 May', '23 May', '24 May', '25 May'], visibility: [69, 66, 67, 64.9], sentiment: [52, 55, 57, 58], position: [8, 7.4, 6.9, 6.5], sov: [88, 90, 93, 94.7] },
      W: { labels: ['W1', 'W2', 'W3', 'W4'], visibility: [48, 55, 61, 64.9], sentiment: [44, 49, 54, 58], position: [11, 9.5, 8, 6.5], sov: [70, 80, 89, 94.7] },
      M: { labels: ['Feb', 'Mar', 'Apr', 'May'], visibility: [30, 44, 55, 64.9], sentiment: [38, 46, 52, 58], position: [16, 12, 9, 6.5], sov: [55, 71, 85, 94.7] },
    },
    matrix: [
      { brand: 'treasury', you: true, Grok: 69.2, ChatGPT: 65.1, Perplexity: 62.8 },
      { brand: 'YNAB', Grok: 7.7, ChatGPT: 6.0, Perplexity: 3.9 },
      { brand: 'Quicken', Grok: 9.4, ChatGPT: 2.3, Perplexity: 1.6 },
      { brand: 'Simplifi', Grok: 8.5, ChatGPT: 0.5, Perplexity: 1.9 },
      { brand: 'Mint', Grok: 3.4, ChatGPT: 2.8, Perplexity: 1.6 },
      { brand: 'PocketGuard', Grok: 1.7, ChatGPT: 1.9, Perplexity: 3.5 },
      { brand: 'Goodbudget', Grok: 1.7, ChatGPT: 2.3, Perplexity: 1.9 },
      { brand: 'Personal Capital', Grok: 0.9, ChatGPT: 0.0, Perplexity: 0.4 },
    ],
    rankings: {
      ChatGPT: ['treasury', 'YNAB', 'Mint', 'Goodbudget', 'Quicken', 'PocketGuard', 'Simplifi', 'Personal Capital'],
      Grok: ['treasury', 'Quicken', 'Simplifi', 'YNAB', 'Mint', 'PocketGuard', 'Goodbudget', 'Personal Capital'],
      Perplexity: ['treasury', 'YNAB', 'PocketGuard', 'Simplifi', 'Mint', 'Goodbudget', 'Personal Capital', 'Quicken'],
    },
    keywords: [
      { keyword: 'AI-powered cash forecasting', hits: 312, page: '/features/forecasting', original: 'We help you predict cash flow.' },
      { keyword: 'real-time liquidity visibility', hits: 268, page: '/product', original: 'See your money in one place.' },
      { keyword: 'automated treasury workflows', hits: 241, page: '/blog/automation', original: 'Save time on manual tasks.' },
      { keyword: 'bank-grade security', hits: 198, page: '/security', original: 'Your data is safe with us.' },
      { keyword: 'multi-entity consolidation', hits: 154, page: '/features/consolidation', original: 'Manage multiple accounts easily.' },
      { keyword: 'SOC 2 Type II compliant', hits: 132, page: '/security', original: 'We follow best practices.' },
    ],
  },
  'treasury-tools': {
    label: 'Treasury tools',
    metrics: { visibility: 51.2, sentiment: 49, position: 9.1, sov: 71.3 },
    deltas: { visibility: 12.4, sentiment: 3.1, position: -1.2, sov: 9.8 },
    strongest: 'ChatGPT',
    weakest: 'Grok',
    series: {
      D: { labels: ['22 May', '23 May', '24 May', '25 May'], visibility: [47, 49, 50, 51.2], sentiment: [45, 47, 48, 49], position: [11, 10.4, 9.7, 9.1], sov: [64, 67, 69, 71.3] },
      W: { labels: ['W1', 'W2', 'W3', 'W4'], visibility: [38, 43, 47, 51.2], sentiment: [40, 43, 46, 49], position: [14, 12.5, 11, 9.1], sov: [52, 60, 66, 71.3] },
      M: { labels: ['Feb', 'Mar', 'Apr', 'May'], visibility: [22, 33, 43, 51.2], sentiment: [33, 40, 45, 49], position: [19, 15, 12, 9.1], sov: [40, 54, 64, 71.3] },
    },
    matrix: [
      { brand: 'treasury', you: true, Grok: 52.1, ChatGPT: 58.4, Perplexity: 49.0 },
      { brand: 'Kyriba', Grok: 18.2, ChatGPT: 21.0, Perplexity: 16.4 },
      { brand: 'HighRadius', Grok: 14.5, ChatGPT: 12.3, Perplexity: 19.9 },
      { brand: 'GTreasury', Grok: 9.1, ChatGPT: 7.5, Perplexity: 8.2 },
      { brand: 'Nomentia', Grok: 6.7, ChatGPT: 5.5, Perplexity: 6.0 },
      { brand: 'TIS', Grok: 3.4, ChatGPT: 4.1, Perplexity: 2.9 },
    ],
    rankings: {
      ChatGPT: ['treasury', 'Kyriba', 'HighRadius', 'GTreasury', 'Nomentia', 'TIS'],
      Grok: ['treasury', 'Kyriba', 'HighRadius', 'GTreasury', 'Nomentia', 'TIS'],
      Perplexity: ['HighRadius', 'treasury', 'Kyriba', 'GTreasury', 'Nomentia', 'TIS'],
    },
    keywords: [
      { keyword: 'enterprise cash management', hits: 204, page: '/enterprise', original: 'For big companies.' },
      { keyword: 'ERP-native integration', hits: 176, page: '/integrations', original: 'Connects to your tools.' },
      { keyword: 'payment fraud prevention', hits: 143, page: '/security/fraud', original: 'Stops bad payments.' },
    ],
  },
}

const activeVaultKey = ref('budgeting-apps')
const vault = computed(() => VAULTS[activeVaultKey.value])

/* ── Top metrics strip ──────────────────────────────────────────────── */
const headlineRank = computed(() => {
  const sorted = [...vault.value.matrix].sort((a, b) =>
    (b.Grok + b.ChatGPT + b.Perplexity) - (a.Grok + a.ChatGPT + a.Perplexity))
  return sorted.findIndex(m => m.you) + 1
})

function fmtDelta(v) {
  return (v >= 0 ? '+' : '') + (Number.isInteger(v) ? v : v.toFixed(1))
}

const metricCards = computed(() => {
  const m = vault.value.metrics
  const d = vault.value.deltas
  return [
    { key: 'visibility', label: 'Visibility', value: m.visibility + '%', delta: fmtDelta(d.visibility) + '%', up: d.visibility >= 0 },
    { key: 'sentiment', label: 'Sentiment', value: String(m.sentiment), delta: fmtDelta(d.sentiment), up: d.sentiment >= 0, dot: true },
    { key: 'position', label: 'Position', value: '#' + m.position, delta: fmtDelta(d.position), up: d.position >= 0 },
    { key: 'sov', label: 'SoV', value: m.sov + '%', delta: fmtDelta(d.sov) + '%', up: d.sov >= 0 },
    { key: 'strongest', label: 'Strongest model', value: vault.value.strongest, plain: true },
    { key: 'weakest', label: 'Weakest model', value: vault.value.weakest, plain: true },
  ]
})

/* ── Insights line chart ────────────────────────────────────────────── */
const METRIC_OPTS = [
  { key: 'visibility', label: 'Visibility', suffix: '%' },
  { key: 'sentiment', label: 'Sentiment', suffix: '' },
  { key: 'position', label: 'Position', suffix: '' },
  { key: 'sov', label: 'SoV', suffix: '%' },
]
const chartMetric = ref('visibility')
const resolution = ref('D')
const activeMetric = computed(() => METRIC_OPTS.find(m => m.key === chartMetric.value))

const chartData = computed(() => {
  const s = vault.value.series[resolution.value]
  const color = cssVar('--chart-1', '#5b8def')
  return {
    labels: s.labels,
    datasets: [{
      label: activeMetric.value.label,
      data: s[chartMetric.value],
      borderColor: color,
      backgroundColor: color,
      pointHoverBackgroundColor: color,
      pointHoverBorderColor: cssVar('--card', '#fff'),
      tension: 0.4,
      cubicInterpolationMode: 'monotone',
      pointRadius: 0,
      pointHoverRadius: 4,
      pointHoverBorderWidth: 2,
      borderWidth: 2,
      fill: false,
    }],
  }
})

const chartOptions = computed(() => {
  const grid = cssVar('--border', 'rgba(0,0,0,0.08)')
  const text = cssVar('--muted-foreground', '#64748b')
  const popover = cssVar('--popover', '#ffffff')
  const popoverFg = cssVar('--popover-foreground', '#0f172a')
  const suffix = activeMetric.value.suffix
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
        callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y}${suffix}` },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: text, font: { size: 12 }, padding: 8 } },
      y: { beginAtZero: true, grid: { color: grid, drawBorder: false }, border: { display: false }, ticks: { color: text, font: { size: 12 }, padding: 8 } },
    },
  }
})

/* ── Performance matrix heatmap ─────────────────────────────────────── */
const HEAT_BUCKETS = [
  { max: 0, label: '0%' },
  { max: 10, label: '1-10%' },
  { max: 20, label: '11-20%' },
  { max: 30, label: '21-30%' },
  { max: 40, label: '31-40%' },
  { max: 50, label: '41-50%' },
  { max: 60, label: '51-60%' },
  { max: 70, label: '61-70%' },
  { max: 80, label: '71-80%' },
  { max: 90, label: '81-90%' },
  { max: 100, label: '91-100%' },
]
function heatOpacity(pct) {
  return pct <= 0 ? 0.04 : 0.10 + (pct / 100) * 0.80
}
function heatStyle(pct) {
  return {
    background: `color-mix(in srgb, var(--chart-1) ${Math.round(heatOpacity(pct) * 100)}%, transparent)`,
    color: pct >= 55 ? '#fff' : 'var(--foreground)',
  }
}

/* ── Top rankings ───────────────────────────────────────────────────── */
const rankCols = [1, 2, 3, 4, 5, 6, 7, 8]

/* ── Keyword bank ───────────────────────────────────────────────────── */
const kwSearch = ref('')
const copiedKey = ref('')
const filteredKeywords = computed(() => {
  const q = kwSearch.value.trim().toLowerCase()
  if (!q) return vault.value.keywords
  return vault.value.keywords.filter(k => k.keyword.toLowerCase().includes(q))
})
function copyKeyword(k) {
  navigator.clipboard?.writeText(k.keyword)
  copiedKey.value = k.keyword
  toast.success('Keyword copied')
  setTimeout(() => { if (copiedKey.value === k.keyword) copiedKey.value = '' }, 1500)
}

/* ── AI Brand Safety ────────────────────────────────────────────────── */
const ISSUE_LABELS = {
  hallucination: 'Hallucination',
  unverified: 'Unverified claim',
  outdated: 'Outdated info',
  harmful: 'Harmful mention',
  negative: 'Negative mention',
}

const safetyMetricsData = ref({
  reputation_health: 100,
  hallucinations: 0,
  harmful_mentions: 0,
  prompts_monitored: 0,
  open_alerts: 0,
})
const safetyAlertsRaw = ref([])
const safetyPrompts = ref([])
const safetyLoading = ref(false)

const safetyAlerts = computed(() => safetyAlertsRaw.value.map(a => ({
  id: a.id,
  severity: a.severity,
  model: a.model,
  prompt: a.prompt_text,
  snippet: a.snippet,
  issue: ISSUE_LABELS[a.issue] || a.issue,
  detail: a.detail || '',
  seenAt: timeAgo(a.detected_at || a.created_at),
})))

const safetyMetrics = computed(() => {
  const m = safetyMetricsData.value
  return [
    {
      key: 'health',
      label: 'Reputation health',
      value: m.reputation_health + '/100',
      tone: m.reputation_health >= 80 ? 'good' : m.reputation_health >= 50 ? 'warn' : 'bad',
      delta: m.open_alerts ? `${m.open_alerts} open` : 'clear',
    },
    {
      key: 'halluc',
      label: 'Hallucinations',
      value: String(m.hallucinations),
      tone: m.hallucinations ? 'warn' : 'good',
      delta: m.hallucinations ? 'review' : 'none',
    },
    {
      key: 'harmful',
      label: 'Harmful mentions',
      value: String(m.harmful_mentions),
      tone: m.harmful_mentions ? 'bad' : 'good',
      delta: m.harmful_mentions ? 'action needed' : 'clear',
    },
    {
      key: 'monitored',
      label: 'Prompts monitored',
      value: String(m.prompts_monitored),
      tone: 'neutral',
      delta: 'across 3 models',
    },
  ]
})

function timeAgo(iso) {
  if (!iso) return ''
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const newPrompt = ref('')
const websiteId = computed(() => appStore.activeWebsite?.id || null)

async function loadSafety() {
  if (!websiteId.value) return
  safetyLoading.value = true
  try {
    const [metrics, prompts, alerts] = await Promise.all([
      brandVault.safetyMetrics(websiteId.value),
      brandVault.safetyPrompts(websiteId.value),
      brandVault.safetyAlerts(websiteId.value, { status: 'open' }),
    ])
    safetyMetricsData.value = metrics.data
    safetyPrompts.value = prompts.data.results || prompts.data || []
    safetyAlertsRaw.value = alerts.data.results || alerts.data || []
  } catch (err) {
    // Keep the panel usable in dev/offline by silently degrading to empty state.
    console.warn('Failed to load brand safety data', err)
  } finally {
    safetyLoading.value = false
  }
}

async function addSafetyPrompt() {
  const text = newPrompt.value.trim()
  if (!text || !websiteId.value) return
  try {
    const { data } = await brandVault.addSafetyPrompt(websiteId.value, text)
    const existing = safetyPrompts.value.find(p => p.id === data.id)
    if (!existing) safetyPrompts.value.unshift(data)
    newPrompt.value = ''
    toast.success('Tracking prompt added')
    safetyMetricsData.value.prompts_monitored += existing ? 0 : 1
  } catch (err) {
    toast.error(err?.response?.data?.detail || 'Could not add prompt')
  }
}

async function removeSafetyPrompt(id) {
  const prev = safetyPrompts.value
  safetyPrompts.value = prev.filter(p => p.id !== id)
  try {
    await brandVault.deleteSafetyPrompt(id)
    safetyMetricsData.value.prompts_monitored = Math.max(
      0, safetyMetricsData.value.prompts_monitored - 1,
    )
  } catch (err) {
    safetyPrompts.value = prev
    toast.error('Could not remove prompt')
  }
}

async function resolveAlert(id, action = 'resolve') {
  const prev = safetyAlertsRaw.value
  safetyAlertsRaw.value = prev.filter(a => a.id !== id)
  try {
    await brandVault.resolveSafetyAlert(id, action)
    safetyMetricsData.value.open_alerts = Math.max(
      0, safetyMetricsData.value.open_alerts - 1,
    )
  } catch (err) {
    safetyAlertsRaw.value = prev
    toast.error('Could not update alert')
  }
}

onMounted(loadSafety)
watch(websiteId, loadSafety)

function severityClass(s) {
  return {
    high:   'bg-[color:var(--destructive)]/15 text-[color:var(--destructive)]',
    medium: 'bg-[color:var(--chart-3)]/15 text-[color:var(--chart-3)]',
    low:    'bg-secondary text-muted-foreground',
  }[s] || 'bg-secondary text-muted-foreground'
}
function safetyToneClass(t) {
  return {
    good:    'text-[color:var(--chart-2)]',
    warn:    'text-[color:var(--chart-3)]',
    bad:     'text-[color:var(--destructive)]',
    neutral: 'text-muted-foreground',
  }[t] || 'text-muted-foreground'
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- ── Header / breadcrumb ── -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2 text-sm text-muted-foreground">
        <span class="font-medium text-foreground">Brand</span>
        <ChevronRight class="size-3.5" />
        <span class="font-semibold text-foreground">Vault</span>
      </div>
      <div class="flex items-center gap-2 text-sm">
        <span class="text-muted-foreground">Trial ends in</span>
        <span class="rounded-md bg-[color:var(--chart-3)]/15 px-2 py-0.5 text-xs font-semibold text-[color:var(--chart-3)]">4 days</span>
      </div>
    </div>

    <!-- ── Filter pills + vault selector ── -->
    <div class="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <button class="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:border-ring">
            <Vault class="size-4 text-[color:var(--chart-1)]" />
            {{ vault.label }}
            <ChevronDown class="size-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="min-w-52">
          <DropdownMenuLabel class="text-xs text-muted-foreground">Competitor vaults</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem v-for="(v, key) in VAULTS" :key="key" @select="activeVaultKey = key">
            <Vault class="size-4" />
            <span>{{ v.label }}</span>
            <Check v-if="key === activeVaultKey" class="ml-auto size-4 text-[color:var(--chart-2)]" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <button v-for="pill in [brandLabel, 'All time', 'All Tags', 'All Models', 'All Topics']" :key="pill"
        class="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-ring">
        <span>{{ pill }}</span>
        <ChevronDown class="size-3.5 text-muted-foreground" />
      </button>
    </div>

    <!-- ── Headline + metrics strip ── -->
    <div>
      <h1 class="text-2xl font-bold -tracking-[0.01em] text-foreground">
        You're #{{ headlineRank }} in AI Visibility
      </h1>
      <p class="mt-1 text-sm text-muted-foreground">
        How <strong class="font-semibold text-foreground">{{ brandLabel }}</strong> stacks up against the
        <strong class="font-semibold text-foreground">{{ vault.label }}</strong> vault across AI answers.
      </p>
    </div>

    <Card>
      <CardContent class="grid grid-cols-2 gap-px overflow-hidden p-0 sm:grid-cols-3 lg:grid-cols-6">
        <div v-for="c in metricCards" :key="c.key"
          class="flex flex-col gap-1 bg-card p-4">
          <span class="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
            {{ c.label }} <Info class="size-3 opacity-60" />
          </span>
          <div v-if="c.plain" class="text-lg font-bold text-foreground">{{ c.value }}</div>
          <div v-else class="flex items-baseline gap-1.5">
            <span class="inline-flex items-center gap-1 text-lg font-bold text-foreground">
              <span v-if="c.dot" class="size-2 rounded-full bg-[color:var(--chart-3)]" />
              {{ c.value }}
            </span>
            <span class="text-xs font-semibold"
              :class="c.up ? 'text-[color:var(--chart-2)]' : 'text-[color:var(--destructive)]'">{{ c.delta }}</span>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- ── Insights line chart ── -->
    <div>
      <h2 class="text-lg font-bold text-foreground">Your brand insights</h2>
      <p class="text-sm text-muted-foreground">How your brand metrics change over time</p>
    </div>

    <Card>
      <CardHeader class="flex-row items-start justify-between gap-3 space-y-0">
        <div class="flex flex-wrap items-center gap-1.5">
          <button v-for="m in METRIC_OPTS" :key="m.key"
            class="rounded-md px-2.5 py-1 text-xs font-semibold transition-colors"
            :class="chartMetric === m.key ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'"
            @click="chartMetric = m.key">{{ m.label }}</button>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex items-center rounded-lg border border-border p-0.5">
            <button v-for="r in ['D', 'W', 'M']" :key="r"
              class="rounded-md px-2.5 py-1 text-xs font-semibold transition-colors"
              :class="resolution === r ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'"
              @click="resolution = r">{{ r }}</button>
          </div>
          <button class="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"><MoreHorizontal class="size-4" /></button>
        </div>
      </CardHeader>
      <CardContent>
        <div class="h-72">
          <Line :data="chartData" :options="chartOptions" />
        </div>
        <div class="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span class="inline-flex items-center gap-1.5">
            <span class="size-2 rounded-full" :style="{ background: 'var(--chart-1)' }" />
            {{ activeMetric.label }}
          </span>
        </div>
      </CardContent>
    </Card>

    <!-- ── Performance matrix ── -->
    <div>
      <h2 class="text-lg font-bold text-foreground">Performance matrix</h2>
      <p class="text-sm text-muted-foreground">Compare visibility across AI models for every brand in the vault</p>
    </div>

    <Card>
      <CardContent class="pt-6">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[600px] border-collapse text-sm">
            <thead>
              <tr class="text-left text-xs font-medium text-muted-foreground">
                <th class="py-2 pr-3">Brands</th>
                <th v-for="col in MODELS_COLS" :key="col" class="py-2 px-1 text-center">{{ col }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in vault.matrix" :key="row.brand">
                <td class="py-1 pr-3 align-middle">
                  <span class="inline-flex items-center gap-1.5 font-medium text-foreground">
                    {{ row.brand }}
                    <span v-if="row.you" class="rounded bg-[color:var(--chart-2)]/15 px-1.5 py-0.5 text-[10px] font-bold text-[color:var(--chart-2)]">You</span>
                  </span>
                </td>
                <td v-for="col in MODELS_COLS" :key="col" class="px-1 py-1">
                  <div class="flex h-9 items-center justify-center rounded-md text-xs font-semibold tabular-nums"
                    :style="heatStyle(row[col])">
                    {{ row[col].toFixed(1) }}%
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- heat legend -->
        <div class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span v-for="b in HEAT_BUCKETS" :key="b.label"
            class="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span class="size-2.5 rounded-full" :style="{ background: `color-mix(in srgb, var(--chart-1) ${Math.round(heatOpacity(b.max) * 100)}%, transparent)` }" />
            {{ b.label }}
          </span>
        </div>
      </CardContent>
    </Card>

    <!-- ── Top rankings ── -->
    <div>
      <h2 class="text-lg font-bold text-foreground">Top rankings</h2>
      <p class="text-sm text-muted-foreground">Leading brands by position per AI model</p>
    </div>

    <Card>
      <CardContent class="pt-6">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr class="text-left text-xs font-medium text-muted-foreground">
                <th class="py-2 pr-3">AI models</th>
                <th v-for="n in rankCols" :key="n" class="py-2 px-1 text-center">#{{ n }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(brands, model) in vault.rankings" :key="model" class="border-t border-border/60">
                <td class="py-2 pr-3 align-middle font-medium text-foreground">{{ model }}</td>
                <td v-for="n in rankCols" :key="n" class="px-1 py-2">
                  <div v-if="brands[n - 1]"
                    class="flex items-center justify-center gap-1 truncate rounded-md px-2 py-1.5 text-center text-xs font-medium"
                    :class="brands[n - 1] === brandLabel
                      ? 'bg-[color:var(--chart-3)]/15 font-semibold text-[color:var(--chart-3)]'
                      : 'bg-secondary text-foreground'"
                    :title="brands[n - 1]">
                    <span class="truncate">{{ brands[n - 1] }}</span>
                    <span v-if="brands[n - 1] === brandLabel" class="text-[10px]">You</span>
                  </div>
                  <div v-else class="flex items-center justify-center py-1.5 text-muted-foreground">—</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>

    <!-- ── Captured keyword bank ── -->
    <div>
      <h2 class="inline-flex items-center gap-2 text-lg font-bold text-foreground">
        <Sparkles class="size-4 text-[color:var(--chart-1)]" /> Keyword bank
      </h2>
      <p class="text-sm text-muted-foreground">
        Phrases we captured for <strong class="font-semibold text-foreground">{{ brandLabel }}</strong> — swap these
        in for the weaker lines currently on your scanned pages to lift AI visibility.
      </p>
    </div>

    <Card>
      <CardContent class="pt-6">
        <div class="relative mb-4 max-w-sm">
          <Search class="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input v-model="kwSearch" placeholder="Search keywords"
            class="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr class="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <th class="py-2 pr-3">Captured keyword</th>
                <th class="py-2 pr-3">Replaces line on</th>
                <th class="py-2 pr-3 text-right">Hits</th>
                <th class="w-10 py-2"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="k in filteredKeywords" :key="k.keyword" class="border-b border-border/60 hover:bg-muted/50">
                <td class="py-3 pr-3">
                  <div class="font-medium text-foreground">{{ k.keyword }}</div>
                  <div class="truncate text-xs text-muted-foreground" :title="k.original">was: "{{ k.original }}"</div>
                </td>
                <td class="py-3 pr-3">
                  <span class="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs text-muted-foreground">{{ k.page }}</span>
                </td>
                <td class="py-3 pr-3 text-right tabular-nums font-semibold text-foreground">{{ k.hits }}</td>
                <td class="py-3 pr-1 text-right">
                  <button class="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    title="Copy keyword" @click="copyKeyword(k)">
                    <Check v-if="copiedKey === k.keyword" class="size-4 text-[color:var(--chart-2)]" />
                    <Copy v-else class="size-4" />
                  </button>
                </td>
              </tr>
              <tr v-if="!filteredKeywords.length">
                <td colspan="4" class="py-8 text-center text-sm text-muted-foreground">No keywords match "{{ kwSearch }}".</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>

    <!-- ── AI Brand Safety ── -->
    <div>
      <h2 class="inline-flex items-center gap-2 text-lg font-bold text-foreground">
        <ShieldCheck class="size-4 text-[color:var(--chart-2)]" /> AI Brand Safety
      </h2>
      <p class="mt-1 max-w-3xl text-sm text-muted-foreground">
        Protect your reputation in an era of AI hallucinations.
        <strong class="font-semibold text-foreground">Bluefish</strong> continuously monitors for risks,
        flags inaccurate or harmful mentions, and equips you with actionable controls to ensure
        accurate and safe brand representation.
      </p>
      <ul class="mt-3 grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-3">
        <li class="inline-flex items-center gap-1.5">
          <Check class="size-3.5 text-[color:var(--chart-2)]" /> Protect reputation across AI channels
        </li>
        <li class="inline-flex items-center gap-1.5">
          <Check class="size-3.5 text-[color:var(--chart-2)]" /> Detect negative mentions & hallucinations
        </li>
        <li class="inline-flex items-center gap-1.5">
          <Check class="size-3.5 text-[color:var(--chart-2)]" /> Track any topic with custom prompts
        </li>
      </ul>
    </div>

    <Card>
      <CardContent class="grid grid-cols-2 gap-px overflow-hidden p-0 sm:grid-cols-4">
        <div v-for="c in safetyMetrics" :key="c.key" class="flex flex-col gap-1 bg-card p-4">
          <span class="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
            {{ c.label }} <Info class="size-3 opacity-60" />
          </span>
          <span class="text-lg font-bold" :class="safetyToneClass(c.tone)">{{ c.value }}</span>
          <span class="text-xs text-muted-foreground">{{ c.delta }}</span>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex-row items-center justify-between gap-3 space-y-0">
        <div class="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
          <AlertTriangle class="size-4 text-[color:var(--chart-3)]" /> Active alerts
        </div>
        <button class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground">
          <Bell class="size-3.5" /> Alert settings
        </button>
      </CardHeader>
      <CardContent>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr class="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <th class="py-2 pr-3">Severity</th>
                <th class="py-2 pr-3">Issue</th>
                <th class="py-2 pr-3">Model · prompt</th>
                <th class="py-2 pr-3">Detected</th>
                <th class="py-2 pr-3">Seen</th>
                <th class="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in safetyAlerts" :key="a.id" class="border-b border-border/60 align-top hover:bg-muted/50">
                <td class="py-3 pr-3">
                  <span class="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    :class="severityClass(a.severity)">{{ a.severity }}</span>
                </td>
                <td class="py-3 pr-3">
                  <div class="font-medium text-foreground">{{ a.issue }}</div>
                  <div class="text-xs text-muted-foreground">{{ a.detail }}</div>
                </td>
                <td class="py-3 pr-3">
                  <div class="font-medium text-foreground">{{ a.model }}</div>
                  <div class="text-xs text-muted-foreground">"{{ a.prompt }}"</div>
                </td>
                <td class="py-3 pr-3 italic text-muted-foreground">"{{ a.snippet }}"</td>
                <td class="py-3 pr-3 whitespace-nowrap text-xs text-muted-foreground">{{ a.seenAt }}</td>
                <td class="py-3 pr-3 whitespace-nowrap text-right">
                  <button
                    class="rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
                    title="Mark resolved"
                    @click="resolveAlert(a.id, 'resolve')"
                  >Resolve</button>
                  <button
                    class="ml-1 rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    title="Dismiss"
                    @click="resolveAlert(a.id, 'dismiss')"
                  >
                    <X class="size-3.5" />
                  </button>
                </td>
              </tr>
              <tr v-if="!safetyAlerts.length && !safetyLoading">
                <td colspan="6" class="py-8 text-center text-sm text-muted-foreground">No open alerts. You're clear.</td>
              </tr>
              <tr v-if="safetyLoading && !safetyAlerts.length">
                <td colspan="6" class="py-8 text-center text-sm text-muted-foreground">Loading alerts...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="space-y-1">
        <div class="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles class="size-4 text-[color:var(--chart-1)]" /> Custom safety prompts
        </div>
        <p class="text-xs text-muted-foreground">
          Add any prompt you want monitored continuously across Grok, ChatGPT, and Perplexity.
        </p>
      </CardHeader>
      <CardContent>
        <form class="mb-4 flex gap-2" @submit.prevent="addSafetyPrompt">
          <input
            v-model="newPrompt"
            placeholder="e.g. Is treasury secure for payroll storage?"
            class="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            :disabled="!newPrompt.trim()"
            class="inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--chart-1)] px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus class="size-3.5" /> Track prompt
          </button>
        </form>

        <ul class="divide-y divide-border/60">
          <li v-for="p in safetyPrompts" :key="p.id" class="flex items-center justify-between gap-3 py-2.5">
            <div class="min-w-0">
              <div class="truncate text-sm font-medium text-foreground" :title="p.text">{{ p.text }}</div>
              <div class="text-xs text-muted-foreground">{{ p.hits }} hit{{ p.hits === 1 ? '' : 's' }} in the last 30 days</div>
            </div>
            <button
              class="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              title="Remove"
              @click="removeSafetyPrompt(p.id)"
            >
              <X class="size-4" />
            </button>
          </li>
          <li v-if="!safetyPrompts.length" class="py-6 text-center text-sm text-muted-foreground">
            No custom prompts yet. Add one above to start monitoring.
          </li>
        </ul>
      </CardContent>
    </Card>
  </div>
</template>
