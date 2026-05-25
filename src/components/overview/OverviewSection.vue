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
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <VisibilityCard :brands="brands" :active-name="activeName" />
      <TopBrandsCard :brands="brands" :active-name="activeName" />
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <TopDomainsCard :domains="domains" />
      <DomainTypesCard :data="domainTypes" />
    </div>
  </div>
</template>
