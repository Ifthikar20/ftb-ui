<script setup>
import { computed } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const props = defineProps({
  deepDive: { type: Object, default: null },
})

const providerLabels = {
  claude: 'Claude',
  gpt4: 'GPT-4',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
  deepseek: 'DeepSeek',
  grok: 'Grok',
}

const bucketColors = {
  '1': 'var(--chart-2, #10b981)',
  '2-3': 'var(--chart-1, #5b8def)',
  '4-10': 'var(--chart-3, #f59e0b)',
  '11+': 'var(--muted-foreground, #94a3b8)',
}

const sentimentColors = {
  positive: 'var(--chart-2, #10b981)',
  neutral: 'var(--muted-foreground, #94a3b8)',
  negative: 'var(--chart-5, #ef4444)',
}

const sentimentLabels = {
  positive: 'Positive',
  neutral: 'Neutral',
  negative: 'Negative',
}

const matrix = computed(() => props.deepDive?.visibility_matrix || null)
const position = computed(() => props.deepDive?.position_by_provider || [])
const sentiment = computed(() => props.deepDive?.sentiment_by_provider || [])
const themes = computed(() => props.deepDive?.sentiment_themes || { positive: [], negative: [] })

const hasMatrix = computed(() => matrix.value?.prompts?.length > 0)
const hasPosition = computed(() => position.value.some(p => p.total > 0))
const hasSentiment = computed(() => sentiment.value.some(p => p.total > 0))
const hasThemes = computed(() => themes.value.positive.length || themes.value.negative.length)

function providerLabel(p) {
  return providerLabels[p] || p
}

function cellStyle(cell) {
  if (!cell) return { background: 'transparent', border: '1px dashed var(--border)' }
  if (!cell.is_mentioned) {
    return { background: 'var(--muted, #f1f5f9)', color: 'var(--muted-foreground)' }
  }
  const r = cell.mention_rank
  if (r === 1) return { background: 'var(--chart-2, #10b981)', color: '#fff' }
  if (r != null && r <= 3) return { background: 'rgba(16,185,129,0.65)', color: '#fff' }
  if (r != null && r <= 10) return { background: 'rgba(245,158,11,0.6)', color: '#fff' }
  return { background: 'rgba(148,163,184,0.5)', color: '#fff' }
}

function cellLabel(cell) {
  if (!cell) return ''
  if (!cell.is_mentioned) return '—'
  return cell.mention_rank ? `#${cell.mention_rank}` : '✓'
}

function shortPrompt(text) {
  if (!text) return ''
  return text.length > 80 ? text.slice(0, 80) + '…' : text
}
</script>

<template>
  <div v-if="props.deepDive" class="flex flex-col gap-4">
    <!-- ─── Visibility matrix ────────────────────────────────────────── -->
    <Card>
      <CardHeader>
        <CardTitle>Visibility by prompt and model</CardTitle>
        <CardDescription>
          Every prompt in the last 30 days, scored cell-by-cell. Green is a top-3
          mention; grey means the model didn't surface you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="hasMatrix" class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead>
              <tr class="text-muted-foreground">
                <th class="py-2 pr-3 text-left font-medium">Prompt</th>
                <th
                  v-for="p in matrix.providers"
                  :key="p"
                  class="px-2 py-2 text-center font-medium"
                >
                  {{ providerLabel(p) }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in matrix.prompts" :key="i" class="border-t border-border">
                <td class="py-2 pr-3">
                  <span class="text-card-foreground">{{ shortPrompt(row.prompt) }}</span>
                </td>
                <td
                  v-for="(cell, j) in row.cells"
                  :key="j"
                  class="px-1 py-1 text-center"
                >
                  <div
                    class="mx-auto flex h-7 w-12 items-center justify-center rounded text-[11px] font-semibold tabular-nums"
                    :style="cellStyle(cell)"
                    :title="cell ? (cell.is_mentioned ? `Rank ${cell.mention_rank ?? '?'}` : 'Not mentioned') : 'No result'"
                  >
                    {{ cellLabel(cell) }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span class="flex items-center gap-1.5">
              <span class="size-3 rounded" :style="{ background: 'var(--chart-2)' }" /> #1
            </span>
            <span class="flex items-center gap-1.5">
              <span class="size-3 rounded" style="background: rgba(16,185,129,0.65)" /> #2–3
            </span>
            <span class="flex items-center gap-1.5">
              <span class="size-3 rounded" style="background: rgba(245,158,11,0.6)" /> #4–10
            </span>
            <span class="flex items-center gap-1.5">
              <span class="size-3 rounded" style="background: rgba(148,163,184,0.5)" /> #11+
            </span>
            <span class="flex items-center gap-1.5">
              <span class="size-3 rounded bg-muted" /> Not mentioned
            </span>
          </div>
        </div>
        <div v-else class="py-8 text-center text-xs text-muted-foreground">
          No prompt-level results in the last 30 days.
        </div>
      </CardContent>
    </Card>

    <div class="grid gap-4 lg:grid-cols-2">
      <!-- ─── Position by provider ───────────────────────────────────── -->
      <Card>
        <CardHeader>
          <CardTitle>Position by model</CardTitle>
          <CardDescription>
            Where you rank inside each LLM's answers, by bucket.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="hasPosition" class="flex flex-col gap-4">
            <div v-for="p in position" :key="p.provider" class="space-y-1.5">
              <div class="flex items-center justify-between text-sm">
                <span class="font-medium text-card-foreground">{{ providerLabel(p.provider) }}</span>
                <span class="text-xs text-muted-foreground tabular-nums">{{ p.total }} mentions</span>
              </div>
              <div class="flex h-3 overflow-hidden rounded-full bg-muted">
                <div
                  v-for="b in p.buckets"
                  :key="b.range"
                  class="h-full"
                  :style="{ width: b.pct + '%', background: bucketColors[b.range] }"
                  :title="`Rank ${b.range}: ${b.count} (${b.pct}%)`"
                />
              </div>
              <div class="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                <span v-for="b in p.buckets" :key="b.range">
                  <span class="font-medium text-card-foreground">{{ b.range }}</span>
                  {{ b.pct }}%
                </span>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
              <span v-for="(c, range) in bucketColors" :key="range" class="flex items-center gap-1.5">
                <span class="size-3 rounded" :style="{ background: c }" />
                Rank {{ range }}
              </span>
            </div>
          </div>
          <div v-else class="py-8 text-center text-xs text-muted-foreground">
            No ranked mentions in the last 30 days.
          </div>
        </CardContent>
      </Card>

      <!-- ─── Sentiment by provider ──────────────────────────────────── -->
      <Card>
        <CardHeader>
          <CardTitle>Sentiment by model</CardTitle>
          <CardDescription>
            How each LLM talks about you when it mentions you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="hasSentiment" class="flex flex-col gap-4">
            <div v-for="p in sentiment" :key="p.provider" class="space-y-1.5">
              <div class="flex items-center justify-between text-sm">
                <span class="font-medium text-card-foreground">{{ providerLabel(p.provider) }}</span>
                <span class="text-xs text-muted-foreground tabular-nums">{{ p.total }} mentions</span>
              </div>
              <div class="flex h-3 overflow-hidden rounded-full bg-muted">
                <div
                  v-for="s in p.split"
                  :key="s.sentiment"
                  class="h-full"
                  :style="{ width: s.pct + '%', background: sentimentColors[s.sentiment] }"
                  :title="`${sentimentLabels[s.sentiment]}: ${s.count} (${s.pct}%)`"
                />
              </div>
              <div class="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                <span v-for="s in p.split" :key="s.sentiment">
                  <span class="font-medium text-card-foreground">{{ sentimentLabels[s.sentiment] }}</span>
                  {{ s.pct }}%
                </span>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
              <span v-for="(c, s) in sentimentColors" :key="s" class="flex items-center gap-1.5">
                <span class="size-3 rounded" :style="{ background: c }" />
                {{ sentimentLabels[s] }}
              </span>
            </div>
          </div>
          <div v-else class="py-8 text-center text-xs text-muted-foreground">
            No mentions with sentiment in the last 30 days.
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- ─── Sentiment themes ──────────────────────────────────────────── -->
    <Card v-if="hasThemes">
      <CardHeader>
        <CardTitle>What's driving sentiment</CardTitle>
        <CardDescription>
          Themes clustered from positive and negative quote contexts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="grid gap-6 md:grid-cols-2">
          <div>
            <div class="mb-3 flex items-center gap-2 text-sm font-semibold text-card-foreground">
              <span class="size-2 rounded-full" :style="{ background: sentimentColors.positive }" />
              Positive themes
            </div>
            <div v-if="themes.positive.length" class="flex flex-col gap-3">
              <div
                v-for="(t, i) in themes.positive"
                :key="'pos-' + i"
                class="rounded-md border border-border bg-muted/30 p-3"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="text-sm font-medium text-card-foreground">{{ t.label }}</span>
                  <span class="rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                    {{ t.count }} {{ t.count === 1 ? 'mention' : 'mentions' }}
                  </span>
                </div>
                <div v-if="t.sample_quote" class="mt-1.5 text-xs italic text-muted-foreground">
                  "{{ t.sample_quote }}"
                </div>
              </div>
            </div>
            <div v-else class="text-xs text-muted-foreground">No positive themes yet.</div>
          </div>
          <div>
            <div class="mb-3 flex items-center gap-2 text-sm font-semibold text-card-foreground">
              <span class="size-2 rounded-full" :style="{ background: sentimentColors.negative }" />
              Negative themes
            </div>
            <div v-if="themes.negative.length" class="flex flex-col gap-3">
              <div
                v-for="(t, i) in themes.negative"
                :key="'neg-' + i"
                class="rounded-md border border-border bg-muted/30 p-3"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="text-sm font-medium text-card-foreground">{{ t.label }}</span>
                  <span class="rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                    {{ t.count }} {{ t.count === 1 ? 'mention' : 'mentions' }}
                  </span>
                </div>
                <div v-if="t.sample_quote" class="mt-1.5 text-xs italic text-muted-foreground">
                  "{{ t.sample_quote }}"
                </div>
              </div>
            </div>
            <div v-else class="text-xs text-muted-foreground">No negative themes yet.</div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
