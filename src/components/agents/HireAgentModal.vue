<script setup>
import { ref, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { Button } from '@/components/ui/button'
import agentsApi from '@/api/agents'
import integrationsApi from '@/api/integrations'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  spec: { type: Object, default: null },
  websiteId: { type: String, default: null },
})
const emit = defineEmits(['update:modelValue', 'hired'])

const toast = useToast()
const frequency = ref('daily')
const slackConnectionId = ref('')
const slackConnections = ref([])
const saving = ref(false)

watch(() => props.modelValue, async (open) => {
  if (!open) return
  frequency.value = 'daily'
  slackConnectionId.value = ''
  try {
    const { data } = await integrationsApi.list()
    const rows = data?.data || data || []
    slackConnections.value = rows.filter((c) => c.platform === 'slack' && c.is_active)
  } catch (_) {
    slackConnections.value = []
  }
})

function close() { emit('update:modelValue', false) }

async function confirm() {
  if (!props.spec || !props.websiteId) {
    toast.error('Pick an active project first.')
    return
  }
  saving.value = true
  try {
    const payload = {
      agent_key: props.spec.key,
      website_id: props.websiteId,
      frequency: frequency.value,
    }
    if (slackConnectionId.value) payload.slack_connection_id = slackConnectionId.value
    const { data } = await agentsApi.hire(payload)
    toast.success(`${props.spec.name} hired.`)
    emit('hired', data?.data || data)
    close()
  } catch (e) {
    if (e.response?.status === 402) {
      toast.error("You've reached your plan's agent limit. Upgrade to hire more.")
    } else {
      toast.error(e.displayMessage || 'Could not hire agent.')
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="spec ? `Hire ${spec.name}` : 'Hire agent'"
    :subtitle="spec?.tagline"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="hm-grid">
      <div class="hm-field">
        <label class="hm-label">Update frequency</label>
        <select v-model="frequency" class="hm-input">
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>
      <div class="hm-field">
        <label class="hm-label">Deliver to Slack (optional)</label>
        <select v-model="slackConnectionId" class="hm-input">
          <option value="">In-app only</option>
          <option v-for="c in slackConnections" :key="c.id" :value="c.id">
            {{ c.channel_name || 'Slack connection' }}
          </option>
        </select>
        <p v-if="!slackConnections.length" class="hm-hint">
          Connect Slack under Integrations to receive daily digests there.
        </p>
      </div>
    </div>

    <template #footer>
      <div class="hm-footer">
        <Button variant="ghost" @click="close">Cancel</Button>
        <Button :disabled="saving" @click="confirm">{{ saving ? 'Hiring…' : 'Hire agent' }}</Button>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.hm-grid { display: flex; flex-direction: column; gap: 16px; }
.hm-field { display: flex; flex-direction: column; gap: 6px; }
.hm-label { font-size: 13px; font-weight: 500; color: var(--text-primary); }
.hm-input {
  width: 100%; border: 1px solid var(--border-color); border-radius: var(--radius-sm);
  background: var(--bg-input); padding: 9px 12px; font-size: 14px; color: var(--text-primary);
}
.hm-hint { font-size: 12px; color: var(--text-muted); margin: 0; }
.hm-footer { display: flex; justify-content: flex-end; gap: 8px; width: 100%; }
</style>
