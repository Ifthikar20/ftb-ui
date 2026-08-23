<script setup>
import { DialogClose } from 'reka-ui'
defineProps({ as: { type: null, default: 'button' }, asChild: { type: Boolean, default: false } })
</script>

<template>
  <DialogClose :as="as" :as-child="asChild">
    <slot />
  </DialogClose>
</template>
