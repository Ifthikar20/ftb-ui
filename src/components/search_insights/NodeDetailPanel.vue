<template>
  <div class="detail-panel">
    <div class="dp-header">
      <span class="dp-type">{{ typeLabel }}</span>
      <button class="dp-close" @click="$emit('close')" aria-label="Close details">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </button>
    </div>

    <!-- Source -->
    <template v-if="node.type === 'source'">
      <h3 class="dp-title">{{ node.data.row.serp_title || node.data.row.domain }}</h3>
      <div class="dp-meta">
        <SourceClassBadge :source_class="node.data.row.source_class" />
        <span v-if="node.data.row.published_at">Published {{ node.data.row.published_at }}</span>
        <span v-if="node.data.row.word_count">{{ node.data.row.word_count }} words read</span>
      </div>
      <p v-if="node.data.row.serp_snippet" class="dp-text">{{ node.data.row.serp_snippet }}</p>
      <div v-if="(node.data.row.brands || []).length" class="dp-section">
        <h4 class="dp-section-title">Brands in this source</h4>
        <div v-for="b in node.data.row.brands" :key="b.name" class="dp-brand-row">
          <span class="dp-brand-dot" :style="{ background: sentimentColor(b.sentiment || 0) }"></span>
          <span class="dp-brand-name">{{ b.name }}</span>
          <span class="dp-brand-meta">{{ b.mentions }}x</span>
        </div>
      </div>
      <a :href="node.data.row.url" target="_blank" rel="noopener" class="dp-cta">Open source</a>
    </template>

    <!-- Brand -->
    <template v-else-if="node.type === 'brand'">
      <h3 class="dp-title">{{ node.data.brand.name }}</h3>
      <div class="dp-meta">
        <span v-if="node.data.brand.is_own_brand" class="dp-own">Your brand</span>
        <span>{{ node.data.brand.mentions }} mentions</span>
        <span>in {{ node.data.brand.results_present_in }} sources</span>
      </div>
      <div class="dp-section">
        <h4 class="dp-section-title">Sentiment</h4>
        <div class="dp-sentiment-track">
          <div
            class="dp-sentiment-fill"
            :style="{
              left: `${Math.min(50, 50 + (node.data.brand.sentiment || 0) * 50)}%`,
              width: `${Math.abs(node.data.brand.sentiment || 0) * 50}%`,
              background: sentimentColor(node.data.brand.sentiment || 0),
            }"
          ></div>
          <div class="dp-sentiment-mid"></div>
        </div>
        <div class="dp-sentiment-labels"><span>negative</span><span>positive</span></div>
      </div>
      <div class="dp-section">
        <h4 class="dp-section-title">Share of voice</h4>
        <div class="dp-share-track">
          <div class="dp-share-fill" :style="{ width: `${sharePct}%` }"></div>
        </div>
        <span class="dp-share-value">{{ sharePct }}% of the strongest brand</span>
      </div>
      <blockquote v-if="node.data.brand.top_quote" class="dp-quote">
        "{{ node.data.brand.top_quote }}"
      </blockquote>
      <div v-if="(node.data.brand.issues || []).length" class="dp-section">
        <h4 class="dp-section-title">Issues people raise</h4>
        <ul class="dp-issues">
          <li v-for="issue in node.data.brand.issues" :key="issue">{{ issue }}</li>
        </ul>
      </div>
    </template>

    <!-- Opportunity -->
    <template v-else-if="node.type === 'opportunity'">
      <h3 class="dp-title">Where you can chip in</h3>
      <p class="dp-text">{{ node.data.opportunity.reason }}</p>
      <div class="dp-section">
        <h4 class="dp-section-title">Brands in the conversation</h4>
        <div class="dp-chips">
          <span v-for="c in node.data.opportunity.competitors" :key="c" class="dp-chip">{{ c }}</span>
        </div>
      </div>
      <div v-if="(node.data.opportunity.issues || []).length" class="dp-section">
        <h4 class="dp-section-title">Their weak spots</h4>
        <ul class="dp-issues">
          <li v-for="issue in node.data.opportunity.issues" :key="issue">{{ issue }}</li>
        </ul>
      </div>
      <a :href="node.data.opportunity.url" target="_blank" rel="noopener" class="dp-cta accent">
        Open the conversation
      </a>
    </template>

    <!-- Leaf / query -->
    <template v-else-if="node.type === 'leaf'">
      <h3 class="dp-title">{{ node.data.kind === 'issue' ? 'Reported issue' : 'Notable quote' }}</h3>
      <p class="dp-text" :class="{ italic: node.data.kind === 'quote' }">{{ node.data.text }}</p>
    </template>
    <template v-else>
      <h3 class="dp-title">{{ node.data.label }}</h3>
      <p class="dp-text">
        This pathway shows which sources answer this search, which brands they
        point to, and where the conversation is open for you to join.
      </p>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import SourceClassBadge from '@/components/citations/SourceClassBadge.vue'
import { sentimentColor } from './buildGraph'

const props = defineProps({
  node: { type: Object, required: true },
  maxScore: { type: Number, default: 1 },
})
defineEmits(['close'])

const sharePct = computed(() => {
  if (props.node.type !== 'brand') return 0
  const score = props.node.data.brand.weighted_score || 0
  return Math.round((score / Math.max(props.maxScore, 0.0001)) * 100)
})
</script>

<style scoped>
.detail-panel {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  overflow-y: auto;
}
.dp-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.dp-type {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--muted-foreground);
}
.dp-close {
  color: var(--muted-foreground);
  padding: 4px;
  border-radius: 6px;
  transition: background 0.15s;
}
.dp-close:hover { background: var(--muted); color: var(--foreground); }
.dp-title { font-size: 15px; font-weight: 700; color: var(--foreground); line-height: 1.3; }
.dp-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  font-size: 11px;
  color: var(--muted-foreground);
}
.dp-own {
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--primary);
  font-weight: 700;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 10px;
}
.dp-text { margin-top: 10px; font-size: 12px; line-height: 1.5; color: var(--foreground); }
.dp-text.italic { font-style: italic; color: var(--muted-foreground); }
.dp-section { margin-top: 14px; }
.dp-section-title {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted-foreground);
  margin-bottom: 6px;
}
.dp-brand-row { display: flex; align-items: center; gap: 8px; padding: 3px 0; }
.dp-brand-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.dp-brand-name { font-size: 12px; font-weight: 600; color: var(--foreground); flex: 1; }
.dp-brand-meta { font-size: 10px; color: var(--muted-foreground); }
.dp-sentiment-track {
  position: relative;
  height: 8px;
  background: var(--muted);
  border-radius: 999px;
  overflow: hidden;
}
.dp-sentiment-fill { position: absolute; top: 0; bottom: 0; border-radius: 999px; }
.dp-sentiment-mid {
  position: absolute;
  left: 50%;
  top: -1px;
  bottom: -1px;
  width: 1.5px;
  background: var(--border);
}
.dp-sentiment-labels {
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  color: var(--muted-foreground);
  margin-top: 3px;
}
.dp-share-track { height: 8px; background: var(--muted); border-radius: 999px; overflow: hidden; }
.dp-share-fill { height: 100%; background: var(--primary); border-radius: 999px; transition: width 0.4s; }
.dp-share-value { font-size: 10px; color: var(--muted-foreground); margin-top: 3px; display: block; }
.dp-quote {
  margin-top: 14px;
  padding: 10px 12px;
  border-left: 3px solid var(--border);
  background: var(--muted);
  border-radius: 0 8px 8px 0;
  font-size: 12px;
  font-style: italic;
  color: var(--foreground);
  line-height: 1.45;
}
.dp-issues { display: flex; flex-direction: column; gap: 5px; }
.dp-issues li {
  font-size: 11.5px;
  line-height: 1.4;
  color: var(--foreground);
  padding-left: 14px;
  position: relative;
}
.dp-issues li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--destructive);
}
.dp-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.dp-chip {
  font-size: 10.5px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--muted);
  color: var(--foreground);
}
.dp-cta {
  display: inline-block;
  margin-top: 16px;
  font-size: 12px;
  font-weight: 700;
  color: var(--primary);
}
.dp-cta.accent { color: var(--chart-3); }
.dp-cta:hover { text-decoration: underline; }
</style>
