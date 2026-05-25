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
  <Card class="overflow-hidden rounded-2xl border-border p-0 shadow-none">
    <div class="flex items-start justify-between px-6 pb-4 pt-6">
      <div>
        <h2 class="text-lg font-extrabold text-foreground">{{ title }}</h2>
        <p class="mt-1 text-[13px] text-muted-foreground">Where retrieved sources come from</p>
      </div>
      <span class="text-xs text-muted-foreground">Total: {{ model.total }}</span>
    </div>

    <div class="h-px w-full bg-border" />

    <div class="space-y-4 p-6">
      <div v-for="t in model.types" :key="t.label" class="space-y-1.5">
        <div class="flex items-center justify-between text-sm">
          <span class="flex items-center gap-2 font-semibold text-foreground">
            <span class="size-2.5 rounded-full" :style="{ background: t.color }" />
            {{ t.label }}
          </span>
          <span class="tabular-nums font-bold text-foreground">{{ t.pct }}%</span>
        </div>
        <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div class="h-full rounded-full" :style="{ width: t.pct + '%', background: t.color }" />
        </div>
      </div>
    </div>
  </Card>
</template>
