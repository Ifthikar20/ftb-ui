import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import brandSecurity from '@/api/brandSecurity'
import { categoryPresentation } from '@/constants/detectors'

// Session-cached Brand Security data that outlives the page: the detector
// taxonomy (global, fetched once) and the per-website overview counters.
// The alerts list and its filters stay page-local — they are URL-driven.
export const useBrandSecurityStore = defineStore('brandSecurity', () => {
  const taxonomy = ref(null) // { engine, categories: [], detectors: [] }
  const taxonomyFailed = ref(false)
  const overview = ref(null) // per active website
  const overviewLoading = ref(false)

  let taxonomyPromise = null

  // Fetch once per session. Failure is non-fatal: the UI falls back to
  // legacy issue-code mapping and simply hides detector metadata.
  async function loadTaxonomy() {
    if (taxonomy.value) return taxonomy.value
    if (!taxonomyPromise) {
      taxonomyPromise = brandSecurity
        .taxonomy()
        .then(({ data }) => {
          taxonomy.value = data
          taxonomyFailed.value = false
          return data
        })
        .catch(() => {
          taxonomyFailed.value = true
          taxonomyPromise = null
          return null
        })
    }
    return taxonomyPromise
  }

  async function refreshOverview(websiteId) {
    if (!websiteId) return
    overviewLoading.value = true
    try {
      const { data } = await brandSecurity.overview(websiteId)
      overview.value = data
    } catch {
      // Leave whatever we had; the summary strip renders nothing rather
      // than fake zeros when overview is unavailable.
      overview.value = overview.value || null
    } finally {
      overviewLoading.value = false
    }
  }

  const detectorIndex = computed(() => {
    const map = new Map()
    for (const d of taxonomy.value?.detectors || []) map.set(d.code, d)
    return map
  })

  function detectorByCode(code) {
    return detectorIndex.value.get(code) || null
  }

  // Catalog categories merged with presentation config and open counts
  // from the overview. Renders all categories, including zero-count ones
  // — coverage is part of the message.
  const categories = computed(() => {
    const counts = overview.value?.by_category || {}
    const keys = (taxonomy.value?.categories || []).map((c) => c.key)
    return keys.map((key) => ({
      ...categoryPresentation(key),
      count: counts[key] || 0,
    }))
  })

  // Detector codes for one category — the alerts list filters server-side
  // by detector_code, mirroring the old capture-type -> issues expansion.
  function detectorCodesForCategory(categoryKey) {
    return (taxonomy.value?.detectors || [])
      .filter((d) => d.category === categoryKey)
      .map((d) => d.code)
  }

  return {
    taxonomy,
    taxonomyFailed,
    overview,
    overviewLoading,
    loadTaxonomy,
    refreshOverview,
    detectorByCode,
    categories,
    detectorCodesForCategory,
  }
})
