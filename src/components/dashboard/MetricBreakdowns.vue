<script setup>
import { computed } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const props = defineProps({
  breakdowns: { type: Object, default: null },
})

const providerLabels = {
  claude: 'Claude',
  gpt4: 'GPT-4',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
  deepseek: 'DeepSeek',
  grok: 'Grok',
}

const sentimentLabels = {
  positive: 'Positive',
  neutral: 'Neutral',
  negative: 'Negative',
}

const sentimentColors = {
  positive: 'var(--chart-2)',
  neutral: 'var(--muted-foreground)',
  negative: 'var(--chart-5, #ef4444)',
}

const visibility = computed(() => props.breakdowns?.visibility?.by_provider || [])
const position = computed(() => props.breakdowns?.position?.distribution || [])
const sentimentSplit = computed(() => props.breakdowns?.sentiment?.split || [])
const sentimentSamples = computed(() => props.breakdowns?.sentiment?.samples || [])

const positionTotal = computed(() => props.breakdowns?.position?.total_mentions ?? 0)
const sentimentTotal = computed(() => props.breakdowns?.sentiment?.total_mentions ?? 0)

function providerLabel(p) {
  return providerLabels[p] || p
}

function sentimentLabel(s) {
  return sentimentLabels[s] || s
}
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-3">
    <!-- Visibility breakdown -->
    <Card>
      <CardHeader>
        <CardTitle>Visibility by model</CardTitle>
        <CardDescription>Where you actually show up in answers.</CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="visibility.length" class="flex flex-col gap-3">
          <div v-for="row in visibility" :key="row.provider" class="space-y-1">
            <div class="flex items-center justify-between text-sm">
              <span class="font-medium text-card-foreground">{{ providerLabel(row.provider) }}</span>
              <span class="tabular-nums text-muted-foreground">
                {{ row.mention_rate }}% <span class="opacity-60">({{ row.mentions }}/{{ row.total }})</span>
              </span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-muted">
              <div
                class="h-full rounded-full"
                :style="{ width: row.mention_rate + '%', background: 'var(--chart-1)' }"
              />
            </div>
          </div>
        </div>
        <div v-else class="py-8 text-center text-xs text-muted-foreground">
          No results in the last 30 days.
        </div>
      </CardContent>
    </Card>

    <!-- Position breakdown -->
    <Card>
      <CardHeader>
        <CardTitle>Position distribution</CardTitle>
        <CardDescription>How high you rank when you do show up.</CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="positionTotal" class="flex flex-col gap-3">
          <div v-for="row in position" :key="row.range" class="space-y-1">
            <div class="flex items-center justify-between text-sm">
              <span class="font-medium text-card-foreground">Rank {{ row.range }}</span>
              <span class="tabular-nums text-muted-foreground">
                {{ row.pct }}% <span class="opacity-60">({{ row.count }})</span>
              </span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-muted">
              <div
                class="h-full rounded-full"
                :style="{ width: row.pct + '%', background: 'var(--chart-4)' }"
              />
            </div>
          </div>
          <div class="pt-1 text-xs text-muted-foreground">
            Across {{ positionTotal }} ranked mentions.
          </div>
        </div>
        <div v-else class="py-8 text-center text-xs text-muted-foreground">
          No ranked mentions in the last 30 days.
        </div>
      </CardContent>
    </Card>

    <!-- Sentiment breakdown -->
    <Card>
      <CardHeader>
        <CardTitle>Sentiment mix</CardTitle>
        <CardDescription>How AI talks about your brand.</CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="sentimentTotal" class="flex flex-col gap-3">
          <div v-for="row in sentimentSplit" :key="row.sentiment" class="space-y-1">
            <div class="flex items-center justify-between text-sm">
              <span class="font-medium text-card-foreground">{{ sentimentLabel(row.sentiment) }}</span>
              <span class="tabular-nums text-muted-foreground">
                {{ row.pct }}% <span class="opacity-60">({{ row.count }})</span>
              </span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-muted">
              <div
                class="h-full rounded-full"
                :style="{ width: row.pct + '%', background: sentimentColors[row.sentiment] }"
              />
            </div>
          </div>
          <div v-if="sentimentSamples.length" class="mt-2 space-y-2">
            <div
              v-for="(s, i) in sentimentSamples"
              :key="i"
              class="rounded-md border border-border bg-muted/40 px-3 py-2"
            >
              <div class="text-xs text-muted-foreground">
                {{ sentimentLabel(s.sentiment) }} · {{ providerLabel(s.provider) }}
              </div>
              <div class="mt-1 text-xs italic text-card-foreground">"{{ s.quote }}"</div>
            </div>
          </div>
        </div>
        <div v-else class="py-8 text-center text-xs text-muted-foreground">
          No mentions with sentiment yet.
        </div>
      </CardContent>
    </Card>
  </div>
</template>
