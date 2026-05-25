<script setup>
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'

const props = defineProps({
  name: { type: String, required: true },
  value: { type: [String, Number, null], default: null },
})

defineEmits(['request-edit'])

const resolved = computed(() => props.value !== null && props.value !== undefined && String(props.value).length > 0)
const variant = computed(() => (resolved.value ? 'secondary' : 'warning'))
const tooltip = computed(() =>
  resolved.value ? `{{ ${props.name} }} = ${props.value}` : `{{ ${props.name} }} not set — click to fill`,
)
</script>

<template>
  <Badge
    as="button"
    :variant="variant"
    :title="tooltip"
    class="cursor-pointer"
    @click="$emit('request-edit', name)"
  >
    <span v-if="resolved">{{ value }}</span>
    <span v-else>{{ name }}</span>
  </Badge>
</template>
