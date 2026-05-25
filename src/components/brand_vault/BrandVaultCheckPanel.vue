<template>
  <section v-if="text" class="mt-3 rounded-xl border border-border bg-muted px-4 py-3.5">
    <header class="mb-3 flex items-center gap-2.5">
      <span class="text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">Brand Vault check</span>
      <span v-if="loading" class="bvc-spinner" aria-hidden="true"></span>
      <span v-else-if="result" class="inline-flex items-center gap-3.5 text-[0.78rem] text-muted-foreground">
        <span class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-chart-2"></span>{{ result.corroborated.length }} confirmed</span>
        <span v-if="result.contradicted.length" class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-destructive"></span>{{ result.contradicted.length }} mismatch{{ result.contradicted.length === 1 ? '' : 'es' }}</span>
        <span class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-muted-foreground/50"></span>{{ result.missed.length }} not mentioned</span>
      </span>
      <span v-else-if="error" class="text-[0.78rem] text-destructive">{{ error }}</span>
    </header>

    <div v-if="result" class="grid grid-cols-1 gap-3.5 md:grid-cols-[minmax(220px,0.9fr)_minmax(0,1.1fr)]">
      <!-- Brand vault truth -->
      <div>
        <div class="mb-1.5 text-[0.7rem] font-bold uppercase tracking-[0.06em] text-muted-foreground">Your brand says</div>
        <ul v-if="!result.total" class="m-0 list-none p-1.5 px-2.5 text-[0.82rem] text-muted-foreground">
          <li>No approved facts in the vault yet — nothing to compare.</li>
        </ul>
        <ul v-else class="m-0 flex list-none flex-col gap-1 p-0">
          <li
            v-for="f in displayedFacts"
            :key="f.id"
            class="grid grid-cols-[18px_1fr_auto] items-baseline gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-[0.82rem]"
            :class="{
              'border-chart-2/30': f._tag === 'good',
              'border-destructive/30 bg-destructive/5': f._tag === 'bad',
              'border-transparent opacity-[0.78]': f._tag === 'mute',
            }"
          >
            <span
              class="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full font-mono text-[11px] font-bold"
              :class="{
                'bg-chart-2/15 text-chart-2': f._tag === 'good',
                'bg-destructive/15 text-destructive': f._tag === 'bad',
                'bg-muted text-muted-foreground': f._tag === 'mute',
              }"
              aria-hidden="true"
            >
              <template v-if="f._tag === 'good'">✓</template>
              <template v-else-if="f._tag === 'bad'">!</template>
              <template v-else>·</template>
            </span>
            <span class="flex flex-wrap gap-1 leading-snug text-foreground">
              <strong class="font-semibold">{{ f.subject }}</strong>
              <span class="text-muted-foreground">{{ f.predicate }}</span>
              <span>{{ f.object }}</span>
            </span>
            <span v-if="f.topic" class="self-center rounded-full bg-muted px-[7px] py-px text-[0.65rem] uppercase tracking-[0.04em] text-muted-foreground">{{ f.topic }}</span>
          </li>
        </ul>
        <button
          v-if="hiddenMissedCount"
          type="button"
          class="mt-1 self-start px-0.5 py-1 text-[0.78rem] font-semibold text-chart-1 hover:underline"
          @click="showAllMissed = !showAllMissed"
        >
          {{ showAllMissed ? `Hide ${hiddenMissedCount}` : `Show ${hiddenMissedCount} more` }}
        </button>
      </div>

      <!-- What the model said -->
      <div>
        <div class="mb-1.5 text-[0.7rem] font-bold uppercase tracking-[0.06em] text-muted-foreground">What the model said</div>
        <div
          class="bvc-response max-h-[260px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-card px-3 py-2.5 text-[0.85rem] leading-relaxed text-foreground"
          v-html="highlightedResponse"
        ></div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import brandVaultApi from '@/api/brandVault'

const props = defineProps({
  websiteId: { type: String, required: true },
  text: { type: String, default: '' },
  autorun: { type: Boolean, default: true },
})

const result = ref(null)
const loading = ref(false)
const error = ref('')
const showAllMissed = ref(false)
let pending = null

async function run() {
  const text = (props.text || '').trim()
  if (!text || !props.websiteId) {
    result.value = null
    return
  }
  // Debounce rapid text swaps (e.g. when the user clicks through a
  // few responses quickly) — only the last one fires.
  if (pending) clearTimeout(pending)
  pending = setTimeout(async () => {
    loading.value = true
    error.value = ''
    try {
      const { data } = await brandVaultApi.factCheck(props.websiteId, text)
      result.value = data?.data || data || null
    } catch (e) {
      error.value = e?.displayMessage || 'Vault check failed.'
      result.value = null
    } finally {
      loading.value = false
    }
  }, 180)
}

watch(() => [props.text, props.websiteId], () => {
  if (props.autorun) run()
}, { immediate: true })

onBeforeUnmount(() => { if (pending) clearTimeout(pending) })

// Decorate facts with a UI tag so the template doesn't have to
// reach into three lists. Limit displayed missed facts unless the
// user clicks Show all.
const MISSED_LIMIT = 4
const displayedFacts = computed(() => {
  if (!result.value) return []
  const out = []
  for (const f of result.value.corroborated || []) out.push({ ...f, _tag: 'good' })
  for (const f of result.value.contradicted || []) out.push({ ...f, _tag: 'bad' })
  const missed = result.value.missed || []
  const slice = showAllMissed.value ? missed : missed.slice(0, MISSED_LIMIT)
  for (const f of slice) out.push({ ...f, _tag: 'mute' })
  return out
})
const hiddenMissedCount = computed(() => {
  if (!result.value || showAllMissed.value) return 0
  const m = result.value.missed?.length || 0
  return Math.max(0, m - MISSED_LIMIT)
})

// Highlight any object substring from corroborated facts inside the
// model's response. The Brand Vault check is conservative on the
// backend so we trust its corroborated list here — just wrap each
// match in a span the user can spot.
const highlightedResponse = computed(() => {
  const escaped = escapeHtml(props.text || '')
  if (!result.value?.corroborated?.length) return escaped
  let html = escaped
  // Apply longest objects first so "located in San Francisco" wins
  // over "San Francisco" when both are facts.
  const objects = result.value.corroborated
    .map((f) => (f.object || '').trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
  for (const obj of objects) {
    const re = new RegExp(`(${escapeRegex(obj)})`, 'gi')
    html = html.replace(re, '<mark class="bvc-mark">$1</mark>')
  }
  return html
})

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
</script>

<style scoped>
.bvc-spinner {
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid var(--border);
  border-top-color: var(--foreground);
  animation: bvc-spin 0.9s linear infinite;
}
@keyframes bvc-spin { to { transform: rotate(360deg); } }

.bvc-response :deep(.bvc-mark) {
  background: color-mix(in srgb, var(--chart-2) 18%, transparent);
  color: inherit;
  padding: 0 2px;
  border-radius: 3px;
}
</style>
