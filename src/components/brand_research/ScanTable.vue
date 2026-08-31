<template>
  <div class="st">
    <div class="st-scroll">
      <table class="st-table">
        <thead>
          <tr>
            <th class="st-rank">#</th>
            <th class="st-name">Brand</th>
            <th
              v-for="col in COLUMNS"
              :key="col.key"
              class="st-num"
              :class="{ 'st-sorted': sortKey === col.key }"
              :aria-sort="sortKey === col.key ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'"
              @click="setSort(col.key)"
            >
              <button type="button" class="st-th-btn" :title="col.hint">
                {{ col.label }}
                <span class="st-caret" :class="{ on: sortKey === col.key, up: sortKey === col.key && sortDir === 'asc' }">▾</span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(b, i) in sortedBrands"
            :key="b.name"
            class="st-row"
            :class="{ 'st-own': b.is_own_brand, 'st-active': activeName === keyOf(b.name) }"
            tabindex="0"
            @click="$emit('select-brand', b)"
            @keydown.enter="$emit('select-brand', b)"
          >
            <td class="st-rank">{{ i + 1 }}</td>
            <td class="st-name">
              <span class="st-dot" :style="{ background: sentimentColor(b.sentiment || 0) }"></span>
              <span class="st-brand">{{ b.name }}</span>
              <span v-if="b.is_own_brand" class="st-you">You</span>
            </td>
            <td class="st-num">
              <div class="st-share">
                <div class="st-share-track">
                  <div class="st-share-fill" :style="{ width: sharePct(b) + '%' }"></div>
                </div>
                <span class="st-share-val">{{ sharePct(b) }}%</span>
              </div>
            </td>
            <td class="st-num">{{ b.mentions ?? 0 }}</td>
            <td class="st-num">{{ b.results_present_in ?? 0 }}</td>
            <td class="st-num">
              <span class="st-sent" :style="{ color: sentimentColor(b.sentiment || 0) }">
                {{ signed(b.sentiment) }}
              </span>
            </td>
            <td class="st-num">
              <span :class="{ 'st-dim': !enginesNaming(b) }">
                {{ okEngines ? enginesNaming(b) + '/' + okEngines : '—' }}
              </span>
            </td>
            <td class="st-num">
              <span :class="{ 'st-dim': !issueCount(b) }">{{ issueCount(b) || '—' }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="!sortedBrands.length" class="st-empty">
      {{ running ? 'Reading the results and pulling out the brands…' : 'No brands surfaced for this query.' }}
    </p>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { sentimentColor } from './buildGraph'

const props = defineProps({
  brands: { type: Array, default: () => [] },
  engines: { type: Array, default: () => [] },
  maxScore: { type: Number, default: 1 },
  running: { type: Boolean, default: false },
  // Name of the currently selected brand, so the table can highlight the
  // row that matches whatever the detail panel is showing.
  activeName: { type: String, default: '' },
})
defineEmits(['select-brand'])

const COLUMNS = [
  { key: 'share', label: 'Share of voice', hint: 'This brand\'s weighted presence across every channel, relative to the loudest brand in the scan.' },
  { key: 'mentions', label: 'Mentions', hint: 'Total times the brand was named across all sources and answers.' },
  { key: 'sources', label: 'Sources', hint: 'How many distinct results mention this brand.' },
  { key: 'sentiment', label: 'Sentiment', hint: 'Average tone of the mentions, from -1 (negative) to +1 (positive).' },
  { key: 'engines', label: 'AI engines', hint: 'How many answering AI engines named this brand, out of those that answered.' },
  { key: 'issues', label: 'Issues', hint: 'Distinct complaints people raise about this brand in the results.' },
]

// Mirrors NodeDetailPanel's junk filter so an issue count here matches the
// list the panel shows when you open the row.
const JUNK_ISSUE_RE = /access\s+denied|preventing\s+content|content\s+review|unable to (access|review|retrieve)|error preventing|no accessible|content is (blocked|unavailable)/i

function keyOf(name) {
  return (name || '').trim().toLowerCase()
}
function signed(s) {
  const n = s || 0
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}`
}
function sharePct(b) {
  return Math.round(((b.weighted_score || 0) / Math.max(props.maxScore, 0.0001)) * 100)
}
function issueCount(b) {
  return (b.issues || []).filter((s) => s && !JUNK_ISSUE_RE.test(String(s))).length
}

const okEngines = computed(
  () => (props.engines || []).filter((e) => e.status === 'ok').length,
)
function enginesNaming(b) {
  const target = keyOf(b.name)
  return (props.engines || []).filter(
    (e) => e.status === 'ok'
      && (e.brands || []).some((x) => keyOf(x.name) === target),
  ).length
}

// Sort. Defaults to share-of-voice descending, which is the scan's own
// ranking and the first thing anyone reads a table like this for.
const sortKey = ref('share')
const sortDir = ref('desc')
function setSort(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortKey.value = key
    sortDir.value = 'desc'
  }
}

const SORT_VALUE = {
  share: (b) => b.weighted_score || 0,
  mentions: (b) => b.mentions || 0,
  sources: (b) => b.results_present_in || 0,
  sentiment: (b) => b.sentiment || 0,
  engines: (b) => enginesNaming(b),
  issues: (b) => issueCount(b),
}

const sortedBrands = computed(() => {
  const valueOf = SORT_VALUE[sortKey.value] || SORT_VALUE.share
  const dir = sortDir.value === 'desc' ? -1 : 1
  // Copy before sorting — never mutate the prop array in place.
  return [...(props.brands || [])].sort((a, b) => {
    const d = valueOf(a) - valueOf(b)
    if (d !== 0) return d * dir
    // Stable tiebreak on share so equal values don't jitter between renders.
    return ((b.weighted_score || 0) - (a.weighted_score || 0)) * -dir
  })
})
</script>

<style scoped>
.st {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}
.st-scroll { flex: 1; min-height: 0; overflow: auto; }
.st-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.st-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--card);
  border-bottom: 1px solid var(--border);
  padding: 0;
  text-align: right;
  white-space: nowrap;
}
.st-table thead th.st-rank { text-align: right; }
.st-table thead th.st-name { text-align: left; }
.st-th-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  justify-content: flex-end;
  padding: 11px 14px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted-foreground);
  cursor: pointer;
  transition: color 0.15s;
}
.st-num .st-th-btn { justify-content: flex-end; }
.st-th-btn:hover { color: var(--foreground); }
.st-sorted .st-th-btn { color: var(--foreground); }
.st-caret { font-size: 9px; opacity: 0; transition: opacity 0.15s, transform 0.15s; }
.st-caret.on { opacity: 1; }
.st-caret.up { transform: rotate(180deg); }

.st-rank, .st-num { text-align: right; font-variant-numeric: tabular-nums; }
.st-name { text-align: left; }
.st-table th.st-rank, .st-table td.st-rank { padding-left: 14px; width: 34px; color: var(--muted-foreground); font-weight: 700; font-size: 11px; }

.st-row { border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.12s; outline: none; }
.st-row:last-child { border-bottom: 0; }
.st-row:hover { background: var(--muted); }
.st-row:focus-visible { background: var(--muted); box-shadow: inset 2px 0 0 var(--primary); }
.st-row.st-active { background: var(--muted); box-shadow: inset 2px 0 0 var(--primary); }
.st-row.st-own { background: color-mix(in srgb, var(--primary) 5%, transparent); }
.st-row td { padding: 11px 14px; color: var(--foreground); }

.st-name { display: flex; align-items: center; gap: 8px; }
.st-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.st-brand { font-weight: 600; }
.st-you {
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  padding: 1px 7px;
  border-radius: 999px;
}

.st-share { display: inline-flex; align-items: center; gap: 8px; justify-content: flex-end; }
.st-share-track {
  width: 76px;
  height: 6px;
  border-radius: 999px;
  background: var(--muted);
  overflow: hidden;
}
.st-share-fill { height: 100%; background: var(--primary); border-radius: 999px; }
.st-share-val { min-width: 34px; text-align: right; font-weight: 700; }

.st-sent { font-weight: 700; }
.st-dim { color: var(--muted-foreground); }

.st-empty {
  padding: 40px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--muted-foreground);
}
</style>
