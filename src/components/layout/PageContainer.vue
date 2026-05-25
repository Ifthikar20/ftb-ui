<script setup>
defineProps({
  scrollable: { type: Boolean, default: true },
})
</script>

<template>
  <div v-if="scrollable" class="flex flex-1 flex-col overflow-auto">
    <div class="@container/main flex flex-1 flex-col gap-4 md:gap-6">
      <slot />
    </div>
  </div>
  <div v-else class="@container/main flex flex-1 flex-col gap-4 md:gap-6">
    <slot />
  </div>
</template>
