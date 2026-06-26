<script setup>
import { ref } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import agentsApi from '@/api/agents'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  action: { type: Object, required: true },
})
const emit = defineEmits(['updated'])

const toast = useToast()
const busy = ref(false)

const STATUS_VARIANT = {
  proposed: 'secondary', approved: 'default', rejected: 'outline',
  executing: 'secondary', done: 'default', failed: 'destructive',
}

async function decide(decision) {
  busy.value = true
  try {
    const { data } = await agentsApi.decideAction(props.action.id, decision)
    toast.success(decision === 'approve' ? 'Action approved.' : 'Action dismissed.')
    emit('updated', data?.data || data)
  } catch (e) {
    toast.error(e.displayMessage || 'Could not update action.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="aa-row">
    <div class="aa-main">
      <div class="aa-title">{{ action.title }}</div>
      <div class="aa-meta">
        <Badge variant="outline">{{ action.action_type }}</Badge>
        <Badge :variant="STATUS_VARIANT[action.status] || 'secondary'">{{ action.status }}</Badge>
      </div>
    </div>
    <div v-if="action.status === 'proposed'" class="aa-actions">
      <Button size="sm" variant="outline" :disabled="busy" @click="decide('reject')">Dismiss</Button>
      <Button size="sm" :disabled="busy" @click="decide('approve')">Approve</Button>
    </div>
  </div>
</template>

<style scoped>
.aa-row {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  border: 1px solid var(--border-color); border-radius: var(--radius-sm);
  background: var(--bg-card); padding: 12px 14px;
}
.aa-title { font-size: 13px; font-weight: 500; color: var(--text-primary); }
.aa-meta { display: flex; gap: 6px; margin-top: 6px; }
.aa-actions { display: flex; gap: 8px; flex-shrink: 0; }
</style>
