<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-xl -tracking-[0.02em]">Find every place your brand was mentioned.</CardTitle>
      <CardDescription class="leading-relaxed">
        We watch which third-party sources Claude, GPT-4, Gemini, and Perplexity
        cite whenever they talk about <strong class="font-semibold text-foreground">{{ brandName || 'your brand' }}</strong>.
      </CardDescription>
    </CardHeader>

    <CardContent>
      <div v-if="loading" class="flex flex-col rounded-xl border border-border p-1">
        <div v-for="i in 3" :key="i" class="h-[52px] animate-pulse border-b border-border bg-muted last:border-b-0" />
      </div>

      <div
        v-else-if="!items.length"
        class="rounded-xl border border-dashed border-border px-4 py-7 text-center text-sm text-muted-foreground"
      >
        No third-party mentions detected yet. Run an audit on the LLM Dashboard
        to surface where models cite your brand from.
      </div>

      <div v-else class="flex flex-col rounded-xl border border-border bg-card p-1">
        <div
          v-for="row in visible"
          :key="row.apex_domain"
          class="grid grid-cols-[32px_1fr_auto] items-center gap-3.5 border-b border-border px-4 py-3 last-of-type:border-b-0"
        >
          <img
            :src="faviconFor(row.apex_domain)"
            :alt="row.domain"
            class="h-7 w-7 rounded-lg bg-muted object-cover"
            @error="onFaviconError($event, row)"
          />
          <div class="inline-flex min-w-0 items-center gap-2.5 text-base text-foreground">
            <a
              :href="`https://${row.domain}`"
              target="_blank"
              rel="noopener"
              class="font-medium text-foreground hover:underline"
            >{{ row.domain }}</a>
            <Badge v-if="row.recent" variant="warning">JUST DETECTED</Badge>
            <Badge v-else-if="row.is_competitor_source" variant="secondary">COMPETITOR</Badge>
          </div>
          <div class="text-[0.95rem] tabular-nums text-muted-foreground">
            {{ row.mention_count }}<span class="font-normal text-muted-foreground"> mention{{ row.mention_count === 1 ? '' : 's' }}</span>
          </div>
        </div>

        <div class="mt-1 flex items-baseline justify-between border-t border-border px-4 pb-2 pt-3 text-sm text-muted-foreground">
          <span>Total mentions across {{ items.length }} {{ items.length === 1 ? 'source' : 'sources' }}</span>
          <strong class="text-base tabular-nums text-foreground">{{ totalMentions }}</strong>
        </div>

        <Button
          v-if="items.length > limit"
          variant="link"
          class="h-auto justify-start px-4 pb-2.5 pt-1.5 text-[0.82rem]"
          @click="expanded = !expanded"
        >
          {{ expanded ? 'Show top 5' : `Show all ${items.length} sources` }}
        </Button>
      </div>
    </CardContent>
  </Card>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const props = defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  totalMentions: { type: Number, default: 0 },
  brandName: { type: String, default: '' },
})

const expanded = ref(false)
const limit = 5
const visible = computed(() => expanded.value ? props.items : props.items.slice(0, limit))

function faviconFor(domain) {
  if (!domain) return ''
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`
}
function onFaviconError(ev, row) {
  // Inline SVG fallback: first letter of the apex domain on a neutral chip.
  const letter = (row.apex_domain || row.domain || '?').charAt(0).toUpperCase()
  const svg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Crect width='32' height='32' rx='8' fill='%23e5e7eb'/%3E%3Ctext x='16' y='21' text-anchor='middle' font-size='14' font-family='sans-serif' fill='%236b7280' font-weight='600'%3E${letter}%3C/text%3E%3C/svg%3E`
  ev.target.src = svg
}
</script>
