<template>
  <Card>
    <CardHeader class="flex flex-row items-center justify-between gap-4 space-y-0">
      <div>
        <CardTitle>FetchBot Google tag</CardTitle>
        <CardDescription>
          No Google account? Paste our Google tag — traffic lands in a GA4 property we host and shows up live here.
        </CardDescription>
      </div>
      <Badge v-if="status?.enabled" variant="success">Enabled</Badge>
    </CardHeader>
    <CardContent>
      <template v-if="!status?.enabled">
        <p class="mb-3 text-sm text-muted-foreground">
          We create a dedicated data stream for {{ hostLabel }} in a FetchBot-managed Google
          Analytics property and give you a snippet to paste into your site's
          <code class="rounded bg-muted px-1 py-0.5 text-xs">&lt;head&gt;</code>.
          Realtime covers the last 30 minutes.
        </p>
        <p v-if="errorLabel" class="mb-3 text-sm text-destructive">{{ errorLabel }}</p>
        <Button :disabled="busy" @click="$emit('enable')">
          {{ busy ? 'Setting up…' : 'Generate my Google tag' }}
        </Button>
      </template>

      <template v-else>
        <p class="mb-4 text-sm text-muted-foreground">
          Add this tag to your website's <code class="rounded bg-muted px-1 py-0.5 text-xs">&lt;head&gt;</code>.
          Measurement ID <span class="font-medium text-foreground">{{ status?.measurement_id }}</span>.
        </p>
        <div class="overflow-x-auto whitespace-pre rounded-lg border border-border bg-muted px-4 py-3.5 font-mono text-xs text-[color:var(--chart-2)]">{{ status?.snippet }}</div>
        <div class="mt-3 flex items-center gap-2">
          <Button variant="secondary" size="sm" @click="copySnippet">
            {{ copied ? 'Copied!' : 'Copy tag' }}
          </Button>
          <Button variant="ghost" size="sm" :disabled="busy" @click="$emit('disable')">Disable</Button>
        </div>
      </template>
    </CardContent>
  </Card>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const props = defineProps({
  status: { type: Object, default: null },
  hostLabel: { type: String, default: 'your site' },
  busy: { type: Boolean, default: false },
})
defineEmits(['enable', 'disable'])

const copied = ref(false)

const ERROR_LABELS = {
  stream_limit_reached: 'Our tag pool is full right now — contact support and we will free up a slot.',
  sa_token_failed: 'Google rejected our service credentials. Try again in a minute or contact support.',
  provision_failed: 'Google Analytics refused to create the stream. Try again in a minute.',
  not_configured: 'This source is not configured on the server yet.',
}
const errorLabel = computed(() => ERROR_LABELS[props.status?.provisioning_error] || '')

function copySnippet() {
  if (!props.status?.snippet) return
  navigator.clipboard.writeText(props.status.snippet)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}
</script>
