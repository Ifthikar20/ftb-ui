<script setup>
import { computed, onMounted, onUnmounted, provide, ref, toRef } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  SIDEBAR_COOKIE_MAX_AGE,
  SIDEBAR_COOKIE_NAME,
  SIDEBAR_INJECTION_KEY,
  SIDEBAR_KEYBOARD_SHORTCUT,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_ICON,
} from './utils'

const props = defineProps({
  defaultOpen: { type: Boolean, default: true },
  open: { type: Boolean, default: undefined },
  class: { type: null, default: '' },
})
const emits = defineEmits(['update:open'])

const isMobile = useMediaQuery('(max-width: 767px)')
const openMobile = ref(false)

const openProp = toRef(props, 'open')
const _open = ref(props.defaultOpen)
const open = computed(() => openProp.value ?? _open.value)

function setOpen(value) {
  const newVal = typeof value === 'function' ? value(open.value) : value
  if (openProp.value !== undefined)
    emits('update:open', newVal)
  else
    _open.value = newVal
  document.cookie = `${SIDEBAR_COOKIE_NAME}=${newVal}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
}

function setOpenMobile(value) {
  openMobile.value = value
}

function toggleSidebar() {
  return isMobile.value ? setOpenMobile(!openMobile.value) : setOpen(!open.value)
}

function onKeydown(event) {
  if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    toggleSidebar()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

const state = computed(() => (open.value ? 'expanded' : 'collapsed'))

provide(SIDEBAR_INJECTION_KEY, {
  state,
  open,
  setOpen,
  isMobile,
  openMobile,
  setOpenMobile,
  toggleSidebar,
})
</script>

<template>
  <TooltipProvider :delay-duration="0">
    <div
      :style="{
        '--sidebar-width': SIDEBAR_WIDTH,
        '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
      }"
      :class="cn('group/sidebar-wrapper flex min-h-svh w-full', props.class)"
    >
      <slot />
    </div>
  </TooltipProvider>
</template>
