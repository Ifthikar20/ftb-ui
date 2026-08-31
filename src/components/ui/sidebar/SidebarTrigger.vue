<script setup>
import { computed } from 'vue'
import { ChevronsLeft, ChevronsRight } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSidebar } from './utils'

const props = defineProps({ class: { type: null, default: '' } })
const { toggleSidebar, state } = useSidebar()

// The arrow points the direction the sidebar will move, so the control
// says what it is about to do rather than just naming the panel. The old
// static PanelLeft glyph looked identical in both states.
const expanded = computed(() => state.value !== 'collapsed')
const label = computed(() => (expanded.value ? 'Collapse sidebar' : 'Expand sidebar'))
</script>

<template>
  <Button
    data-sidebar="trigger"
    variant="ghost"
    size="icon"
    :class="cn('size-7', props.class)"
    :title="label"
    :aria-label="label"
    :aria-expanded="expanded"
    @click="toggleSidebar"
  >
    <ChevronsLeft v-if="expanded" class="sidebar-trigger-icon" />
    <ChevronsRight v-else class="sidebar-trigger-icon" />
    <span class="sr-only">{{ label }}</span>
  </Button>
</template>

<style scoped>
/* Swapping the glyph is instant; easing the nudge makes the direction
   change read as motion rather than a flicker. */
.sidebar-trigger-icon { transition: transform 0.18s ease; }
:deep(button:hover) .sidebar-trigger-icon { transform: translateX(-1px); }
@media (prefers-reduced-motion: reduce) {
  .sidebar-trigger-icon { transition: none; }
}
</style>
