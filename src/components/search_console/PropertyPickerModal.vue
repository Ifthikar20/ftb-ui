<template>
  <BaseModal
    :model-value="modelValue"
    title="Choose a Search Console property"
    subtitle="We could not automatically match your website to a property in this Google account. Pick the one that covers it."
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div v-if="properties.length" class="space-y-2">
      <label
        v-for="prop in properties"
        :key="prop.site_url"
        class="flex cursor-pointer items-center justify-between rounded-lg border border-input px-3 py-2.5 text-sm transition-colors hover:bg-muted"
        :class="{ 'border-primary bg-muted': selected === prop.site_url }"
      >
        <span class="flex items-center gap-2">
          <input
            type="radio"
            name="gsc-property"
            :value="prop.site_url"
            v-model="selected"
            class="accent-current"
          />
          <span class="font-medium">{{ displayName(prop.site_url) }}</span>
        </span>
        <span class="text-xs text-muted-foreground">{{ propertyType(prop.site_url) }}</span>
      </label>
    </div>
    <p v-else class="text-sm text-muted-foreground">
      This Google account has no verified Search Console properties. Verify your site in
      Search Console first, then reconnect.
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

function displayName(siteUrl) {
  return siteUrl.startsWith('sc-domain:') ? siteUrl.slice('sc-domain:'.length) : siteUrl
}

function propertyType(siteUrl) {
  return siteUrl.startsWith('sc-domain:') ? 'Domain property' : 'URL prefix'
}
</script>
