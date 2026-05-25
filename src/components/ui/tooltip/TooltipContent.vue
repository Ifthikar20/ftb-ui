<script setup>
import { TooltipContent, TooltipPortal, useForwardPropsEmits } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps({
  sideOffset: { type: Number, default: 4 },
  side: { type: String, default: undefined },
  align: { type: String, default: undefined },
  class: { type: null, default: '' },
})
const emits = defineEmits(['escapeKeyDown', 'pointerDownOutside'])

const delegated = useForwardPropsEmits(props, emits)
</script>

<template>
  <TooltipPortal>
    <TooltipContent
      v-bind="delegated"
      :class="cn(
        'z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        props.class,
      )"
    >
      <slot />
    </TooltipContent>
  </TooltipPortal>
</template>
