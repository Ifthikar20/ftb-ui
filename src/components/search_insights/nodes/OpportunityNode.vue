<template>
  <div class="opp-node">
    <Handle type="target" :position="Position.Top" />
    <div class="on-top">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="on-icon">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
      <span class="on-title">Chip in here</span>
    </div>
    <div class="on-reason">{{ data.opportunity.reason }}</div>
  </div>
</template>

<script setup>
import { Handle, Position } from '@vue-flow/core'

defineProps({
  data: { type: Object, required: true },
})
</script>

<style scoped>
.opp-node {
  background: color-mix(in srgb, var(--chart-3) 7%, var(--card));
  border: 1.5px dashed color-mix(in srgb, var(--chart-3) 60%, transparent);
  border-radius: 10px;
  padding: 9px 13px;
  width: 210px;
  animation: node-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes node-in {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}
.on-top { display: flex; align-items: center; gap: 5px; margin-bottom: 3px; }
.on-icon { color: var(--chart-3); flex-shrink: 0; }
.on-title {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--chart-3);
}
.on-reason {
  font-size: 10px;
  line-height: 1.35;
  color: var(--foreground);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
:deep(.vue-flow__handle) {
  width: 6px;
  height: 6px;
  background: var(--chart-3);
  border: 2px solid var(--card);
}
</style>
