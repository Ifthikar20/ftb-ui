<script setup>
import { computed } from 'vue'
import FilterBar from './FilterBar.vue'
import InsightsSummary from './InsightsSummary.vue'
import VisibilityCard from './VisibilityCard.vue'
import TopBrandsCard from './TopBrandsCard.vue'
import PerformanceMatrix from './PerformanceMatrix.vue'
import TopDomainsCard from './TopDomainsCard.vue'
import DomainTypesCard from './DomainTypesCard.vue'
import TopPromptsCard from './TopPromptsCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const props = defineProps({
  activeName: { type: String, default: '' },
  websiteId: { type: String, default: '' },
  // The `overview` block from GET /websites/dashboard/. Null while the
  // request is still in flight.
  overview: { type: Object, default: null },
  // The `setup_state` block: which step the user still owes before any of
  // these cards can have data, plus the copy and CTA for it.
  setupState: { type: Object, default: null },
  showFilters: { type: Boolean, default: true },
})

const hasData = computed(() => Boolean(props.overview?.has_data))
const brands = computed(() => props.overview?.brands || [])
const domains = computed(() => props.overview?.domains || [])
const domainTypes = computed(() => props.overview?.domain_types || null)
const matrix = computed(() => props.overview?.matrix || null)
const prompts = computed(() => props.overview?.prompts || [])
const headline = computed(() => props.overview?.headline || null)
const insightKpis = computed(() => props.overview?.insight_kpis || [])

// Before anything has been measured we replace the whole card grid with a
// single instruction rather than stacking five identical empty cards.
const needsSetup = computed(
  () => !hasData.value && props.setupState && props.setupState.step !== 'ready',
)
const ctaLabel = computed(() => props.setupState?.cta_label || '')
const ctaTo = computed(() => props.setupState?.cta_to || '')
</script>

<template>
  <div class="space-y-6">
    <FilterBar v-if="showFilters && hasData" :project-name="activeName" />

    <EmptyState
      v-if="needsSetup"
      variant="panel"
      :title="setupState.title"
      :body="setupState.body"
      :cta-label="setupState.cta_label"
      :cta-to="setupState.cta_to"
    />

    <template v-else>
      <InsightsSummary :headline="headline" :kpis="insightKpis" />

      <section class="space-y-3">
        <div>
          <h2 class="text-lg font-semibold tracking-tight text-foreground">Your brand insights</h2>
          <p class="text-sm text-muted-foreground">How your brand metrics change over time</p>
        </div>
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <VisibilityCard
            :brands="brands"
            :active-name="activeName"
            :website-id="websiteId"
            :cta-label="ctaLabel"
            :cta-to="ctaTo"
          />
          <TopBrandsCard :brands="brands" :cta-label="ctaLabel" :cta-to="ctaTo" />
        </div>
      </section>

      <section class="space-y-3">
        <div>
          <h2 class="text-lg font-semibold tracking-tight text-foreground">Top prompts</h2>
          <p class="text-sm text-muted-foreground">
            The questions behind every number above — weakest placement first.
          </p>
        </div>
        <TopPromptsCard
          :prompts="prompts"
          :website-id="websiteId"
          :cta-label="ctaLabel"
          :cta-to="ctaTo"
        />
      </section>

      <section class="space-y-3">
        <div>
          <h2 class="text-lg font-semibold tracking-tight text-foreground">Performance matrix</h2>
          <p class="text-sm text-muted-foreground">Compare metrics across different dimensions.</p>
        </div>
        <PerformanceMatrix
          :matrix="matrix"
          :active-name="activeName"
          :cta-label="ctaLabel"
          :cta-to="ctaTo"
        />
      </section>

      <section class="space-y-2">
        <div>
          <h2 class="text-sm font-bold tracking-tight text-foreground">Top sources</h2>
          <p class="text-[11px] text-muted-foreground">Top domains retrieved by AI models in their answers</p>
        </div>
        <div class="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
          <TopDomainsCard :domains="domains" :cta-label="ctaLabel" :cta-to="ctaTo" />
          <DomainTypesCard :data="domainTypes" />
        </div>
      </section>
    </template>
  </div>
</template>
