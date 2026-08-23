<script setup>
import { computed } from 'vue'
import { Info } from '@lucide/vue'

// Headline and KPI cells are supplied by the backend
// (overview.headline / overview.insight_kpis), computed from measured
// audits. There is deliberately no default copy here: an account with no
// data must not be told how it is performing.
const props = defineProps({
  headline: { type: Object, default: null },
  kpis: { type: Array, default: () => [] },
})

const cells = computed(() => props.kpis || [])
const title = computed(() => props.headline?.title || '')
const subtitle = computed(() => props.headline?.subtitle || '')
const show = computed(() => Boolean(title.value) || cells.value.length > 0)
</script>

<template>
  <div v-if="show" class="overflow-hidden rounded-2xl border border-border bg-card">
    <div v-if="title" class="border-b border-border px-5 py-4">
      <h1 class="text-xl font-extrabold tracking-tight text-foreground">{{ title }}</h1>
      <p v-if="subtitle" class="mt-1 text-sm text-muted-foreground">{{ subtitle }}</p>
    </div>
    <div v-if="cells.length" class="flex flex-wrap items-stretch sm:flex-nowrap">
      <div
        v-for="cell in cells"
        :key="cell.label"
        class="flex min-w-0 flex-1 flex-col justify-between gap-1.5 border-l border-border px-5 pb-3 pt-2.5 first:border-l-0 max-sm:min-w-[50%] max-sm:border-l-0"
      >
        <div class="flex items-center gap-1">
          <span class="truncate text-sm text-muted-foreground">{{ cell.label }}</span>
          <Info class="size-3.5 shrink-0 text-muted-foreground/70" />
        </div>
        <div class="flex items-end gap-1.5">
          <span class="inline-flex items-center gap-1.5 text-base font-semibold text-foreground">
            <span v-if="cell.dot" class="size-1.5 shrink-0 rounded-full bg-muted-foreground" />
            {{ cell.value }}
          </span>
          <span
            v-if="cell.delta"
            class="text-[13px] font-semibold tabular-nums"
            :class="cell.up ? 'text-[#008A05] dark:text-[#4ade80]' : 'text-[#C13515] dark:text-[#f87171]'"
          >{{ cell.delta }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
