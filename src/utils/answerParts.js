// Split an assistant answer into renderable parts.
//
// The answer is Markdown, rendered through utils/markdown.js and injected
// with v-html. A Vue component cannot be mounted inside v-html, so a chart
// cannot simply be another tag the renderer emits. Instead the answer is cut
// into an alternating sequence of markdown and chart parts, and the template
// renders each with the right thing.
//
// Charts arrive as a fenced block the model is instructed to produce:
//
//   ```chart
//   {"type":"bar","title":"...","labels":[...],"datasets":[{"label":"...","data":[...]}]}
//   ```
//
// Anything malformed stays prose: a broken spec renders as the code block it
// already is, which is far better than swallowing the model's output.

const CHART_FENCE = /```chart\s*\n([\s\S]*?)```/g

const TYPES = new Set(['bar', 'line', 'doughnut'])
const MAX_LABELS = 12
const MAX_DATASETS = 3

/** Validate and normalise a spec. Returns null if it is not usable. */
export function parseChartSpec(raw) {
  let spec
  try {
    spec = JSON.parse(raw)
  } catch {
    return null
  }
  if (!spec || typeof spec !== 'object') return null

  const type = TYPES.has(spec.type) ? spec.type : 'bar'
  const labels = Array.isArray(spec.labels)
    ? spec.labels.slice(0, MAX_LABELS).map((l) => String(l))
    : []
  if (!labels.length) return null

  const datasets = (Array.isArray(spec.datasets) ? spec.datasets : [])
    .slice(0, MAX_DATASETS)
    .map((d) => ({
      label: String(d?.label ?? ''),
      // Coerce to finite numbers; a null or a stray string becomes a gap
      // rather than crashing the scale.
      data: (Array.isArray(d?.data) ? d.data : [])
        .slice(0, labels.length)
        .map((n) => (Number.isFinite(Number(n)) ? Number(n) : null)),
    }))
    .filter((d) => d.data.some((n) => n !== null))

  if (!datasets.length) return null

  return {
    type,
    title: typeof spec.title === 'string' ? spec.title.slice(0, 120) : '',
    unit: typeof spec.unit === 'string' ? spec.unit.slice(0, 8) : '',
    labels,
    datasets,
  }
}

/**
 * @returns {Array<{kind:'markdown', text:string} | {kind:'chart', spec:object}>}
 */
export function splitAnswer(text) {
  const source = String(text || '')
  const parts = []
  let cursor = 0

  CHART_FENCE.lastIndex = 0
  let match
  while ((match = CHART_FENCE.exec(source)) !== null) {
    const spec = parseChartSpec(match[1])
    if (!spec) continue // leave the fence in the prose; it renders as code

    const before = source.slice(cursor, match.index)
    if (before.trim()) parts.push({ kind: 'markdown', text: before })
    parts.push({ kind: 'chart', spec })
    cursor = match.index + match[0].length
  }

  const rest = source.slice(cursor)
  if (rest.trim() || !parts.length) parts.push({ kind: 'markdown', text: rest })
  return parts
}
