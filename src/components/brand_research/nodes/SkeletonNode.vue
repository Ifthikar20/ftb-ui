<!--
  Placeholder for a lane that is still working.

  The point is to show the SHAPE of the answer before the data lands, so a
  half-finished scan reads as "filling in" rather than "this is all there
  is". Matches SourceNode's 220px width and padding so nothing reflows when
  the real node replaces it.

  Not clickable — buildGraph marks these `selectable: false`, and the page
  ignores clicks on them.
-->
<template>
  <div class="skeleton-node" :class="data.variant" aria-hidden="true">
    <Handle type="target" :position="Position.Left" />
    <template v-if="data.variant === 'brand'">
      <Skeleton class="sk-circle" />
    </template>
    <template v-else>
      <div class="sk-row">
        <Skeleton class="sk-fav" />
        <Skeleton class="sk-domain" />
      </div>
      <Skeleton class="sk-title" />
      <Skeleton class="sk-title short" />
      <div class="sk-row sk-meta">
        <Skeleton class="sk-chip" />
        <Skeleton class="sk-chip" />
      </div>
    </template>
    <Handle type="source" :position="Position.Right" id="out" />
  </div>
</template>

<script setup>
import { Handle, Position } from '@vue-flow/core'
import { Skeleton } from '@/components/ui/skeleton'

defineProps({
  // { variant: 'source' | 'brand' }
  data: { type: Object, default: () => ({ variant: 'source' }) },
})
</script>

<style scoped>
.skeleton-node {
  background: var(--card);
  border: 1.5px dashed var(--border);
  border-radius: 10px;
  padding: 10px 14px;
  width: 220px;
  opacity: 0.7;
  cursor: default;
}
.skeleton-node.brand {
  width: auto;
  padding: 0;
  border: none;
  background: transparent;
}
.sk-row { display: flex; align-items: center; gap: 6px; }
.sk-meta { margin-top: 7px; }
.sk-fav { width: 14px; height: 14px; border-radius: 3px; flex-shrink: 0; }
.sk-domain { height: 8px; width: 88px; }
.sk-title { height: 9px; width: 100%; margin-top: 8px; }
.sk-title.short { width: 62%; margin-top: 5px; }
.sk-chip { height: 7px; width: 34px; }
.sk-circle { width: 56px; height: 56px; border-radius: 50%; }
:deep(.vue-flow__handle) {
  width: 7px;
  height: 7px;
  background: var(--muted-foreground);
  border: 2px solid var(--card);
  opacity: 0.5;
}
</style>
