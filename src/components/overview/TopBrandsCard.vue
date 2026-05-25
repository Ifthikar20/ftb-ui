<script setup>
import { computed } from 'vue'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { fallbackBrands } from './placeholders'

const props = defineProps({
  brands: { type: Array, default: null },
  activeName: { type: String, default: '' },
  title: { type: String, default: 'Top 7 Brands' },
})

const rows = computed(() => (props.brands?.length ? props.brands : fallbackBrands(props.activeName)))

function initials(name) {
  return (name || '?').trim().charAt(0).toUpperCase()
}
function sentimentColor(v) {
  if (v >= 60) return 'var(--chart-2)'
  if (v >= 45) return 'var(--chart-3)'
  return 'var(--destructive)'
}
</script>

<template>
  <Card>
    <CardHeader class="pb-2">
      <CardTitle class="text-base">{{ title }}</CardTitle>
    </CardHeader>
    <CardContent class="px-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-8">#</TableHead>
            <TableHead>Brand</TableHead>
            <TableHead class="text-right">Visibility</TableHead>
            <TableHead class="text-right">SOV</TableHead>
            <TableHead class="text-right">Sentiment</TableHead>
            <TableHead class="text-right">Position</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="b in rows" :key="b.rank">
            <TableCell class="text-muted-foreground">{{ b.rank }}</TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <span
                  class="flex size-5 items-center justify-center rounded-md text-[10px] font-semibold text-white"
                  :style="{ background: b.rank === 1 ? 'var(--chart-1)' : 'var(--muted-foreground)' }"
                >{{ initials(b.name) }}</span>
                <span class="truncate font-medium">{{ b.name }}</span>
              </div>
            </TableCell>
            <TableCell class="text-right tabular-nums">{{ b.visibility }}%</TableCell>
            <TableCell class="text-right tabular-nums text-muted-foreground">{{ b.sov }}%</TableCell>
            <TableCell class="text-right tabular-nums">
              <span class="inline-flex items-center justify-end gap-1.5">
                <span class="size-1.5 rounded-full" :style="{ background: sentimentColor(b.sentiment) }" />
                {{ b.sentiment }}
              </span>
            </TableCell>
            <TableCell class="text-right tabular-nums text-muted-foreground"># {{ b.position }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </CardContent>
  </Card>
</template>
