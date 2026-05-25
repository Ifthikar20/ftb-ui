<template>
  <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
    <Card>
      <CardContent class="p-4 sm:p-[18px]">
        <div class="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">Pending</div>
        <div
          class="text-[1.75rem] font-bold leading-none -tracking-[0.02em] tabular-nums"
          :class="stats.pending > 0 ? 'text-chart-3' : 'text-foreground'"
        >{{ stats.pending || 0 }}</div>
        <div class="mt-1.5 text-xs text-muted-foreground">Needs review</div>
      </CardContent>
    </Card>

    <Card>
      <CardContent class="p-4 sm:p-[18px]">
        <div class="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">Approved</div>
        <div class="text-[1.75rem] font-bold leading-none -tracking-[0.02em] tabular-nums text-chart-2">{{ approvedTotal }}</div>
        <div class="mt-1.5 text-xs text-muted-foreground">{{ stats.auto || 0 }} auto · {{ stats.approved || 0 }} manual</div>
      </CardContent>
    </Card>

    <Card>
      <CardContent class="p-4 sm:p-[18px]">
        <div class="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">Stale</div>
        <div
          class="text-[1.75rem] font-bold leading-none -tracking-[0.02em] tabular-nums"
          :class="staleCount > 0 ? 'text-chart-3' : 'text-foreground'"
        >{{ staleCount || 0 }}</div>
        <div class="mt-1.5 text-xs text-muted-foreground">Older than 6 months</div>
      </CardContent>
    </Card>

    <Card>
      <CardContent class="p-4 sm:p-[18px]">
        <div class="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">Coverage</div>
        <div class="text-[1.75rem] font-bold leading-none -tracking-[0.02em] tabular-nums text-foreground">{{ coverageScore }}%</div>
        <div class="my-2 h-1 overflow-hidden rounded-full bg-border">
          <div class="h-full rounded-full bg-primary transition-[width] duration-300" :style="{ width: coverageScore + '%' }"></div>
        </div>
        <div class="text-xs text-muted-foreground">Standard B2B facts covered</div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Card, CardContent } from '@/components/ui/card'

const props = defineProps({
  stats: { type: Object, required: true },
  coverageScore: { type: Number, default: 0 },
  staleCount: { type: Number, default: 0 },
})

const approvedTotal = computed(
  () => (props.stats.approved || 0) + (props.stats.auto || 0),
)
</script>
