<script setup>
import { useRouter } from 'vue-router'
import { Flame, TrendingUp, Zap, Radio } from '@lucide/vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const router = useRouter()
function goToIntegrations() { router.push('/integrations') }

const trends = [
  { keyword: '"AI productivity tools"', volume: '↑ 340% this week', icon: Flame, relevance: 'High Match', cls: 'text-destructive' },
  { keyword: '"automation workflows"', volume: '↑ 120% this month', icon: TrendingUp, relevance: 'Medium', cls: 'text-[color:var(--chart-3)]' },
  { keyword: '"growth hacking 2026"', volume: '↑ 85% trending', icon: Zap, relevance: 'Opportunity', cls: 'text-[color:var(--chart-4)]' },
]

const suggestedIntegrations = [
  { type: 'slack', name: 'Slack', desc: 'Get trend alerts directly in your channels' },
  { type: 'discord', name: 'Discord', desc: 'Share weekly insights with your team' },
  { type: 'telegram', name: 'Telegram', desc: 'Receive instant growth milestone alerts' },
]
</script>

<template>
  <Card>
    <CardHeader class="flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle class="flex items-center gap-2 text-base">
        <TrendingUp class="size-4 text-[color:var(--chart-4)]" />
        Trend Insights
      </CardTitle>
      <Badge>AI-Powered</Badge>
    </CardHeader>
    <CardContent class="pt-0">
      <p class="mb-4 text-xs leading-relaxed text-muted-foreground">
        FetchBot analyzes trending topics and keywords to find growth opportunities for your business.
      </p>

      <div class="flex flex-col gap-2">
        <div
          v-for="trend in trends"
          :key="trend.keyword"
          class="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2.5"
        >
          <div class="flex items-center gap-3">
            <component :is="trend.icon" class="size-4" :class="trend.cls" />
            <div>
              <span class="block text-sm font-semibold text-card-foreground">{{ trend.keyword }}</span>
              <span class="text-xs text-muted-foreground">{{ trend.volume }}</span>
            </div>
          </div>
          <Badge variant="secondary">{{ trend.relevance }}</Badge>
        </div>
      </div>

      <div class="mt-5 border-t border-border pt-4">
        <h4 class="mb-3 flex items-center gap-2 text-sm font-bold text-card-foreground">
          <Radio class="size-4 text-[color:var(--chart-1)]" />
          Connect to Supercharge
        </h4>
        <div class="flex flex-col gap-2">
          <div
            v-for="intg in suggestedIntegrations"
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
