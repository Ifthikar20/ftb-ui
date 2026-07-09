<script setup>
import { computed } from 'vue'
import { Card } from '@/components/ui/card'
import { fallbackDomainTypes } from './placeholders'

const props = defineProps({
  data: { type: Object, default: null },
  title: { type: String, default: 'Domain types' },
})

const model = computed(() => props.data || fallbackDomainTypes())
</script>

<template>
  <Card class="overflow-hidden rounded-xl border-border p-0 shadow-none">
    <div class="flex items-start justify-between px-4 pb-2 pt-3">
      <div>
        <h2 class="text-sm font-bold text-foreground">{{ title }}</h2>
        <p class="mt-0.5 text-[11px] text-muted-foreground">Where retrieved sources come from</p>
      </div>
      <span class="text-[10px] font-semibold text-muted-foreground">Total: {{ model.total }}</span>
    </div>

    <div class="h-px w-full bg-border" />

    <div class="space-y-2 p-4">
      <div v-for="t in model.types" :key="t.label" class="space-y-0.5">
        <div class="flex items-center justify-between text-[12px]">
          <span class="flex items-center gap-1.5 font-semibold text-foreground">
            <span class="size-2 rounded-full" :style="{ background: t.color }" />
            {{ t.label }}
          </span>
          <span class="tabular-nums font-bold text-foreground">{{ t.pct }}%</span>
        </div>
        <div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div class="h-full rounded-full" :style="{ width: t.pct + '%', background: t.color }" />
        </div>
      </div>
    </div>
  </Card>
</template>
