<script setup>
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const props = defineProps({
  activity: { type: Array, default: () => [] },
})
</script>

<template>
  <Card>
    <CardHeader class="pb-2">
      <CardTitle class="text-base">Recent Activity</CardTitle>
    </CardHeader>
    <CardContent class="pt-0">
      <div v-if="props.activity.length" class="flex flex-col">
        <div
          v-for="item in props.activity"
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
      <div v-else class="py-8 text-center">
        <div class="text-sm font-medium text-card-foreground">No activity yet</div>
        <div class="mt-1 text-xs text-muted-foreground">
          Start your first prompt run and events will land here.
        </div>
      </div>
    </CardContent>
  </Card>
</template>
