<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronRight } from '@lucide/vue'
import { Card } from '@/components/ui/card'
import EmptyState from '@/components/ui/EmptyState.vue'

// The prompts behind every other number on this page. Ordered weakest
// first: a question you are absent from is more actionable than one you
// already win, and it is the honest thing to lead with.
const props = defineProps({
  prompts: { type: Array, default: () => [] },
  websiteId: { type: String, default: '' },
  title: { type: String, default: 'Top Prompts' },
  subtitle: { type: String, default: 'The questions we asked each AI model, and how you placed' },
  ctaLabel: { type: String, default: '' },
  ctaTo: { type: String, default: '' },
})

const router = useRouter()
const rows = computed(() => props.prompts || [])
const hovered = ref(null)

// A row is only clickable when the audited text resolved to a library
// prompt. Without an id there is no detail page to open, so the row stays
// inert rather than linking somewhere broken.
function linkable(p) {
  return Boolean(p.prompt_id && props.websiteId)
}
function open(p) {
  if (!linkable(p)) return
  router.push(`/llm-ranking/${props.websiteId}/prompts/${p.prompt_id}/detail`)
}

function barColor(v) {
  if (v >= 75) return '#008A05'
  if (v >= 40) return '#FC642D'
  return '#C13515'
}
</script>

<template>
  <Card class="overflow-hidden rounded-2xl border-border p-0 shadow-none">
    <div class="px-6 pb-4 pt-6">
      <h2 class="text-lg font-extrabold text-foreground">{{ title }}</h2>
      <p class="mt-1 text-[13px] text-muted-foreground">{{ subtitle }}</p>
    </div>

    <div class="h-px w-full bg-border" />

    <EmptyState
      v-if="!rows.length"
      title="No prompts measured yet"
      body="Once an audit runs, every question we asked appears here with your visibility on it — weakest first, so you can see where you're missing."
      :cta-label="ctaLabel"
      :cta-to="ctaTo"
    />

    <div v-else class="overflow-x-auto">
      <table class="w-full min-w-[640px] border-collapse">
        <thead>
          <tr class="border-b border-border/60">
            <th class="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Prompt</th>
            <th class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Visibility</th>
            <th class="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Models</th>
            <th class="px-6 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Position</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(p, i) in rows"
            :key="p.text"
            class="border-b border-border/60 transition-colors last:border-b-0"
            :class="[hovered === i ? 'bg-muted' : '', linkable(p) ? 'cursor-pointer' : '']"
            :tabindex="linkable(p) ? 0 : -1"
            @mouseenter="hovered = i"
            @mouseleave="hovered = null"
            @click="open(p)"
            @keydown.enter="open(p)"
          >
            <td class="max-w-[340px] px-6 py-3">
              <p
                class="truncate text-[13px] font-semibold"
                :class="linkable(p) ? 'text-foreground underline-offset-2 group-hover:underline' : 'text-foreground'"
                :title="p.text"
              >{{ p.text }}</p>
              <p class="mt-0.5 text-[11px] text-muted-foreground">
                Mentioned in {{ p.mentions }} of {{ p.runs }} answers
              </p>
            </td>

            <td class="px-3 py-3">
              <div class="flex items-center gap-2">
                <div class="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                  <div
                    class="h-full rounded-full"
                    :style="{ width: p.visibility + '%', background: barColor(p.visibility) }"
                  />
                </div>
                <span class="text-xs font-bold tabular-nums text-foreground">{{ p.visibility }}%</span>
              </div>
            </td>

            <td class="px-3 py-3">
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="prov in p.providers"
                  :key="prov.name"
                  class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
                  :class="prov.mentioned
                    ? 'bg-[#E8F5E9] text-[#008A05]'
                    : 'bg-muted text-muted-foreground'"
                  :title="prov.mentioned ? 'Mentioned' : 'Not mentioned'"
                >
                  {{ prov.name }}
                </span>
              </div>
            </td>

            <td class="px-6 py-3 text-right">
              <span class="inline-flex items-center justify-end gap-1.5">
                <span class="text-[13px] font-bold tabular-nums text-foreground">
                  {{ p.position == null ? '—' : '#' + p.position }}
                </span>
                <ChevronRight
                  v-if="linkable(p)"
                  class="size-3.5 shrink-0 text-muted-foreground"
                />
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Card>
</template>
