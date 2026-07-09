<script setup>
import { computed } from 'vue'
import {
  ShieldCheck, Sparkles, Search, MessageCircle, UserX,
} from '@lucide/vue'

/**
 * Small coloured chip that says "this alert was caught by <agent>".
 * Reused in the alerts table (first column) and as a header on the
 * agent cards so users can visually tie alerts back to the agent that
 * raised them.
 */
const props = defineProps({
  agentId: { type: String, required: true },
  displayName: { type: String, default: '' },
  color: { type: String, default: 'slate' },
})

const ICONS = {
  narrative_watch: Sparkles,
  llm_truth: ShieldCheck,
  serp_reputation: Search,
  sentiment_pulse: MessageCircle,
  impersonation: UserX,
}

const iconComponent = computed(() => ICONS[props.agentId] || ShieldCheck)
const label = computed(() => props.displayName || props.agentId)

const palette = {
  amber:  { bg: 'rgba(245,158,11,0.14)',  fg: 'rgb(180,83,9)',   ring: 'rgba(245,158,11,0.35)' },
  purple: { bg: 'rgba(147,51,234,0.14)',  fg: 'rgb(126,34,206)', ring: 'rgba(147,51,234,0.35)' },
  blue:   { bg: 'rgba(59,130,246,0.14)',  fg: 'rgb(29,78,216)',  ring: 'rgba(59,130,246,0.35)' },
  teal:   { bg: 'rgba(20,184,166,0.14)',  fg: 'rgb(15,118,110)', ring: 'rgba(20,184,166,0.35)' },
  red:    { bg: 'rgba(239,68,68,0.14)',   fg: 'rgb(185,28,28)',  ring: 'rgba(239,68,68,0.35)' },
  slate:  { bg: 'rgba(100,116,139,0.14)', fg: 'rgb(51,65,85)',   ring: 'rgba(100,116,139,0.35)' },
}
const style = computed(() => {
  const p = palette[props.color] || palette.slate
  return {
    background: p.bg,
    color: p.fg,
    boxShadow: `inset 0 0 0 1px ${p.ring}`,
  }
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
    :style="style"
  >
    <component :is="iconComponent" class="size-3" />
    {{ label }}
  </span>
</template>
