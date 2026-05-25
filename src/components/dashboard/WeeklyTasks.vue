<script setup>
import { computed } from 'vue'
import { CheckCircle2, Circle } from '@lucide/vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const props = defineProps({
  tasks: { type: Array, default: () => [] },
})

const FALLBACK = [
  { id: 1, text: 'Verify tracking pixel installation', priority: 'High', done: false },
  { id: 2, text: 'Add 5 competitor prompts to track', priority: 'Medium', done: true },
  { id: 3, text: 'Review weekly visibility report', priority: 'Medium', done: false },
  { id: 4, text: 'Publish AI policy page', priority: 'Low', done: true },
]

const tasks = computed(() => (props.tasks?.length ? props.tasks : FALLBACK))
const completedCount = computed(() => tasks.value.filter(a => a.done).length)

function priorityVariant(p) {
  if (p === 'High') return 'destructive'
  if (p === 'Medium') return 'warning'
  return 'secondary'
}
</script>

<template>
  <Card>
    <CardHeader class="flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle class="text-base">This Week's Actions</CardTitle>
      <span class="text-xs font-semibold text-muted-foreground">{{ completedCount }}/{{ tasks.length }}</span>
    </CardHeader>
    <CardContent class="pt-0">
      <div class="flex flex-col">
        <div
          v-for="task in tasks"
          :key="task.id || task.text"
          class="flex items-center gap-3 py-2"
        >
          <component
            :is="task.done ? CheckCircle2 : Circle"
            class="size-4 shrink-0"
            :class="task.done ? 'text-[color:var(--chart-2)]' : 'text-muted-foreground'"
          />
          <span
            class="flex-1 text-sm"
            :class="task.done ? 'text-muted-foreground line-through' : 'text-card-foreground'"
          >
            {{ task.text }}
          </span>
          <Badge :variant="priorityVariant(task.priority)">{{ task.priority }}</Badge>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
