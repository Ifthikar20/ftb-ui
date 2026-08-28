<template>
  <Card>
    <CardHeader class="flex flex-row items-center justify-between gap-4 space-y-0">
      <div>
        <CardTitle>Google Analytics</CardTitle>
        <CardDescription>Read live traffic from a GA4 property you already run — no tag changes needed.</CardDescription>
      </div>
      <Badge v-if="connected" :variant="status?.is_active ? 'success' : 'warning'">
        {{ status?.is_active ? 'Connected' : 'Reconnect needed' }}
      </Badge>
    </CardHeader>
    <CardContent>
      <template v-if="!status?.configured">
        <p class="text-sm text-muted-foreground">
          Google OAuth is not configured on this server yet, so GA4 can't be connected.
        </p>
      </template>

      <template v-else-if="!connected || !status?.is_active">
        <p class="mb-3 text-sm text-muted-foreground">
          You'll be sent to Google to grant read-only access
          (<code class="rounded bg-muted px-1 py-0.5 text-xs">analytics.readonly</code>).
          We only read the realtime report — nothing is stored on our side.
        </p>
        <Button :disabled="busy" @click="$emit('connect')">
          {{ busy ? 'Redirecting…' : (connected ? 'Reconnect Google Analytics' : 'Connect Google Analytics') }}
        </Button>
      </template>

      <template v-else-if="status?.pending_property_selection">
        <p class="mb-3 text-sm text-muted-foreground">
          Connected. This Google account has more than one GA4 property — pick the one for this website.
        </p>
        <div class="flex gap-2">
          <Button :disabled="busy" @click="$emit('choose-property')">Choose property</Button>
          <Button variant="ghost" :disabled="busy" @click="$emit('disconnect')">Disconnect</Button>
        </div>
      </template>

      <template v-else>
        <div class="flex items-center justify-between gap-4">
          <div class="text-sm">
            <div class="font-medium text-foreground">{{ status?.property_display_name || 'GA4 property' }}</div>
            <div class="text-muted-foreground">Property {{ status?.property_id }} · realtime, last 30 minutes</div>
          </div>
          <Button variant="secondary" size="sm" :disabled="busy" @click="$emit('disconnect')">Disconnect</Button>
        </div>
      </template>
    </CardContent>
  </Card>
</template>

<script setup>
import { computed } from 'vue'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const props = defineProps({
  status: { type: Object, default: null },
  busy: { type: Boolean, default: false },
})
defineEmits(['connect', 'disconnect', 'choose-property'])

const connected = computed(() => Boolean(props.status?.connected))
</script>
