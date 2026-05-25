<template>
  <div class="spd">
    <!-- Filter chip bar -->
    <div class="spd-chips">
      <button class="spd-chip">
        <Building :size="13" :stroke-width="1.8"/>
        {{ websiteName || 'This project' }}
        <ChevronDown :size="12" :stroke-width="2"/>
      </button>
      <button class="spd-chip">
        <Calendar :size="13" :stroke-width="1.8"/>
        All time
        <ChevronDown :size="12" :stroke-width="2"/>
      </button>
      <button class="spd-chip">
        <Tag :size="13" :stroke-width="1.8"/>
        All Tags
        <ChevronDown :size="12" :stroke-width="2"/>
      </button>
      <button class="spd-chip">
        <Bot :size="13" :stroke-width="1.8"/>
        All Models
        <ChevronDown :size="12" :stroke-width="2"/>
      </button>
      <button class="spd-chip">
        <Folder :size="13" :stroke-width="1.8"/>
        {{ activeTopic || 'All Topics' }}
        <ChevronDown :size="12" :stroke-width="2"/>
      </button>
    </div>

    <div class="spd-body">
      <!-- Left rail: Topics -->
      <aside class="spd-rail">
        <header class="spd-rail-head">
          <span class="spd-rail-title">Topics</span>
          <button class="spd-rail-sort" type="button" title="Sort">
            <ArrowUpDown :size="14" :stroke-width="1.8"/>
          </button>
        </header>
        <button class="spd-rail-add" type="button" @click="openNewTopic">
          <span>New topic</span>
          <Plus :size="14" :stroke-width="2"/>
        </button>
        <ul class="spd-rail-list">
          <li>
            <button
              type="button"
              class="spd-rail-item"
              :class="{ 'is-on': !activeTopic }"
              @click="activeTopic = ''"
            >
              <span class="spd-rail-name">All topics</span>
              <span class="spd-rail-count">{{ rows.length }}</span>
            </button>
          </li>
          <li v-for="t in topics" :key="t.name">
            <button
              type="button"
              class="spd-rail-item"
              :class="{ 'is-on': activeTopic === t.name }"
              @click="activeTopic = t.name"
            >
              <span class="spd-rail-name">{{ t.name }}</span>
              <span class="spd-rail-count">{{ t.count }}</span>
            </button>
          </li>
        </ul>
      </aside>

      <!-- Main column -->
      <section class="spd-main">
        <!-- Sub-tabs + count badge + actions -->
        <div class="spd-subtabs">
          <div class="spd-subtab-row">
            <button
              v-for="t in subTabs"
              :key="t.id"
              type="button"
              class="spd-subtab"
              :class="{ 'is-on': activeSub === t.id }"
              @click="activeSub = t.id"
            >
              {{ t.label }}
              <span v-if="t.id === 'suggested' && suggestedRows.length" class="spd-subtab-count">
                {{ suggestedRows.length }}
              </span>
            </button>
          </div>
          <div class="spd-head-actions">
            <span class="spd-head-count">
              <Check :size="13" :stroke-width="2.4"/>
              {{ rows.length }} / 50
            </span>
            <button
              v-if="activeSub === 'suggested'"
              type="button"
              class="spd-suggest"
              :disabled="suggestLoading"
              @click="loadSuggested"
              title="Pull a fresh batch of suggestions"
            >
              <Sparkles :size="14" :stroke-width="2"/>
              {{ suggestLoading ? 'Suggesting…' : 'Suggest more' }}
            </button>
            <button type="button" class="spd-add-prompt" @click="openAddPrompt">
              <Plus :size="14" :stroke-width="2.2"/>
              Add Prompt
            </button>
          </div>
        </div>

        <!-- KPI summary strip -->
        <div class="spd-kpis">
          <div class="spd-search-wrap">
            <Search :size="14" :stroke-width="2"/>
            <input
              v-model="search"
              type="search"
              placeholder="Search prompts…"
              class="spd-search"
            />
          </div>
          <div class="spd-kpi-row">
            <span class="spd-kpi">
              <span class="spd-kpi-label">Visibility</span>
              <strong>{{ kpi.visibility_pct || 0 }}%</strong>
            </span>
            <span class="spd-kpi-sep"></span>
            <span class="spd-kpi">
              <span class="spd-kpi-label">Sentiment</span>
              <span class="spd-kpi-dot" :class="sentimentClass(kpi.sentiment_score)"></span>
              <strong>{{ kpi.sentiment_score != null ? kpi.sentiment_score : '—' }}</strong>
            </span>
            <span class="spd-kpi-sep"></span>
            <span class="spd-kpi">
              <span class="spd-kpi-label">Position</span>
              <strong>{{ kpi.avg_position != null ? `# ${kpi.avg_position}` : '—' }}</strong>
            </span>
          </div>
        </div>

        <!-- Active / Archived table -->
        <div v-if="activeSub !== 'suggested'" class="spd-table-wrap">
          <Table v-if="filtered.length" class="spd-table">
            <TableHeader>
              <TableRow>
                <TableHead class="spd-th-check">
                  <input
                    type="checkbox"
                    :checked="allSelected"
                    @change="toggleAll"
                  />
                </TableHead>
                <TableHead class="spd-th-prompt">Prompt</TableHead>
                <TableHead class="num"><span class="spd-th-with-icon">Visibility<ChevronsUpDown :size="11" :stroke-width="2"/></span></TableHead>
                <TableHead class="num"><span class="spd-th-with-icon">Sentiment<ChevronsUpDown :size="11" :stroke-width="2"/></span></TableHead>
                <TableHead class="num"><span class="spd-th-with-icon">Position<ChevronsUpDown :size="11" :stroke-width="2"/></span></TableHead>
                <TableHead>Mentions</TableHead>
                <TableHead>Volume</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead class="num">Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in filtered" :key="row.brand_prompt_id" @click="openDetail(row)">
                <TableCell @click.stop>
                  <input
                    type="checkbox"
                    :checked="selectedIds.has(row.brand_prompt_id)"
                    @change="toggleRow(row)"
                  />
                </TableCell>
                <TableCell class="spd-td-prompt">{{ row.text }}</TableCell>
                <TableCell class="num">
                  <span class="spd-vis">{{ row.visibility_pct }}%</span>
                </TableCell>
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
                    <span
                      v-if="row.models_mentioned.length > 3"
                      class="spd-mention-more"
                    >+{{ row.models_mentioned.length - 3 }}</span>
                    <span v-if="!row.models_mentioned.length" class="spd-mute">
                      <CloudOff :size="14" :stroke-width="1.8"/>
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span class="spd-volume" :title="`Demand ${row.demand_score}`">
                    <span v-for="i in 4" :key="i" class="spd-vol-bar" :class="{ 'is-on': demandBars(row.demand_score) >= i }"></span>
                  </span>
                </TableCell>
                <TableCell>
                  <span class="spd-tag is-nonbranded">non-branded</span>
                  <span class="spd-tag" :class="`is-${row.intent_bucket}`">{{ row.intent_bucket }}</span>
                </TableCell>
                <TableCell class="num spd-loc"><span aria-hidden="true">🇺🇸</span> US</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <div v-else-if="loading" class="spd-empty">
            <div class="spd-spinner" aria-hidden="true"></div>
            <p>Loading saved prompts…</p>
          </div>

          <div v-else class="spd-empty">
            <Inbox :size="36" :stroke-width="1.5"/>
            <h3>No saved prompts yet</h3>
            <p>Switch to <strong>Suggested</strong> to pick prompts from the library.</p>
            <button class="spd-add spd-add-empty" @click="activeSub = 'suggested'">
              <Sparkles :size="14" :stroke-width="2"/>
              See suggestions
            </button>
          </div>
        </div>

        <!-- Suggested table -->
        <div v-else class="spd-table-wrap">
          <Table v-if="suggestedRows.length" class="spd-table">
            <TableHeader>
              <TableRow>
                <TableHead class="spd-th-check">
                  <input
                    type="checkbox"
                    :checked="allSuggestedSelected"
                    @change="toggleAllSuggested"
                  />
                </TableHead>
                <TableHead class="spd-th-prompt">Prompt</TableHead>
                <TableHead>Volume</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead class="num">Suggested at</TableHead>
                <TableHead class="num">Location</TableHead>
                <TableHead class="spd-th-act"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in suggestedFiltered" :key="row.id" class="spd-suggested-row">
                <TableCell @click.stop>
                  <input
                    type="checkbox"
                    :checked="selectedSuggested.has(row.id)"
                    @change="toggleSuggested(row)"
                  />
                </TableCell>
                <TableCell class="spd-td-prompt">{{ row.text }}</TableCell>
                <TableCell>
                  <span class="spd-volume" :title="`Demand ${row.demand_score}`">
                    <span v-for="i in 4" :key="i" class="spd-vol-bar" :class="{ 'is-on': demandBars(row.demand_score) >= i }"></span>
                  </span>
                </TableCell>
                <TableCell>
                  <span class="spd-tag is-nonbranded">non-branded</span>
                  <span class="spd-tag" :class="`is-${row.intent_bucket}`">{{ row.intent_bucket }}</span>
                </TableCell>
                <TableCell class="num spd-mute">{{ relTime(row.suggested_at) }}</TableCell>
                <TableCell class="num spd-loc"><span aria-hidden="true">🇺🇸</span> US</TableCell>
                <TableCell class="spd-act">
                  <button class="spd-act-btn spd-act-reject" title="Reject" @click.stop="rejectOne(row)">
                    <X :size="14" :stroke-width="2.2"/>
                  </button>
                  <button class="spd-act-btn spd-act-accept" title="Track this prompt" @click.stop="acceptOne(row)">
                    <Check :size="14" :stroke-width="2.4"/>
                  </button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <div v-else-if="suggestLoading" class="spd-empty">
            <div class="spd-spinner" aria-hidden="true"></div>
            <p>Pulling suggestions from the library…</p>
          </div>

          <div v-else class="spd-empty">
            <Sparkles :size="36" :stroke-width="1.5"/>
            <h3>No suggestions right now</h3>
            <p>Try <strong>Suggest more</strong> to pull a fresh batch from the library.</p>
          </div>
        </div>

        <footer class="spd-foot">
          <span v-if="activeSub === 'suggested'">{{ suggestedFiltered.length }} suggestions</span>
          <span v-else>{{ filtered.length }} Prompts</span>
          <div v-if="activeSub === 'suggested' && suggestedRows.length" class="spd-foot-actions">
            <button class="spd-archive" type="button" @click="rejectAll" :disabled="bulkPending">
              <X :size="13" :stroke-width="2"/>
              Reject all
            </button>
            <button class="spd-track-all" type="button" @click="trackAll" :disabled="bulkPending">
              <Check :size="13" :stroke-width="2.4"/>
              Track all
            </button>
          </div>
        </footer>
      </section>
    </div>
    <!-- Add prompt / new topic modal -->
    <div
      v-if="showAdd"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="showAdd = false"
    >
      <div class="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-xl">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-base font-semibold text-foreground">Add prompt</h3>
          <button class="text-muted-foreground hover:text-foreground" @click="showAdd = false">
            <X :size="18" :stroke-width="2"/>
          </button>
        </div>
        <label class="mb-1 block text-xs font-medium text-muted-foreground">Prompt</label>
        <textarea
          v-model="addText"
          rows="3"
          placeholder="e.g. What are the best budgeting apps in 2026?"
          class="mb-3 w-full rounded-lg border border-border bg-background p-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        ></textarea>
        <label class="mb-1 block text-xs font-medium text-muted-foreground">Topic (bundle)</label>
        <input
          v-model="addTopic"
          list="spd-topic-options"
          placeholder="Pick an existing topic or type a new one"
          class="mb-4 w-full rounded-lg border border-border bg-background p-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <datalist id="spd-topic-options">
          <option v-for="t in topics" :key="t.name" :value="t.name" />
        </datalist>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-secondary"
            @click="showAdd = false"
          >Cancel</button>
          <button
            type="button"
            class="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            :disabled="addPending"
            @click="submitAdd"
          >{{ addPending ? 'Adding…' : 'Add prompt' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import promptLibrary from '@/api/promptLibrary'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  ArrowUpDown, Bot, Building, Calendar, Check, ChevronDown, ChevronsUpDown,
  CloudOff, Folder, Inbox, Plus, Search, Sparkles, Tag, X,
} from '@lucide/vue'
// Plus stays imported even though it's only referenced from the
// 'New topic' rail button; keeping it next to the other rail icons.

import { useToast } from '@/composables/useToast'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const toast = useToast()
const websiteId = route.params.websiteId
const websiteName = computed(() => appStore.activeWebsite?.name || '')

/* ── Add prompt / new topic ── */
const showAdd = ref(false)
const addText = ref('')
const addTopic = ref('')
const addPending = ref(false)

function openAddPrompt() {
  addText.value = ''
  addTopic.value = activeTopic.value || ''
  showAdd.value = true
}
function openNewTopic() {
  addText.value = ''
  addTopic.value = ''
  showAdd.value = true
}
async function submitAdd() {
  const text = addText.value.trim()
  if (!text) { toast.error('Enter the prompt text.'); return }
  addPending.value = true
  try {
    await promptLibrary.createWebsitePrompt(websiteId, {
      text,
      topic: addTopic.value.trim(),
      intent_bucket: 'category',
      style: 'question',
    })
    toast.success('Prompt added')
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

const rows = ref([])
const topics = ref([])
const kpi = ref({ visibility_pct: 0, sentiment_score: null, avg_position: null })
const loading = ref(true)

const activeTopic = ref('')
const subTabs = [
  { id: 'active', label: 'Active' },
  { id: 'suggested', label: 'Suggested' },
  { id: 'archived', label: 'Archived' },
]
const activeSub = ref('active')
const search = ref('')
const selectedIds = ref(new Set())

async function load() {
  loading.value = true
  try {
    const { data } = await promptLibrary.savedPromptsAgg(websiteId)
    const body = data?.data || data || {}
    rows.value = body.rows || []
    topics.value = body.topics || []
    kpi.value = body.kpi || { visibility_pct: 0, sentiment_score: null, avg_position: null }
  } catch (_) {
    rows.value = []
    topics.value = []
  } finally {
    loading.value = false
  }
}
onMounted(load)

defineExpose({ load, get count() { return rows.value.length } })

const filtered = computed(() => {
  let list = rows.value
  if (activeSub.value === 'archived') list = list.filter((r) => !r.is_active)
  else list = list.filter((r) => r.is_active)
  if (activeTopic.value) list = list.filter((r) => r.topic === activeTopic.value)
  const q = search.value.trim().toLowerCase()
  if (q) list = list.filter((r) => (r.text || '').toLowerCase().includes(q))
  return list
})

const allSelected = computed(() =>
  filtered.value.length > 0 &&
  filtered.value.every((r) => selectedIds.value.has(r.brand_prompt_id)),
)
function toggleRow(row) {
  const next = new Set(selectedIds.value)
  if (next.has(row.brand_prompt_id)) next.delete(row.brand_prompt_id)
  else next.add(row.brand_prompt_id)
  selectedIds.value = next
}
function toggleAll() {
  if (allSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(filtered.value.map((r) => r.brand_prompt_id))
  }
}

function openDetail(row) {
  router.push(`/llm-ranking/${websiteId}/prompts/${row.id}/detail`)
}

function sentimentClass(score) {
  if (score == null) return 'is-mute'
  if (score >= 70) return 'is-pos'
  if (score >= 50) return 'is-neu'
  return 'is-neg'
}
function demandBars(score) {
  const v = Number(score) || 0
  if (v >= 0.75) return 4
  if (v >= 0.5)  return 3
  if (v >= 0.25) return 2
  if (v > 0)     return 1
  return 0
}

// ── Suggested-tab state + handlers ───────────────────────────────
const suggestedRows = ref([])
const suggestLoading = ref(false)
const bulkPending = ref(false)
const selectedSuggested = ref(new Set())

async function loadSuggested() {
  suggestLoading.value = true
  try {
    const { data } = await promptLibrary.suggestedPrompts(websiteId)
    const body = data?.data || data || {}
    suggestedRows.value = body.rows || []
  } catch (_) {
    suggestedRows.value = []
  } finally {
    suggestLoading.value = false
  }
}

// Fetch suggestions the first time the user clicks into the tab.
watch(() => activeSub.value, (tab) => {
  if (tab === 'suggested' && !suggestedRows.value.length && !suggestLoading.value) {
    loadSuggested()
  }
})

const suggestedFiltered = computed(() => {
  if (!activeTopic.value) return suggestedRows.value
  return suggestedRows.value.filter((r) => r.topic === activeTopic.value)
})
const allSuggestedSelected = computed(() =>
  suggestedFiltered.value.length > 0 &&
  suggestedFiltered.value.every((r) => selectedSuggested.value.has(r.id)),
)
function toggleSuggested(row) {
  const next = new Set(selectedSuggested.value)
  if (next.has(row.id)) next.delete(row.id); else next.add(row.id)
  selectedSuggested.value = next
}
function toggleAllSuggested() {
  if (allSuggestedSelected.value) {
    selectedSuggested.value = new Set()
  } else {
    selectedSuggested.value = new Set(suggestedFiltered.value.map((r) => r.id))
  }
}

async function acceptOne(row) {
  try {
    await promptLibrary.actSuggestion(websiteId, 'accept', row.id)
    suggestedRows.value = suggestedRows.value.filter((r) => r.id !== row.id)
    selectedSuggested.value.delete(row.id)
    load() // refresh the saved-prompts aggregate
  } catch (_) { /* surface via toast in the parent if needed */ }
}
async function rejectOne(row) {
  try {
    await promptLibrary.actSuggestion(websiteId, 'reject', row.id)
    suggestedRows.value = suggestedRows.value.filter((r) => r.id !== row.id)
    selectedSuggested.value.delete(row.id)
  } catch (_) {}
}
async function trackAll() {
  const ids = suggestedFiltered.value.map((r) => r.id)
  if (!ids.length) return
  bulkPending.value = true
  try {
    await promptLibrary.bulkSuggestion(websiteId, 'accept', ids)
    suggestedRows.value = suggestedRows.value.filter((r) => !ids.includes(r.id))
    selectedSuggested.value = new Set()
    load()
  } finally {
    bulkPending.value = false
  }
}
async function rejectAll() {
  const ids = suggestedFiltered.value.map((r) => r.id)
  if (!ids.length) return
  bulkPending.value = true
  try {
    await promptLibrary.bulkSuggestion(websiteId, 'reject', ids)
    suggestedRows.value = suggestedRows.value.filter((r) => !ids.includes(r.id))
    selectedSuggested.value = new Set()
  } finally {
    bulkPending.value = false
  }
}

function relTime(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s} sec. ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min. ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hr. ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

defineEmits(['go-search'])
</script>

<style scoped>
.spd { display: flex; flex-direction: column; gap: 14px; }

/* Top filter chip bar */
.spd-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.spd-chip {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card);
  font: inherit;
  font-size: 0.82rem;
  color: var(--foreground);
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.spd-chip:hover { border-color: var(--border); }
.spd-chip svg { color: var(--muted-foreground); }

/* Body two-col layout */
.spd-body { display: grid; grid-template-columns: 220px 1fr; gap: 14px; }
@media (max-width: 900px) { .spd-body { grid-template-columns: 1fr; } }

/* Left rail */
.spd-rail {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.spd-rail-head { display: flex; align-items: center; justify-content: space-between; padding: 0 4px; }
.spd-rail-title { font-size: 0.9rem; font-weight: 600; color: var(--foreground); }
.spd-rail-sort {
  appearance: none;
  background: transparent;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--muted-foreground);
}
.spd-rail-add {
  appearance: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: transparent;
  border: 1px dashed var(--border);
  border-radius: 10px;
  color: var(--muted-foreground);
  font: inherit;
  font-size: 0.82rem;
  cursor: pointer;
}
.spd-rail-add:hover { color: var(--foreground); border-color: var(--muted-foreground); }
.spd-rail-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.spd-rail-item {
  appearance: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font: inherit;
  font-size: 0.85rem;
  color: var(--foreground);
  cursor: pointer;
}
.spd-rail-item:hover { background: var(--muted); }
.spd-rail-item.is-on { background: var(--muted); font-weight: 500; }
.spd-rail-name { text-align: left; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.spd-rail-count { font-size: 0.78rem; color: var(--muted-foreground); margin-left: 8px; font-variant-numeric: tabular-nums; }

/* Main column */
.spd-main { display: flex; flex-direction: column; gap: 12px; min-width: 0; }

.spd-subtabs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.spd-subtab-row { display: flex; gap: 4px; align-items: center; }
.spd-subtab {
  appearance: none;
  background: transparent;
  border: none;
  padding: 6px 14px;
  border-radius: 8px;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--muted-foreground);
  cursor: pointer;
}
.spd-subtab.is-on { color: var(--foreground); background: var(--muted); font-weight: 600; }

.spd-head-actions { display: flex; gap: 8px; align-items: center; }
.spd-head-count {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.85rem;
  color: var(--muted-foreground);
  padding: 4px 12px 4px 8px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--card);
  font-variant-numeric: tabular-nums;
}
.spd-head-count svg { color: #10b981; }
.spd-add {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: var(--foreground);
  color: var(--primary-foreground);
  border: none;
  border-radius: 8px;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}
.spd-add:hover { opacity: 0.92; }

/* KPI strip */
.spd-kpis {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.spd-search-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  max-width: 320px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--background);
}
.spd-search-wrap svg { color: var(--muted-foreground); }
.spd-search {
  flex: 1;
  border: none;
  background: transparent;
  padding: 8px 0;
  font: inherit;
  font-size: 0.88rem;
  color: var(--foreground);
}
.spd-search:focus { outline: none; }

.spd-kpi-row { display: flex; align-items: center; gap: 14px; }
.spd-kpi {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--foreground);
}
.spd-kpi-label { color: var(--muted-foreground); }
.spd-kpi strong { font-weight: 600; font-variant-numeric: tabular-nums; }
.spd-kpi-sep { width: 1px; height: 14px; background: var(--border); }
.spd-kpi-dot { width: 7px; height: 7px; border-radius: 50%; background: #94a3b8; }
.spd-kpi-dot.is-pos { background: #10b981; }
.spd-kpi-dot.is-neu { background: #6b7280; }
.spd-kpi-dot.is-neg { background: #ef4444; }

/* Table */
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

.spd-vis { font-weight: 600; }
.spd-pos { font-weight: 500; }
.spd-sent-dot {
  display: inline-block;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--muted-foreground);
  margin-right: 4px;
  vertical-align: middle;
}
.spd-sent-dot.is-pos { background: #10b981; }
.spd-sent-dot.is-neu { background: #6b7280; }
.spd-sent-dot.is-neg { background: #ef4444; }

.spd-mentions { display: inline-flex; align-items: center; }
.spd-mention-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid var(--card);
  margin-left: -6px;
  display: inline-block;
}
.spd-mention-dot:first-child { margin-left: 0; }
.spd-mention-dot.is-claude { background: #ec6e3b; }
.spd-mention-dot.is-gpt4   { background: #34d399; }
.spd-mention-dot.is-gemini { background: #5b8def; }
.spd-mention-dot.is-perplexity { background: #1ea7a0; }
.spd-mention-dot.is-deepseek { background: #6366f1; }
.spd-mention-more { font-size: 0.75rem; color: var(--muted-foreground); margin-left: 6px; }

.spd-volume { display: inline-flex; gap: 2px; align-items: end; }
.spd-vol-bar {
  width: 4px;
  height: 8px;
  border-radius: 1px;
  background: var(--border);
}
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
}
.spd-tag.is-nonbranded { background: rgba(245, 158, 11, 0.10); color: #b45309; }
.spd-tag.is-recommendation,
.spd-tag.is-transactional { background: rgba(239, 68, 68, 0.10); color: #b91c1c; }
.spd-tag.is-comparison { background: rgba(99, 102, 241, 0.10); color: #4338ca; }
.spd-tag.is-use_case,
.spd-tag.is-informational { background: rgba(6, 182, 212, 0.10); color: #0e7490; }
.spd-tag.is-persona { background: rgba(16, 185, 129, 0.10); color: #047857; }

.spd-loc { color: var(--muted-foreground); }

/* Empty + footer */
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
.spd-empty strong { color: var(--foreground); font-weight: 600; }
.spd-add-empty { margin-top: 10px; }
.spd-spinner {
  width: 24px; height: 24px;
  border: 2px solid var(--border);
  border-top-color: var(--foreground);
  border-radius: 50%;
  animation: spd-spin 0.9s linear infinite;
}
@keyframes spd-spin { to { transform: rotate(360deg); } }

.spd-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 6px;
  font-size: 0.82rem;
  color: var(--muted-foreground);
}
.spd-archive {
  appearance: none;
  background: transparent;
  border: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font: inherit;
  font-size: 0.82rem;
  color: var(--muted-foreground);
  cursor: pointer;
}
.spd-archive:hover { color: var(--foreground); }
.spd-archive:disabled { opacity: 0.5; cursor: progress; }

.spd-foot-actions { display: inline-flex; gap: 8px; }
.spd-track-all {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  background: var(--foreground);
  color: var(--primary-foreground);
  border: none;
  border-radius: 999px;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}
.spd-track-all:hover { opacity: 0.92; }
.spd-track-all:disabled { opacity: 0.5; cursor: progress; }

/* Suggested-row accept / reject icon buttons */
.spd-th-act { width: 96px; }
.spd-act { white-space: nowrap; text-align: right; }
.spd-act-btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--card);
  border: 1px solid var(--border);
  color: var(--muted-foreground);
  cursor: pointer;
  margin-left: 4px;
}
.spd-act-btn:hover { color: var(--foreground); border-color: var(--muted-foreground); }
.spd-act-accept:hover { color: #047857; border-color: rgba(16,185,129,0.4); background: rgba(16,185,129,0.06); }
.spd-act-reject:hover { color: #b91c1c; border-color: rgba(239,68,68,0.36); background: rgba(239,68,68,0.06); }

/* 'Suggest more' top-right button */
.spd-suggest {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--foreground);
  color: var(--primary-foreground);
  border: none;
  border-radius: 8px;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}
.spd-suggest:hover { opacity: 0.92; }
.spd-suggest:disabled { opacity: 0.55; cursor: progress; }
.spd-add-prompt {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--foreground);
  color: var(--primary-foreground);
  border: none;
  border-radius: 8px;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}
.spd-add-prompt:hover { opacity: 0.92; }

.spd-subtab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--primary);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  margin-left: 6px;
}

[data-theme="dark"] .spd-chip,
[data-theme="dark"] .spd-rail,
[data-theme="dark"] .spd-kpis,
[data-theme="dark"] .spd-table-wrap,
[data-theme="dark"] .spd-head-count {
  background: var(--card);
  border-color: var(--border);
}
[data-theme="dark"] .spd-search-wrap { background: var(--background); border-color: var(--border); }
[data-theme="dark"] .spd-table th { background: var(--accent); color: var(--muted-foreground); border-color: var(--border); }
[data-theme="dark"] .spd-table td { border-color: var(--border); color: var(--foreground); }
[data-theme="dark"] .spd-table tbody tr:hover { background: var(--accent); }
[data-theme="dark"] .spd-mention-dot { border-color: var(--card); }
</style>
