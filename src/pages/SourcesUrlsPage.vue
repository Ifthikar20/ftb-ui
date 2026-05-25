<script setup>
import { ref, computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title, Tooltip, Legend, LineElement, PointElement,
  CategoryScale, LinearScale, Filler,
} from 'chart.js'
import {
  Bookmark, Search, ChevronLeft, ChevronRight, MoreHorizontal,
  ArrowUpDown, Upload, Settings2, Maximize2, Info, Flag, Check,
  ChevronDown, Users,
} from '@lucide/vue'
import { useAppStore } from '@/stores/app'
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from '@/components/ui/card'

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale, Filler)

const appStore = useAppStore()
const brandLabel = computed(() => appStore.activeWebsite?.name || 'treasury')

function cssVar(name, fallback) {
  if (typeof window === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

/* ── Domain palette for the overview chart ── */
const DOMAIN_SERIES = [
  { key: 'treasury.ri', label: 'treasury.ripple.com', color: '#475569', data: [76, 6, 5, 4] },
  { key: 'highradius', label: 'highradius.com', color: '#8b5cf6', data: [68, 6, 4, 3] },
  { key: 'treasuryvi', label: 'treasuryview.com', color: '#5b8def', data: [51, 5, 6, 5] },
  { key: 'gartner.co', label: 'gartner.com', color: '#ec4899', data: [65, 2, 2, 2] },
  { key: 'nomentia.c', label: 'nomentia.com', color: '#f59e0b', data: [62, 2, 1, 1] },
]
const CHART_LABELS = ['May 22', 'May 23', 'May 24', 'May 25']
const resolution = ref('D')

const chartData = computed(() => ({
  labels: CHART_LABELS,
  datasets: DOMAIN_SERIES.map(d => ({
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

const MOVERS = {
  Top: [
    { title: 'Top 10 Treasury Management Systems for 2026: AI-Powered Intelligence Meets Proven Excellence', retrievals: 91 },
    { title: 'Best Treasury Management Systems Reviews 2026 | Gartner Peer Insights', retrievals: 73 },
    { title: '8 best treasury management solutions', retrievals: 67 },
    { title: 'Best Treasury Management Software for SMBs in 2025: Compare and Choose', retrievals: 65 },
    { title: '12 Best Treasury Management Software for 2026', retrievals: 62 },
    { title: 'Best treasury software solutions — Cygnetise', retrievals: 56 },
    { title: 'The 13 best treasury management software solutions in 2026', retrievals: 52 },
    { title: 'The 5 Best Treasury Management Software Solutions of 2026', retrievals: 47 },
  ],
  New: [
    { title: 'AI Treasury Automation: The 2026 Buyer\'s Guide', retrievals: 34 },
    { title: 'Cash Forecasting Tools Compared — Spring 2026', retrievals: 28 },
    { title: 'How Mid-Market CFOs Pick a TMS', retrievals: 21 },
    { title: 'Real-Time Liquidity Dashboards: A Primer', retrievals: 14 },
  ],
  Trending: [
    { title: 'Best Treasury Management Software for SMBs in 2025: Compare and Choose', retrievals: 65 },
    { title: '12 Best Treasury Management Software for 2026', retrievals: 62 },
    { title: 'AI Treasury Automation: The 2026 Buyer\'s Guide', retrievals: 34 },
    { title: 'Cash Forecasting Tools Compared — Spring 2026', retrievals: 28 },
  ],
  Losing: [
    { title: 'Best treasury software solutions — Cygnetise', retrievals: 56 },
    { title: 'The 13 best treasury management software solutions in 2026', retrievals: 52 },
    { title: 'Legacy ERP Treasury Modules: Still Worth It?', retrievals: 19 },
    { title: 'Spreadsheet Treasury: When to Move On', retrievals: 11 },
  ],
}
const moverRows = computed(() => MOVERS[moverTab.value] || [])
const moverMax = computed(() => Math.max(1, ...moverRows.value.map(r => r.retrievals)))

const URL_TYPES = [
  { type: 'Listicle', pct: 30, color: '#5b8def' },
  { type: 'Other', pct: 15, color: '#94a3b8' },
  { type: 'Article', pct: 14, color: '#22c55e' },
  { type: 'Product Page', pct: 12, color: '#8b5cf6' },
  { type: 'Comparison', pct: 9, color: '#06b6d4' },
  { type: 'Homepage', pct: 5, color: '#f97316' },
  { type: 'How-To Guide', pct: 5, color: '#14b8a6' },
  { type: 'Category Page', pct: 5, color: '#eab308' },
]

/* ── AI models for the mentions column ── */
const MODELS = {
  chatgpt: { label: 'ChatGPT', color: '#10a37f', initial: 'C' },
  perplexity: { label: 'Perplexity', color: '#8b5cf6', initial: 'P' },
  gemini: { label: 'Gemini', color: '#5b8def', initial: 'G' },
  claude: { label: 'Claude', color: '#f97316', initial: 'A' },
  copilot: { label: 'Copilot', color: '#06b6d4', initial: 'M' },
}

const DOMAIN_TYPE_STYLES = {
  Reference: { bg: 'rgba(168,85,247,0.12)', fg: '#a855f7' },
  Corporate: { bg: 'rgba(249,115,22,0.12)', fg: '#f97316' },
  Editorial: { bg: 'rgba(91,141,239,0.12)', fg: '#5b8def' },
  UGC: { bg: 'rgba(34,197,94,0.12)', fg: '#22c55e' },
}

/* ── URLs table ── */
const gapAnalysis = ref(true)
const search = ref('')

const URLS = [
  { title: 'Random Prompt Generator - (Free, No Signup AI Tool)', path: 'theresanaiforthat.com/@alexisrotem/random-prompt-generator', type: 'Other', domainType: 'Reference', models: ['gemini'], retrievals: 6, citationRate: 0.0, gap: 6, bookmarked: false },
  { title: '3 Ways to Curb Your Spending Problem | YNAB', path: 'ynab.com/blog/3-ways-to-curb-a-money-spending-problem', type: 'Other', domainType: 'Corporate', models: ['chatgpt'], retrievals: 3, citationRate: 2.3, gap: 3, bookmarked: true, flagged: true },
  { title: 'Best Budget Apps (2026): YNAB, Monarch, Copilot Compared', path: 'appstested.com/best-budget-apps', type: 'Other', domainType: 'Editorial', models: ['chatgpt', 'perplexity', 'copilot'], extra: 3, retrievals: 2, citationRate: 0.0, gap: 12, bookmarked: true, verified: true },
  { title: 'Best Apps to Save Money in 2026: Cut Your Bills by $300/Mo...', path: 'blog.iambeezy.app/en/best-apps-to-save-money-2026', type: 'Other', domainType: 'UGC', models: ['gemini', 'chatgpt'], retrievals: 2, citationRate: 4.0, gap: 4 },
  { title: 'Fix Your Budget: What to Do When Your Budget Isn\'t Working', path: 'believeinabudget.com/fix-your-budget', type: 'Other', domainType: 'Editorial', models: ['gemini', 'perplexity', 'claude'], extra: 1, retrievals: 1, citationRate: 0.0, gap: 4 },
  { title: 'Go City Chicago Pass: My Top Tips to Save on Attractions!', path: 'lemon8-app.com/heroiisa/7411842242845262342?region=us', type: 'Other', domainType: 'UGC', models: ['gemini', 'perplexity'], extra: 1, retrievals: 1, citationRate: 1.0, gap: 4 },
  { title: 'How To Automate And Streamline Your Cash Flow Processes - ...', path: 'fastercapital.com/topics/how-to-automate-and-streamline-your-c...', type: 'Other', domainType: 'Corporate', models: ['gemini', 'perplexity', 'copilot'], retrievals: 1, citationRate: 0.0, gap: 3 },
  { title: 'Why Mellow Finance Believes Curators Will Shape the Future o...', path: 'binance.com/en/square/post/22298800227666', type: 'Other', domainType: 'Corporate', models: ['gemini'], retrievals: 1, citationRate: 0.0, gap: 1 },
  { title: 'RFP (Idea): Protocol-Owned Liquidity on Uniswap v3 Utilizing ...', path: 'community.radiant.capital/t/rfp-idea-protocol-owned-liquidity-on-...', type: 'Other', domainType: 'Corporate', models: ['gemini'], retrievals: 1, citationRate: 0.0, gap: 1 },
  { title: 'Can Mellow Finance Redefine DeFi Asset Management? A Rev...', path: 'defi-planet.com/2026/04/can-mellow-finance-redefine-defi-asse...', type: 'Other', domainType: 'Editorial', models: ['gemini'], retrievals: 1, citationRate: 0.0, gap: 1 },
  { title: 'How to Fix a Failing Budget', path: 'howtomoney.com/fix-a-failing-budget', type: 'Other', domainType: 'Reference', models: ['chatgpt'], retrievals: 1, citationRate: 0.0, gap: 1 },
  { title: '5 Apps For Money Management', path: 'hydratewithcore.com/blog/5-apps-for-money-management', type: 'Other', domainType: 'Corporate', models: ['gemini'], retrievals: 1, citationRate: 0.0, gap: 1 },
  { title: 'This article compares the four LP automation management pro...', path: 'odaily.news/en/post/5181696', type: 'Other', domainType: 'Editorial', models: ['gemini'], retrievals: 1, citationRate: 0.0, gap: 1 },
  { title: 'Uniswap V3: Economic Powerhouse of Modern AMMs | Rango ...', path: 'rango.exchange/learn/market-trends/uniswap-v3-technical-review', type: 'Other', domainType: 'Corporate', models: ['gemini'], retrievals: 1, citationRate: 0.0, gap: 1 },
]

const filteredUrls = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return URLS
  return URLS.filter(u =>
    u.title.toLowerCase().includes(q) || u.path.toLowerCase().includes(q))
})

function toggleBookmark(row) {
  row.bookmarked = !row.bookmarked
}

function faviconFor(path) {
  const domain = path.split('/')[0]
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
}
function onFaviconError(e) {
  e.target.style.visibility = 'hidden'
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- ── Header / breadcrumb row ── -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2 text-sm text-muted-foreground">
        <span class="font-medium text-foreground">Sources</span>
        <ChevronRight class="size-3.5" />
        <span class="font-semibold text-foreground">URLs</span>
      </div>
      <div class="flex items-center gap-2 text-sm">
        <span class="text-muted-foreground">Trial ends in</span>
        <span class="rounded-md bg-[color:var(--chart-3)]/15 px-2 py-0.5 text-xs font-semibold text-[color:var(--chart-3)]">4 days</span>
      </div>
    </div>

    <!-- ── Global filter pills ── -->
    <div class="flex flex-wrap items-center gap-2">
      <button v-for="pill in [brandLabel, 'All time', 'All Tags', 'All Models', 'All Topics']" :key="pill"
        class="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-ring">
        <span>{{ pill }}</span>
        <ChevronDown class="size-3.5 text-muted-foreground" />
      </button>
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
          <span v-for="d in DOMAIN_SERIES" :key="d.key"
            class="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span class="size-2 rounded-full" :style="{ background: d.color }" />
            {{ d.key }}...
          </span>
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
            <span class="relative z-10 truncate text-sm text-foreground" :title="row.title">{{ row.title }}</span>
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
          <span class="text-xs text-muted-foreground">Total retrievals: 10.7k</span>
        </CardHeader>
        <CardContent class="space-y-3">
          <div v-for="t in URL_TYPES" :key="t.type"
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
    <div class="flex items-end justify-between">
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
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <th class="w-8 py-2"></th>
                <th class="py-2 pr-3">URL</th>
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
                    :style="{ background: DOMAIN_TYPE_STYLES[row.domainType].bg, color: DOMAIN_TYPE_STYLES[row.domainType].fg }">
                    {{ row.domainType }}
                  </span>
                </td>
                <td class="py-3 pr-3">
                  <div class="flex items-center -space-x-1.5">
                    <span v-for="m in row.models" :key="m"
                      class="flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-card"
                      :style="{ background: MODELS[m].color }" :title="MODELS[m].label">
                      {{ MODELS[m].initial }}
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
            </tbody>
          </table>
        </div>

        <!-- pagination -->
        <div class="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <div class="flex items-center gap-1">
            <button class="rounded-md border border-border p-1 hover:bg-secondary"><ChevronLeft class="size-4" /></button>
            <button class="rounded-md bg-secondary px-2.5 py-1 font-semibold text-foreground">1</button>
            <button class="rounded-md px-2.5 py-1 hover:bg-secondary">2</button>
            <button class="rounded-md border border-border p-1 hover:bg-secondary"><ChevronRight class="size-4" /></button>
          </div>
          <span>15 items</span>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
