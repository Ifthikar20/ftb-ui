<script setup>
import { Plus } from '@lucide/vue'
import { Button } from '@/components/ui/button'

defineProps({
  timeOfDay: { type: String, required: true },
  firstName: { type: String, required: true },
})
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-foreground">
        Good {{ timeOfDay }}, {{ firstName }}
      </h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Here's what's happening with your marketing today.
      </p>
    </div>
    <Button as="router-link" to="/websites">
      <Plus class="size-4" />
      Add Project
    </Button>
  </div>
</template>
