<template>
  <Teleport to="body">
    <Transition name="krm-fade">
      <div
        v-if="modelOpen"
        class="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        @click.self="modelOpen = false"
      >
        <div
          class="flex max-h-[88vh] w-[860px] max-w-[95vw] flex-col gap-4 overflow-hidden rounded-xl border border-border bg-card p-6 shadow-xl"
          role="dialog"
          aria-modal="true"
        >
          <header class="flex items-end justify-between gap-4">
            <div>
              <h2 class="m-0 text-2xl font-bold -tracking-[0.02em] text-foreground">Keywords</h2>
              <p class="mt-1 text-sm text-muted-foreground">
                {{ totalMentions }} of {{ totalMentions }} facts analysed
              </p>
            </div>
            <div class="flex gap-2">
              <Button variant="outline" size="sm" type="button" @click="onExport">Export</Button>
            </div>
          </header>

          <div class="flex items-center gap-3">
            <input
              v-model="search"
              type="search"
              class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Filter keywords…"
            />
            <label class="flex flex-shrink-0 items-center gap-1.5 text-[0.82rem] text-muted-foreground">
              Sort:
              <select
                v-model="sortBy"
                class="rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="mentions">Mentions</option>
                <option value="topic">A → Z</option>
                <option value="confidence">Confidence</option>
                <option value="recent">Most recent</option>
              </select>
            </label>
          </div>

          <div class="overflow-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="w-7"></TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead class="w-24">AI Summary</TableHead>
                  <TableHead class="w-[130px]">Avg. Confidence</TableHead>
                  <TableHead class="w-[110px] text-right">Mentions</TableHead>
                  <TableHead class="w-[130px] text-right">Share</TableHead>
                  <TableHead class="w-[130px]">Chart</TableHead>
                  <TableHead class="w-9"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="(row, i) in visibleRows"
                  :key="row.topic"
                >
                  <TableCell class="text-right tabular-nums">{{ i + 1 }}</TableCell>
                  <TableCell class="font-medium capitalize">{{ row.topic }}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" type="button" @click="onAnalyze(row)">Analyze</Button>
                  </TableCell>
                  <TableCell>
                    <span class="mr-1 text-chart-3">★</span>
                    {{ formatConfidence(row.avg_confidence) }}
                  </TableCell>
                  <TableCell class="text-right tabular-nums">{{ row.mention_count.toLocaleString() }}</TableCell>
                  <TableCell class="text-right tabular-nums">{{ row.share_pct }}%</TableCell>
                  <TableCell>
                    <KeywordSparkline :data="row.timeline" :width="110" :height="32" />
                  </TableCell>
                  <TableCell class="text-right">
                    <div class="relative inline-block" @click.stop>
                      <button
                        class="inline-flex h-7 w-7 items-center justify-center rounded-md text-base leading-none text-muted-foreground hover:bg-muted hover:text-foreground"
                        type="button"
                        :aria-expanded="openMenu === row.topic"
                        @click="openMenu = openMenu === row.topic ? null : row.topic"
                      >⋯</button>
                      <div
                        v-if="openMenu === row.topic"
                        class="absolute right-0 top-[calc(100%+4px)] z-[5] min-w-[168px] rounded-lg border border-border bg-card p-1.5 text-left shadow-lg"
                      >
                        <button type="button" class="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-muted" @click="onEdit(row)"><span aria-hidden="true">✎</span> Edit</button>
                        <button type="button" class="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-destructive hover:bg-destructive/10" @click="onDelete(row)"><span aria-hidden="true">🗑</span> Delete topic</button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <div v-if="!visibleRows.length" class="px-5 py-8 text-center text-sm text-muted-foreground">
              No keywords match the current filter.
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import KeywordSparkline from './KeywordSparkline.vue'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

const props = defineProps({
  open: { type: Boolean, default: false },
  items: { type: Array, default: () => [] },
  totalMentions: { type: Number, default: 0 },
})
const emit = defineEmits(['update:open', 'analyze', 'edit', 'delete'])

const modelOpen = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v),
})

const search = ref('')
const sortBy = ref('mentions')
const openMenu = ref(null)

watch(() => props.open, (o) => { if (!o) { search.value = ''; openMenu.value = null } })

const visibleRows = computed(() => {
  let rows = [...props.items]
  const q = search.value.trim().toLowerCase()
  if (q) rows = rows.filter((r) => (r.topic || '').toLowerCase().includes(q))
  switch (sortBy.value) {
    case 'topic':
      rows.sort((a, b) => (a.topic || '').localeCompare(b.topic || ''))
      break
    case 'confidence':
      rows.sort((a, b) => (b.avg_confidence || 0) - (a.avg_confidence || 0))
      break
    case 'recent':
      rows.sort((a, b) => new Date(b.last_seen || 0) - new Date(a.last_seen || 0))
      break
    case 'mentions':
    default:
      rows.sort((a, b) => (b.mention_count || 0) - (a.mention_count || 0))
  }
  return rows
})

function formatConfidence(c) {
  const v = Number(c) || 0
  const display = v <= 1 ? v * 5 : v
  return display.toFixed(1)
}

function onAnalyze(row) { emit('analyze', row) }
function onEdit(row) { openMenu.value = null; emit('edit', row) }
function onDelete(row) { openMenu.value = null; emit('delete', row) }

function onExport() {
  const rows = [['rank', 'topic', 'mentions', 'share_pct', 'avg_confidence', 'last_seen']]
  visibleRows.value.forEach((r, i) => {
    rows.push([i + 1, r.topic, r.mention_count, r.share_pct, r.avg_confidence, r.last_seen || ''])
  })
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `keywords-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Close any open row menu when the user clicks outside.
function _closeMenuOnDocClick() { openMenu.value = null }
watch(modelOpen, (open) => {
  if (open) document.addEventListener('click', _closeMenuOnDocClick)
  else document.removeEventListener('click', _closeMenuOnDocClick)
})
</script>

<style scoped>
.krm-fade-enter-active, .krm-fade-leave-active { transition: opacity 0.15s ease; }
.krm-fade-enter-from, .krm-fade-leave-to { opacity: 0; }
</style>
