<script setup>
import { ref, computed, watch } from 'vue'
import { X, ExternalLink, ArrowLeft, ArrowRight, Loader2, Minus } from '@lucide/vue'
import citationsApi from '@/api/citations'
import BrandLogo from '@/components/BrandLogo.vue'

const props = defineProps({
  websiteId: { type: String, required: true },
  resultId: { type: String, default: '' },
  open: { type: Boolean, default: false },
  hasPrev: { type: Boolean, default: false },
  hasNext: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'prev', 'next'])

const MODELS = {
  chatgpt: { label: 'ChatGPT', abbr: 'GP', color: '#10a37f' },
  perplexity: { label: 'Perplexity', abbr: 'Px', color: '#8b5cf6' },
  gemini: { label: 'Gemini', abbr: 'Ge', color: '#5b8def' },
  claude: { label: 'Claude', abbr: 'Cl', color: '#f97316' },
  copilot: { label: 'Copilot', abbr: 'Co', color: '#06b6d4' },
  grok: { label: 'Grok', abbr: 'Gk', color: '#0f172a' },
  deepseek: { label: 'DeepSeek', abbr: 'Ds', color: '#2563eb' },
  mistral: { label: 'Mistral', abbr: 'Mi', color: '#ef4444' },
  cohere: { label: 'Cohere', abbr: 'Ch', color: '#d946ef' },
  llama: { label: 'Llama', abbr: 'La', color: '#0ea5e9' },
  nova: { label: 'Nova', abbr: 'No', color: '#64748b' },
}
function modelStyle(key) {
  return MODELS[key] || { label: key || 'Model', abbr: (key || 'M').slice(0, 2), color: '#94a3b8' }
}

const loading = ref(false)
const error = ref('')
const detail = ref(null)

function flag(code) {
  if (!code || code.length !== 2) return '🌐'
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 127397 + c.charCodeAt(0)))
}
function faviconFor(domain) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
}
function onFaviconError(e) { e.target.style.visibility = 'hidden' }

const modelLabel = computed(() => modelStyle(detail.value?.model).label)

// Order brands the way the model surfaced them: by position ascending,
// with un-positioned brands last but the tracked brand kept visible.
const rankedBrands = computed(() => {
  const brands = [...(detail.value?.brands || [])]
  return brands.sort((a, b) => {
    const pa = a.position == null ? Infinity : a.position
    const pb = b.position == null ? Infinity : b.position
    return pa - pb
  })
})

/* Highlight the tracked brand (green) and competitors (amber) in any text.
   Escapes HTML first, then wraps whole-word brand matches in <mark>. */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}
function highlight(text) {
  const safe = escapeHtml(text || '')
  const brands = detail.value?.brands || []
  const own = (detail.value?.brand || '').trim().toLowerCase()
  const names = [...new Set(brands.map(b => (b.name || '').trim()).filter(Boolean))]
  if (!names.length) return safe
  names.sort((a, b) => b.length - a.length)
  const escaped = names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi')
  return safe.replace(re, (m) => {
    const style = m.toLowerCase() === own
      ? 'background:rgba(34,197,94,0.20);color:#15803d'
      : 'background:rgba(245,158,11,0.20);color:#b45309'
    return `<mark style="${style};padding:0 2px;border-radius:3px;font-weight:600">${m}</mark>`
  })
}

async function load() {
  if (!props.resultId || !props.open) return
  loading.value = true
  error.value = ''
  detail.value = null
  try {
    const res = await citationsApi.chatDetail(props.websiteId, props.resultId)
    detail.value = res.data?.data || res.data || null
  } catch (e) {
    error.value = e?.displayMessage || 'Could not load this chat.'
  } finally {
    loading.value = false
  }
}

watch(() => [props.open, props.resultId], load, { immediate: true })
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="emit('close')">
    <div class="flex h-[85vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      <!-- Conversation -->
      <div class="flex min-w-0 flex-1 flex-col">
        <header class="flex items-center justify-between border-b border-border px-5 py-3">
          <div class="flex items-center gap-2 text-sm font-medium text-foreground">
            <span class="flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
              :style="{ background: modelStyle(detail?.model).color }">{{ modelStyle(detail?.model).abbr }}</span>
            {{ modelLabel }}
            <span v-if="detail?.country" class="ml-1 text-base leading-none">{{ flag(detail.country) }}</span>
            <span v-if="detail?.country" class="text-xs text-muted-foreground">{{ detail.country }}</span>
          </div>
          <button class="text-muted-foreground hover:text-foreground" @click="emit('close')"><X :size="18" /></button>
        </header>

        <div class="flex-1 overflow-y-auto px-6 py-5">
          <div v-if="loading" class="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 class="size-4 animate-spin" /> Loading chat…
          </div>
          <div v-else-if="error" class="text-sm text-destructive">{{ error }}</div>
          <template v-else-if="detail">
            <!-- user prompt bubble -->
            <div class="mb-5 flex justify-end">
              <div class="max-w-[80%] rounded-2xl bg-secondary px-4 py-2.5 text-sm text-foreground" v-html="highlight(detail.prompt)"></div>
            </div>
            <!-- legend -->
            <div class="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span class="inline-flex items-center gap-1.5"><span class="size-2.5 rounded-sm" style="background:rgba(34,197,94,0.45)"></span>{{ detail.brand }}</span>
              <span class="inline-flex items-center gap-1.5"><span class="size-2.5 rounded-sm" style="background:rgba(245,158,11,0.45)"></span>Competitors</span>
            </div>
            <!-- response -->
            <div class="whitespace-pre-wrap text-sm leading-relaxed text-foreground" v-html="detail.response_text ? highlight(detail.response_text) : 'No response text captured.'"></div>
          </template>
        </div>

        <footer class="flex items-center justify-between border-t border-border px-5 py-3">
          <button class="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40"
            :disabled="!hasPrev" @click="emit('prev')"><ArrowLeft :size="15" /> Previous</button>
          <button class="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40"
            :disabled="!hasNext" @click="emit('next')">Next <ArrowRight :size="15" /></button>
        </footer>
      </div>

      <!-- Details panel -->
      <aside class="hidden w-80 shrink-0 overflow-y-auto border-l border-border bg-background px-5 py-4 md:block">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-foreground">Details</h3>
        </div>

        <template v-if="detail">
          <!-- Brands (ordered by the rank the model returned) -->
          <div class="mb-5">
            <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Brands</div>
            <div v-for="(b, i) in rankedBrands" :key="i"
              class="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm"
              :class="b.name === detail.brand ? 'bg-secondary' : ''">
              <span class="flex min-w-0 items-center gap-2">
                <BrandLogo :name="b.name" :size="20" />
                <span class="truncate text-foreground">{{ b.name }}</span>
                <span v-if="b.name === detail.brand"
                  class="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">you</span>
              </span>
              <span class="shrink-0 text-xs font-medium text-muted-foreground">
                {{ b.position != null ? '#' + b.position : '—' }}
              </span>
            </div>
            <div v-if="!detail.brands.length" class="text-xs text-muted-foreground">No brands detected.</div>
          </div>

          <!-- Fanout queries -->
          <div v-if="detail.fanout_queries?.length" class="mb-5">
            <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fanout queries</div>
            <p class="text-sm leading-relaxed text-foreground">{{ detail.fanout_queries.join('  ·  ') }}</p>
          </div>

          <!-- Sources -->
          <div>
            <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sources</div>
            <a v-for="(s, i) in detail.sources" :key="i" :href="s.url" target="_blank" rel="noopener"
              class="mb-2 flex items-start gap-2 rounded-lg px-1 py-1 hover:bg-secondary">
              <img :src="faviconFor(s.apex_domain)" alt="" class="mt-0.5 size-4 shrink-0 rounded-sm" @error="onFaviconError" />
              <span class="min-w-0">
                <span class="block truncate text-sm text-foreground">{{ s.title }}</span>
                <span class="block truncate text-xs text-muted-foreground">{{ s.apex_domain }}</span>
              </span>
              <ExternalLink :size="12" class="ml-auto mt-1 shrink-0 text-muted-foreground" />
            </a>
            <div v-if="!detail.sources.length" class="text-xs text-muted-foreground">No sources cited.</div>
          </div>
        </template>
      </aside>
    </div>
  </div>
</template>
