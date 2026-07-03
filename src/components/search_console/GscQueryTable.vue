<template>
  <div>
    <div class="mb-3 flex items-center justify-between gap-3">
      <input
        :value="search"
        class="w-full max-w-xs rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        :placeholder="dimension === 'query' ? 'Filter queries...' : 'Filter pages...'"
        @input="onSearchInput"
      />
      <span class="shrink-0 text-xs text-muted-foreground">{{ count }} {{ dimension === 'query' ? 'queries' : 'pages' }}</span>
    </div>

    <div class="overflow-x-auto rounded-lg border">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b bg-muted/50 text-left text-xs text-muted-foreground">
            <th class="px-3 py-2 font-medium">{{ dimension === 'query' ? 'Query' : 'Page' }}</th>
            <th
              v-for="col in columns"
              :key="col.key"
              class="cursor-pointer select-none whitespace-nowrap px-3 py-2 text-right font-medium hover:text-foreground"
              @click="toggleSort(col.key)"
            >
              {{ col.label }}
              <span v-if="sortField === col.key">{{ sortDesc ? '↓' : '↑' }}</span>
            </th>
            <th class="whitespace-nowrap px-3 py-2 text-right font-medium">Change</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6" class="px-3 py-8 text-center text-muted-foreground">Loading...</td>
          </tr>
          <tr v-else-if="!rows.length">
            <td colspan="6" class="px-3 py-8 text-center text-muted-foreground">
              No rows in this date range.
            </td>
          </tr>
          <tr v-for="row in rows" v-else :key="row[dimension]" class="border-b last:border-0 hover:bg-muted/30">
            <td class="max-w-md truncate px-3 py-2" :title="row[dimension]">{{ row[dimension] }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ row.clicks }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ row.impressions }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ (row.ctr * 100).toFixed(1) }}%</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ row.position.toFixed(1) }}</td>
            <td class="px-3 py-2 text-right">
              <span
                v-if="row.clicks_delta !== null && row.clicks_delta !== undefined"
                class="text-xs font-medium"
                :class="row.clicks_delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'"
              >
                {{ row.clicks_delta >= 0 ? '+' : '' }}{{ (row.clicks_delta * 100).toFixed(0) }}%
              </span>
              <span v-else class="text-xs text-muted-foreground">new</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="count > limit" class="mt-3 flex items-center justify-end gap-2">
      <Button variant="ghost" size="sm" :disabled="offset === 0" @click="$emit('page', Math.max(0, offset - limit))">
        Previous
      </Button>
      <span class="text-xs text-muted-foreground">
        {{ offset + 1 }}-{{ Math.min(offset + limit, count) }} of {{ count }}
      </span>
      <Button variant="ghost" size="sm" :disabled="offset + limit >= count" @click="$emit('page', offset + limit)">
        Next
      </Button>
    </div>
  </div>
</template>

<script setup>
import { Button } from '@/components/ui/button'

const props = defineProps({
  dimension: { type: String, required: true }, // 'query' | 'page'
  rows: { type: Array, default: () => [] },
  count: { type: Number, default: 0 },
  limit: { type: Number, default: 50 },
  offset: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
  search: { type: String, default: '' },
  sortField: { type: String, default: 'clicks' },
  sortDesc: { type: Boolean, default: true },
})
const emit = defineEmits(['sort', 'search', 'page'])

const columns = [
  { key: 'clicks', label: 'Clicks' },
  { key: 'impressions', label: 'Impressions' },
  { key: 'ctr', label: 'CTR' },
  { key: 'position', label: 'Position' },
]

let searchTimer = null
function onSearchInput(event) {
  clearTimeout(searchTimer)
  const value = event.target.value
  searchTimer = setTimeout(() => emit('search', value), 350)
}

function toggleSort(field) {
  if (props.sortField === field) {
    emit('sort', { field, desc: !props.sortDesc })
  } else {
    // Position sorts ascending by default because lower is better.
    emit('sort', { field, desc: field !== 'position' })
  }
}
</script>
