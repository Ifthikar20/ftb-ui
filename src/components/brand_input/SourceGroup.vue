<script setup>
/**
 * Collapsible group of sources sharing a domain (or the "paste" pseudo-
 * domain). Header exposes bulk counts + a menu; body holds SourceRows.
 *
 * Default expanded state: open if the group has any non-ready sources
 * (draws attention to failed / pending / ingesting rows), collapsed
 * otherwise.
 */
import { ref, computed, watch } from 'vue'
import { ChevronRight, Globe, FileText, AlertCircle } from '@lucide/vue'
import SourceRow from './SourceRow.vue'

const props = defineProps({
  group: { type: Object, required: true },
})

const emit = defineEmits(['select', 'reingest', 'delete'])

const shouldAutoOpen = (g) =>
  (g.failed || 0) > 0 || (g.pending || 0) > 0 || (g.ingesting || 0) > 0

const open = ref(shouldAutoOpen(props.group))

// If the counts change (e.g. after a reingest flips a row from ready
// back to pending), auto-open the group so the user notices.
watch(
  () => shouldAutoOpen(props.group),
  (needsAttention) => { if (needsAttention) open.value = true },
)

const isPaste = computed(() => props.group.host === 'paste')

const readyLabel = computed(() => {
  const ready = props.group.ready || 0
  const total = props.group.sources.length
  return `${ready}/${total} ready`
})
</script>

<template>
  <div class="rounded-lg border border-border bg-card">
    <button
      class="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-secondary/40"
      @click="open = !open"
    >
      <ChevronRight
        class="size-4 shrink-0 text-muted-foreground transition-transform"
        :class="{ 'rotate-90': open }"
      />
      <FileText v-if="isPaste" class="size-4 shrink-0 text-muted-foreground" />
      <Globe v-else class="size-4 shrink-0 text-muted-foreground" />

      <span class="truncate text-sm font-semibold text-foreground">
        {{ isPaste ? 'Pasted text' : group.host }}
      </span>

      <span class="text-xs tabular-nums text-muted-foreground">
        {{ group.sources.length }} source{{ group.sources.length === 1 ? '' : 's' }}
        · {{ group.chunks }} chunks
        · {{ readyLabel }}
      </span>

      <span
        v-if="group.failed"
        class="ml-auto inline-flex items-center gap-1 rounded-md bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive"
      >
        <AlertCircle class="size-3" />
        {{ group.failed }} failed
      </span>
    </button>

    <div v-if="open" class="border-t border-border px-2 py-2">
      <SourceRow
        v-for="s in group.sources"
        :key="s.id"
        :source="s"
        @select="(x) => emit('select', x)"
        @reingest="(x) => emit('reingest', x)"
        @delete="(x) => emit('delete', x)"
      />
    </div>
  </div>
</template>
