<script setup>
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const props = defineProps({
  spec: { type: Object, required: true },
  hired: { type: Object, default: null },
  canHire: { type: Boolean, default: true },
})
const emit = defineEmits(['hire', 'open'])

const isHired = computed(() => !!props.hired)
</script>

<template>
  <div class="ag-card">
    <div class="ag-card-top">
      <div class="ag-card-icon">{{ spec.name.charAt(0) }}</div>
      <Badge v-if="isHired" variant="secondary">Hired</Badge>
    </div>
    <h3 class="ag-card-name">{{ spec.name }}</h3>
    <p class="ag-card-tag">{{ spec.tagline }}</p>
    <div class="ag-card-meta">{{ spec.domain }}</div>
    <div class="ag-card-actions">
      <Button v-if="isHired" size="sm" @click="$emit('open', hired)">Open</Button>
      <Button v-else size="sm" :disabled="!canHire" @click="$emit('hire', spec)">
        {{ canHire ? 'Hire' : 'Limit reached' }}
      </Button>
    </div>
  </div>
</template>

<style scoped>
.ag-card {
  display: flex; flex-direction: column; gap: 8px;
  border: 1px solid var(--border-color); border-radius: var(--radius-md);
  background: var(--bg-card); padding: 18px;
}
.ag-card-top { display: flex; align-items: center; justify-content: space-between; }
.ag-card-icon {
  width: 36px; height: 36px; border-radius: var(--radius-sm);
  display: grid; place-items: center; font-weight: 700;
  background: var(--brand-accent-glow); color: var(--brand-accent);
}
.ag-card-name { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0; }
.ag-card-tag { font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin: 0; min-height: 38px; }
.ag-card-meta { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
.ag-card-actions { margin-top: 8px; }
</style>
