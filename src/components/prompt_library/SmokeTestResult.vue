<script setup>
import { ref, computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const props = defineProps({
  result: { type: Object, required: true },
})

defineEmits(['try-provider'])

const expanded = ref(false)
const r = computed(() => props.result || {})

const providers = ['claude', 'gpt4', 'gemini', 'perplexity']
</script>

<template>
  <div class="str-wrap">
    <div class="str-meta">
      <Badge variant="secondary">{{ r.provider || 'unknown' }}</Badge>
      <span v-if="r.latency_ms" class="str-stat">{{ r.latency_ms }}ms</span>
      <span v-if="r.cost_usd" class="str-stat">${{ Number(r.cost_usd).toFixed(4) }}</span>
      <Badge :variant="r.mentioned ? 'success' : 'secondary'">
        {{ r.mentioned ? 'Mentioned' : 'Not mentioned' }}
      </Badge>
      <Badge variant="secondary">{{ r.citations_count || 0 }} citations</Badge>
      <Badge v-if="r.claims_count !== undefined" variant="secondary">{{ r.claims_count }} claims</Badge>
    </div>

    <div v-if="r.error" class="str-error">{{ r.error }}</div>

    <div class="str-section">
      <div class="str-label">Filled prompt</div>
      <pre class="str-pre">{{ r.filled_prompt }}</pre>
    </div>

    <div class="str-section">
      <div class="str-label">LLM response</div>
      <div class="str-response" :class="{ 'str-collapsed': !expanded }">
        <pre class="str-pre">{{ r.response_text }}</pre>
      </div>
      <button type="button" class="str-toggle" @click="expanded = !expanded">
        {{ expanded ? 'Show less' : 'Show more' }}
      </button>
    </div>

    <div class="str-section str-try">
      <span class="str-label">Try another provider:</span>
      <Button
        v-for="p in providers"
        :key="p"
        size="sm"
        :variant="p === r.provider ? 'default' : 'ghost'"
        @click="$emit('try-provider', p)"
      >{{ p }}</Button>
    </div>
  </div>
</template>

<style scoped>
.str-wrap { display: flex; flex-direction: column; gap: 12px; }
.str-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.str-stat { font-size: 11px; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
.str-error { color: var(--destructive); font-size: 12px; }
.str-section { display: flex; flex-direction: column; gap: 4px; }
.str-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted-foreground); }
.str-pre {
  margin: 0;
  padding: 10px 12px;
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.55;
  color: var(--foreground);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 600px;
  overflow: auto;
}
.str-response.str-collapsed .str-pre { max-height: 200px; }
.str-toggle {
  align-self: flex-start;
  background: transparent; border: 0; padding: 0;
  color: var(--primary); font-size: 12px; cursor: pointer;
}
.str-try { flex-direction: row; align-items: center; flex-wrap: wrap; gap: 6px; }
</style>
