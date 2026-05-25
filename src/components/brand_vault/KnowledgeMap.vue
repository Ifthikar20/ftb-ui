<template>
  <div class="flex flex-col gap-3.5">
    <div class="flex flex-wrap gap-1.5">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors"
        :class="filter === 'all'
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-foreground hover:border-muted-foreground'"
        @click="updateFilter('all')"
      >All <span class="rounded-full px-1.5 py-px text-[0.7rem] font-bold" :class="filter === 'all' ? 'bg-white/20' : 'bg-foreground/[0.06]'">{{ facts.length }}</span></button>
      <button
        v-if="contradictions.length"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors"
        :class="filter === 'contradictions'
          ? 'border-chart-3 bg-chart-3 text-white'
          : 'border-chart-3/40 bg-card text-chart-3 hover:border-chart-3'"
        @click="updateFilter('contradictions')"
      >Contradictions <span class="rounded-full px-1.5 py-px text-[0.7rem] font-bold" :class="filter === 'contradictions' ? 'bg-white/20' : 'bg-foreground/[0.06]'">{{ contradictions.length }}</span></button>
      <button
        v-for="pl in productLines"
        :key="pl"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors"
        :class="filter === pl
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-foreground hover:border-muted-foreground'"
        @click="updateFilter(pl)"
      >{{ pl }}</button>
    </div>

    <div v-if="loading" class="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
      <div v-for="i in 6" :key="i" class="h-[140px] animate-pulse rounded-xl border border-border bg-card" />
    </div>

    <div v-else-if="!facts.length" class="rounded-2xl border border-dashed border-border px-5 py-[60px] text-center text-muted-foreground">
      <h3 class="mb-1 text-[1.05rem] text-foreground">Nothing here yet</h3>
      <p class="text-sm">Approve facts from the Review queue to populate the map.</p>
    </div>

    <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
      <div
        v-for="fact in facts"
        :key="fact.id"
        class="flex cursor-pointer flex-col gap-2.5 rounded-xl border bg-card px-4 py-3.5 transition-colors hover:border-muted-foreground hover:shadow-md"
        :class="conflictedIds.has(fact.id) ? 'border-chart-3/55 bg-chart-3/5' : 'border-border'"
        @click="$emit('open-detail', fact)"
      >
        <div class="flex gap-1.5">
          <Badge :variant="fact.status === 'auto' ? 'default' : 'success'">
            {{ fact.status === 'auto' ? 'Auto' : 'Approved' }}
          </Badge>
          <Badge v-if="conflictedIds.has(fact.id)" variant="warning">Conflict</Badge>
        </div>
        <div class="flex flex-wrap gap-1 text-[0.9rem] leading-relaxed text-foreground">
          <strong class="font-semibold">{{ fact.subject }}</strong>
          <span class="text-muted-foreground">{{ fact.predicate }}</span>
          <span>{{ fact.object }}</span>
        </div>
        <div class="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span v-if="fact.product_line" class="rounded-full bg-muted px-2 py-px uppercase tracking-[0.04em]">{{ fact.product_line }}</span>
          <span v-if="fact.topic" class="rounded-full bg-muted px-2 py-px uppercase tracking-[0.04em]">{{ fact.topic }}</span>
          <span class="tabular-nums">{{ confidencePct(fact.confidence) }}% conf</span>
        </div>
        <div class="flex justify-end gap-1 border-t border-border pt-2" @click.stop>
          <Button variant="ghost" size="sm" @click="$emit('edit-click', fact)">Edit</Button>
          <Button variant="ghost" size="sm" @click="$emit('reject', fact)">Archive</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const props = defineProps({
  facts: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  productLines: { type: Array, default: () => [] },
  topics: { type: Array, default: () => [] },
  contradictions: { type: Array, default: () => [] },
  filter: { type: String, default: 'all' },
  websiteId: { type: String, required: true },
})

const emit = defineEmits(['update:filter', 'approve', 'reject', 'edit-click', 'open-detail'])

function updateFilter(val) {
  emit('update:filter', val)
}

const conflictedIds = computed(() => {
  const s = new Set()
  for (const c of props.contradictions) {
    for (const f of c.facts || []) s.add(f.id)
  }
  return s
})

function confidencePct(c) {
  const v = Number(c) || 0
  const pct = v <= 1 ? v * 100 : v
  return Math.max(0, Math.min(100, Math.round(pct)))
}
</script>
