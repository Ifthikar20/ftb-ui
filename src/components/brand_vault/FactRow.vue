<template>
  <Card class="fact-card flex h-full flex-col p-4 transition-colors hover:border-muted-foreground">
    <div class="mb-3 flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="text-[15px] font-semibold leading-snug text-foreground">
          {{ fact.subject }}
        </div>
        <div class="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          <span class="font-medium text-foreground">{{ fact.predicate }}</span>
          <span class="mx-1.5 text-muted-foreground">·</span>
          <span>{{ fact.object }}</span>
        </div>
      </div>
      <Badge :variant="statusVariant">{{ statusLabel }}</Badge>
    </div>

    <div class="mt-auto flex flex-col gap-3 border-t border-border pt-4">
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Confidence
        </span>
        <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
          <div class="h-full rounded-full bg-chart-1" :style="{ width: pct + '%' }"></div>
        </div>
        <span class="tabular-nums text-xs text-muted-foreground">{{ pct }}%</span>
      </div>

      <div class="flex items-center justify-between gap-2">
        <a
          v-if="fact.source_url"
          :href="fact.source_url"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 text-xs font-medium text-chart-1 hover:underline"
          @click.stop
        >
          Source
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path d="M3 7l4-4M4 3h3v3" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </a>
        <span v-else class="text-xs text-muted-foreground">No source</span>

        <div v-if="isPending" class="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" @click.stop="$emit('edit-click', fact)">Edit</Button>
          <Button variant="ghost" size="sm" @click.stop="$emit('reject', fact)">Reject</Button>
          <Button size="sm" @click.stop="$emit('approve', fact)">Approve</Button>
        </div>
      </div>
    </div>
  </Card>
</template>

<script setup>
import { computed } from 'vue'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const props = defineProps({
  fact: { type: Object, required: true },
})

defineEmits(['approve', 'reject', 'edit-click'])

const STATUS_VARIANT = {
  pending: 'warning',
  approved: 'success',
  rejected: 'secondary',
  auto: 'default',
}

const statusVariant = computed(() => STATUS_VARIANT[props.fact.status] || 'warning')

const statusLabel = computed(() => {
  const s = props.fact.status || 'pending'
  if (s === 'auto') return 'Auto-approved'
  return s.charAt(0).toUpperCase() + s.slice(1)
})

const isPending = computed(() => props.fact.status === 'pending')

const pct = computed(() => {
  const c = Number(props.fact.confidence) || 0
  const v = c <= 1 ? c * 100 : c
  return Math.max(0, Math.min(100, Math.round(v)))
})
</script>
