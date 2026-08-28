<!--
  One AI engine's answer to the scan query.

  An engine with no API key still gets a node, greyed out. Omitting it would
  read as "this engine had nothing to say about your brand", which is a very
  different claim from "we never asked it".
-->
<template>
  <div class="engine-node" :class="statusClass">
    <Handle type="target" :position="Position.Left" />
    <div class="en-top">
      <span class="en-mark" :style="{ background: markColor }">{{ initial }}</span>
      <span class="en-name">{{ label }}</span>
      <span v-if="engine.status !== 'ok'" class="en-state">{{ stateLabel }}</span>
    </div>
    <div v-if="engine.status === 'ok'" class="en-brands">
      <span v-if="!namedBrands.length" class="en-empty">no brands named</span>
      <span
        v-for="b in namedBrands"
        :key="b.name"
        class="en-chip"
        :style="{ borderColor: sentimentColor(b.sentiment || 0), color: sentimentColor(b.sentiment || 0) }"
      >
        {{ b.name }}
      </span>
    </div>
    <div v-else class="en-reason">{{ engine.error || 'no answer' }}</div>
    <div v-if="engine.status === 'ok' && citationCount" class="en-meta">
      {{ citationCount }} {{ citationCount === 1 ? 'citation' : 'citations' }}
      <span v-if="(engine.cited_ranks || []).length" class="en-linked">
        · {{ engine.cited_ranks.length }} in this scan
      </span>
    </div>
    <Handle type="source" :position="Position.Right" id="out" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { sentimentColor } from '../buildGraph'

const props = defineProps({
  data: { type: Object, required: true },
})

const engine = computed(() => props.data.engine || {})

// Mirrors ENGINE_LABELS in apps/citations/services/engine_probe.py.
const LABELS = {
  claude: 'Claude',
  gpt4: 'ChatGPT',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
  grok: 'Grok',
  google_ai_overview: 'Google AI Overview',
}
const MARK_COLORS = {
  claude: 'var(--chart-1)',
  gpt4: 'var(--chart-2)',
  gemini: 'var(--chart-3)',
  perplexity: 'var(--chart-4)',
  grok: 'var(--chart-5)',
  google_ai_overview: 'var(--muted-foreground)',
}

const label = computed(() => LABELS[engine.value.provider] || engine.value.provider || 'Engine')
const initial = computed(() => (label.value[0] || '?').toUpperCase())
const markColor = computed(() =>
  engine.value.status === 'ok'
    ? MARK_COLORS[engine.value.provider] || 'var(--muted-foreground)'
    : 'var(--muted-foreground)',
)
const statusClass = computed(() => `st-${engine.value.status || 'failed'}`)
const stateLabel = computed(() =>
  engine.value.status === 'not_configured' ? 'not connected' : 'no answer',
)
// Cap at four: the node is a summary, the full ordered list is in the panel.
const namedBrands = computed(() => (engine.value.brands || []).slice(0, 4))
const citationCount = computed(() => (engine.value.citations || []).length)
</script>

<style scoped>
.engine-node {
  background: var(--card);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  padding: 9px 12px;
  width: 220px;
  animation: node-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.engine-node:hover {
  border-color: var(--ring);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}
.engine-node.st-ok { border-color: color-mix(in srgb, var(--primary) 32%, var(--border)); }
.engine-node.st-not_configured,
.engine-node.st-failed {
  opacity: 0.55;
  border-style: dashed;
}
@keyframes node-in {
  from { opacity: 0; transform: translateY(8px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.en-top { display: flex; align-items: center; gap: 7px; }
.en-mark {
  width: 16px;
  height: 16px;
  border-radius: 5px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 800;
  color: var(--background);
}
.en-name {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.en-state {
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted-foreground);
  flex-shrink: 0;
}
.en-brands { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 7px; }
.en-chip {
  font-size: 9.5px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid var(--border);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.en-empty, .en-reason {
  margin-top: 6px;
  font-size: 9.5px;
  color: var(--muted-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.en-meta { margin-top: 6px; font-size: 9px; color: var(--muted-foreground); }
.en-linked { color: var(--primary); }
:deep(.vue-flow__handle) {
  width: 7px;
  height: 7px;
  background: var(--muted-foreground);
  border: 2px solid var(--card);
}
</style>
