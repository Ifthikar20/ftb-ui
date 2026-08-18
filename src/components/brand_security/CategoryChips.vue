<script setup>
/**
 * One wrapping row of category filter chips — every detection category
 * the taxonomy declares, with open-finding counts. Zero-count chips stay
 * visible but muted: showing the full coverage is part of the message.
 */
const props = defineProps({
  // From the brandSecurity store: [{key, label, blurb, icon, count}]
  categories: { type: Array, default: () => [] },
  activeCategory: { type: String, default: '' },
})
const emit = defineEmits(['filter-category'])
</script>

<template>
  <div v-if="categories.length" class="flex flex-wrap items-center gap-2">
    <button
      v-for="cat in categories"
      :key="cat.key"
      type="button"
      class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      :class="[
        activeCategory === cat.key
          ? 'bg-secondary text-secondary-foreground ring-1 ring-ring'
          : cat.count > 0
            ? 'bg-background text-foreground'
            : 'bg-background text-muted-foreground',
      ]"
      :aria-pressed="activeCategory === cat.key"
      :title="cat.blurb"
      @click="emit('filter-category', cat.key)"
    >
      <component :is="cat.icon" class="size-3.5" aria-hidden="true" />
      {{ cat.label }}
      <span
        class="rounded-full px-1.5 text-[10px] font-semibold tabular-nums"
        :class="cat.count > 0 ? 'bg-muted text-foreground' : 'bg-muted/60 text-muted-foreground'"
      >{{ cat.count }}</span>
    </button>
  </div>
</template>
