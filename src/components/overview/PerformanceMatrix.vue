<script setup>
import { ref, computed } from 'vue'
import { Eye, Smile, ArrowUpDown, PieChart, ChevronDown } from '@lucide/vue'
import { fallbackMatrix } from './placeholders'

const props = defineProps({
  matrix: { type: Object, default: null },
  activeName: { type: String, default: '' },
})

// If the parent hands us a real matrix — even if it's empty — trust it
// and render the empty state instead of falling back to demo brands.
// Only when no matrix was passed at all (null) do we show the
// scaffolding. That way the LLM Dashboard never shows YNAB/Quicken for
// an education website.
const hasReal = computed(
  () => props.matrix && Array.isArray(props.matrix.models) && Array.isArray(props.matrix.rows),
)
const isEmpty = computed(
  () => hasReal.value && (!props.matrix.rows.length || !props.matrix.models.length),
)
const data = computed(
  () => hasReal.value ? props.matrix : fallbackMatrix(props.activeName),
)

const metric = ref('visibility')
const metrics = [
  { key: 'visibility', label: 'Visibility', icon: Eye },
  { key: 'sentiment', label: 'Sentiment', icon: Smile },
  { key: 'position', label: 'Position', icon: ArrowUpDown },
  { key: 'sov', label: 'SoV', icon: PieChart },
]

function cellStyle(v) {
  let opacity
  if (v <= 0) opacity = 0.03
  else if (v <= 10) opacity = 0.1
  else if (v <= 20) opacity = 0.2
  else if (v <= 30) opacity = 0.3
  else if (v <= 40) opacity = 0.4
  else if (v <= 50) opacity = 0.5
  else if (v <= 60) opacity = 0.6
  else if (v <= 70) opacity = 0.7
  else if (v <= 80) opacity = 0.8
  else if (v <= 90) opacity = 0.9
  else opacity = 1
  return {
    background: `rgba(0,146,184,${opacity})`,
    color: opacity >= 0.6 ? '#fff' : 'var(--foreground)',
  }
}

const legend = [
  { label: '0%', o: 0.03 }, { label: '1-10%', o: 0.1 }, { label: '11-20%', o: 0.2 },
  { label: '21-30%', o: 0.3 }, { label: '31-40%', o: 0.4 }, { label: '41-50%', o: 0.5 },
  { label: '51-60%', o: 0.6 }, { label: '61-70%', o: 0.7 }, { label: '71-80%', o: 0.8 },
  { label: '81-90%', o: 0.9 }, { label: '91-100%', o: 1 },
]

const gridCols = computed(() => `minmax(120px,max-content) repeat(${data.value.models.length}, minmax(90px,1fr))`)
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-border bg-card">
    <div class="flex h-12 items-center justify-between gap-2 border-b border-border px-4">
      <div class="inline-flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
        <button
          v-for="m in metrics"
          :key="m.key"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md p-1.5 text-sm font-medium transition-colors"
          :class="metric === m.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
          @click="metric = m.key"
        >
          <component :is="m.icon" class="size-4" />
          <span v-if="metric === m.key">{{ m.label }}</span>
        </button>
      </div>
      <button class="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-card px-2 text-[13px] font-medium text-foreground shadow-sm transition-colors hover:bg-muted">
        AI models vs Brands
        <ChevronDown class="size-4 text-muted-foreground" />
      </button>
    </div>

    <div v-if="isEmpty" class="flex flex-col items-center justify-center gap-1 px-6 py-10 text-center">
      <p class="text-sm font-semibold text-foreground">Not enough data yet</p>
      <p class="max-w-md text-[12px] text-muted-foreground">
        The matrix fills in as your prompts get measured against LLM
        providers and Search Insights collects competing brands.
      </p>
    </div>
    <div v-else class="overflow-x-auto p-3">
      <div role="table" class="grid min-w-full gap-x-0 gap-y-1" :style="{ gridTemplateColumns: gridCols }">
        <div class="contents">
          <div class="px-4 pb-2 text-xs font-medium text-muted-foreground">Brands</div>
          <div v-for="model in data.models" :key="model" class="px-4 pb-2 text-center text-xs font-medium text-muted-foreground">{{ model }}</div>
        </div>
        <template v-for="row in data.rows" :key="row.brand">
          <div class="flex items-center gap-1.5 px-4 text-sm text-foreground">
            <span class="truncate">{{ row.brand }}</span>
            <span v-if="row.you" class="inline-flex items-center rounded-md border border-[#008A05]/30 bg-[#E8F5E9] px-1 text-xs font-semibold text-[#008A05]">You</span>
          </div>
          <div v-for="(v, i) in row.values" :key="i" class="px-0.5 py-0.5">
            <div class="flex h-8 items-center justify-center rounded-lg text-[13px]" :style="cellStyle(v)">{{ v.toFixed(1) }}%</div>
          </div>
        </template>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border px-4 py-2.5">
      <div v-for="l in legend" :key="l.label" class="flex items-center gap-1.5">
        <span class="size-2 rounded-full" :style="{ background: `rgba(0,146,184,${l.o})` }" />
        <span class="text-xs font-medium text-foreground">{{ l.label }}</span>
      </div>
    </div>
  </div>
</template>
