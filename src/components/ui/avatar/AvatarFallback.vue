<script setup>
import { AvatarFallback } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps({
  class: { type: null, default: '' },
  delayMs: { type: Number, default: undefined },
})
</script>

<template>
  <AvatarFallback
    :delay-ms="delayMs"
    :class="cn('flex size-full items-center justify-center rounded-full bg-muted text-xs font-medium', props.class)"
  >
    <slot />
  </AvatarFallback>
</template>
