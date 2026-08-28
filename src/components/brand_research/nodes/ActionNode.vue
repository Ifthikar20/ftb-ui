<!--
  A place the user can go say something about their own brand. The terminal
  column: every path through the graph should be able to end on one of
  these rather than on a competitor's complaint.

  Two kinds. A `thread` is a live discussion naming competitors but not the
  user — somewhere to reply today. A `question` is a People Also Ask query
  nobody owns — somewhere to publish.
-->
<template>
  <div class="action-node" :class="opp.kind">
    <Handle type="target" :position="Position.Left" />
    <div class="an-top">
      <span class="an-kind">{{ opp.kind === 'question' ? 'Answer this' : 'Reply here' }}</span>
      <span v-if="opp.subreddit" class="an-sub">r/{{ opp.subreddit }}</span>
      <span v-else-if="opp.domain" class="an-sub">{{ opp.domain }}</span>
    </div>
    <div class="an-title">{{ opp.serp_title || opp.url }}</div>
    <div v-if="meta.length" class="an-meta">
      <span v-for="m in meta" :key="m">{{ m }}</span>
    </div>
    <Handle type="source" :position="Position.Right" id="out" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'

const props = defineProps({
  data: { type: Object, required: true },
})

const opp = computed(() => props.data.opportunity || {})

// Activity and age are what make one thread a better target than another,
// so they go on the node rather than hiding in the panel.
const meta = computed(() => {
  const o = opp.value
  const out = []
  if (o.num_comments) out.push(`${o.num_comments} comments`)
  if (o.score_upvotes) out.push(`${o.score_upvotes} upvotes`)
  if (o.age_days != null) out.push(formatAge(o.age_days))
  if (!out.length && (o.competitors || []).length) {
    out.push(`${o.competitors.length} competitors named`)
  }
  return out.slice(0, 3)
})

function formatAge(days) {
  if (days < 1) return 'today'
  if (days < 30) return `${days}d old`
  if (days < 365) return `${Math.round(days / 30)}mo old`
  return `${Math.round(days / 365)}y old`
}
</script>

<style scoped>
.action-node {
  background: var(--card);
  border: 1.5px solid color-mix(in srgb, var(--chart-3) 55%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--chart-3) 12%, transparent);
  border-radius: 10px;
  padding: 9px 12px;
  width: 220px;
  animation: node-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.action-node:hover {
  border-color: var(--chart-3);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--chart-3) 20%, transparent);
}
.action-node.question {
  border-color: var(--border);
  box-shadow: none;
}
.action-node.question:hover { border-color: var(--ring); }
@keyframes node-in {
  from { opacity: 0; transform: translateY(8px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.an-top { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }
.an-kind {
  font-size: 8.5px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 999px;
  color: var(--chart-3);
  background: color-mix(in srgb, var(--chart-3) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--chart-3) 40%, transparent);
  flex-shrink: 0;
}
.action-node.question .an-kind {
  color: var(--muted-foreground);
  background: var(--muted);
  border-color: var(--border);
}
.an-sub {
  font-size: 9.5px;
  font-weight: 700;
  color: var(--muted-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.an-title {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--foreground);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.an-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 5px;
  font-size: 9.5px;
  color: var(--muted-foreground);
}
:deep(.vue-flow__handle) {
  width: 7px;
  height: 7px;
  background: var(--muted-foreground);
  border: 2px solid var(--card);
}
</style>
