<template>
  <div class="query-node" :class="{ running: data.running }">
    <div class="qn-kicker">Search query</div>
    <div class="qn-label">{{ data.label }}</div>
    <Handle type="source" :position="Position.Right" />
  </div>
</template>

<script setup>
import { Handle, Position } from '@vue-flow/core'

defineProps({
  data: { type: Object, required: true },
})
</script>

<style scoped>
.query-node {
  background: color-mix(in srgb, var(--primary) 7%, var(--card));
  border: 1.5px solid color-mix(in srgb, var(--primary) 35%, transparent);
  border-radius: 12px;
  padding: 14px 18px;
  max-width: 220px;
  animation: node-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.query-node.running {
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 12%, transparent);
  animation: node-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both,
    query-pulse 1.6s ease infinite 0.4s;
}
@keyframes query-pulse {
  0%, 100% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 10%, transparent); }
  50% { box-shadow: 0 0 0 7px color-mix(in srgb, var(--primary) 16%, transparent); }
}
@keyframes node-in {
  from { opacity: 0; transform: translateY(8px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.qn-kicker {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--primary);
  margin-bottom: 4px;
}
.qn-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--foreground);
  line-height: 1.35;
}
:deep(.vue-flow__handle) {
  width: 8px;
  height: 8px;
  background: var(--primary);
  border: 2px solid var(--card);
}
</style>
