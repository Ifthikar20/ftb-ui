<script setup>
import { ref, computed } from 'vue'
import { Card } from '@/components/ui/card'
import { fallbackBrands, AVATAR_COLORS } from './placeholders'

const props = defineProps({
  brands: { type: Array, default: null },
  activeName: { type: String, default: '' },
  title: { type: String, default: 'Top Brands' },
  subtitle: { type: String, default: 'Visibility performance by brand' },
})

const rows = computed(() => (props.brands?.length ? props.brands : fallbackBrands(props.activeName)))
const hovered = ref(null)

function initials(name) {
  return (name || '?').trim().charAt(0).toUpperCase()
}
function color(i) {
  return AVATAR_COLORS[i % AVATAR_COLORS.length]
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
        v-for="(b, i) in rows"
        :key="b.rank"
        class="flex cursor-pointer items-center gap-3.5 px-6 py-3.5 transition-colors"
        :class="[i < rows.length - 1 ? 'border-b border-border/60' : '', hovered === i ? 'bg-muted' : '']"
        @mouseenter="hovered = i"
        @mouseleave="hovered = null"
      >
        <div
          class="flex size-[42px] shrink-0 items-center justify-center rounded-xl text-base font-extrabold text-white"
          :style="{ background: color(i) }"
        >{{ initials(b.name) }}</div>

        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-bold text-foreground">{{ b.name }}</p>
          <p class="mt-0.5 text-xs text-muted-foreground">{{ b.category || ('Position #' + b.position) }}</p>
        </div>

        <div class="shrink-0 text-right">
          <p class="text-sm font-bold text-foreground">{{ b.visibility }}%</p>
          <p class="mt-0.5 text-xs font-bold" :class="b.up ? 'text-[#008A05]' : 'text-[#C13515]'">
            {{ b.up ? '+' : '-' }}{{ b.trend }}%
          </p>
        </div>
      </div>
    </div>

    <div class="h-px w-full bg-border" />
    <div class="px-6 py-3.5 text-center">
      <button class="text-[13px] font-bold text-foreground underline underline-offset-[3px]">Show all brands</button>
    </div>
  </Card>
</template>
