<script setup>
import { Primitive } from 'reka-ui'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useSidebar, sidebarMenuButtonVariants } from './utils'

const props = defineProps({
  as: { type: null, default: 'button' },
  asChild: { type: Boolean, default: false },
  isActive: { type: Boolean, default: false },
  variant: { type: String, default: 'default' },
  size: { type: String, default: 'default' },
  tooltip: { type: String, default: undefined },
  class: { type: null, default: '' },
})

const { isMobile, state } = useSidebar()
</script>

<template>
  <Tooltip v-if="tooltip">
    <TooltipTrigger as-child>
      <Primitive
        :as="as"
        :as-child="asChild"
        data-sidebar="menu-button"
        :data-size="size"
        :data-active="isActive"
        :class="cn(sidebarMenuButtonVariants({ variant, size }), props.class)"
      >
        <slot />
      </Primitive>
    </TooltipTrigger>
    <TooltipContent
      side="right"
      align="center"
      :hidden="state !== 'collapsed' || isMobile"
    >
      {{ tooltip }}
    </TooltipContent>
  </Tooltip>

  <Primitive
    v-else
    :as="as"
    :as-child="asChild"
    data-sidebar="menu-button"
    :data-size="size"
    :data-active="isActive"
    :class="cn(sidebarMenuButtonVariants({ variant, size }), props.class)"
  >
    <slot />
  </Primitive>
</template>
