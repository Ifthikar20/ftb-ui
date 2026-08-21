<script setup>
import { DropdownMenuTrigger } from 'reka-ui'
defineProps({ as: { type: null, default: 'button' }, asChild: { type: Boolean, default: false } })
</script>

<template>
  <DropdownMenuTrigger :as="as" :as-child="asChild">
    <slot />
  </DropdownMenuTrigger>
</template>
