<template>
  <div class="spd">
    <!-- Toolbar: search + status + topic + grouping + actions -->
    <div class="spd-toolbar">
      <div class="spd-toolbar-left">
        <div class="spd-search-wrap">
          <Search :size="15" :stroke-width="2" />
          <input v-model="search" type="search" placeholder="Search prompts…" class="spd-search" />
        </div>
        <div class="spd-segmented" role="tablist">
          <button
            type="button"
            class="spd-seg-btn"
            :class="{ 'is-on': status === 'active' }"
            @click="status = 'active'"
          >Active</button>
          <button
            type="button"
            class="spd-seg-btn"
            :class="{ 'is-on': status === 'archived' }"
            @click="status = 'archived'"
          >Archived</button>
        </div>
      </div>

      <div class="spd-toolbar-right">
        <label class="spd-field">
          <Folder :size="14" :stroke-width="1.8" />
          <select v-model="activeTopic" class="spd-select" aria-label="Filter by group">
            <option value="">All groups ({{ rows.length }})</option>
            <option v-for="t in topics" :key="t.name" :value="t.name">{{ t.name }} ({{ t.count }})</option>
          </select>
        </label>
        <label class="spd-field">
          <Layers :size="14" :stroke-width="1.8" />
          <select v-model="groupBy" class="spd-select" aria-label="Group prompts by">
            <option value="none">Default prompts</option>
            <option value="topic">By group</option>
            <option value="tag">By tag</option>
            <option value="status">By status</option>
          </select>
        </label>
        <button type="button" class="spd-btn" @click="showHelpCreate = true">
          <Sparkles :size="14" :stroke-width="2" />
          Help me create prompts
        </button>
        <button type="button" class="spd-btn spd-btn-primary" @click="openAddPrompt">
          <Plus :size="14" :stroke-width="2.2" />
          Add Prompt
        </button>
      </div>
    </div>

    <!-- Tag filter row -->
    <div v-if="allTags.length" class="spd-tagfilter">
      <span class="spd-tagfilter-label"><Tag :size="13" :stroke-width="1.8" /> Tags</span>
      <button
        v-for="tag in allTags"
        :key="tag"
        type="button"
        class="spd-tag spd-tag-btn"
        :class="[`is-${tagClass(tag)}`, { 'is-selected': selectedTags.has(tag) }]"
        @click="toggleTagFilter(tag)"
      >{{ tag }}</button>
      <button v-if="selectedTags.size" type="button" class="spd-tag-clear" @click="clearTagFilter">
        <X :size="12" :stroke-width="2.2" /> Clear
      </button>
    </div>

    <!-- Prompt count -->
    <div class="spd-countline">{{ sorted.length }} {{ sorted.length === 1 ? 'prompt' : 'prompts' }}</div>

    <!-- Bulk action bar -->
    <div v-if="selectedIds.size" class="spd-bulkbar">
      <span class="spd-bulk-count">{{ selectedIds.size }} selected</span>
      <div class="spd-bulk-actions">
        <button v-if="status === 'active'" type="button" class="spd-bulk-btn" :disabled="bulkPending" @click="bulkSetActive(false)">
          <Archive :size="14" :stroke-width="2" /> Archive
        </button>
        <button v-else type="button" class="spd-bulk-btn" :disabled="bulkPending" @click="bulkSetActive(true)">
          <ArchiveRestore :size="14" :stroke-width="2" /> Unarchive
        </button>
        <button type="button" class="spd-bulk-btn spd-bulk-danger" :disabled="bulkPending" @click="bulkDelete">
          <Trash2 :size="14" :stroke-width="2" /> Delete
        </button>
        <button type="button" class="spd-bulk-btn spd-bulk-ghost" @click="selectedIds = new Set()">Clear</button>
      </div>
    </div>

    <!-- Table -->
    <div class="spd-table-wrap">
      <div v-if="loading" class="spd-empty">
        <div class="spd-spinner" aria-hidden="true"></div>
        <p>Loading saved prompts…</p>
      </div>

      <div v-else-if="!sorted.length" class="spd-empty">
        <Inbox :size="36" :stroke-width="1.5" />
        <h3 v-if="hasActiveFilters">No prompts match these filters</h3>
        <h3 v-else-if="status === 'archived'">No archived prompts</h3>
        <h3 v-else>No prompts yet</h3>
        <p v-if="hasActiveFilters">Try clearing the topic, tag, or search filters.</p>
        <p v-else>Add your own prompts, or generate some from a description.</p>
        <button v-if="hasActiveFilters" class="spd-btn spd-btn-primary spd-add-empty" @click="resetFilters">Clear filters</button>
        <button v-else class="spd-btn spd-btn-primary spd-add-empty" @click="openAddPrompt">
          <Plus :size="14" :stroke-width="2.2" /> Add your first prompt
        </button>
      </div>

      <Table v-else class="spd-table">
        <TableHeader>
          <TableRow>
            <TableHead class="spd-th-check">
              <input type="checkbox" :checked="allSelected" @change="toggleAll" />
            </TableHead>
            <TableHead class="spd-th-prompt">Prompt</TableHead>
            <TableHead class="num spd-th-sort" @click="setSort('visibility')">
              <span class="spd-th-with-icon">Visibility<component :is="sortIcon('visibility')" :size="12" :stroke-width="2" /></span>
            </TableHead>
            <TableHead class="num spd-th-sort" @click="setSort('sentiment')">
              <span class="spd-th-with-icon">Sentiment<component :is="sortIcon('sentiment')" :size="12" :stroke-width="2" /></span>
            </TableHead>
            <TableHead class="num spd-th-sort" @click="setSort('position')">
              <span class="spd-th-with-icon">Position<component :is="sortIcon('position')" :size="12" :stroke-width="2" /></span>
            </TableHead>
            <TableHead>Mentions</TableHead>
            <TableHead class="spd-th-sort" @click="setSort('volume')">
              <span class="spd-th-with-icon">Volume<component :is="sortIcon('volume')" :size="12" :stroke-width="2" /></span>
            </TableHead>
            <TableHead>Tags</TableHead>
            <TableHead class="num">Origin</TableHead>
            <TableHead>Last run</TableHead>
            <TableHead>Next run</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-for="group in groups" :key="group.key">
            <TableRow v-if="groupBy !== 'none'" class="spd-group-row">
              <TableCell :colspan="11" class="spd-group-head">
                {{ group.label }} <span class="spd-group-count">{{ group.rows.length }}</span>
              </TableCell>
            </TableRow>
            <TableRow v-for="row in group.rows" :key="row.brand_prompt_id" @click="openDetail(row)">
              <TableCell @click.stop>
                <input type="checkbox" :checked="selectedIds.has(row.brand_prompt_id)" @change="toggleRow(row)" />
              </TableCell>
              <TableCell class="spd-td-prompt">{{ row.text }}</TableCell>
              <TableCell class="num"><span class="spd-vis">{{ row.visibility_pct }}%</span></TableCell>
              <TableCell class="num">
                <template v-if="row.sentiment_score != null">
                  <span class="spd-sent-dot" :class="sentimentClass(row.sentiment_score)"></span>
                  {{ row.sentiment_score }}
                </template>
                <span v-else class="spd-mute">—</span>
              </TableCell>
              <TableCell class="num">
                <span v-if="row.avg_position != null" class="spd-pos"># {{ row.avg_position }}</span>
                <span v-else class="spd-mute">—</span>
              </TableCell>
              <TableCell>
                <div class="spd-mentions">
                  <span
                    v-for="(p, i) in row.models_mentioned.slice(0, 3)"
                    :key="p"
                    class="spd-mention-dot"
                    :class="`is-${p}`"
                    :title="p"
                    :style="{ zIndex: 5 - i }"
                  ></span>
                  <span v-if="row.models_mentioned.length > 3" class="spd-mention-more">+{{ row.models_mentioned.length - 3 }}</span>
                  <span v-if="!row.models_mentioned.length" class="spd-mute"><CloudOff :size="14" :stroke-width="1.8" /></span>
                </div>
              </TableCell>
              <TableCell>
                <span class="spd-volume" :title="`Demand ${row.demand_score}`">
                  <span v-for="i in 4" :key="i" class="spd-vol-bar" :class="{ 'is-on': demandBars(row.demand_score) >= i }"></span>
                </span>
              </TableCell>
              <TableCell @click.stop>
                <template v-if="(row.tags || []).length">
                  <button
                    v-for="t in row.tags"
                    :key="t"
                    type="button"
                    class="spd-tag spd-tag-btn"
                    :class="[`is-${tagClass(t)}`, { 'is-selected': selectedTags.has(t) }]"
                    :title="`Filter by ${t}`"
                    @click="toggleTagFilter(t)"
                  >{{ t }}</button>
                </template>
                <span v-else class="spd-mute">—</span>
              </TableCell>
              <TableCell class="num spd-loc">
                <template v-if="row.location">
                  <span aria-hidden="true">{{ flag(row.location) }}</span> {{ countryName(row.location) }}
                </template>
                <span v-else class="spd-mute">🌐 Global</span>
              </TableCell>
              <TableCell class="spd-runcell">
                <span v-if="row.last_run_at" :title="fullDate(row.last_run_at)">{{ shortDate(row.last_run_at) }}</span>
                <span v-else class="spd-mute">Never</span>
              </TableCell>
              <TableCell class="spd-runcell">
                <template v-if="row.next_run_at">
                  <span class="spd-next" :title="fullDate(row.next_run_at)">{{ shortDate(row.next_run_at) }}</span>
                  <span v-if="row.schedule_frequency" class="spd-freq">{{ row.schedule_frequency }}</span>
                </template>
                <span v-else class="spd-mute">Not scheduled</span>
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
    </div>

    <!-- Add prompt / bulk upload modal -->
    <div
      v-if="showAdd"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="showAdd = false"
    >
      <div class="w-full max-w-xl rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <!-- tab switch -->
        <div class="mb-5 flex rounded-xl bg-secondary p-1">
          <button
            type="button"
            class="flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors"
            :class="addTab === 'add' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'"
            @click="addTab = 'add'"
          >Add Prompt</button>
          <button
            type="button"
            class="flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors"
            :class="addTab === 'bulk' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'"
            @click="addTab = 'bulk'"
          >Bulk Upload</button>
        </div>

        <!-- ADD PROMPT -->
        <template v-if="addTab === 'add'">
          <h3 class="text-base font-semibold text-foreground">Add Prompt</h3>
          <p class="mb-4 text-sm text-muted-foreground">Add your own prompts. Every line becomes a separate prompt.</p>

          <div class="mb-1 flex items-center justify-between">
            <label class="text-xs font-medium text-muted-foreground">Prompt</label>
            <span class="text-xs text-muted-foreground">{{ promptCount }} prompt{{ promptCount === 1 ? '' : 's' }}</span>
          </div>
          <textarea
            v-model="addText"
            rows="3"
            placeholder="e.g. any alternative to rocket money"
            class="mb-4 w-full rounded-lg border border-border bg-background p-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          ></textarea>

          <label class="mb-1 block text-xs font-medium text-muted-foreground">Group</label>
          <input
            v-model="addTopic"
            list="spd-topic-options"
            placeholder="Default prompts — pick or type a group"
            class="mb-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p class="mb-4 text-xs text-muted-foreground">Leave empty to file under <strong>Default prompts</strong>.</p>
          <datalist id="spd-topic-options">
            <option v-for="t in topics" :key="t.name" :value="t.name" />
          </datalist>

          <label class="mb-1 block text-xs font-medium text-muted-foreground">Origin</label>
          <select
            v-model="addLocation"
            class="mb-4 w-full rounded-lg border border-border bg-background p-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option v-for="l in LOCATIONS" :key="l.code" :value="l.code">{{ l.name }}</option>
          </select>

          <label class="mb-1.5 block text-xs font-medium text-muted-foreground">Tags</label>
          <div class="mb-5 flex flex-wrap gap-2">
            <button
              v-for="tag in TAG_PRESETS"
              :key="tag"
              type="button"
              class="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
              :class="addTags.includes(tag)
                ? 'border-ring bg-secondary text-foreground'
                : 'border-border text-muted-foreground hover:border-ring'"
              @click="toggleTag(tag)"
            >{{ tag }}</button>
          </div>

          <div class="flex justify-end gap-2">
            <button type="button" class="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-secondary" @click="showAdd = false">Cancel</button>
            <button
              type="button"
              class="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              :disabled="addPending"
              @click="submitAdd"
            >{{ addPending ? 'Adding…' : 'Add Prompt' }}</button>
          </div>
        </template>

        <!-- BULK UPLOAD -->
        <template v-else>
          <p class="mb-3 text-center text-sm text-muted-foreground">
            Make sure your CSV follows the required format or
            <button type="button" class="underline hover:text-foreground" @click="downloadCsvExample">download example</button>.
          </p>
          <label
            class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-6 py-10 text-center hover:border-ring"
            @dragover.prevent
            @drop.prevent="onCsvFile"
          >
            <Plus :size="22" :stroke-width="1.8" class="text-muted-foreground" />
            <span class="text-sm text-foreground">Drag and drop your file here, or <span class="underline">click to browse</span></span>
            <input type="file" accept=".csv,text/csv" class="hidden" @change="onCsvFile" />
          </label>
          <div class="mt-5 flex justify-end">
            <button type="button" class="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-secondary" @click="showAdd = false">Cancel</button>
          </div>
        </template>
      </div>
    </div>

    <!-- Help me create prompts (placeholder — full flow to be designed later) -->
    <div
      v-if="showHelpCreate"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="showHelpCreate = false"
    >
      <div class="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
        <div class="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-secondary">
          <Sparkles :size="20" :stroke-width="2" class="text-foreground" />
        </div>
        <h3 class="text-base font-semibold text-foreground">Help me create prompts</h3>
        <p class="mx-auto mb-5 mt-1 max-w-xs text-sm text-muted-foreground">
          We'll help you draft and pitch prompt ideas for your brand. This flow is coming soon.
        </p>
        <button
          type="button"
          class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          @click="showHelpCreate = false"
        >Got it</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import promptLibrary from '@/api/promptLibrary'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  Archive, ArchiveRestore, ChevronDown, ChevronsUpDown, ChevronUp, CloudOff,
  Folder, Inbox, Layers, Plus, Search, Sparkles, Tag, Trash2, X,
} from '@lucide/vue'
import { useToast } from '@/composables/useToast'

defineEmits(['go-search'])

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const toast = useToast()
const websiteId = route.params.websiteId

/* ── Data ── */
const rows = ref([])
const topics = ref([])
const allTags = ref([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const { data } = await promptLibrary.savedPromptsAgg(websiteId)
    const body = data?.data || data || {}
    rows.value = body.rows || []
    topics.value = body.topics || []
    // Prefer the server's distinct tag list; fall back to deriving from rows.
    // The agg endpoint returns all_tags as {name, count} objects, while
    // row.tags are plain strings — normalize to strings so filtering matches.
    const rawTags = (body.all_tags && body.all_tags.length)
      ? body.all_tags.map((t) => (typeof t === 'string' ? t : t?.name)).filter(Boolean)
      : (body.rows || []).flatMap((r) => r.tags || [])
    allTags.value = [...new Set(rawTags)]
  } catch (_) {
    rows.value = []
    topics.value = []
    allTags.value = []
  } finally {
    loading.value = false
  }
}
onMounted(() => { load(); loadRegions() })
defineExpose({ load, get count() { return rows.value.length } })

/* ── Filters / sort / group state ── */
const status = ref('active')          // 'active' | 'archived'
const activeTopic = ref('')
const selectedTags = ref(new Set())
const search = ref('')
const groupBy = ref('none')           // 'none' | 'topic' | 'tag' | 'status'
const sortKey = ref('visibility')     // visibility | sentiment | position | volume | none
const sortDir = ref('desc')           // 'asc' | 'desc'

const hasActiveFilters = computed(() =>
  !!activeTopic.value || selectedTags.value.size > 0 || !!search.value.trim())

function resetFilters() {
  activeTopic.value = ''
  selectedTags.value = new Set()
  search.value = ''
}

function toggleTagFilter(tag) {
  const next = new Set(selectedTags.value)
  if (next.has(tag)) next.delete(tag); else next.add(tag)
  selectedTags.value = next
}
function clearTagFilter() { selectedTags.value = new Set() }

const filtered = computed(() => {
  let list = rows.value.filter((r) => (status.value === 'archived' ? !r.is_active : r.is_active))
  if (activeTopic.value) list = list.filter((r) => r.topic === activeTopic.value)
  if (selectedTags.value.size) {
    // A prompt matches if it carries every selected tag (AND semantics).
    list = list.filter((r) => [...selectedTags.value].every((t) => (r.tags || []).includes(t)))
  }
  const q = search.value.trim().toLowerCase()
  if (q) list = list.filter((r) => (r.text || '').toLowerCase().includes(q))
  return list
})

/* Sorting. Nulls always sort to the bottom regardless of direction. */
const SORT_ACCESSORS = {
  visibility: (r) => r.visibility_pct,
  sentiment: (r) => r.sentiment_score,
  position: (r) => r.avg_position,
  volume: (r) => r.demand_score,
}
const sorted = computed(() => {
  const key = sortKey.value
  const accessor = SORT_ACCESSORS[key]
  if (!accessor) return filtered.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...filtered.value].sort((a, b) => {
    const av = accessor(a); const bv = accessor(b)
    const an = av == null; const bn = bv == null
    if (an && bn) return 0
    if (an) return 1
    if (bn) return -1
    return (av - bv) * dir
  })
})

function setSort(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    // Position is "lower is better", so default it ascending; others descending.
    sortDir.value = key === 'position' ? 'asc' : 'desc'
  }
}
function sortIcon(key) {
  if (sortKey.value !== key) return ChevronsUpDown
  return sortDir.value === 'asc' ? ChevronUp : ChevronDown
}

/* Grouping. Returns [{ key, label, rows }]. A single "All" group when off. */
const groups = computed(() => {
  const list = sorted.value
  if (groupBy.value === 'none') return [{ key: '__all__', label: '', rows: list }]

  const buckets = new Map()
  const push = (key, label, row) => {
    if (!buckets.has(key)) buckets.set(key, { key, label, rows: [] })
    buckets.get(key).rows.push(row)
  }
  for (const row of list) {
    if (groupBy.value === 'topic') {
      push(row.topic || '__none__', row.topic || 'Default prompts', row)
    } else if (groupBy.value === 'status') {
      push(row.is_active ? 'active' : 'archived', row.is_active ? 'Active' : 'Archived', row)
    } else if (groupBy.value === 'tag') {
      const first = (row.tags || [])[0]
      push(first || '__none__', first || 'Untagged', row)
    }
  }
  return [...buckets.values()].sort((a, b) => a.label.localeCompare(b.label))
})

/* ── Selection + bulk actions ── */
const selectedIds = ref(new Set())
const bulkPending = ref(false)
const allSelected = computed(() =>
  sorted.value.length > 0 && sorted.value.every((r) => selectedIds.value.has(r.brand_prompt_id)))
function toggleRow(row) {
  const next = new Set(selectedIds.value)
  if (next.has(row.brand_prompt_id)) next.delete(row.brand_prompt_id)
  else next.add(row.brand_prompt_id)
  selectedIds.value = next
}
function toggleAll() {
  selectedIds.value = allSelected.value
    ? new Set()
    : new Set(sorted.value.map((r) => r.brand_prompt_id))
}
function selectedRows() {
  return rows.value.filter((r) => selectedIds.value.has(r.brand_prompt_id))
}

// Archive == deactivate the prompt (is_active=false); Unarchive re-enables.
// Reuses the existing per-prompt enable/disable endpoints (no bulk endpoint).
async function bulkSetActive(active) {
  const targets = selectedRows()
  if (!targets.length) return
  bulkPending.value = true
  try {
    const call = active ? promptLibrary.enable : promptLibrary.disable
    const results = await Promise.allSettled(targets.map((r) => call(r.id)))
    const ok = results.filter((x) => x.status === 'fulfilled').length
    toast.success(`${active ? 'Unarchived' : 'Archived'} ${ok} prompt${ok === 1 ? '' : 's'}.`)
    selectedIds.value = new Set()
    await load()
  } catch (e) {
    toast.error(e?.displayMessage || 'Could not update prompts.')
  } finally {
    bulkPending.value = false
  }
}
async function bulkDelete() {
  const targets = selectedRows()
  if (!targets.length) return
  if (!window.confirm(`Delete ${targets.length} prompt${targets.length === 1 ? '' : 's'}? This can't be undone.`)) return
  bulkPending.value = true
  try {
    const results = await Promise.allSettled(targets.map((r) => promptLibrary.removeBrandPrompt(r.brand_prompt_id)))
    const ok = results.filter((x) => x.status === 'fulfilled').length
    toast.success(`Deleted ${ok} prompt${ok === 1 ? '' : 's'}.`)
    selectedIds.value = new Set()
    await load()
  } catch (e) {
    toast.error(e?.displayMessage || 'Could not delete prompts.')
  } finally {
    bulkPending.value = false
  }
}

function openDetail(row) {
  router.push(`/llm-ranking/${websiteId}/prompts/${row.id}/detail`)
}

/* ── Presentation helpers ── */
function sentimentClass(score) {
  if (score == null) return 'is-mute'
  if (score >= 70) return 'is-pos'
  if (score >= 50) return 'is-neu'
  return 'is-neg'
}
function demandBars(score) {
  const v = Number(score) || 0
  if (v >= 0.75) return 4
  if (v >= 0.5) return 3
  if (v >= 0.25) return 2
  if (v > 0) return 1
  return 0
}
// Normalize a tag to the CSS colour-class suffix (e.g. "non-branded" -> "nonbranded").
function tagClass(tag) { return String(tag || '').toLowerCase().replace(/[^a-z0-9]/g, '') }
function flag(code) {
  if (!code || code.length !== 2) return '🌐'
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)))
}
// Short date for the Last run / Next run columns (e.g. "Aug 16").
function shortDate(v) {
  if (!v) return ''
  const d = new Date(v)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
function fullDate(v) {
  if (!v) return ''
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString()
}
// Full country name from an ISO-2 code (e.g. "LK" -> "Sri Lanka").
function countryName(code) {
  if (!code) return ''
  if (code.length !== 2) return code
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase()) || code
  } catch (_) {
    return code
  }
}

/* ── Modals ── */
const showHelpCreate = ref(false)

/* ── Add prompt / bulk upload modal ── */
const showAdd = ref(false)
const addTab = ref('add')
const addText = ref('')
const addTopic = ref('')
const addLocation = ref('US')
const addTags = ref([])
const addPending = ref(false)
const TAG_PRESETS = ['branded', 'non-branded', 'informational', 'transactional']
const LOCATIONS = ref([{ code: 'US', name: 'United States' }])

async function loadRegions() {
  try {
    const { data } = await promptLibrary.getRegions()
    const list = (data?.data || data || {}).countries || []
    if (list.length) LOCATIONS.value = list
  } catch (_) { /* keep the default */ }
}
const promptCount = computed(() =>
  addText.value.split('\n').map((l) => l.trim()).filter(Boolean).length)

function resetAddForm() {
  addText.value = ''
  addTags.value = []
  addLocation.value = 'US'
  addTab.value = 'add'
}
function openAddPrompt() {
  resetAddForm()
  addTopic.value = activeTopic.value || ''
  showAdd.value = true
}
function toggleTag(tag) {
  const i = addTags.value.indexOf(tag)
  if (i >= 0) addTags.value.splice(i, 1)
  else addTags.value.push(tag)
}
async function submitAdd() {
  const text = addText.value.trim()
  if (!text) { toast.error('Enter at least one prompt.'); return }
  addPending.value = true
  try {
    const res = await promptLibrary.createWebsitePrompt(websiteId, {
      text,
      topic: addTopic.value.trim(),
      location: addLocation.value,
      tags: addTags.value,
      intent_bucket: 'category',
      style: 'question',
    })
    const body = res?.data?.data || res?.data || {}
    const n = body.created_count || promptCount.value
    toast.success(`Added ${n} prompt${n === 1 ? '' : 's'} · scanning…`)
    showAdd.value = false
    const t = addTopic.value.trim()
    if (t) activeTopic.value = t
    await load()
  } catch (e) {
    toast.error(e?.displayMessage || 'Could not add prompt.')
  } finally {
    addPending.value = false
  }
}

/* Bulk CSV: one prompt per row (a leading "prompt" header is ignored). */
function downloadCsvExample() {
  const sample = 'prompt\nbest budgeting apps in 2026\nalternatives to rocket money\nhow do I automate my savings\n'
  const blob = new Blob([sample], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'prompts-example.csv'
  a.click()
  URL.revokeObjectURL(url)
}
function parseCsv(content) {
  const csvRows = content.split(/\r?\n/).map((r) => r.trim()).filter(Boolean)
  if (csvRows.length && /^"?prompts?"?$/i.test(csvRows[0])) csvRows.shift()
  return csvRows.map((r) => r.split(',')[0].replace(/^"|"$/g, '').trim()).filter(Boolean)
}
async function onCsvFile(e) {
  const file = (e.target.files || e.dataTransfer?.files || [])[0]
  if (!file) return
  const content = await file.text()
  const prompts = parseCsv(content)
  if (!prompts.length) { toast.error('No prompts found in that file.'); return }
  addText.value = prompts.join('\n')
  addTab.value = 'add'
  toast.success(`Loaded ${prompts.length} prompts — review and add.`)
}

// appStore kept for future website-scoped context; referenced to avoid an unused binding.
void appStore
</script>

<style scoped>
.spd { display: flex; flex-direction: column; gap: 14px; }

/* ── Toolbar ── */
.spd-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.spd-toolbar-left, .spd-toolbar-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.spd-search-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 240px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card);
}
.spd-search-wrap svg { color: var(--muted-foreground); }
.spd-search {
  flex: 1;
  border: none;
  background: transparent;
  padding: 9px 0;
  font: inherit;
  font-size: 0.88rem;
  color: var(--foreground);
}
.spd-search:focus { outline: none; }

.spd-segmented {
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  background: var(--muted);
  border-radius: 10px;
}
.spd-seg-btn {
  appearance: none;
  border: none;
  background: transparent;
  padding: 6px 16px;
  border-radius: 8px;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--muted-foreground);
  cursor: pointer;
}
.spd-seg-btn.is-on { background: var(--card); color: var(--foreground); font-weight: 600; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06); }

.spd-field {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card);
}
.spd-field svg { color: var(--muted-foreground); }
.spd-select {
  appearance: none;
  border: none;
  background: transparent;
  padding: 8px 4px;
  font: inherit;
  font-size: 0.85rem;
  color: var(--foreground);
  cursor: pointer;
}
.spd-select:focus { outline: none; }

.spd-btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--foreground);
  cursor: pointer;
}
.spd-btn:hover { background: var(--muted); }
.spd-btn svg { color: var(--muted-foreground); }
.spd-btn-primary { background: var(--foreground); color: var(--primary-foreground); border-color: var(--foreground); }
.spd-btn-primary:hover { opacity: 0.92; background: var(--foreground); }
.spd-btn-primary svg { color: var(--primary-foreground); }

/* ── Tag filter row ── */
.spd-tagfilter { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.spd-tagfilter-label {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 0.78rem; font-weight: 600; color: var(--muted-foreground);
  text-transform: uppercase; letter-spacing: 0.04em; margin-right: 2px;
}
.spd-tag-btn { appearance: none; border: 1px solid transparent; cursor: pointer; }
.spd-tag-btn.is-selected { outline: 2px solid var(--foreground); outline-offset: 1px; }
.spd-tag-clear {
  appearance: none; display: inline-flex; align-items: center; gap: 3px;
  border: none; background: transparent; cursor: pointer;
  font: inherit; font-size: 0.78rem; color: var(--muted-foreground);
}
.spd-tag-clear:hover { color: var(--foreground); }

/* ── Count line ── */
.spd-countline {
  font-size: 0.82rem;
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
  padding: 0 2px;
}

/* ── Bulk bar ── */
.spd-bulkbar {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 10px 16px;
  background: color-mix(in oklab, var(--foreground) 6%, var(--card));
  border: 1px solid var(--border);
  border-radius: 12px;
}
.spd-bulk-count { font-size: 0.85rem; font-weight: 600; color: var(--foreground); }
.spd-bulk-actions { display: inline-flex; gap: 8px; }
.spd-bulk-btn {
  appearance: none; display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border: 1px solid var(--border); border-radius: 8px;
  background: var(--card); font: inherit; font-size: 0.82rem; font-weight: 500;
  color: var(--foreground); cursor: pointer;
}
.spd-bulk-btn:hover { background: var(--muted); }
.spd-bulk-btn:disabled { opacity: 0.5; cursor: default; }
.spd-bulk-btn svg { color: var(--muted-foreground); }
.spd-bulk-danger { color: #b91c1c; }
.spd-bulk-danger svg { color: #b91c1c; }
.spd-bulk-ghost { border-color: transparent; background: transparent; color: var(--muted-foreground); }

/* ── Table ── */
.spd-table-wrap {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.spd-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
.spd-table th {
  text-align: left;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted-foreground);
  padding: 12px 14px;
  background: var(--muted);
  border-bottom: 1px solid var(--border);
}
.spd-table th.num, .spd-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
.spd-th-check { width: 36px; }
.spd-th-prompt { width: auto; }
.spd-th-with-icon { display: inline-flex; align-items: center; gap: 4px; }
.spd-th-sort { cursor: pointer; user-select: none; }
.spd-th-sort:hover { color: var(--foreground); }
.spd-table td {
  padding: 14px;
  color: var(--foreground);
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}
.spd-table tbody tr { cursor: pointer; transition: background 0.12s ease; }
.spd-table tbody tr:hover { background: var(--muted); }
.spd-table tbody tr:last-child td { border-bottom: none; }
.spd-td-prompt { font-weight: 500; color: var(--foreground); }
.spd-mute { color: var(--muted-foreground); }

/* Group header rows */
.spd-group-row { cursor: default; }
.spd-group-row:hover { background: transparent; }
.spd-group-head {
  background: var(--muted);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted-foreground);
  padding: 8px 14px;
}
.spd-group-count {
  margin-left: 6px;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--card);
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}

.spd-vis { font-weight: 600; }
.spd-pos { font-weight: 500; }
.spd-sent-dot {
  display: inline-block; width: 6px; height: 6px; border-radius: 50%;
  background: var(--muted-foreground); margin-right: 4px; vertical-align: middle;
}
.spd-sent-dot.is-pos { background: #10b981; }
.spd-sent-dot.is-neu { background: #6b7280; }
.spd-sent-dot.is-neg { background: #ef4444; }

.spd-mentions { display: inline-flex; align-items: center; }
.spd-mention-dot {
  width: 22px; height: 22px; border-radius: 50%;
  border: 2px solid var(--card); margin-left: -6px; display: inline-block;
}
.spd-mention-dot:first-child { margin-left: 0; }
.spd-mention-dot.is-claude { background: #ec6e3b; }
.spd-mention-dot.is-gpt4 { background: #34d399; }
.spd-mention-dot.is-gemini { background: #5b8def; }
.spd-mention-dot.is-perplexity { background: #1ea7a0; }
.spd-mention-dot.is-deepseek { background: #6366f1; }
.spd-mention-more { font-size: 0.75rem; color: var(--muted-foreground); margin-left: 6px; }

.spd-volume { display: inline-flex; gap: 2px; align-items: end; }
.spd-vol-bar { width: 4px; height: 8px; border-radius: 1px; background: var(--border); }
.spd-vol-bar:nth-child(2) { height: 11px; }
.spd-vol-bar:nth-child(3) { height: 14px; }
.spd-vol-bar:nth-child(4) { height: 17px; }
.spd-vol-bar.is-on { background: #10b981; }

.spd-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 500;
  margin-right: 4px;
  background: var(--muted);
  color: var(--muted-foreground);
}
.spd-tag.is-branded { background: rgba(37, 99, 235, 0.10); color: #1d4ed8; }
.spd-tag.is-nonbranded { background: rgba(245, 158, 11, 0.10); color: #b45309; }
.spd-tag.is-recommendation,
.spd-tag.is-transactional { background: rgba(239, 68, 68, 0.10); color: #b91c1c; }
.spd-tag.is-comparison { background: rgba(99, 102, 241, 0.10); color: #4338ca; }
.spd-tag.is-use_case,
.spd-tag.is-usecase,
.spd-tag.is-informational { background: rgba(6, 182, 212, 0.10); color: #0e7490; }
.spd-tag.is-persona { background: rgba(16, 185, 129, 0.10); color: #047857; }

.spd-loc { color: var(--muted-foreground); }

/* Last run / Next run columns */
.spd-runcell { white-space: nowrap; font-variant-numeric: tabular-nums; font-size: 0.82rem; }
.spd-next { font-weight: 600; color: var(--foreground); }
.spd-freq {
  margin-left: 6px;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--muted);
  color: var(--muted-foreground);
  font-size: 0.66rem;
  font-weight: 600;
  text-transform: capitalize;
}

/* ── Empty state + spinner ── */
.spd-empty {
  padding: 60px 24px;
  text-align: center;
  color: var(--muted-foreground);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.spd-empty h3 { margin: 6px 0 4px; color: var(--foreground); font-size: 1rem; }
.spd-empty p { margin: 0; font-size: 0.88rem; }
.spd-add-empty { margin-top: 10px; }
.spd-spinner {
  width: 22px; height: 22px; border-radius: 50%;
  border: 2px solid var(--border); border-top-color: var(--foreground);
  animation: spd-spin 0.7s linear infinite;
}
@keyframes spd-spin { to { transform: rotate(360deg); } }
</style>
