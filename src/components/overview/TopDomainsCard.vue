<script setup>
import { ref, computed } from 'vue'
import { Card } from '@/components/ui/card'
import { fallbackDomains } from './placeholders'

const props = defineProps({
  domains: { type: Array, default: null },
  title: { type: String, default: 'Top Domains' },
  subtitle: { type: String, default: 'Top domains retrieved by AI models in their answers' },
})

const rows = computed(() => (props.domains?.length ? props.domains : fallbackDomains()))
const hovered = ref(null)

const TYPE_COLOR = {
  Corporate: '#FC642D',
  UGC: '#00A699',
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
  <Card class="overflow-hidden rounded-2xl border-border p-0 shadow-none">
    <div class="px-6 pb-4 pt-6">
      <h2 class="text-lg font-extrabold text-foreground">{{ title }}</h2>
      <p class="mt-1 text-[13px] text-muted-foreground">{{ subtitle }}</p>
    </div>

    <div class="h-px w-full bg-border" />

    <div>
      <div
        v-for="(d, i) in rows"
        :key="d.domain"
        class="flex cursor-pointer items-center gap-3.5 px-6 py-3.5 transition-colors"
        :class="[i < rows.length - 1 ? 'border-b border-border/60' : '', hovered === i ? 'bg-muted' : '']"
        @mouseenter="hovered = i"
        @mouseleave="hovered = null"
      >
        <div
          class="flex size-[42px] shrink-0 items-center justify-center rounded-xl text-base font-extrabold text-white"
          :style="{ background: typeColor(d.type) }"
        >{{ initials(d.domain) }}</div>

        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-bold text-foreground">{{ d.domain }}</p>
          <p class="mt-0.5 text-xs text-muted-foreground">{{ d.type }}</p>
        </div>

        <div class="shrink-0 text-right">
          <p class="text-sm font-bold text-foreground">{{ d.retrieved.toFixed(1) }}%</p>
          <p class="mt-0.5 text-xs text-muted-foreground">citation {{ d.citation.toFixed(1) }}</p>
        </div>
      </div>
    </div>

    <div class="h-px w-full bg-border" />
    <div class="px-6 py-3.5 text-center">
      <button class="text-[13px] font-bold text-foreground underline underline-offset-[3px]">All domains</button>
    </div>
  </Card>
</template>
