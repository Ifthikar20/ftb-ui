<template>
  <BaseModal
    :model-value="modelValue"
    title="Choose a GA4 property"
    subtitle="This Google account has more than one Analytics property. Pick the one that tracks this website."
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div v-if="properties.length" class="space-y-2">
      <label
        v-for="prop in properties"
        :key="prop.property_id"
        class="flex cursor-pointer items-center justify-between rounded-lg border border-input px-3 py-2.5 text-sm transition-colors hover:bg-muted"
        :class="{ 'border-primary bg-muted': selected === prop.property_id }"
      >
        <span class="flex items-center gap-2">
          <input
            type="radio"
            name="ga4-property"
            :value="prop.property_id"
            v-model="selected"
            class="accent-current"
          />
          <span class="font-medium">{{ prop.display_name || prop.property_id }}</span>
        </span>
        <span class="text-xs text-muted-foreground">{{ prop.account_name }} · {{ prop.property_id }}</span>
      </label>
    </div>
    <p v-else class="text-sm text-muted-foreground">
      This Google account has no GA4 properties we can read. Create one in Google Analytics
      first, then reconnect.
    </p>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="ghost" @click="$emit('update:modelValue', false)">Cancel</Button>
        <Button :disabled="!selected || saving" @click="$emit('select', selected)">
          {{ saving ? 'Saving...' : 'Use this property' }}
        </Button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { Button } from '@/components/ui/button'

defineProps({
  modelValue: { type: Boolean, required: true },
  properties: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
})
defineEmits(['update:modelValue', 'select'])

const selected = ref('')
</script>
