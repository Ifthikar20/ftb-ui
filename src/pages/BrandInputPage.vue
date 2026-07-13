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
import { ChevronRight, Link2, FileText, Trash2, RefreshCw, Loader2, Globe, BookOpen, Package, FileCode, ShieldCheck } from '@lucide/vue'

import { useAppStore } from '@/stores/app'
import { useToast } from '@/composables/useToast'
import rag from '@/api/rag'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const appStore = useAppStore()
const toast = useToast()
const websiteId = computed(() => appStore.activeWebsite?.id || null)

// ── Sources list ────────────────────────────────────────────────────────
const sources = ref([])
const listLoading = ref(false)

async function loadSources() {
  if (!websiteId.value) return
  listLoading.value = true
  try {
    const res = await rag.listSources(websiteId.value)
    sources.value = res.data || []
  } catch {
    toast.error('Failed to load brand sources')
  } finally {
    listLoading.value = false
  }
}

// ── Add source form ────────────────────────────────────────────────────
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
    await rag.addSource(websiteId.value, { ...form.value })
    toast.success(form.value.crawl ? 'Site crawl queued' : 'URL queued for ingest')
    form.value = { url: '', title: '', kind: 'other', crawl: false, page_cap: 12, depth: 1 }
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

async function deleteSource(source) {
  if (!confirm(`Delete "${source.title || source.url}"? This removes it from the RAG index.`)) return
  try {
    await rag.deleteSource(websiteId.value, source.id)
    toast.success('Source deleted')
    await loadSources()
  } catch {
    toast.error('Failed to delete source')
  }
}

// ── Status pill styling ────────────────────────────────────────────────
function statusClass(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'ready' || s === 'indexed' || s === 'success') {
    return 'bg-[color:var(--chart-2)]/15 text-[color:var(--chart-2)]'
  }
  if (s === 'processing' || s === 'pending' || s === 'queued') {
    return 'bg-[color:var(--chart-3)]/15 text-[color:var(--chart-3)]'
  }
  if (s === 'failed' || s === 'error') {
    return 'bg-destructive/15 text-destructive'
  }
  return 'bg-secondary text-muted-foreground'
}

onMounted(async () => {
  if (websiteId.value) await loadSources()
})
watch(websiteId, async (v) => { if (v) await loadSources() })
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

        <!-- Markdown / file upload — placeholder pending backend work -->
        <div class="mt-6 flex items-start gap-3 rounded-lg border border-dashed border-border bg-secondary/40 px-4 py-4">
          <FileText class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div class="flex-1">
            <div class="text-sm font-semibold text-foreground">Markdown &amp; text upload</div>
            <p class="mt-0.5 text-xs text-muted-foreground">
              Coming soon. Backend endpoint <code class="rounded bg-muted px-1 py-0.5">/rag/&lt;website_id&gt;/sources/upload/</code>
              is not yet wired — until then, publish your source content at a URL and add it above.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- ── Ingested sources ── -->
    <div class="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 class="text-lg font-bold text-foreground">Brand sources</h2>
        <p class="text-sm text-muted-foreground">
          {{ sources.length }} source{{ sources.length === 1 ? '' : 's' }} indexed. Deleting removes all chunks from the vector store.
        </p>
      </div>
    </div>

    <Card>
      <CardContent class="pt-6">
        <div v-if="listLoading && !sources.length" class="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 class="size-4 animate-spin" /> Loading sources…
        </div>

        <div v-else-if="!sources.length" class="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No brand sources yet. Add your first URL above to teach the RAG about your brand.
        </div>

        <div v-else class="divide-y divide-border">
          <div
            v-for="s in sources"
            :key="s.id"
            class="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
          >
            <!-- Kind icon -->
            <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
              <Globe v-if="s.kind === 'homepage'" class="size-4" />
              <BookOpen v-else-if="s.kind === 'blog'" class="size-4" />
              <Package v-else-if="s.kind === 'product'" class="size-4" />
              <FileCode v-else-if="s.kind === 'docs'" class="size-4" />
              <ShieldCheck v-else-if="s.kind === 'review'" class="size-4" />
              <Link2 v-else class="size-4" />
            </span>

            <!-- Title + URL -->
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-semibold text-foreground">
                {{ s.title || s.url }}
              </div>
              <div class="mt-0.5 truncate text-xs text-muted-foreground">
                <a
                  :href="s.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="hover:text-foreground hover:underline"
                >{{ s.url }}</a>
              </div>
              <div v-if="s.error_message" class="mt-1 text-xs text-destructive">
                {{ s.error_message }}
              </div>
            </div>

            <!-- Meta pills -->
            <div class="flex items-center gap-2">
              <span class="hidden rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground sm:inline-block">
                {{ s.kind_display || s.kind }}
              </span>
              <span class="text-xs tabular-nums text-muted-foreground" :title="s.chunk_count + ' chunks in index'">
                {{ s.chunk_count || 0 }} chunks
              </span>
              <span
                class="rounded-md px-2 py-0.5 text-xs font-semibold capitalize"
                :class="statusClass(s.status)"
              >{{ s.status_display || s.status }}</span>
              <button
                class="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
                :title="'Delete ' + (s.title || s.url)"
                @click="deleteSource(s)"
              >
                <Trash2 class="size-4" />
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
