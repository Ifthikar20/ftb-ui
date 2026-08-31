<script setup>
import { ref, computed } from 'vue'
import { Card } from '@/components/ui/card'
import EmptyState from '@/components/ui/EmptyState.vue'

const props = defineProps({
  domains: { type: Array, default: () => [] },
  title: { type: String, default: 'Top Domains' },
  subtitle: { type: String, default: 'Top domains retrieved by AI models in their answers' },
  ctaLabel: { type: String, default: '' },
  ctaTo: { type: String, default: '' },
})

const rows = computed(() => props.domains || [])
const hovered = ref(null)

const TYPE_COLOR = {
  Corporate: '#FC642D',
  UGC: '#00A699',
  Editorial: '#FF385C',
  Reference: '#5B8DEF',
  Other: '#767676',
}
function typeColor(t) {
  return TYPE_COLOR[t] || '#767676'
}
function initials(domain) {
  return (domain || '?').replace(/^www\./, '').charAt(0).toUpperCase()
}
</script>

<template>
  <Card class="overflow-hidden rounded-xl border-border p-0 shadow-none">
    <div class="px-4 pb-2 pt-3">
      <h2 class="text-sm font-bold text-foreground">{{ title }}</h2>
      <p class="mt-0.5 text-[11px] text-muted-foreground">{{ subtitle }}</p>
    </div>

    <div class="h-px w-full bg-border" />

    <EmptyState
      v-if="!rows.length"
      title="No sources retrieved yet"
      body="These are the sites AI models pull from when answering about your space. They populate after your first prompt run."
      :cta-label="ctaLabel"
      :cta-to="ctaTo"
    />

    <template v-else>
      <div>
        <div
          v-for="(d, i) in rows"
          :key="d.domain"
          class="flex cursor-pointer items-center gap-2.5 px-4 py-1.5 transition-colors"
          :class="[i < rows.length - 1 ? 'border-b border-border/60' : '', hovered === i ? 'bg-muted' : '']"
          @mouseenter="hovered = i"
          @mouseleave="hovered = null"
        >
          <div
            class="flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
            :style="{ background: typeColor(d.type) }"
          >{{ initials(d.domain) }}</div>

          <div class="min-w-0 flex-1">
            <p class="truncate text-[13px] font-semibold leading-tight text-foreground">{{ d.domain }}</p>
            <p class="text-[10px] leading-tight text-muted-foreground">{{ d.type }}</p>
          </div>

          <div class="shrink-0 text-right">
            <p class="text-[13px] font-semibold leading-tight text-foreground">{{ d.retrieved.toFixed(1) }}%</p>
            <p class="text-[10px] leading-tight text-muted-foreground">cite {{ d.citation.toFixed(1) }}</p>
          </div>
        </div>
      </div>

      <div class="h-px w-full bg-border" />
      <div class="px-4 py-2 text-center">
        <button class="text-[11px] font-semibold text-muted-foreground underline underline-offset-2 hover:text-foreground">All domains</button>
      </div>
    </template>
  </Card>
</template>
