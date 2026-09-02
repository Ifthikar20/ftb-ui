<script setup>
import { computed } from 'vue'
import { ArrowUpRight, ArrowDownRight, Minus } from '@lucide/vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import EmptyState from '@/components/ui/EmptyState.vue'

const props = defineProps({
  prompts: { type: Array, default: () => [] },
})

const rows = computed(() => props.prompts || [])

function changeMeta(change) {
  if (change > 0) return { icon: ArrowUpRight, cls: 'text-[color:var(--chart-2)]', label: `+${change}` }
  if (change < 0) return { icon: ArrowDownRight, cls: 'text-destructive', label: `${change}` }
  return { icon: Minus, cls: 'text-muted-foreground', label: '0' }
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Tracked prompts</CardTitle>
      <CardDescription>How your brand ranks across monitored prompts</CardDescription>
    </CardHeader>
    <CardContent class="px-0">
      <EmptyState
        v-if="!rows.length"
        title="No prompts measured yet"
        body="Tracked prompts and their placements appear here after a prompt run completes."
      />
      <Table v-else>
        <TableHeader>
          <TableRow>
            <TableHead class="pl-6">Prompt</TableHead>
            <TableHead>Visibility</TableHead>
            <TableHead>Position</TableHead>
            <TableHead class="pr-6 text-right">Change</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="row in rows" :key="row.prompt">
            <TableCell class="max-w-xs truncate pl-6 font-medium text-card-foreground">
              {{ row.prompt }}
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <div class="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                  <div
                    class="h-full rounded-full bg-[color:var(--chart-1)]"
                    :style="{ width: `${row.visibility}%` }"
                  />
                </div>
                <span class="text-xs tabular-nums text-muted-foreground">{{ row.visibility }}%</span>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="secondary">#{{ row.position }}</Badge>
            </TableCell>
            <TableCell class="pr-6 text-right">
              <span
                class="inline-flex items-center justify-end gap-1 text-sm font-semibold tabular-nums"
                :class="changeMeta(row.change).cls"
              >
                <component :is="changeMeta(row.change).icon" class="size-3.5" />
                {{ changeMeta(row.change).label }}
              </span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </CardContent>
  </Card>
</template>
