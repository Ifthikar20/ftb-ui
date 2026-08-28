<template>
  <div class="insight-canvas">
    <VueFlow
      :nodes="nodes"
      :edges="edges"
      :node-types="nodeTypes"
      :nodes-draggable="true"
      :nodes-connectable="false"
      :edges-updatable="false"
      :zoom-on-double-click="false"
      :min-zoom="0.25"
      :max-zoom="1.75"
      fit-view-on-init
      @node-click="onNodeClick"
      @pane-click="$emit('pane-click')"
    >
      <Background pattern-color="var(--border)" :gap="22" />
      <Controls :show-interactive="false" position="bottom-left" />
    </VueFlow>
  </div>
</template>

<script setup>
import { markRaw, watch } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import QueryNode from './nodes/QueryNode.vue'
import SourceNode from './nodes/SourceNode.vue'
import BrandNode from './nodes/BrandNode.vue'
import LeafNode from './nodes/LeafNode.vue'
import SkeletonNode from './nodes/SkeletonNode.vue'
import EngineNode from './nodes/EngineNode.vue'
import LaneLabelNode from './nodes/LaneLabelNode.vue'
import ActionNode from './nodes/ActionNode.vue'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'

const props = defineProps({
  nodes: { type: Array, default: () => [] },
  edges: { type: Array, default: () => [] },
})
const emit = defineEmits(['node-click', 'pane-click'])

const nodeTypes = {
  query: markRaw(QueryNode),
  source: markRaw(SourceNode),
  brand: markRaw(BrandNode),
  leaf: markRaw(LeafNode),
  skeleton: markRaw(SkeletonNode),
  engine: markRaw(EngineNode),
  lane: markRaw(LaneLabelNode),
  action: markRaw(ActionNode),
}

const { fitView } = useVueFlow()

// Re-fit as the tree grows during a running scan so new branches stay
// in view without the user having to pan.
watch(
  () => props.nodes.length,
  () => {
    requestAnimationFrame(() => fitView({ padding: 0.15, duration: 350 }))
  },
)

function onNodeClick({ node }) {
  emit('node-click', node)
}
</script>

<style scoped>
.insight-canvas {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: var(--background);
  border: 1px solid var(--border);
}
:deep(.vue-flow__controls) {
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: none;
}
:deep(.vue-flow__controls-button) {
  background: var(--card);
  border-bottom: 1px solid var(--border);
  fill: var(--foreground);
}
:deep(.vue-flow__controls-button:hover) { background: var(--muted); }
:deep(.vue-flow__edge-path) { transition: stroke 0.2s; }
</style>
