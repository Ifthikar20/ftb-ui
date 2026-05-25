<script setup>
import { computed } from 'vue'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { fallbackDomainTypes } from './placeholders'

const props = defineProps({
  data: { type: Object, default: null },
  title: { type: String, default: 'Domain types' },
})

const model = computed(() => props.data || fallbackDomainTypes())
</script>

<template>
  <Card>
    <CardHeader class="flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle class="text-base">{{ title }}</CardTitle>
      <span class="text-xs text-muted-foreground">Total retrievals: {{ model.total }}</span>
    </CardHeader>
    <CardContent class="space-y-4 pt-2">
      <div v-for="t in model.types" :key="t.label" class="space-y-1.5">
        <div class="flex items-center justify-between text-sm">
          <span class="flex items-center gap-2">
            <span class="size-2 rounded-full" :style="{ background: t.color }" />
            {{ t.label }}
          </span>
          <span class="tabular-nums text-muted-foreground">{{ t.pct }}%</span>
        </div>
        <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div class="h-full rounded-full" :style="{ width: t.pct + '%', background: t.color }" />
        </div>
      </div>
    </CardContent>
  </Card>
</template>
