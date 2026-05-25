<script setup>
import { TooltipProvider } from 'reka-ui'

const props = defineProps({
  delayDuration: { type: Number, default: 0 },
  disableHoverableContent: { type: Boolean, default: undefined },
  skipDelayDuration: { type: Number, default: undefined },
})
</script>

<template>
  <TooltipProvider v-bind="props">
    <slot />
  </TooltipProvider>
</template>
