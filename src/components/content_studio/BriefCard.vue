<template>
  <Card
    class="brief-card group relative h-full cursor-pointer p-6 transition-shadow hover:shadow-md"
    @click="$emit('select', brief)"
  >
    <div class="flex h-full flex-col">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <GapTypeBadge :gap="brief.gap_type" />
        <FormatBadge v-if="brief.target_format" :format="brief.target_format" />
      </div>

      <h3 class="line-clamp-2 text-[15px] font-medium leading-snug text-foreground">
        {{ brief.headline || 'Untitled brief' }}
      </h3>

      <p
        v-if="brief.description"
        class="mt-2 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground"
      >
        {{ brief.description }}
      </p>

      <div
        class="mt-auto flex items-end justify-between gap-3 border-t border-border pt-5"
      >
        <div class="flex flex-col gap-1">
          <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Impact
          </span>
          <div class="flex items-end gap-1" aria-hidden="true">
            <span
              v-for="i in 3"
              :key="i"
              class="block w-1.5 rounded-sm transition-colors"
              :class="[
                i === 1 ? 'h-2' : i === 2 ? 'h-3' : 'h-4',
                i <= impactBars ? 'bg-[color:var(--chart-1)]' : 'bg-border',
              ]"
            ></span>
          </div>
        </div>

        <Button
          variant="default"
          size="sm"
          @click.stop="$emit('select', brief)"
        >
          Create draft
          <ArrowRight class="size-3" />
        </Button>
      </div>
    </div>

    <button
      type="button"
      class="brief-card__skip"
      title="Skip this brief"
      @click.stop="$emit('skip', brief)"
    >
      <X class="size-3" />
    </button>
  </Card>
</template>

<script setup>
import { computed } from 'vue'
import { ArrowRight, X } from '@lucide/vue'
import GapTypeBadge from './GapTypeBadge.vue'
import FormatBadge from './FormatBadge.vue'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const props = defineProps({
  brief: { type: Object, required: true },
})

defineEmits(['select', 'skip'])

const impactBars = computed(() => {
  const s = Number(props.brief?.impact_score) || 0
  if (s >= 0.66) return 3
  if (s >= 0.33) return 2
  if (s > 0) return 1
  return 0
})
</script>

<style scoped>
.brief-card__skip {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  display: none;
  padding: 0.375rem;
  border-radius: 9999px;
  background: var(--card);
  color: var(--muted-foreground);
  border: 1px solid var(--border);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: color 150ms ease-out, transform 150ms ease-out;
}
.brief-card:hover .brief-card__skip {
  display: inline-flex;
}
.brief-card__skip:hover {
  color: var(--foreground);
  transform: scale(1.05);
}
</style>
