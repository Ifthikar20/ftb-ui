<script setup>
import { cn } from '@/lib/utils'
import { useSidebar } from './utils'

const props = defineProps({ class: { type: null, default: '' } })
const { toggleSidebar } = useSidebar()
</script>

<template>
  <button
    data-sidebar="rail"
    aria-label="Toggle Sidebar"
    tabindex="-1"
    title="Toggle Sidebar"
    @click="toggleSidebar"
    :class="cn(
      'absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex',
      '[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize',
      'group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full hover:group-data-[collapsible=offcanvas]:bg-sidebar',
      props.class,
    )"
  />
</template>
