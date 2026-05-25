<script setup>
import VisibilityCard from './VisibilityCard.vue'
import TopBrandsCard from './TopBrandsCard.vue'
import TopDomainsCard from './TopDomainsCard.vue'
import DomainTypesCard from './DomainTypesCard.vue'

defineProps({
  activeName: { type: String, default: '' },
  brands: { type: Array, default: null },
  domains: { type: Array, default: null },
  domainTypes: { type: Object, default: null },
})
</script>

<template>
  <div class="space-y-6">
    <section class="space-y-3">
      <div>
        <h3 class="text-lg font-semibold tracking-tight">Overview</h3>
        <p class="text-sm text-muted-foreground">How often each brand appears in AI generated discussions</p>
      </div>
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-7">
        <div class="lg:col-span-4">
          <VisibilityCard :brands="brands" :active-name="activeName" />
        </div>
        <div class="lg:col-span-3">
          <TopBrandsCard :brands="brands" :active-name="activeName" />
        </div>
      </div>
    </section>

    <section class="space-y-3">
      <div>
        <h3 class="text-lg font-semibold tracking-tight">Top Domains</h3>
        <p class="text-sm text-muted-foreground">Top domains retrieved by AI models in their answers</p>
      </div>
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopDomainsCard :domains="domains" />
        <DomainTypesCard :data="domainTypes" />
      </div>
    </section>
  </div>
</template>
