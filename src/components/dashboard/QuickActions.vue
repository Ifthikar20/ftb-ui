<script setup>
import { computed } from 'vue'
import { ArrowRight } from '@lucide/vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const props = defineProps({
  actions: { type: Array, default: () => [] },
})

const FALLBACK = [
  { label: 'Add a tracked prompt', desc: 'Monitor a new query for brand visibility', to: '/prompt-library' },
  { label: 'Connect an integration', desc: 'Link analytics and ad platforms', to: '/integrations' },
  { label: 'Review content drafts', desc: 'AI-generated content waiting for review', to: '/content-studio' },
  { label: 'Check LLM rankings', desc: 'See how you rank across AI models', to: '/llm-ranking' },
]

const items = computed(() => (props.actions?.length ? props.actions : FALLBACK))
</script>

<template>
  <Card>
    <CardHeader class="pb-2">
      <CardTitle class="text-base">Quick Actions</CardTitle>
    </CardHeader>
    <CardContent class="pt-0">
      <div class="flex flex-col">
        <router-link
          v-for="action in items"
          :key="action.label"
          :to="action.to"
          class="group flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted"
        >
          <div class="flex-1">
            <div class="text-sm font-semibold text-card-foreground">{{ action.label }}</div>
            <div class="text-xs text-muted-foreground">{{ action.desc }}</div>
          </div>
          <ArrowRight class="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
        </router-link>
      </div>
    </CardContent>
  </Card>
</template>
