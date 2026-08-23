<script setup>
import { ref, computed } from 'vue'
import { ChevronDown } from '@lucide/vue'
import { Card } from '@/components/ui/card'
import EmptyState from '@/components/ui/EmptyState.vue'
// Real company logos with a cached resolver (site crawl -> Clearbit ->
// favicon guess) and a deterministic initial badge as the final fallback,
// so an unresolvable brand still gets a stable mark instead of a broken img.
import BrandLogo from '@/components/BrandLogo.vue'

const props = defineProps({
  brands: { type: Array, default: () => [] },
  title: { type: String, default: 'Top Brands' },
  subtitle: { type: String, default: 'Visibility performance by brand' },
  emptyTitle: { type: String, default: 'No brands measured yet' },
  emptyBody: {
    type: String,
    default: 'Once an audit runs we list every brand the AI models named, ranked by how often they appeared.',
  },
  ctaLabel: { type: String, default: '' },
  ctaTo: { type: String, default: '' },
})

const rows = computed(() => props.brands || [])
const hovered = ref(null)
// Which brand row is expanded. A ranked list alone isn't actionable — the
// useful question is what a competitor actually outranked you on, so each
// row opens its per-prompt breakdown.
const expanded = ref(null)

function toggle(i) {
  expanded.value = expanded.value === i ? null : i
}
function summary(b) {
  const n = b.prompts?.length || 0
  if (!n) return 'No prompt detail available'
  if (b.is_target) return `Appeared in ${n} prompt${n === 1 ? '' : 's'}`
  const beat = b.beat_count || 0
  if (!beat) return `Appeared in ${n} prompt${n === 1 ? '' : 's'} · never above you`
  return `Ranked above you on ${beat} of ${n} prompt${n === 1 ? '' : 's'}`
}
function rank(v) {
  return v == null ? '—' : '#' + v
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
      :title="emptyTitle"
      :body="emptyBody"
      :cta-label="ctaLabel"
      :cta-to="ctaTo"
    />

    <template v-else>
      <div>
        <div
          v-for="(b, i) in rows"
          :key="b.rank"
          :class="i < rows.length - 1 ? 'border-b border-border/60' : ''"
        >
          <button
            type="button"
            class="flex w-full items-center gap-3.5 px-6 py-3.5 text-left transition-colors"
            :class="hovered === i || expanded === i ? 'bg-muted' : ''"
            :aria-expanded="expanded === i"
            @mouseenter="hovered = i"
            @mouseleave="hovered = null"
            @click="toggle(i)"
          >
            <BrandLogo :name="b.name" :size="42" class="shrink-0" />

            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-bold text-foreground">{{ b.name }}</p>
              <p class="mt-0.5 text-xs text-muted-foreground">
                {{ b.category || (b.position != null ? 'Position #' + b.position : '') }}
              </p>
            </div>

            <div class="shrink-0 text-right">
              <p class="text-sm font-bold text-foreground">{{ b.visibility }}%</p>
              <!-- No prior window to compare against means no delta. Render
                   nothing rather than an invented 0%. -->
              <p
                v-if="b.trend != null"
                class="mt-0.5 text-xs font-bold"
                :class="b.up ? 'text-[#008A05] dark:text-[#4ade80]' : 'text-[#C13515] dark:text-[#f87171]'"
              >
                {{ b.up ? '+' : '-' }}{{ b.trend }}%
              </p>
            </div>

            <ChevronDown
              class="size-4 shrink-0 text-muted-foreground transition-transform"
              :class="expanded === i ? 'rotate-180' : ''"
            />
          </button>

          <div v-if="expanded === i" class="bg-muted/40 px-6 pb-4 pt-1">
            <p class="pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {{ summary(b) }}
            </p>

            <p v-if="!b.prompts?.length" class="py-2 text-[12px] text-muted-foreground">
              No per-prompt detail for this brand in the selected window.
            </p>

            <ul v-else class="space-y-1.5">
              <li
                v-for="p in b.prompts"
                :key="p.text"
                class="rounded-lg bg-card px-3 py-2"
              >
                <div class="flex items-start justify-between gap-3">
                  <p class="min-w-0 flex-1 text-[12px] font-medium text-foreground">{{ p.text }}</p>
                  <span
                    v-if="p.beats_you"
                    class="shrink-0 rounded bg-[#FDECEA] dark:bg-[#f87171]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#C02926] dark:text-[#f87171]"
                  >ABOVE YOU</span>
                </div>
                <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  <span v-if="!b.is_target">
                    Them <span class="font-bold text-foreground">{{ rank(p.position) }}</span>
                    ·
                    You
                    <span class="font-bold text-foreground">
                      {{ p.you_appeared ? rank(p.your_position) : 'not mentioned' }}
                    </span>
                  </span>
                  <span v-else>
                    Your position <span class="font-bold text-foreground">{{ rank(p.position) }}</span>
                  </span>
                  <span v-if="p.providers?.length">{{ p.providers.join(', ') }}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="h-px w-full bg-border" />
      <div class="px-6 py-3.5 text-center">
        <button class="text-[13px] font-bold text-foreground underline underline-offset-[3px]">Show all brands</button>
      </div>
    </template>
  </Card>
</template>
