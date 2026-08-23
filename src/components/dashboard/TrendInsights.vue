<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Flame, TrendingUp, Zap, Radio } from '@lucide/vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import EmptyState from '@/components/ui/EmptyState.vue'

// Trends must be supplied by the caller from a measured source. This card
// previously shipped three invented keywords with invented growth figures
// under an "AI-Powered" badge; nothing generated them and they were
// identical for every account. It now renders only what it is given.
const props = defineProps({
  trends: { type: Array, default: () => [] },
  // Integration suggestions are product configuration, not measurements —
  // they stay declarative but are overridable.
  integrations: {
    type: Array,
    default: () => ([
      { type: 'slack', name: 'Slack', desc: 'Daily reports and brand-security alerts in your channels' },
      { type: 'discord', name: 'Discord', desc: 'Daily reports and /fetchbot commands in your server' },
    ]),
  },
})

const router = useRouter()
function goToIntegrations() { router.push('/app/integrations') }

const ICONS = { hot: Flame, rising: TrendingUp, opportunity: Zap }
function iconFor(t) { return ICONS[t.kind] || TrendingUp }

const rows = computed(() => props.trends || [])
</script>

<template>
  <Card>
    <CardHeader class="flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle class="flex items-center gap-2 text-base">
        <TrendingUp class="size-4 text-[color:var(--chart-4)]" />
        Trend Insights
      </CardTitle>
      <Badge v-if="rows.length">AI-Powered</Badge>
    </CardHeader>
    <CardContent class="pt-0">
      <p class="mb-4 text-xs leading-relaxed text-muted-foreground">
        FetchBot analyzes trending topics and keywords to find growth opportunities for your business.
      </p>

      <EmptyState
        v-if="!rows.length"
        title="No trends detected yet"
        body="Trending topics are derived from your prompt results. They appear here once enough audits have run to establish a baseline."
      />

      <div v-else class="flex flex-col gap-2">
        <div
          v-for="trend in rows"
          :key="trend.keyword"
          class="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2.5"
        >
          <div class="flex items-center gap-3">
            <component :is="iconFor(trend)" class="size-4" :class="trend.cls" />
            <div>
              <span class="block text-sm font-semibold text-card-foreground">{{ trend.keyword }}</span>
              <span class="text-xs text-muted-foreground">{{ trend.volume }}</span>
            </div>
          </div>
          <Badge v-if="trend.relevance" variant="secondary">{{ trend.relevance }}</Badge>
        </div>
      </div>

      <div class="mt-5 border-t border-border pt-4">
        <h4 class="mb-3 flex items-center gap-2 text-sm font-bold text-card-foreground">
          <Radio class="size-4 text-[color:var(--chart-1)]" />
          Connect to Supercharge
        </h4>
        <div class="flex flex-col gap-2">
          <div
            v-for="intg in integrations"
            :key="intg.name"
            class="flex items-center gap-3 rounded-lg bg-muted/60 px-3 py-2.5"
          >
            <div class="min-w-0 flex-1">
              <span class="block text-sm font-semibold text-card-foreground">{{ intg.name }}</span>
              <span class="text-xs text-muted-foreground">{{ intg.desc }}</span>
            </div>
            <Button variant="outline" size="sm" @click="goToIntegrations">Connect</Button>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
