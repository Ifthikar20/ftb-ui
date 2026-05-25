<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale,
} from 'chart.js'
import {
  ChevronRight, MoreHorizontal, Info, Search, Upload, Loader2, ExternalLink,
} from '@lucide/vue'
import citationsApi from '@/api/citations'
import {
  Card, CardHeader, CardTitle, CardContent,
} from '@/components/ui/card'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const route = useRoute()
const router = useRouter()
const websiteId = computed(() => route.params.websiteId)
const targetUrl = computed(() => route.query.url || '')

const loading = ref(true)
const error = ref('')
const detail = ref(null)
const promptSearch = ref('')

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

function cssVar(name, fallback) {
  if (typeof window === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

const metrics = computed(() => detail.value?.metrics || {})
const title = computed(() => metrics.value.title || 'URL')

function fmtDelta(d) {
  if (d == null) return ''
  if (d > 0) return `+${d}`
  return String(d)
}
function deltaClass(d) {
  if (d == null || d === 0) return 'text-muted-foreground'
  return d > 0 ? 'text-[color:var(--chart-2)]' : 'text-destructive'
}

/* ── Retrievals over time (current vs previous) ── */
const overTimeData = computed(() => {
  const rot = detail.value?.retrievals_over_time || { labels: [], current: [], previous: [] }
  return {
    labels: rot.labels,
    datasets: [
      { label: 'Current Period', data: rot.current, backgroundColor: '#5b8def', borderRadius: 4 },
      { label: 'Previous Period', data: rot.previous, backgroundColor: '#f9a8d4', borderRadius: 4 },
    ],
  }
})

/* ── Retrievals by model ── */
const byModelData = computed(() => {
  const rows = detail.value?.retrievals_by_model || []
  return {
    labels: rows.map(r => modelStyle(r.model).label),
    datasets: [
      { label: 'Current Period', data: rows.map(r => r.current), backgroundColor: rows.map(r => modelStyle(r.model).color), borderRadius: 4 },
      { label: 'Previous Period', data: rows.map(r => r.previous), backgroundColor: '#f9a8d4', borderRadius: 4 },
    ],
  }
})

const barOptions = computed(() => {
  const grid = cssVar('--border', 'rgba(0,0,0,0.08)')
  const text = cssVar('--muted-foreground', '#64748b')
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: text, font: { size: 12 } } },
      y: { beginAtZero: true, grid: { color: grid }, border: { display: false }, ticks: { color: text, font: { size: 12 }, precision: 0 } },
    },
  }
})

const filteredPrompts = computed(() => {
  const rows = detail.value?.prompts || []
  const q = promptSearch.value.trim().toLowerCase()
  if (!q) return rows
  return rows.filter(r => (r.prompt || '').toLowerCase().includes(q))
})

async function load() {
  if (!websiteId.value || !targetUrl.value) {
    error.value = 'No URL specified.'
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  try {
    const res = await citationsApi.websiteUrlDetail(websiteId.value, targetUrl.value)
    detail.value = res.data?.data || res.data || null
  } catch (e) {
    error.value = e?.displayMessage || 'Failed to load URL details.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => [websiteId.value, targetUrl.value], load)

function backToList() {
  router.push({ name: 'sources-urls', params: { websiteId: websiteId.value } })
}
function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- breadcrumb -->
    <div class="flex items-center gap-2 text-sm text-muted-foreground">
      <span class="font-medium text-foreground">Sources</span>
      <ChevronRight class="size-3.5" />
      <button class="hover:text-foreground" @click="backToList">URLs</button>
      <ChevronRight class="size-3.5" />
      <span class="max-w-[420px] truncate font-semibold text-foreground" :title="title">{{ title }}</span>
    </div>

    <div v-if="error" class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ error }}</div>
    <div v-if="loading" class="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 class="size-4 animate-spin" /> Loading URL details…
    </div>

    <template v-if="detail">
      <!-- url + open link -->
      <a v-if="metrics.url" :href="metrics.url" target="_blank" rel="noopener"
        class="inline-flex items-center gap-1.5 text-sm text-[color:var(--chart-1)] hover:underline">
        <ExternalLink class="size-3.5" /> <span class="truncate max-w-[600px]">{{ metrics.url }}</span>
      </a>

      <!-- metrics bar -->
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <Card><CardContent class="pt-5">
          <div class="flex items-center gap-1 text-xs text-muted-foreground">URL type <Info class="size-3" /></div>
          <div class="mt-1 text-sm font-semibold text-foreground">{{ metrics.url_type }}</div>
        </CardContent></Card>
        <Card><CardContent class="pt-5">
          <div class="flex items-center gap-1 text-xs text-muted-foreground">Domain type <Info class="size-3" /></div>
          <span class="mt-1 inline-block rounded-md px-2 py-0.5 text-xs font-semibold"
            :style="{ background: domainStyle(metrics.domain_type).bg, color: domainStyle(metrics.domain_type).fg }">{{ metrics.domain_type }}</span>
        </CardContent></Card>
        <Card><CardContent class="pt-5">
          <div class="flex items-center gap-1 text-xs text-muted-foreground">Retrievals <Info class="size-3" /></div>
          <div class="mt-1 text-sm font-semibold text-foreground">
            {{ metrics.retrievals?.value }}
            <span class="text-xs font-medium" :class="deltaClass(metrics.retrievals?.delta)">{{ fmtDelta(metrics.retrievals?.delta) }}</span>
          </div>
        </CardContent></Card>
        <Card><CardContent class="pt-5">
          <div class="flex items-center gap-1 text-xs text-muted-foreground">Citation rate <Info class="size-3" /></div>
          <div class="mt-1 text-sm font-semibold text-foreground">
            {{ (metrics.citation_rate?.value ?? 0).toFixed(1) }}
            <span class="text-xs font-medium" :class="deltaClass(metrics.citation_rate?.delta)">{{ fmtDelta(metrics.citation_rate?.delta) }}</span>
          </div>
        </CardContent></Card>
        <Card><CardContent class="pt-5">
          <div class="flex items-center gap-1 text-xs text-muted-foreground">No. of prompts <Info class="size-3" /></div>
          <div class="mt-1 text-sm font-semibold text-foreground">
            {{ metrics.prompts?.value }}
            <span class="text-xs font-medium" :class="deltaClass(metrics.prompts?.delta)">{{ fmtDelta(metrics.prompts?.delta) }}</span>
          </div>
        </CardContent></Card>
        <Card><CardContent class="pt-5">
          <div class="flex items-center gap-1 text-xs text-muted-foreground">First Seen <Info class="size-3" /></div>
          <div class="mt-1 text-sm font-semibold text-foreground">{{ fmtTime(metrics.first_seen) }}</div>
        </CardContent></Card>
        <Card><CardContent class="pt-5">
          <div class="flex items-center gap-1 text-xs text-muted-foreground">Last Seen <Info class="size-3" /></div>
          <div class="mt-1 text-sm font-semibold text-foreground">{{ fmtTime(metrics.last_seen) }}</div>
        </CardContent></Card>
      </div>

      <!-- charts -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader class="space-y-0">
            <CardTitle class="text-base">Retrievals</CardTitle>
            <p class="text-sm text-muted-foreground">No. of times AI uses this URL as a source</p>
          </CardHeader>
          <CardContent>
            <div class="h-56"><Bar :data="overTimeData" :options="barOptions" /></div>
            <div class="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-full bg-[#5b8def]" /> Current Period</span>
              <span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-full bg-[#f9a8d4]" /> Previous Period</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader class="space-y-0">
            <CardTitle class="text-base">Retrievals by model</CardTitle>
            <p class="text-sm text-muted-foreground">No. of times this URL is retrieved in chats</p>
          </CardHeader>
          <CardContent>
            <div class="h-56"><Bar :data="byModelData" :options="barOptions" /></div>
          </CardContent>
        </Card>
      </div>

      <!-- prompts -->
      <Card>
        <CardHeader class="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle class="text-base">Prompts</CardTitle>
            <p class="text-sm text-muted-foreground">No. of times this URL was retrieved per prompt</p>
          </div>
          <div class="relative">
            <Search class="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input v-model="promptSearch" placeholder="Search"
              class="h-9 w-48 rounded-lg border border-border bg-background pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
        </CardHeader>
        <CardContent>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr class="border-b border-border text-left text-xs font-medium text-muted-foreground">
                  <th class="w-[55%] py-2 pr-3">Prompts</th>
                  <th class="py-2 pr-3">Topic</th>
                  <th class="py-2 pr-3 text-right">Retrieved</th>
                  <th class="py-2 pr-3 text-right">Citation rate</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, i) in filteredPrompts" :key="i" class="border-b border-border/60">
                  <td class="py-3 pr-3 text-foreground">{{ p.prompt }}</td>
                  <td class="py-3 pr-3"><span class="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{{ p.topic }}</span></td>
                  <td class="py-3 pr-3 text-right tabular-nums text-foreground">{{ p.retrieved }}</td>
                  <td class="py-3 pr-3 text-right tabular-nums text-foreground">{{ (p.citation_rate ?? 0).toFixed(1) }}</td>
                </tr>
                <tr v-if="!filteredPrompts.length"><td colspan="4" class="py-6 text-center text-sm text-muted-foreground">No prompts.</td></tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <!-- brands mentioned -->
      <Card>
        <CardHeader class="space-y-0">
          <CardTitle class="text-base">Brands mentioned in {{ title }}</CardTitle>
          <p class="text-sm text-muted-foreground">Frequency and position of brand appearances in this URL</p>
        </CardHeader>
        <CardContent>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr class="border-b border-border text-left text-xs font-medium text-muted-foreground">
                  <th class="py-2 pr-3">Brand</th>
                  <th class="py-2 pr-3 text-right">Position</th>
                  <th class="py-2 pr-3 text-right">Frequency</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(b, i) in detail.brands_mentioned" :key="i" class="border-b border-border/60">
                  <td class="py-3 pr-3 font-medium text-foreground">{{ b.brand }}</td>
                  <td class="py-3 pr-3 text-right tabular-nums text-foreground">{{ b.position ?? '—' }}</td>
                  <td class="py-3 pr-3 text-right tabular-nums text-foreground">{{ b.frequency }}</td>
                </tr>
                <tr v-if="!detail.brands_mentioned.length"><td colspan="3" class="py-6 text-center text-sm text-muted-foreground">No brands detected.</td></tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <!-- chats -->
      <Card>
        <CardHeader class="space-y-0">
          <CardTitle class="text-base">Chats</CardTitle>
          <p class="text-sm text-muted-foreground">Recent chats using this URL</p>
        </CardHeader>
        <CardContent>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr class="border-b border-border text-left text-xs font-medium text-muted-foreground">
                  <th class="w-[45%] py-2 pr-3">Chat</th>
                  <th class="py-2 pr-3">Brand mentioned</th>
                  <th class="py-2 pr-3">Mentions</th>
                  <th class="py-2 pr-3">Sources</th>
                  <th class="py-2 pr-3 text-right">Position</th>
                  <th class="py-2 pr-3 text-right">Created</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in detail.chats" :key="c.result_id" class="border-b border-border/60">
                  <td class="py-3 pr-3">
                    <div class="font-medium text-foreground line-clamp-1">{{ c.prompt }}</div>
                    <div class="text-xs text-muted-foreground line-clamp-1">{{ c.response_preview }}</div>
                  </td>
                  <td class="py-3 pr-3">
                    <span :class="c.brand_mentioned ? 'text-[color:var(--chart-2)]' : 'text-destructive'" class="text-xs font-semibold">
                      {{ c.brand_mentioned ? 'Yes' : 'No' }}
                    </span>
                  </td>
                  <td class="py-3 pr-3">
                    <div class="flex items-center -space-x-1.5">
                      <span v-for="m in c.models" :key="m"
                        class="flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-card"
                        :style="{ background: modelStyle(m).color }" :title="modelStyle(m).label">{{ modelStyle(m).initial }}</span>
                    </div>
                  </td>
                  <td class="py-3 pr-3 text-xs text-muted-foreground">
                    <span class="truncate">{{ (c.sources || []).slice(0, 2).join(', ') || '—' }}</span>
                    <span v-if="(c.sources || []).length > 2"> +{{ c.sources.length - 2 }}</span>
                  </td>
                  <td class="py-3 pr-3 text-right tabular-nums text-foreground">{{ c.position ?? '—' }}</td>
                  <td class="py-3 pr-3 text-right text-xs text-muted-foreground">{{ fmtTime(c.created_at) }}</td>
                </tr>
                <tr v-if="!detail.chats.length"><td colspan="6" class="py-6 text-center text-sm text-muted-foreground">No chats yet.</td></tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
