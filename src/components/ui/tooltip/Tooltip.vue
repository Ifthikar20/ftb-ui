<script setup>
import { TooltipRoot } from 'reka-ui'

const props = defineProps({
  defaultOpen: { type: Boolean, default: undefined },
  open: { type: Boolean, default: undefined },
  delayDuration: { type: Number, default: undefined },
})
const emits = defineEmits(['update:open'])
</script>

<template>
  <TooltipRoot v-bind="props" @update:open="emits('update:open', $event)">
    <slot />
  </TooltipRoot>
</template>
