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

const props = defineProps({
  prompts: { type: Array, default: () => [] },
})

const FALLBACK = [
  { prompt: 'best project management tools for startups', visibility: 64, position: 1, change: 8 },
  { prompt: 'how to automate marketing workflows', visibility: 51, position: 2, change: 3 },
  { prompt: 'AI productivity software comparison', visibility: 47, position: 2, change: 0 },
  { prompt: 'top CRM platforms 2026', visibility: 38, position: 4, change: -2 },
  { prompt: 'growth hacking strategies for SaaS', visibility: 29, position: 6, change: 5 },
]

const rows = computed(() => (props.prompts?.length ? props.prompts : FALLBACK))

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
      <Table>
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
