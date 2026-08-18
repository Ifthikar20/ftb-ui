<script setup>
import { computed, ref } from 'vue'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  ExternalLink, Check, X, ChevronRight, ShieldCheck, ShieldAlert, Gavel,
} from '@lucide/vue'
import { captureTypeForIssue, sourceLabel } from '@/constants/captureTypes'
import { safeHref } from '@/utils/safeHref'

const props = defineProps({
  alerts: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  // Highlight vocabularies: the brand's own terms (from monitoring config)
  // and its configured negative keywords. Both come from the page so the
  // marks reflect what the scans actually watch for.
  brandTerms: { type: Array, default: () => [] },
  negativeKeywords: { type: Array, default: () => [] },
})
const emit = defineEmits(['resolve', 'dismiss'])

const severityStyle = computed(() => ({
  high:   'bg-red-50 text-red-700',
  medium: 'bg-amber-50 text-amber-800',
  low:    'bg-slate-100 text-slate-700',
}))

// Track which finding rows have their detail panel expanded. A Set keeps
// toggling O(1) and avoids re-render churn from a computed map.
const expanded = ref(new Set())

function toggle(id) {
  const next = new Set(expanded.value)
  next.has(id) ? next.delete(id) : next.add(id)
  expanded.value = next
}

function evidenceCount(alert) {
  return Array.isArray(alert.evidence_chunks) ? alert.evidence_chunks.length : 0
}

function formatDetected(v) {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${date} · ${time}`
}

// ── Snapshot highlighting ─────────────────────────────────────────────
// Escape-first, then wrap known terms in <mark> spans so the charged
// phrases pop out of the snapshot. Two vocabularies:
//   brand  — the website's brand terms/aliases (what the finding is about)
//   risk   — configured negative keywords plus a curated lexicon of
//            sentiment-loaded words scans care about
// Deterministic string matching only — nothing is inferred or invented.
const RISK_LEXICON = [
  'scam', 'lawsuit', 'complaint', 'complaints', 'fraud', 'avoid',
  'warning', 'risk', 'risky', 'expensive', 'hidden fees', 'hidden fee',
  'problem', 'problems', 'issue', 'issues', 'downside', 'downsides',
  'negative', 'worse', 'worst', 'bad', 'poor', 'cheaper', 'alternative',
  'alternatives', 'competitor', 'competitors', 'instead of', 'switch from',
  'controversy', 'breach', 'outage', 'downtime', 'refund', 'cancel',
  'without endorsement', 'not recommended', 'declined', 'decline',
]

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}
function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const markVocab = computed(() => {
  const brand = new Set(
    (props.brandTerms || []).filter(Boolean).map((t) => String(t).toLowerCase()),
  )
  const risk = new Set(
    [...(props.negativeKeywords || []), ...RISK_LEXICON]
      .filter(Boolean).map((t) => String(t).toLowerCase()),
  )
  const all = [...new Set([...brand, ...risk])]
  if (!all.length) return null
  // Longest terms first so "hidden fees" wins over "fees"-style overlaps.
  const pattern = all
    .sort((a, b) => b.length - a.length)
    .map(escapeRe)
    .join('|')
  return { brand, regex: new RegExp(`\\b(${pattern})\\b`, 'gi') }
})

// Escapes the text, then wraps matches. Brand terms take precedence when
// a term appears in both vocabularies. Safe for v-html because the source
// text is fully escaped before any markup is injected.
function highlight(text) {
  const vocab = markVocab.value
  const escaped = escapeHtml(text || '')
  if (!vocab) return escaped
  return escaped.replace(vocab.regex, (m) => {
    const cls = vocab.brand.has(m.toLowerCase()) ? 'bs-mark-brand' : 'bs-mark-risk'
    return `<mark class="${cls}">${m}</mark>`
  })
}
</script>

<template>
  <div class="rounded-lg border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead class="w-8"></TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Finding</TableHead>
          <TableHead>Found in</TableHead>
          <TableHead>Detected</TableHead>
          <TableHead class="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-if="!alerts.length">
          <TableCell colspan="6" class="text-center text-sm text-muted-foreground py-8">
            {{ loading ? 'Loading...' : 'No findings yet. Run a scan to check what is being said about your brand.' }}
          </TableCell>
        </TableRow>
        <template v-for="alert in alerts" :key="alert.id">
          <TableRow
            class="cursor-pointer"
            @click="toggle(alert.id)"
          >
            <TableCell class="w-8 align-top pt-3">
              <ChevronRight
                class="size-4 text-muted-foreground transition-transform"
                :class="{ 'rotate-90': expanded.has(alert.id) }"
              />
            </TableCell>
            <TableCell class="whitespace-nowrap">
              <div class="flex flex-col gap-1">
                <span
                  class="inline-flex w-fit whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium"
                  :class="captureTypeForIssue(alert.issue).badgeClass"
                  :title="captureTypeForIssue(alert.issue).blurb"
                >{{ captureTypeForIssue(alert.issue).label }}</span>
                <span
                  class="inline-flex w-fit rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  :class="severityStyle[alert.severity] || 'bg-slate-100'"
                >{{ alert.severity }}</span>
              </div>
            </TableCell>
            <TableCell class="max-w-xl">
              <div class="text-sm font-medium truncate">{{ alert.title || alert.prompt_text || '-' }}</div>
              <div class="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span
                  v-if="evidenceCount(alert) > 0"
                  class="inline-flex items-center gap-1 whitespace-nowrap text-emerald-700"
                  :title="'Judged against ' + evidenceCount(alert) + ' brand source(s) from your knowledge base'"
                >
                  <ShieldCheck class="size-3" />
                  verified · {{ evidenceCount(alert) }}
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1 whitespace-nowrap text-amber-700"
                  title="No brand material was retrieved for this prompt. Add reference material on the Brand Input page to improve accuracy."
                >
                  <ShieldAlert class="size-3" />
                  ungrounded
                </span>
                <span class="truncate">{{ alert.detail || alert.snippet }}</span>
              </div>
            </TableCell>
            <TableCell class="text-xs text-muted-foreground whitespace-nowrap">
              {{ sourceLabel(alert.source) }}<template v-if="alert.model"> · {{ alert.model }}</template>
            </TableCell>
            <TableCell class="text-xs text-muted-foreground whitespace-nowrap">{{ formatDetected(alert.detected_at) }}</TableCell>
            <TableCell class="text-right" @click.stop>
              <div class="flex justify-end gap-1">
                <a
                  v-if="alert.source_url"
                  :href="safeHref(alert.source_url)" target="_blank" rel="noopener"
                  class="inline-flex size-8 items-center justify-center rounded hover:bg-muted"
                  title="Open source"
                >
                  <ExternalLink class="size-3.5" />
                </a>
                <Button size="sm" variant="ghost" title="Resolve" @click="emit('resolve', alert)">
                  <Check class="size-3.5" />
                </Button>
                <Button size="sm" variant="ghost" title="Dismiss" @click="emit('dismiss', alert)">
                  <X class="size-3.5" />
                </Button>
              </div>
            </TableCell>
          </TableRow>

          <TableRow v-if="expanded.has(alert.id)" class="bg-muted/30 hover:bg-muted/30">
            <TableCell></TableCell>
            <TableCell colspan="5" class="py-4">
              <div class="flex flex-col gap-4">
                <!-- Context: which prompt produced this capture -->
                <div v-if="alert.prompt_text" class="text-xs text-muted-foreground">
                  Captured while checking
                  <span class="font-medium text-foreground">"{{ alert.prompt_text }}"</span>
                </div>

                <!-- The diff: what was said vs what the brand says -->
                <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <!-- Snapshot with highlighted trigger terms -->
                  <div v-if="alert.snippet" class="flex flex-col">
                    <div class="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      What the AI said
                    </div>
                    <div
                      class="flex-1 rounded-lg border bg-background p-3.5 text-sm leading-relaxed text-foreground/90"
                      v-html="highlight(alert.snippet)"
                    />
                    <div class="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span class="inline-flex items-center gap-1">
                        <span class="bs-legend bs-legend-brand"></span> your brand
                      </span>
                      <span class="inline-flex items-center gap-1">
                        <span class="bs-legend bs-legend-risk"></span> attention terms
                      </span>
                    </div>
                  </div>

                  <!-- Ground truth: how it should be -->
                  <div class="flex flex-col">
                    <div class="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <ShieldCheck class="size-3" />
                      What your brand says
                    </div>

                    <div
                      v-if="evidenceCount(alert) === 0"
                      class="flex-1 rounded-lg border border-dashed bg-background p-3.5 text-sm text-muted-foreground"
                    >
                      No brand reference material matched this prompt, so this finding is
                      unverified. Add pages or paste text on the
                      <strong class="text-foreground">Brand Input</strong> page and future
                      findings will be checked against your own facts.
                    </div>

                    <div v-else class="flex flex-1 flex-col gap-2">
                      <div
                        v-for="(chunk, idx) in alert.evidence_chunks"
                        :key="chunk.chunk_id || idx"
                        class="rounded-lg border bg-background p-3.5"
                      >
                        <div class="mb-1.5 flex items-center justify-between gap-2 text-xs">
                          <a
                            v-if="chunk.source_url && !chunk.source_url.startsWith('paste://') && !chunk.source_url.startsWith('audit://')"
                            :href="safeHref(chunk.source_url)" target="_blank" rel="noopener"
                            class="truncate font-medium text-foreground hover:underline"
                          >{{ chunk.section_label || chunk.source_url }}</a>
                          <span v-else class="truncate font-medium text-foreground">
                            {{ chunk.section_label || 'Your brand material' }}
                          </span>
                          <span class="whitespace-nowrap text-[10px] text-muted-foreground">match {{ idx + 1 }}</span>
                        </div>
                        <div
                          class="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85"
                          v-html="highlight(chunk.text)"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Verdict callout -->
                <div
                  v-if="alert.detail"
                  class="flex items-start gap-2.5 rounded-lg border-l-4 border-amber-400 bg-amber-50/60 px-3.5 py-2.5"
                >
                  <Gavel class="mt-0.5 size-4 shrink-0 text-amber-700" />
                  <div class="text-sm leading-relaxed text-foreground/90">
                    <span class="mr-1.5 text-xs font-semibold uppercase tracking-wider text-amber-800">Verdict</span>
                    {{ alert.detail }}
                  </div>
                </div>
              </div>
            </TableCell>
          </TableRow>
        </template>
      </TableBody>
    </Table>
  </div>
</template>

<style scoped>
/* Highlight marks inside snapshots. :deep because the spans arrive via
   v-html and are outside Vue's scoping. */
:deep(.bs-mark-brand) {
  background: rgba(99, 102, 241, 0.16);
  color: #3730a3;
  font-weight: 600;
  padding: 0 3px;
  border-radius: 3px;
}
:deep(.bs-mark-risk) {
  background: rgba(239, 68, 68, 0.14);
  color: #b91c1c;
  font-weight: 600;
  padding: 0 3px;
  border-radius: 3px;
}
.bs-legend {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 3px;
}
.bs-legend-brand { background: rgba(99, 102, 241, 0.45); }
.bs-legend-risk { background: rgba(239, 68, 68, 0.4); }
</style>
