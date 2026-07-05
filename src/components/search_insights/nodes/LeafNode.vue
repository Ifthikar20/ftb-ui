<template>
  <div class="leaf-node" :class="data.kind">
    <Handle type="target" :position="Position.Left" />
    <span class="ln-tag">{{ data.kind === 'issue' ? 'Issue' : 'Quote' }}</span>
    <span class="ln-text">{{ data.kind === 'quote' ? `"${data.text}"` : data.text }}</span>
  </div>
</template>

<script setup>
import { Handle, Position } from '@vue-flow/core'

defineProps({
  data: { type: Object, required: true },
})
</script>

<style scoped>
.leaf-node {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
  width: 210px;
  animation: node-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.leaf-node.issue {
  border-color: color-mix(in srgb, var(--destructive) 35%, transparent);
  background: color-mix(in srgb, var(--destructive) 4%, var(--card));
}
@keyframes node-in {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}
.ln-tag {
  display: block;
  font-size: 8.5px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 2px;
}
.leaf-node.issue .ln-tag { color: var(--destructive); }
.leaf-node.quote .ln-tag { color: var(--muted-foreground); }
.ln-text {
  font-size: 10.5px;
  line-height: 1.35;
  color: var(--foreground);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.leaf-node.quote .ln-text { font-style: italic; color: var(--muted-foreground); }
:deep(.vue-flow__handle) {
  width: 6px;
  height: 6px;
  background: var(--border);
  border: 2px solid var(--card);
}
</style>
