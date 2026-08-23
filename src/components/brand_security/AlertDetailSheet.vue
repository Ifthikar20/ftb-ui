<script setup>
/**
 * Right-side detail drawer for one finding. Deliberately spare: an
 * identity header (severity, status, one reference line), "Why this was
 * flagged", and the structured "Where you stand" picture. Evidence,
 * ground truth and recommended action render only when they carry real
 * content — a section with boilerplate is a section removed.
 */
import { computed, ref, watch } from 'vue'
import {
  Check,
  Copy,
  ExternalLink,
  FileText,
  Lightbulb,
  MessageSquareText,
  ShieldAlert,
  ShieldCheck,
  X,
} from '@lucide/vue'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import HighlightedSnippet from '@/components/brand_security/HighlightedSnippet.vue'
import SeverityBadge from '@/components/brand_security/SeverityBadge.vue'
import { useToast } from '@/composables/useToast'
import { useBrandSecurityStore } from '@/stores/brandSecurity'
import { safeHref } from '@/utils/safeHref'
import { timeAgo } from '@/utils/timeAgo.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  alert: { type: Object, default: null },
  websiteId: { type: String, default: '' },
  brandTerms: { type: Array, default: () => [] },
  negativeKeywords: { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'resolve', 'dismiss', 'view-conversation'])

const toast = useToast()
const store = useBrandSecurityStore()

// Registry metadata for the identity line: catalog entry (fetched
// taxonomy) first, serializer-provided fallback second.
const detectorMeta = computed(() => {
  if (!props.alert) return null
  const code = props.alert.detector_code
  return (code && store.detectorByCode(code)) || props.alert.detector || null
})

// One compact "seen" phrase instead of a meta grid: "2d ago", or
// "12x since 5d ago, last 2h ago" for recurring findings.
const seenLine = computed(() => {
  const a = props.alert
  if (!a) return ''
  const first = a.first_seen_at || a.detected_at
  const last = a.last_seen_at || first
  const count = a.occurrence_count || 1
  if (count > 1) {
    return `seen ${count}x since ${timeAgo(first)}, last ${timeAgo(last)}`
  }
  return `seen ${timeAgo(first)}`
})

const statusVariant = computed(() => ({
  open: 'outline',
  resolved: 'success',
  dismissed: 'secondary',
}[props.alert?.status] || 'outline'))

const evidenceChunks = computed(() =>
  Array.isArray(props.alert?.evidence_chunks) ? props.alert.evidence_chunks : [],
)

// The structured picture of the answer this finding came from: rank,
// co-mentioned brands, and what the answer actually recommends. Shown as
// its own panel so the reader sees the situation, not just prose about it.
const positionCtx = computed(() => {
  const ctx = props.alert?.result_context
  if (!ctx) return null
  const competitors = Array.isArray(ctx.competitors) ? ctx.competitors : []
  if (!competitors.length && !ctx.mention_rank && !ctx.primary_recommendation) return null
  return { ...ctx, competitors }
})

const brandName = computed(() => props.brandTerms[0] || 'Your brand')

const recommendationIsOther = computed(() => {
  const rec = positionCtx.value?.primary_recommendation
  if (!rec) return false
  return !props.brandTerms.some(
    (t) => t && rec.toLowerCase().includes(String(t).toLowerCase()),
  )
})

const TONE = {
  positive: { label: 'positive tone', dotClass: 'bg-[color:var(--chart-2)]' },
  negative: { label: 'negative tone', dotClass: 'bg-severity-high' },
  neutral: { label: 'neutral tone', dotClass: 'bg-muted-foreground/40' },
}

function toneMeta(sentiment) {
  return TONE[sentiment] || TONE.neutral
}

// Competitors grouped by how the answer described them — the structured
// view of the situation. Positive first: those got the endorsement the
// brand did not.
const toneGroups = computed(() => {
  const comps = positionCtx.value?.competitors || []
  const groups = [
    { key: 'positive', label: 'Described positively', dotClass: TONE.positive.dotClass, items: [] },
    { key: 'negative', label: 'Described negatively', dotClass: TONE.negative.dotClass, items: [] },
    { key: 'neutral', label: 'Described neutrally', dotClass: TONE.neutral.dotClass, items: [] },
  ]
  for (const comp of comps) {
    const group = groups.find((g) => g.key === comp.sentiment) || groups[2]
    group.items.push(comp)
  }
  return groups.filter((g) => g.items.length)
})

// Long tone groups collapse to a first row of chips; "+N more" expands.
const CHIPS_VISIBLE = 8
const expandedGroups = ref(new Set())

watch(() => props.alert?.id, () => {
  expandedGroups.value = new Set()
})

function visibleItems(group) {
  if (expandedGroups.value.has(group.key)) return group.items
  return group.items.slice(0, CHIPS_VISIBLE)
}

function expandGroup(key) {
  const next = new Set(expandedGroups.value)
  next.add(key)
  expandedGroups.value = next
}

// The evidence snippet earns its place only when it contains an actual
// flagged phrase; for structural findings (listed among 15 options) the
// position panel carries the story and the snippet is just an intro line.
// Legacy alerts without any stored spans keep the snippet — it is their
// only evidence.
const hasRiskSpans = computed(() =>
  (props.alert?.evidence_spans || []).some(
    (s) => s && !/^brand\b/i.test(s.label || ''),
  ),
)
const showSnippet = computed(() => {
  if (!props.alert?.snippet) return false
  if (hasRiskSpans.value) return true
  if (!positionCtx.value) return true
  return !(props.alert.evidence_spans || []).length
})

const promptDetailTo = computed(() => {
  if (!props.alert?.source_prompt || !props.websiteId) return null
  return `/llm-ranking/${props.websiteId}/prompts/${props.alert.source_prompt}/detail`
})

function absolute(v) {
  if (!v) return ''
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString()
}

function isExternalChunkUrl(url) {
  return url && !url.startsWith('paste://') && !url.startsWith('audit://')
}

async function copyReference() {
  if (!props.alert?.reference) return
  try {
    await navigator.clipboard.writeText(props.alert.reference)
    toast.success(`Reference ${props.alert.reference} copied`)
  } catch {
    toast.error('Could not copy the reference')
  }
}
</script>

<template>
  <Sheet :open="open" @update:open="(v) => !v && emit('close')">
    <SheetContent
      side="right"
      class="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl lg:max-w-[720px]"
    >
      <template v-if="alert">
        <!-- ── Identity header: two badges, the title, one muted line ── -->
        <SheetHeader class="sticky top-0 z-10 gap-2 border-b bg-background p-5 pr-12 text-left">
          <div class="flex flex-wrap items-center gap-2">
            <SeverityBadge :severity="alert.severity" />
            <Badge :variant="statusVariant" class="capitalize">{{ alert.status }}</Badge>
          </div>
          <SheetTitle class="text-base leading-snug">
            {{ alert.title || alert.prompt_text || 'Finding' }}
          </SheetTitle>
          <SheetDescription class="sr-only">
            Finding {{ alert.reference }} details
          </SheetDescription>
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span v-if="alert.reference" class="inline-flex items-center gap-1 font-mono">
              {{ alert.reference }}
              <button
                type="button"
                class="rounded p-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                :aria-label="`Copy reference ${alert.reference}`"
                title="Copy reference"
                @click="copyReference"
              >
                <Copy class="size-3" />
              </button>
            </span>
            <span
              v-if="detectorMeta"
              :title="detectorMeta.description || ''"
            >· {{ detectorMeta.display_name }}</span>
            <span v-if="alert.model">· {{ alert.model }}</span>
            <span
              v-if="seenLine"
              :title="absolute(alert.last_seen_at || alert.detected_at)"
            >· {{ seenLine }}</span>
          </div>
        </SheetHeader>

        <div class="flex flex-col gap-5 p-5">
          <!-- ── Why this was flagged ── -->
          <div v-if="alert.detail">
            <h3 class="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Why this was flagged
            </h3>
            <p class="text-sm leading-relaxed text-foreground/90">{{ alert.detail }}</p>
          </div>

          <!-- ── Where you stand in this answer ── -->
          <div v-if="positionCtx">
            <h3 class="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Where you stand in this answer
            </h3>
            <div class="flex flex-col gap-3 rounded-lg border bg-background p-3.5">
              <!-- The brand's own row: tone + position -->
              <div
                v-if="positionCtx.is_mentioned !== false"
                class="flex flex-wrap items-center gap-2 text-sm text-foreground/90"
              >
                <span class="inline-flex items-center gap-1.5 rounded-full border bg-secondary px-2 py-0.5 font-semibold text-foreground">
                  <span class="size-1.5 rounded-full" :class="toneMeta(positionCtx.sentiment).dotClass" aria-hidden="true"></span>
                  {{ brandName }}
                </span>
                <span>{{ toneMeta(positionCtx.sentiment).label }}</span>
                <span v-if="positionCtx.mention_rank && positionCtx.brands_total">
                  · position {{ positionCtx.mention_rank }} of {{ positionCtx.brands_total }}
                </span>
              </div>
              <p v-else class="text-sm text-foreground/90">
                {{ brandName }} is named in the text but the answer does not treat it
                as a distinct brand.
              </p>

              <div
                v-if="recommendationIsOther"
                class="rounded-md border-l-4 border-severity-high bg-severity-high/10 px-2.5 py-1.5 text-sm text-foreground/90"
              >
                This answer's top recommendation:
                <span class="font-semibold text-foreground">{{ positionCtx.primary_recommendation }}</span>
              </div>

              <!-- Others in the answer, grouped by how they were described -->
              <div v-for="group in toneGroups" :key="group.key">
                <p class="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <span class="size-1.5 rounded-full" :class="group.dotClass" aria-hidden="true"></span>
                  {{ group.label }}
                  <span class="font-normal">({{ group.items.length }})</span>
                </p>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="comp in visibleItems(group)"
                    :key="comp.name"
                    class="inline-flex items-center rounded-full border bg-background px-2 py-0.5 text-xs text-foreground/90"
                    :title="comp.position ? `${comp.name} · position ${comp.position}` : comp.name"
                  >{{ comp.name }}</span>
                  <button
                    v-if="group.items.length > visibleItems(group).length"
                    type="button"
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    @click="expandGroup(group.key)"
                  >+{{ group.items.length - visibleItems(group).length }} more</button>
                </div>
              </div>
              <p
                v-if="positionCtx.competitors_truncated"
                class="text-[11px] text-muted-foreground"
              >and {{ positionCtx.competitors_truncated }} more named in this answer</p>
            </div>
          </div>

          <!-- ── Evidence: only when a phrase was actually flagged ── -->
          <div v-if="showSnippet">
            <h3 class="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              What the AI said
            </h3>
            <div
              class="rounded-lg border bg-background p-3.5"
              aria-label="AI response with flagged phrases highlighted"
            >
              <HighlightedSnippet
                :text="alert.snippet"
                :spans="alert.evidence_spans"
                :brand-terms="brandTerms"
                :negative-keywords="negativeKeywords"
                :show-legend="true"
              />
            </div>
          </div>

          <!-- ── Ground truth: only when there is material to show ── -->
          <div v-if="evidenceChunks.length">
            <h3 class="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <ShieldCheck class="size-3" />
              What your brand says
            </h3>
            <div class="flex flex-col gap-2">
              <div
                v-for="(chunk, idx) in evidenceChunks"
                :key="chunk.chunk_id || idx"
                class="rounded-lg border bg-background p-3.5"
              >
                <div class="mb-1.5 flex items-center justify-between gap-2 text-xs">
                  <a
                    v-if="isExternalChunkUrl(chunk.source_url)"
                    :href="safeHref(chunk.source_url)" target="_blank" rel="noopener"
                    class="truncate font-medium text-foreground hover:underline"
                  >{{ chunk.section_label || chunk.source_url }}</a>
                  <span v-else class="truncate font-medium text-foreground">
                    {{ chunk.section_label || 'Your brand material' }}
                  </span>
                  <span class="whitespace-nowrap text-[10px] text-muted-foreground">match {{ idx + 1 }}</span>
                </div>
                <HighlightedSnippet
                  :text="chunk.text || chunk.snippet || ''"
                  :spans="null"
                  :brand-terms="brandTerms"
                  :negative-keywords="negativeKeywords"
                />
              </div>
            </div>
          </div>

          <!-- ── Recommended action: only for grounded findings, where the
               guidance is concrete rather than generic ── -->
          <div
            v-if="alert.recommended_action && evidenceChunks.length"
            class="flex items-start gap-2.5 rounded-lg border-l-4 border-severity-medium bg-severity-medium/10 px-3.5 py-2.5"
          >
            <Lightbulb class="mt-0.5 size-4 shrink-0 text-severity-medium" />
            <div class="text-sm leading-relaxed text-foreground/90">
              <span class="mr-1.5 text-xs font-semibold uppercase tracking-wider text-severity-medium">Recommended action</span>
              {{ alert.recommended_action }}
            </div>
          </div>

          <!-- ── Source trail ── -->
          <div class="rounded-lg border bg-muted/30 p-3.5">
            <div v-if="alert.prompt_text" class="text-xs text-muted-foreground">
              Captured while checking
              <span class="font-medium text-foreground">"{{ alert.prompt_text }}"</span>
            </div>
            <div class="mt-2.5 flex flex-wrap items-center gap-2">
              <Button
                v-if="alert.result_public_id"
                size="sm"
                variant="outline"
                @click="emit('view-conversation', alert.result_public_id)"
              >
                <MessageSquareText class="size-3.5" />
                View conversation
              </Button>
              <router-link v-if="promptDetailTo" :to="promptDetailTo">
                <Button size="sm" variant="outline">
                  <FileText class="size-3.5" />
                  View prompt
                </Button>
              </router-link>
              <a
                v-if="safeHref(alert.source_url)"
                :href="safeHref(alert.source_url)" target="_blank" rel="noopener"
              >
                <Button size="sm" variant="outline">
                  <ExternalLink class="size-3.5" />
                  Open source
                </Button>
              </a>
            </div>
          </div>
        </div>

        <!-- ── Workflow footer ── -->
        <div class="sticky bottom-0 mt-auto border-t bg-background p-4">
          <div v-if="alert.status === 'open'" class="flex items-center justify-end gap-2">
            <Button variant="outline" @click="emit('dismiss', alert)">
              <X class="size-3.5" />
              Dismiss
            </Button>
            <Button @click="emit('resolve', alert)">
              <Check class="size-3.5" />
              Resolve
            </Button>
          </div>
          <div v-else class="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldAlert v-if="alert.status === 'dismissed'" class="size-4" />
            <ShieldCheck v-else class="size-4" />
            <span class="capitalize">{{ alert.status }}</span>
            <span v-if="alert.resolved_at" :title="absolute(alert.resolved_at)">
              · {{ timeAgo(alert.resolved_at) }}
            </span>
          </div>
        </div>
      </template>
    </SheetContent>
  </Sheet>
</template>
