<template>
  <div class="pipeline-node" :class="[`type-${data.nodeType}`, `status-${data.status || 'idle'}`, { selected }]">
    <Handle v-if="data.nodeType !== 'source'" type="target" :position="Position.Left" />

    <!-- Status dot -->
    <div class="pn-status" :class="data.status || 'idle'"></div>

    <!-- Icon -->
    <div class="pn-icon" v-html="data.icon || ''"></div>

    <!-- Label -->
    <div class="pn-label">{{ data.label }}</div>

    <!-- Lead count -->
    <div class="pn-count" v-if="data.leadCount !== undefined">
      {{ data.leadCount }} <span class="pn-count-unit">{{ data.leadCount === 1 ? 'lead' : 'leads' }}</span>
    </div>

    <!-- Badge -->
    <span v-if="data.badge" class="pn-badge" :class="data.badgeClass || 'badge-neutral'">{{ data.badge }}</span>

    <!-- Primary output handle (right) -->
    <Handle type="source" :position="Position.Right" id="out" />

    <!-- Secondary output handle (bottom — for split nodes) -->
    <Handle v-if="data.hasSplit" type="source" :position="Position.Bottom" id="split" class="handle-split" />
  </div>
</template>

<script setup>
import { Handle, Position } from '@vue-flow/core'

defineProps({
  data: { type: Object, required: true },
  selected: { type: Boolean, default: false },
})
</script>

<style scoped>
.pipeline-node {
  background: var(--card);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  padding: 14px 18px;
  min-width: 152px;
  max-width: 200px;
  transition: all 0.15s ease;
  cursor: grab;
  position: relative;
}
.pipeline-node:hover {
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  border-color: var(--ring);
}
.pipeline-node.selected {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ring) 25%, transparent);
}

/* Status ring */
.pn-status {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  transition: background 0.2s;
}
.pn-status.idle      { background: var(--border); }
.pn-status.ready     { background: var(--chart-3); }
.pn-status.running   { background: var(--primary); animation: pulse-status 1s ease infinite; }
.pn-status.done      { background: var(--chart-2); }

@keyframes pulse-status {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.35; }
}

/* Type variants */
.pipeline-node.type-source    { background: var(--muted); border-color: var(--ring); }
.pipeline-node.type-action    { background: var(--card); }
.pipeline-node.type-splitter  { background: var(--card); border-style: dashed; border-color: var(--ring); }
.pipeline-node.type-outreach  { background: color-mix(in srgb, var(--primary) 4%, var(--card)); border-color: color-mix(in srgb, var(--primary) 18%, transparent); }
.pipeline-node.type-linkedin  { background: color-mix(in srgb, #0a66c2 4%, var(--card)); border-color: color-mix(in srgb, #0a66c2 18%, transparent); }

.pn-icon   { font-size: 18px; margin-bottom: 6px; line-height: 1; }
.pn-label  { font-size: 11px; font-weight: 600; color: var(--muted-foreground); text-transform: uppercase; letter-spacing: 0.05em; line-height: 1.3; }
.pn-count  { font-family: var(--font-display, 'Inter', sans-serif); font-size: 22px; font-weight: 700; color: var(--foreground); line-height: 1.2; margin-top: 2px; }
.pn-count-unit { font-size: 11px; font-weight: 500; color: var(--muted-foreground); }

.pn-badge {
  display: inline-block;
  margin-top: 5px;
  font-size: 9px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
  letter-spacing: 0.03em;
}
.badge-neutral { background: var(--muted); color: var(--muted-foreground); }
.badge-accent  { background: color-mix(in srgb, var(--primary) 8%, transparent); color: var(--primary); }
.badge-success { background: color-mix(in srgb, var(--chart-2) 12%, transparent); color: var(--chart-2); }
.badge-info    { background: color-mix(in srgb, var(--chart-1) 12%, transparent); color: var(--chart-1); }
.badge-warning { background: color-mix(in srgb, var(--chart-3) 12%, transparent); color: var(--chart-3); }
.badge-danger  { background: color-mix(in srgb, var(--destructive) 12%, transparent); color: var(--destructive); }

/* Handle styling */
:deep(.vue-flow__handle) {
  width: 8px;
  height: 8px;
  background: var(--primary);
  border: 2px solid var(--card);
}
:deep(.vue-flow__handle.handle-split) {
  background: var(--chart-3);
}
</style>
