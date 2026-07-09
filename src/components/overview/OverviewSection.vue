<script setup>
import FilterBar from './FilterBar.vue'
import InsightsSummary from './InsightsSummary.vue'
import VisibilityCard from './VisibilityCard.vue'
import TopBrandsCard from './TopBrandsCard.vue'
import PerformanceMatrix from './PerformanceMatrix.vue'
import TopDomainsCard from './TopDomainsCard.vue'
import DomainTypesCard from './DomainTypesCard.vue'

defineProps({
  activeName: { type: String, default: '' },
  websiteId: { type: String, default: '' },
  brands: { type: Array, default: null },
  domains: { type: Array, default: null },
  domainTypes: { type: Object, default: null },
  matrix: { type: Object, default: null },
  showFilters: { type: Boolean, default: true },
})
</script>

<template>
  <div class="space-y-6">
    <FilterBar v-if="showFilters" :project-name="activeName" />

    <InsightsSummary />

    <section class="space-y-3">
      <div>
        <h2 class="text-lg font-semibold tracking-tight text-foreground">Your brand insights</h2>
        <p class="text-sm text-muted-foreground">How your brand metrics change over time</p>
      </div>
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <VisibilityCard :brands="brands" :active-name="activeName" :website-id="websiteId" />
        <TopBrandsCard :brands="brands" :active-name="activeName" />
      </div>
    </section>

    <section class="space-y-3">
      <div>
        <h2 class="text-lg font-semibold tracking-tight text-foreground">Performance matrix</h2>
        <p class="text-sm text-muted-foreground">Compare metrics across different dimensions.</p>
      </div>
      <PerformanceMatrix :matrix="matrix" :active-name="activeName" />
    </section>

    <section class="space-y-2">
      <div>
        <h2 class="text-sm font-bold tracking-tight text-foreground">Top sources</h2>
        <p class="text-[11px] text-muted-foreground">Top domains retrieved by AI models in their answers</p>
      </div>
      <div class="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <TopDomainsCard :domains="domains" />
        <DomainTypesCard :data="domainTypes" />
      </div>
    </section>
  </div>
</template>
