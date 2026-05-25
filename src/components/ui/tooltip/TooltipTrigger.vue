<script setup>
import { TooltipTrigger } from 'reka-ui'

const props = defineProps({
  asChild: { type: Boolean, default: undefined },
  as: { type: null, default: undefined },
})
</script>

<template>
  <TooltipTrigger v-bind="props">
    <slot />
  </TooltipTrigger>
</template>
