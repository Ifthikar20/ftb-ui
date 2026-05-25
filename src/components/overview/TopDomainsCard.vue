<script setup>
import { computed } from 'vue'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { fallbackDomains } from './placeholders'

const props = defineProps({
  domains: { type: Array, default: null },
  title: { type: String, default: 'Top Domains' },
})

const rows = computed(() => (props.domains?.length ? props.domains : fallbackDomains()))

const TYPE_COLOR = {
  Corporate: 'var(--chart-1)',
  UGC: 'var(--chart-2)',
  Reference: 'var(--chart-4)',
  Other: 'var(--chart-3)',
}
function typeColor(t) {
  return TYPE_COLOR[t] || 'var(--muted-foreground)'
}
function initials(domain) {
  return (domain || '?').replace(/^www\./, '').charAt(0).toUpperCase()
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
            <TableHead>Domain</TableHead>
            <TableHead class="text-right">Retrieved</TableHead>
            <TableHead class="text-right">Citation rate</TableHead>
            <TableHead class="text-right">Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="(d, i) in rows" :key="d.domain">
            <TableCell>
              <div class="flex items-center gap-2">
                <span class="w-4 text-right text-xs text-muted-foreground">{{ i + 1 }}</span>
                <span
                  class="flex size-5 items-center justify-center rounded-md text-[10px] font-semibold text-white"
                  :style="{ background: typeColor(d.type) }"
                >{{ initials(d.domain) }}</span>
                <span class="truncate font-medium">{{ d.domain }}</span>
              </div>
            </TableCell>
            <TableCell class="text-right tabular-nums">{{ d.retrieved.toFixed(1) }}%</TableCell>
            <TableCell class="text-right tabular-nums text-muted-foreground">{{ d.citation.toFixed(1) }}</TableCell>
            <TableCell class="text-right">
              <span
                class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
                :style="{ color: typeColor(d.type), borderColor: 'var(--border)' }"
              >{{ d.type }}</span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </CardContent>
  </Card>
</template>
