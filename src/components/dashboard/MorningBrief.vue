<script setup>
import { Sparkles } from '@lucide/vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

defineProps({
  brief: { type: String, required: true },
})
</script>

<template>
  <Card>
    <CardHeader class="flex-row items-center justify-between space-y-0 pb-3">
      <CardTitle class="flex items-center gap-2 text-base">
        <Sparkles class="size-4 text-[color:var(--chart-1)]" />
        Morning Brief
      </CardTitle>
      <Badge variant="secondary">Today</Badge>
    </CardHeader>
    <CardContent>
      <p class="text-sm leading-relaxed text-muted-foreground">{{ brief }}</p>
    </CardContent>
  </Card>
</template>
