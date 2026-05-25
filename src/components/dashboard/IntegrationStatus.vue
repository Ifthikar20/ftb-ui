<script setup>
import { computed } from 'vue'
import { Link2 } from '@lucide/vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const props = defineProps({
  integrations: { type: Object, required: true },
})

const connectedCount = computed(() =>
  (props.integrations.services || []).filter(s => s.connected).length
)
const totalCount = computed(() => (props.integrations.services || []).length)

function dotClass(active, warn = false) {
  if (active) return 'bg-[color:var(--chart-2)] shadow-[0_0_6px_var(--chart-2)]'
  if (warn) return 'bg-[color:var(--chart-3)] shadow-[0_0_6px_var(--chart-3)]'
  return 'bg-muted-foreground/40'
}
</script>

<template>
  <Card>
    <CardHeader class="flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle class="flex items-center gap-2 text-base">
        <Link2 class="size-4 text-muted-foreground" />
        Integration Status
      </CardTitle>
      <router-link
        to="/settings"
        class="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Manage
      </router-link>
    </CardHeader>

    <CardContent class="pt-0">
      <div class="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Tracking Pixel
      </div>
      <div class="flex items-center gap-3 border-b border-border py-2.5">
        <span class="size-2 shrink-0 rounded-full" :class="dotClass(integrations.pixel?.verified, true)" />
        <div class="min-w-0 flex-1">
          <div class="text-sm font-semibold text-card-foreground">FetchBot Pixel</div>
          <div class="text-xs text-muted-foreground">
            <template v-if="integrations.pixel?.verified">
              Verified {{ integrations.pixel.verified_at || '' }}
            </template>
            <template v-else>
              Not installed —
              <router-link to="/websites" class="font-semibold text-[color:var(--chart-1)] hover:underline">
                Set up now
              </router-link>
            </template>
          </div>
        </div>
        <Badge :variant="integrations.pixel?.verified ? 'success' : 'warning'">
          {{ integrations.pixel?.verified ? 'Active' : 'Pending' }}
        </Badge>
      </div>

      <div class="mb-1 mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Connected Services
      </div>
      <div
        v-for="service in integrations.services"
        :key="service.type"
        class="flex items-center gap-3 border-b border-border py-2.5 last:border-0"
      >
        <span class="size-2 shrink-0 rounded-full" :class="dotClass(service.connected)" />
        <div class="min-w-0 flex-1">
          <div class="text-sm font-semibold text-card-foreground">{{ service.label }}</div>
          <div class="text-xs text-muted-foreground">
            {{ service.connected ? `Connected ${service.connected_at || ''}` : 'Not connected' }}
          </div>
        </div>
        <Badge :variant="service.connected ? 'success' : 'secondary'">
          {{ service.connected ? 'Connected' : 'Available' }}
        </Badge>
      </div>

      <div class="mt-4 flex items-center justify-center gap-5 border-t border-border pt-4">
        <div class="flex flex-col items-center">
          <span class="text-xl font-bold text-card-foreground">{{ connectedCount }}</span>
          <span class="text-xs text-muted-foreground">Connected</span>
        </div>
        <div class="h-8 w-px bg-border" />
        <div class="flex flex-col items-center">
          <span class="text-xl font-bold text-card-foreground">{{ totalCount }}</span>
          <span class="text-xs text-muted-foreground">Available</span>
        </div>
        <div class="h-8 w-px bg-border" />
        <div class="flex flex-col items-center">
          <span
            class="text-xl font-bold"
            :class="integrations.pixel?.verified ? 'text-[color:var(--chart-2)]' : 'text-[color:var(--chart-3)]'"
          >
            {{ integrations.pixel?.verified ? '✓' : '!' }}
          </span>
          <span class="text-xs text-muted-foreground">Pixel</span>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
