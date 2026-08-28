<!--
  Column header for one channel lane. Not a real graph node: no handles, no
  edges, not selectable. It exists so the three kinds of thing in the channel
  column stay visually separated, and so each lane carries its own load sign
  instead of the page having one global spinner.
-->
<template>
  <div class="lane-label" :class="data.status">
    <span class="ll-text">{{ data.label }}</span>
    <span v-if="working" class="ll-spinner" :title="`${data.label} still loading`"></span>
    <span v-else-if="data.status === 'failed'" class="ll-state">failed</span>
    <span v-else-if="data.status === 'skipped'" class="ll-state">not run</span>
    <span v-else-if="data.count" class="ll-count">{{ data.count }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: { type: Object, required: true },
})

const working = computed(() => ['pending', 'running'].includes(props.data.status))
</script>

<style scoped>
.lane-label {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 220px;
  padding: 0 2px 6px;
  border-bottom: 1px solid var(--border);
  cursor: default;
  user-select: none;
}
.ll-text {
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted-foreground);
  flex: 1;
}
.lane-label.running .ll-text, .lane-label.pending .ll-text { color: var(--primary); }
.lane-label.skipped { opacity: 0.5; }
.ll-count, .ll-state {
  font-size: 9px;
  font-weight: 700;
  color: var(--muted-foreground);
}
.lane-label.failed .ll-state { color: var(--destructive); }
.ll-spinner {
  width: 9px;
  height: 9px;
  border: 1.5px solid color-mix(in srgb, var(--primary) 25%, transparent);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: ll-spin 0.7s linear infinite;
  flex-shrink: 0;
}
@keyframes ll-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .ll-spinner { animation-duration: 2.4s; }
}
</style>
