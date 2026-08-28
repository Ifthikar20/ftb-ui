<template>
  <Card>
    <CardHeader class="flex flex-row items-center justify-between gap-4 space-y-0">
      <div>
        <CardTitle>Cloudflare</CardTitle>
        <CardDescription>
          Site behind Cloudflare? Read edge traffic straight from your zone — no tag on the page at all.
        </CardDescription>
      </div>
      <Badge v-if="status?.connected" :variant="status?.is_active ? 'success' : 'warning'">
        {{ status?.is_active ? 'Connected' : 'Reconnect needed' }}
      </Badge>
    </CardHeader>
    <CardContent>
      <template v-if="!status?.connected || !status?.is_active">
        <ol class="mb-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            Open
            <a
              href="https://dash.cloudflare.com/profile/api-tokens"
              target="_blank"
              rel="noopener noreferrer"
              class="font-medium text-primary hover:underline"
            >Cloudflare → My Profile → API Tokens</a>
            and create a custom token.
          </li>
          <li>Give it <span class="font-medium text-foreground">Zone → Analytics → Read</span> and <span class="font-medium text-foreground">Zone → Zone → Read</span> for your zone.</li>
          <li>Paste the token below. Your site must be proxied through Cloudflare (orange cloud) to have data.</li>
        </ol>
        <form class="flex flex-col gap-2 sm:flex-row" @submit.prevent="submitToken">
          <input
            v-model="token"
            type="password"
            autocomplete="off"
            spellcheck="false"
            placeholder="Cloudflare API token"
            class="w-full flex-1 rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="submit" :disabled="!token.trim() || busy">
            {{ busy ? 'Checking…' : 'Connect' }}
          </Button>
        </form>
      </template>

      <template v-else-if="status?.pending_zone_selection">
        <p v-if="zones.length" class="mb-3 text-sm text-muted-foreground">
          Token accepted. Which zone is this website on?
        </p>
        <p v-else class="mb-3 text-sm text-muted-foreground">
          Token accepted, but it can't list any zones. Recreate it with
          <span class="font-medium text-foreground">Zone → Zone → Read</span> included, then reconnect.
        </p>
        <div v-if="zones.length" class="mb-3 space-y-2">
          <label
            v-for="zone in zones"
            :key="zone.id"
            class="flex cursor-pointer items-center justify-between rounded-lg border border-input px-3 py-2.5 text-sm transition-colors hover:bg-muted"
            :class="{ 'border-primary bg-muted': selectedZone === zone.id }"
          >
            <span class="flex items-center gap-2">
              <input type="radio" name="cf-zone" :value="zone.id" v-model="selectedZone" class="accent-current" />
              <span class="font-medium">{{ zone.name }}</span>
            </span>
            <span class="text-xs text-muted-foreground">{{ zone.status }}</span>
          </label>
        </div>
        <div class="flex gap-2">
          <Button v-if="zones.length" :disabled="!selectedZone || busy" @click="$emit('select-zone', selectedZone)">
            Use this zone
          </Button>
          <Button variant="ghost" :disabled="busy" @click="$emit('disconnect')">Disconnect</Button>
        </div>
      </template>

      <template v-else>
        <div class="flex items-center justify-between gap-4">
          <div class="text-sm">
            <div class="font-medium text-foreground">{{ status?.zone_name }}</div>
            <div class="text-muted-foreground">Edge requests and visits · ~1–5 min delay · sampled</div>
          </div>
          <Button variant="secondary" size="sm" :disabled="busy" @click="$emit('disconnect')">Disconnect</Button>
        </div>
      </template>
    </CardContent>
  </Card>
</template>

<script setup>
import { ref } from 'vue'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

defineProps({
  status: { type: Object, default: null },
  zones: { type: Array, default: () => [] },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['connect', 'select-zone', 'disconnect'])

const token = ref('')
const selectedZone = ref('')

function submitToken() {
  const value = token.value.trim()
  if (!value) return
  emit('connect', value)
  token.value = ''
}
</script>
