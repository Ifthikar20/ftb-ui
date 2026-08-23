<script setup>
/**
 * Info icon with a real tooltip carrying a metric definition. Replaces
 * the page's bare, handler-less Info icons — an unexplained metric is
 * the reason this page confused people. TooltipProvider is app-wide
 * (SidebarProvider renders one), so this composes anywhere.
 */
import { Info } from '@lucide/vue'

import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip'

defineProps({
  text: { type: String, required: true },
  side: { type: String, default: 'top' },
})
</script>

<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <button
        type="button"
        class="inline-flex rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="What does this metric mean?"
      >
        <Info class="size-3.5" />
      </button>
    </TooltipTrigger>
    <TooltipContent :side="side" class="max-w-72 whitespace-normal leading-relaxed">
      {{ text }}
    </TooltipContent>
  </Tooltip>
</template>
