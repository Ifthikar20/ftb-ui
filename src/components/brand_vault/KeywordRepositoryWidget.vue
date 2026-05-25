<template>
  <Card>
    <CardHeader class="flex-row items-start justify-between gap-3 space-y-0">
      <div>
        <CardTitle class="text-lg -tracking-[0.01em]">Keyword repository</CardTitle>
        <CardDescription class="mt-1">
          <template v-if="totalMentions">
            {{ totalMentions }} mentions across {{ items.length }} {{ items.length === 1 ? 'topic' : 'topics' }}
          </template>
          <template v-else>
            Topics extracted from your approved facts.
          </template>
        </CardDescription>
      </div>
      <Button
        v-if="items.length"
        variant="link"
        class="h-auto whitespace-nowrap p-0"
        @click="$emit('expand')"
      >View all →</Button>
    </CardHeader>

    <CardContent>
      <div v-if="loading" class="flex flex-col overflow-hidden rounded-xl border border-border">
        <div v-for="i in 4" :key="i" class="h-[42px] animate-pulse border-b border-border bg-muted last:border-b-0" />
      </div>

      <div
        v-else-if="!items.length"
        class="rounded-xl border border-dashed border-border px-4 py-7 text-center text-sm text-muted-foreground"
      >
        Approve some facts with a topic to fill the repository.
      </div>

      <ul
        v-else
        class="flex cursor-pointer flex-col gap-0.5 overflow-hidden rounded-xl border border-border hover:border-muted-foreground"
        @click="$emit('expand')"
      >
        <li
          v-for="row in top"
          :key="row.topic"
          class="grid grid-cols-[24px_1fr_110px_64px] items-center gap-3 border-b border-border bg-card px-4 py-2.5 last:border-b-0"
        >
          <span class="text-[0.78rem] tabular-nums text-muted-foreground">{{ row.rank }}</span>
          <span class="text-[0.92rem] font-medium capitalize text-foreground">{{ row.topic }}</span>
          <span class="flex items-center justify-end opacity-85" aria-hidden="true">
            <KeywordSparkline :data="row.timeline" />
          </span>
          <span class="text-right text-[0.92rem] font-semibold tabular-nums text-foreground">{{ row.mention_count }}</span>
        </li>
      </ul>
    </CardContent>
  </Card>
</template>

<script setup>
import { computed } from 'vue'
import KeywordSparkline from './KeywordSparkline.vue'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const props = defineProps({
  items: { type: Array, default: () => [] },
  totalMentions: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
})
defineEmits(['expand'])

const top = computed(() =>
  props.items.slice(0, 5).map((row, i) => ({ ...row, rank: i + 1 })),
)
</script>
