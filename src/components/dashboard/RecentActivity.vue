<script setup>
import { computed } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const props = defineProps({
  activity: { type: Array, default: () => [] },
})

const FALLBACK = [
  { text: 'Brand mentioned in 12 new AI answers', time: '2 hours ago', color: 'var(--chart-2)' },
  { text: 'Visibility up 6.2% week-over-week', time: '5 hours ago', color: 'var(--chart-1)' },
  { text: 'New competitor prompt detected', time: 'Yesterday', color: 'var(--chart-3)' },
  { text: 'Content draft generated for review', time: '2 days ago', color: 'var(--chart-4)' },
]

const items = computed(() => (props.activity?.length ? props.activity : FALLBACK))
</script>

<template>
  <Card>
    <CardHeader class="pb-2">
      <CardTitle class="text-base">Recent Activity</CardTitle>
    </CardHeader>
    <CardContent class="pt-0">
      <div class="flex flex-col">
        <div
          v-for="item in items"
          :key="item.text"
          class="flex items-start gap-3 border-b border-border py-3 last:border-0"
        >
          <span
            class="mt-1.5 size-2.5 shrink-0 rounded-full"
            :style="{ background: item.color }"
          />
          <div>
            <div class="text-sm font-semibold text-card-foreground">{{ item.text }}</div>
            <div class="mt-0.5 text-xs text-muted-foreground">{{ item.time }}</div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
