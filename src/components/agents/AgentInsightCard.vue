<script setup>
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'

const props = defineProps({
  insight: { type: Object, required: true },
})

const points = computed(() => props.insight?.data?.key_points || [])
const channels = computed(() => props.insight?.delivered_channels || [])
</script>

<template>
  <div class="in-card">
    <div class="in-head">
      <h4 class="in-title">{{ insight.title }}</h4>
      <span class="in-date">{{ insight.run_date }}</span>
    </div>
    <p class="in-summary">{{ insight.summary_markdown }}</p>
    <ul v-if="points.length" class="in-points">
      <li v-for="(p, i) in points" :key="i">{{ p }}</li>
    </ul>
    <div v-if="channels.length" class="in-channels">
      <Badge v-for="c in channels" :key="c" variant="secondary">{{ c }}</Badge>
    </div>
  </div>
</template>

<style scoped>
.in-card {
  border: 1px solid var(--border-color); border-radius: var(--radius-md);
  background: var(--bg-card); padding: 16px;
}
.in-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.in-title { font-size: 14px; font-weight: 600; color: var(--text-primary); margin: 0; }
.in-date { font-size: 12px; color: var(--text-muted); white-space: nowrap; }
.in-summary { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin: 8px 0 0; white-space: pre-wrap; }
.in-points { margin: 8px 0 0; padding-left: 18px; font-size: 13px; color: var(--text-secondary); }
.in-points li { margin: 2px 0; }
.in-channels { display: flex; gap: 6px; margin-top: 10px; }
</style>
