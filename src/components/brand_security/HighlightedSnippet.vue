<script setup>
/**
 * Renders evidence text with the exact server-flagged phrases marked.
 *
 * The primary highlight source is `spans` — character offsets into `text`
 * computed by the backend detector that raised the alert ([{start, end,
 * text, label}]). Each span echoes its text, so before trusting an offset
 * we verify `text.slice(start, end) === span.text` and re-anchor by
 * searching for the echo when it drifts (UTF-16 surrogate pairs, stale
 * rows). Malformed spans degrade to plain text — never a crash, never
 * markup injection.
 *
 * Rendering is escape-first: raw text is sliced by span boundaries, each
 * slice is HTML-escaped, and only then is our own static <mark> markup
 * concatenated in — the same XSS argument as the previous lexicon
 * highlighter, now driven by server data instead of client guessing.
 *
 * On the plain slices (and whenever spans are absent — legacy alerts,
 * "what your brand says" chunks) a secondary vocabulary pass marks the
 * website's configured brand terms and negative keywords.
 */
import { computed } from 'vue'

const props = defineProps({
  text: { type: String, default: '' },
  // Server character spans; null/empty falls back to vocabulary marks only.
  spans: { type: Array, default: null },
  brandTerms: { type: Array, default: () => [] },
  negativeKeywords: { type: Array, default: () => [] },
  showLegend: { type: Boolean, default: false },
})

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}
function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Validate, re-anchor, sort and de-overlap the server spans.
const normalizedSpans = computed(() => {
  const text = props.text || ''
  const raw = Array.isArray(props.spans) ? props.spans : []
  const usable = []
  for (const span of raw) {
    if (!span || !Number.isInteger(span.start) || !Number.isInteger(span.end)) continue
    let { start, end } = span
    const echo = typeof span.text === 'string' ? span.text : ''
    const inBounds = start >= 0 && start < end && end <= text.length
    if (inBounds && (!echo || text.slice(start, end) === echo)) {
      usable.push({ start, end, label: span.label || '' })
      continue
    }
    // Offsets drifted — re-anchor on the echoed text, preferring a match
    // near the claimed position over one elsewhere in the string.
    if (echo) {
      const near = text.indexOf(echo, Math.max(0, start - 80))
      const found = near !== -1 ? near : text.indexOf(echo)
      if (found !== -1) {
        usable.push({ start: found, end: found + echo.length, label: span.label || '' })
      }
    }
  }
  usable.sort((a, b) => a.start - b.start)
  const clipped = []
  let cursor = 0
  for (const span of usable) {
    const start = Math.max(span.start, cursor)
    if (start >= span.end) continue
    clipped.push({ ...span, start })
    cursor = span.end
  }
  return clipped
})

// Secondary vocabulary marks (configured terms), applied to plain slices
// only — never inside a server mark.
const vocab = computed(() => {
  const brand = new Set(
    (props.brandTerms || []).filter(Boolean).map((t) => String(t).toLowerCase()),
  )
  const risk = new Set(
    (props.negativeKeywords || []).filter(Boolean).map((t) => String(t).toLowerCase()),
  )
  const all = [...new Set([...brand, ...risk])]
  if (!all.length) return null
  // Longest terms first so "hidden fees" wins over "fees"-style overlaps.
  const pattern = all.sort((a, b) => b.length - a.length).map(escapeRe).join('|')
  return { brand, regex: new RegExp(`\\b(${pattern})\\b`, 'gi') }
})

function markVocabulary(escaped) {
  const v = vocab.value
  if (!v) return escaped
  return escaped.replace(v.regex, (m) => {
    const cls = v.brand.has(m.toLowerCase()) ? 'hl-brand' : 'hl-risk'
    return `<mark class="${cls}">${m}</mark>`
  })
}

// Spans whose label marks the brand itself ("Brand mention"/"Brand name")
// are context, not risk — they get the brand tint so the reader is never
// told their own name is the problem.
function spanClass(label) {
  return /^brand\b/i.test(label || '') ? 'hl-brand' : 'hl-risk'
}

const html = computed(() => {
  const text = props.text || ''
  if (!text) return ''
  const spans = normalizedSpans.value
  const pieces = []
  let pos = 0
  for (const span of spans) {
    if (span.start > pos) {
      pieces.push(markVocabulary(escapeHtml(text.slice(pos, span.start))))
    }
    const slice = escapeHtml(text.slice(span.start, span.end))
    const label = escapeHtml(span.label)
    const cls = spanClass(span.label)
    pieces.push(
      label
        ? `<mark class="${cls}" title="${label}">${slice}</mark>`
        : `<mark class="${cls}">${slice}</mark>`,
    )
    pos = span.end
  }
  if (pos < text.length) {
    pieces.push(markVocabulary(escapeHtml(text.slice(pos))))
  }
  return pieces.join('')
})

const hasServerSpans = computed(() => normalizedSpans.value.length > 0)
const hasRiskMarks = computed(() =>
  hasServerSpans.value
    ? normalizedSpans.value.some((s) => spanClass(s.label) === 'hl-risk')
    : (props.negativeKeywords || []).length > 0,
)
const hasBrandMarks = computed(() =>
  hasServerSpans.value
    ? normalizedSpans.value.some((s) => spanClass(s.label) === 'hl-brand') || props.brandTerms.length > 0
    : props.brandTerms.length > 0,
)
</script>

<template>
  <div>
    <div
      class="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90"
      v-html="html"
    />
    <div
      v-if="showLegend && (hasRiskMarks || hasBrandMarks)"
      class="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground"
    >
      <span v-if="hasRiskMarks" class="inline-flex items-center gap-1">
        <span class="hl-legend hl-legend-risk" aria-hidden="true"></span>
        {{ hasServerSpans ? 'what triggered this' : 'attention term' }}
      </span>
      <span v-if="hasBrandMarks" class="inline-flex items-center gap-1">
        <span class="hl-legend hl-legend-brand" aria-hidden="true"></span>
        your brand
      </span>
    </div>
  </div>
</template>

<style scoped>
/* :deep because the marks arrive via v-html, outside Vue's scoping.
   Tints ride the severity/ring tokens through color-mix so both themes
   stay legible without raw hex. */
:deep(mark.hl-risk) {
  background: color-mix(in srgb, var(--severity-high) 14%, transparent);
  color: var(--severity-high);
  font-weight: 600;
  padding: 0 3px;
  border-radius: 3px;
}
:deep(mark.hl-brand) {
  background: color-mix(in srgb, var(--ring) 15%, transparent);
  color: var(--ring);
  font-weight: 600;
  padding: 0 3px;
  border-radius: 3px;
}
.hl-legend {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 3px;
}
.hl-legend-risk {
  background: color-mix(in srgb, var(--severity-high) 40%, transparent);
}
.hl-legend-brand {
  background: color-mix(in srgb, var(--ring) 40%, transparent);
}
</style>
