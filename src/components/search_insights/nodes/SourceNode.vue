<template>
  <div class="source-node" :class="{ opportunity: data.isOpportunity, pending }">
    <Handle type="target" :position="Position.Left" />
    <div class="sn-top">
      <img :src="favicon" class="sn-favicon" alt="" @error="hideFavicon = true" v-if="!hideFavicon" />
      <span class="sn-domain">{{ data.row.domain }}</span>
      <SourceClassBadge :source_class="data.row.source_class" class="sn-badge" />
    </div>
    <div class="sn-title">{{ data.row.serp_title || data.row.url }}</div>
    <div class="sn-meta">
      <span v-if="pending" class="sn-reading">reading…</span>
      <template v-else>
        <span v-if="data.row.content_kind" class="sn-kind">{{ data.row.content_kind }}</span>
        <span v-if="data.row.published_at">{{ shortDate }}</span>
        <span v-if="mentionCount">{{ mentionCount }} brands</span>
      </template>
    </div>
    <Handle type="source" :position="Position.Right" id="out" />
    <Handle type="source" :position="Position.Bottom" id="down" class="handle-opp" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import SourceClassBadge from '@/components/citations/SourceClassBadge.vue'

const props = defineProps({
  data: { type: Object, required: true },
})

const hideFavicon = ref(false)
const favicon = computed(
  () => `https://www.google.com/s2/favicons?domain=${props.data.row.domain}&sz=32`,
)
const pending = computed(
  () => props.data.row.fetch_status === 'skipped' && !props.data.row.analysis_error,
)
const mentionCount = computed(() => (props.data.row.brands || []).length)
const shortDate = computed(() => {
  const d = props.data.row.published_at
  if (!d) return ''
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
})
</script>

<style scoped>
.source-node {
  background: var(--card);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  padding: 10px 14px;
  width: 220px;
  animation: node-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.source-node:hover {
  border-color: var(--ring);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}
.source-node.opportunity {
  border-color: color-mix(in srgb, var(--chart-3) 55%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--chart-3) 14%, transparent);
}
.source-node.pending { opacity: 0.75; border-style: dashed; }
@keyframes node-in {
  from { opacity: 0; transform: translateY(8px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.sn-top { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.sn-favicon { width: 14px; height: 14px; border-radius: 3px; flex-shrink: 0; }
.sn-domain {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.sn-badge { flex-shrink: 0; transform: scale(0.85); transform-origin: right center; }
.sn-title {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--foreground);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.sn-meta {
  display: flex;
  gap: 8px;
  margin-top: 5px;
  font-size: 9.5px;
  color: var(--muted-foreground);
}
.sn-kind { text-transform: capitalize; }
.sn-reading { color: var(--primary); animation: blink 1.2s ease infinite; }
@keyframes blink { 50% { opacity: 0.4; } }
:deep(.vue-flow__handle) {
  width: 7px;
  height: 7px;
  background: var(--muted-foreground);
  border: 2px solid var(--card);
}
:deep(.vue-flow__handle.handle-opp) { background: var(--chart-3); }
</style>
