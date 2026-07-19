<script setup>
/**
 * Brand Input page.
 *
 * Sibling of BrandSecurityPage. Where the security page shows alerts
 * caught by the monitoring agents, this page teaches the RAG model
 * what the brand actually says about itself. URLs, MD files, or
 * plain-text notes registered here become chunks in the vector store
 * and are the source of truth every Brand Security agent checks LLM
 * answers against.
 */
import { ref, computed, watch, onMounted } from 'vue'
import {
  ChevronRight, Link2, FileText, Loader2, RefreshCw,
  Globe, BookOpen, Package, FileCode, ShieldCheck,
} from '@lucide/vue'

import { useAppStore } from '@/stores/app'
import { useToast } from '@/composables/useToast'
import ragApi from '@/api/rag'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

import FilterBar from '@/components/brand_input/FilterBar.vue'
import SourceGroup from '@/components/brand_input/SourceGroup.vue'
import SourceDetailDrawer from '@/components/brand_input/SourceDetailDrawer.vue'

const appStore = useAppStore()
const toast = useToast()
const websiteId = computed(() => appStore.activeWebsite?.id || null)

// ── Sources list (paginated + filtered server-side) ────────────────────
const sources = ref([])
const stats = ref({ total: 0, ready: 0, ingesting: 0, pending: 0, failed: 0 })
const pageMeta = ref({ count: 0, next: null, previous: null })
const listLoading = ref(false)

const filters = ref({
  status: '',
  kind: '',
  domain: '',
  search: '',
})
const page = ref(1)
const pageSize = 25

// Debounce search input so we don't fire a request per keystroke.
let searchTimer = null
watch(() => filters.value.search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    loadSources()
  }, 250)
})
watch([
  () => filters.value.status,
  () => filters.value.kind,
  () => filters.value.domain,
], () => { page.value = 1; loadSources() })
watch(page, () => loadSources())

async function loadSources() {
  if (!websiteId.value) return
  listLoading.value = true
  try {
    const params = { page: page.value, page_size: pageSize }
    if (filters.value.status) params.status = filters.value.status
    if (filters.value.kind) params.kind = filters.value.kind
    if (filters.value.domain) params.domain = filters.value.domain
    if (filters.value.search) params.search = filters.value.search

    const res = await ragApi.listSources(websiteId.value, params)
    sources.value = res.data || []
    const meta = res.meta || {}
    pageMeta.value = {
      count: meta.count || 0,
      next: meta.next,
      previous: meta.previous,
    }
    if (meta.stats) stats.value = meta.stats
  } catch {
    toast.error('Failed to load brand sources')
  } finally {
    listLoading.value = false
  }
}

function clearFilters() {
  filters.value = { status: '', kind: '', domain: '', search: '' }
  page.value = 1
  loadSources()
}

// Domain grouping (derived from the current page). This is a pure UI
// transform — the backend returns a flat paginated list; we group by
// `domain` client-side so a 50-page crawl collapses into one node.
const groupedSources = computed(() => {
  const map = new Map()
  for (const s of sources.value) {
    const host = s.domain || 'other'
    if (!map.has(host)) {
      map.set(host, { host, sources: [], chunks: 0, ready: 0, pending: 0, ingesting: 0, failed: 0 })
    }
    const g = map.get(host)
    g.sources.push(s)
    g.chunks += s.chunk_count || 0
    if (s.status && Object.prototype.hasOwnProperty.call(g, s.status)) {
      g[s.status] += 1
    }
  }
  return [...map.values()].sort((a, b) => b.sources.length - a.sources.length)
})

// Domains that exist across the current page, so the FilterBar's domain
// dropdown reflects reality. When pagination is on this is only the
// current page's domains — good enough as a discoverability aid.
const domainOptions = computed(() => groupedSources.value.map((g) => g.host))

const totalPages = computed(() => Math.max(1, Math.ceil(pageMeta.value.count / pageSize)))

// ── Detail drawer ─────────────────────────────────────────────────────
const selectedSource = ref(null)
function openDetail(source) { selectedSource.value = source }
function closeDetail() { selectedSource.value = null }

async function reingestSource(source) {
  try {
    await ragApi.reingestSource(websiteId.value, source.id)
    toast.success('Reingest queued')
    await loadSources()
  } catch (err) {
    const msg = err?.response?.data?.error
      || err?.response?.data?.error?.message
      || 'Failed to queue reingest'
    toast.error(msg)
  }
}

async function deleteSource(source) {
  if (!confirm(`Delete "${source.title || source.url}"? This removes it from the RAG index.`)) return
  try {
    await ragApi.deleteSource(websiteId.value, source.id)
    toast.success('Source deleted')
    await loadSources()
  } catch {
    toast.error('Failed to delete source')
  }
}

// ── Add-URL form ───────────────────────────────────────────────────────
const KIND_OPTIONS = [
  { value: 'homepage', label: 'Homepage', icon: Globe },
  { value: 'blog',     label: 'Blog post', icon: BookOpen },
  { value: 'product',  label: 'Product',   icon: Package },
  { value: 'docs',     label: 'Docs',      icon: FileCode },
  { value: 'review',   label: 'Review',    icon: ShieldCheck },
  { value: 'other',    label: 'Other',     icon: Link2 },
]

const form = ref({
  url: '',
  title: '',
  kind: 'other',
  crawl: false,
  page_cap: 12,
  depth: 1,
})
const submitting = ref(false)

async function submitSource() {
  if (!websiteId.value || !form.value.url) return
  submitting.value = true
  try {
    await ragApi.addSource(websiteId.value, { ...form.value })
    toast.success(form.value.crawl ? 'Site crawl queued' : 'URL queued for ingest')
    form.value = { url: '', title: '', kind: 'other', crawl: false, page_cap: 12, depth: 1 }
    page.value = 1
    await loadSources()
  } catch (err) {
    const msg = err?.response?.data?.error
      || err?.response?.data?.url?.[0]
      || 'Failed to queue source'
    toast.error(msg)
  } finally {
    submitting.value = false
  }
}

// ── Paste-text form ───────────────────────────────────────────────────
const pasteForm = ref({
  title: '',
  kind: 'other',
  text: '',
})
const pasteSubmitting = ref(false)

async function submitPaste() {
  if (!websiteId.value || pasteForm.value.text.trim().length < 20 || !pasteForm.value.title.trim()) return
  pasteSubmitting.value = true
  try {
    await ragApi.uploadText(websiteId.value, { ...pasteForm.value })
    toast.success('Text added to knowledge base')
    pasteForm.value = { title: '', kind: 'other', text: '' }
    page.value = 1
    await loadSources()
  } catch (err) {
    const msg = err?.response?.data?.error
      || err?.response?.data?.text?.[0]
      || err?.response?.data?.title?.[0]
      || 'Failed to save text'
    toast.error(msg)
  } finally {
    pasteSubmitting.value = false
  }
}

onMounted(async () => {
  if (websiteId.value) await loadSources()
})
watch(websiteId, async (v) => { if (v) { page.value = 1; await loadSources() } })
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- ── Header / breadcrumb ── -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2 text-sm text-muted-foreground">
        <span class="font-medium text-foreground">LLM Dashboard</span>
        <ChevronRight class="size-3.5" />
        <span class="font-semibold text-foreground">Brand Input</span>
      </div>
      <Button variant="ghost" @click="loadSources">
        <RefreshCw class="size-3.5" :class="{ 'animate-spin': listLoading }" />
        Refresh
      </Button>
    </div>

    <!-- ── Tab strip: siblings of the same feature ── -->
    <div class="flex items-center gap-1 border-b border-border">
      <router-link
        :to="`/llm-ranking/${websiteId}/brand-security`"
        class="border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >Alerts</router-link>
      <router-link
        :to="`/llm-ranking/${websiteId}/brand-input`"
        class="border-b-2 border-foreground px-3 py-2 text-sm font-semibold text-foreground"
      >Brand Input</router-link>
    </div>

    <!-- ── Intro ── -->
    <div>
      <h2 class="text-lg font-bold text-foreground">Teach the RAG what your brand knows about itself</h2>
      <p class="text-sm text-muted-foreground">
        Add URLs, docs, and knowledge pages here. Every source you add is chunked, embedded, and
        stored — the Brand Security agents then compare LLM answers against these chunks to catch
        hallucinations and misalignments before your customers see them.
      </p>
    </div>

    <!-- ── Add source ── -->
    <div>
      <h2 class="text-lg font-bold text-foreground">Add a source</h2>
      <p class="text-sm text-muted-foreground">One URL, or a full-site crawl (up to 50 pages).</p>
    </div>

    <Card>
      <CardContent class="pt-6">
        <form class="flex flex-col gap-4" @submit.prevent="submitSource">
          <!-- URL input -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">URL</label>
            <div class="relative">
              <Link2 class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                v-model="form.url"
                type="url"
                required
                placeholder="https://www.your-brand.com/about"
                class="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <!-- Title (optional) + Kind row -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_220px]">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title (optional)</label>
              <input
                v-model="form.title"
                type="text"
                placeholder="Auto-detected from page if blank"
                class="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kind</label>
              <select
                v-model="form.kind"
                class="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option v-for="k in KIND_OPTIONS" :key="k.value" :value="k.value">{{ k.label }}</option>
              </select>
            </div>
          </div>

          <!-- Crawl mode toggle -->
          <div class="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <button
              type="button"
              role="switch"
              :aria-checked="form.crawl"
              class="mt-0.5 relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors"
              :class="form.crawl ? 'bg-[color:var(--chart-2)]' : 'bg-input'"
              @click="form.crawl = !form.crawl"
            >
              <span
                class="inline-block size-4 transform rounded-full bg-white transition-transform"
                :class="form.crawl ? 'translate-x-4' : 'translate-x-0.5'"
              />
            </button>
            <div class="flex-1">
              <div class="text-sm font-semibold text-foreground">Crawl the whole site</div>
              <p class="mt-0.5 text-xs text-muted-foreground">
                Follows links from the URL up to the configured depth. Costs 5× the rate limit of a single URL.
              </p>
              <div v-if="form.crawl" class="mt-3 grid grid-cols-2 gap-3">
                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Page cap</label>
                  <input
                    v-model.number="form.page_cap"
                    type="number" min="1" max="50"
                    class="h-9 rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Depth</label>
                  <input
                    v-model.number="form.depth"
                    type="number" min="0" max="2"
                    class="h-9 rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2">
            <Button type="submit" :disabled="submitting || !form.url">
              <Loader2 v-if="submitting" class="size-3.5 animate-spin" />
              {{ form.crawl ? 'Queue crawl' : 'Add URL' }}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>

    <!-- ── Paste text / markdown ── -->
    <div>
      <h2 class="text-lg font-bold text-foreground">Or paste your brand material</h2>
      <p class="text-sm text-muted-foreground">
        Brand deck copy, FAQ answers, tone-of-voice notes, product one-pagers — anything that describes
        how your brand should be represented. Text or markdown, no URL required.
      </p>
    </div>

    <Card>
      <CardContent class="pt-6">
        <form class="flex flex-col gap-4" @submit.prevent="submitPaste">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_220px]">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</label>
              <div class="relative">
                <FileText class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  v-model="pasteForm.title"
                  type="text"
                  required
                  placeholder="e.g. Brand voice notes, Refund policy, About us copy"
                  class="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kind</label>
              <select
                v-model="pasteForm.kind"
                class="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option v-for="k in KIND_OPTIONS" :key="k.value" :value="k.value">{{ k.label }}</option>
              </select>
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Text or markdown
              <span class="ml-1 font-normal text-muted-foreground/70">({{ pasteForm.text.length }} chars, min 20)</span>
            </label>
            <textarea
              v-model="pasteForm.text"
              rows="10"
              required
              minlength="20"
              maxlength="200000"
              placeholder="Paste your brand copy here. Section headings (# Heading or === HEADING ===) improve chunking."
              class="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div class="flex items-center justify-end gap-2">
            <Button
              type="submit"
              :disabled="pasteSubmitting || pasteForm.text.trim().length < 20 || !pasteForm.title.trim()"
            >
              <Loader2 v-if="pasteSubmitting" class="size-3.5 animate-spin" />
              Add to knowledge base
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>

    <!-- ── Ingested sources ── -->
    <div class="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 class="text-lg font-bold text-foreground">Brand sources</h2>
        <p class="text-sm text-muted-foreground">
          {{ stats.total }} source{{ stats.total === 1 ? '' : 's' }} indexed across
          {{ domainOptions.length }} domain{{ domainOptions.length === 1 ? '' : 's' }} on this page.
          Click a row to inspect chunks or test a query against just that source.
        </p>
      </div>
    </div>

    <Card>
      <CardContent class="pt-6">
        <FilterBar
          v-model:status="filters.status"
          v-model:kind="filters.kind"
          v-model:search="filters.search"
          v-model:domain="filters.domain"
          :stats="stats"
          :domain-options="domainOptions"
          @clear="clearFilters"
        />

        <div class="mt-4">
          <div v-if="listLoading && !sources.length" class="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 class="size-4 animate-spin" /> Loading sources…
          </div>

          <div v-else-if="!sources.length" class="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            <template v-if="stats.total === 0">
              No brand sources yet. Add your first URL above to teach the RAG about your brand.
            </template>
            <template v-else>
              No sources match this filter. Try clearing filters, or search another term.
            </template>
          </div>

          <div v-else class="flex flex-col gap-3">
            <SourceGroup
              v-for="group in groupedSources"
              :key="group.host"
              :group="group"
              @select="openDetail"
              @reingest="reingestSource"
              @delete="deleteSource"
            />
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="pageMeta.count > pageSize" class="mt-4 flex items-center justify-between border-t border-border pt-4">
          <p class="text-xs text-muted-foreground">
            Page {{ page }} of {{ totalPages }} · {{ pageMeta.count }} total
          </p>
          <div class="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              :disabled="!pageMeta.previous || listLoading"
              @click="page = Math.max(1, page - 1)"
            >Previous</Button>
            <Button
              variant="ghost"
              size="sm"
              :disabled="!pageMeta.next || listLoading"
              @click="page = Math.min(totalPages, page + 1)"
            >Next</Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Detail drawer -->
    <SourceDetailDrawer
      v-if="selectedSource"
      :website-id="websiteId"
      :source="selectedSource"
      @close="closeDetail"
      @reingested="loadSources"
      @deleted="loadSources"
    />
  </div>
</template>
