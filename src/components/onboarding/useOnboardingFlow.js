// Shared state + logic for the first-run onboarding flow.
//
// The flow shell (OnboardingFlow.vue) calls provideOnboardingFlow();
// each step component pulls the same object via useOnboardingFlow().
// provide/inject (rather than props) because steps deep-mutate `form`
// (checkbox toggles, chip removal) and prop mutation is both a lint
// error and a lie about ownership.
import { ref, computed, inject, provide } from 'vue'
import { useRouter } from 'vue-router'

import onboardingApi from '@/api/onboarding'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const FlowKey = Symbol('onboarding-flow')

// welcome -> url -> scanning -> describe -> competitors.
// `scanning` is not a user step: the visible progress collapses it
// into the url step (see displayStep).
export const STEPS = Object.freeze([
  { id: 'welcome' },
  { id: 'url' },
  { id: 'scanning' },
  { id: 'describe' },
  { id: 'competitors' },
])

export const SCAN_TASKS = Object.freeze([
  'Reading your homepage',
  'Spotting products and features',
  'Drafting your description',
  'Finding your competitors',
])

export function provideOnboardingFlow({ onComplete } = {}) {
  const auth = useAuthStore()
  const toast = useToast()
  const router = useRouter()

  const step = ref(0)
  // 'forward' | 'back' — set BEFORE mutating `step` so the step
  // transition picks the right slide direction.
  const direction = ref('forward')
  const urlInput = ref('')
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')

  const form = ref({
    url: '',
    business_name: '',
    industry: '',
    description: '',
    keywords: [],
    // Parallel to `keywords`: brand names that show up alongside the
    // topic in well-ranked LLM answers. Rendered under each chip on
    // the describe step so the user can see what they're benchmarked
    // against.
    topic_brands: [],
    competitors: [],
  })

  // "Add your own topic" input on the describe step.
  const newTopic = ref('')

  // "Add your own competitor" inputs on the competitors step.
  const newCompetitorName = ref('')
  const newCompetitorDomain = ref('')

  const urlHostname = computed(() => {
    try {
      const raw = form.value.url || urlInput.value
      return new URL(raw.startsWith('http') ? raw : `https://${raw}`).hostname
    } catch (_) {
      return urlInput.value
    }
  })

  // Progress shown in the topbar: scanning shares the url step's slot.
  const displayStep = computed(
    () => ({ 0: 1, 1: 2, 2: 2, 3: 3, 4: 4 })[step.value] ?? 1,
  )

  // Scanning checklist: ticks one task every 1700ms but never past the
  // last row — that one keeps its spinner until the API resolves.
  const scanPhase = ref(0)
  let scanTimer = null

  function startScanTicker() {
    scanPhase.value = 0
    scanTimer = setInterval(() => {
      if (scanPhase.value < SCAN_TASKS.length - 1) scanPhase.value += 1
    }, 1700)
  }
  function stopScanTicker() {
    if (scanTimer) {
      clearInterval(scanTimer)
      scanTimer = null
    }
  }

  function begin() {
    direction.value = 'forward'
    step.value = 1
  }

  async function startScan() {
    const raw = (urlInput.value || '').trim()
    if (!raw) return
    const url = raw.startsWith('http') ? raw : `https://${raw}`
    loading.value = true
    error.value = ''
    direction.value = 'forward'
    step.value = 2
    startScanTicker()
    try {
      const { data } = await onboardingApi.scan(url)
      const payload = data
      if (!payload?.success) {
        throw new Error(payload?.error || 'Could not read this site.')
      }
      form.value = {
        url: payload.url || url,
        business_name: payload.business_name || '',
        industry: payload.industry || '',
        description: payload.description_short || payload.description_raw || '',
        keywords: (payload.topics || []).slice(0, 8),
        topic_brands: (payload.topic_brands || []).slice(0, 8),
        competitors: (payload.competitors || []).slice(0, 12).map(c => ({
          name: c.name || c.domain || '',
          domain: c.domain || '',
          selected: true,
        })),
      }
      direction.value = 'forward'
      step.value = 3
    } catch (e) {
      error.value = e.message || e.response?.data?.error?.message || 'Scan failed.'
      direction.value = 'back'
      step.value = 1
    } finally {
      stopScanTicker()
      loading.value = false
    }
  }

  function back() {
    direction.value = 'back'
    if (step.value === 4) step.value = 3
    else if (step.value === 3) step.value = 1 // skip the scanning step
    else if (step.value > 0) step.value -= 1
  }

  function goToCompetitors() {
    direction.value = 'forward'
    step.value = 4
  }

  function _normalizeDomain(d) {
    return (d || '').trim().toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
  }

  function addCustomCompetitor() {
    const name = newCompetitorName.value.trim()
    if (!name) return
    const domain = _normalizeDomain(newCompetitorDomain.value)
    // Dedupe against existing rows by domain (preferred) or name (fallback).
    const exists = form.value.competitors.some(c => {
      const cDom = _normalizeDomain(c.domain)
      if (domain && cDom) return cDom === domain
      return c.name.toLowerCase() === name.toLowerCase()
    })
    if (exists) {
      newCompetitorName.value = ''
      newCompetitorDomain.value = ''
      return
    }
    form.value.competitors.push({
      name,
      domain,
      selected: true,
      custom: true,
    })
    newCompetitorName.value = ''
    newCompetitorDomain.value = ''
  }

  function removeCompetitor(index) {
    if (index < 0 || index >= form.value.competitors.length) return
    form.value.competitors.splice(index, 1)
  }

  // Two-tier logo fallback: Clearbit -> Google favicon -> initial.
  // State machine driven by an internal `_logoErr` field on the row.
  function onLogoError(competitor) {
    if (!competitor._logoErr) {
      competitor._logoErr = 'clearbit'
    } else {
      competitor._logoErr = 'fallback'
    }
  }

  function removeKeyword(k) {
    // Drop the matching brand list at the same index to keep the two
    // arrays aligned for the "vs Brand1, Brand2" sub-label.
    const idx = form.value.keywords.indexOf(k)
    if (idx === -1) return
    form.value.keywords.splice(idx, 1)
    if (idx < form.value.topic_brands.length) {
      form.value.topic_brands.splice(idx, 1)
    }
  }

  function addCustomTopic() {
    const t = newTopic.value.trim().replace(/[.,]+$/, '')
    if (!t) return
    // Dedupe against the existing list, case-insensitive.
    const exists = form.value.keywords.some(
      k => k.toLowerCase() === t.toLowerCase(),
    )
    if (exists) {
      newTopic.value = ''
      return
    }
    form.value.keywords.push(t)
    // Push an empty brand slot so the parallel arrays stay aligned.
    // User-added topics show no "vs ..." sub-label.
    form.value.topic_brands.push([])
    newTopic.value = ''
  }

  async function finish() {
    saving.value = true
    try {
      await onboardingApi.save({
        url: form.value.url,
        business_name: form.value.business_name,
        industry: form.value.industry,
        description: form.value.description,
        keywords: form.value.keywords,
        competitors: form.value.competitors
          .filter(c => c.selected)
          .map(c => ({ name: c.name, domain: c.domain })),
      })
      // Hand the paywall its personalization line ("We found N
      // competitors for {domain}") — the session payload carries no
      // domains, and /paywall renders outside the app store's website
      // loading, so a same-tab handoff is the cheapest exact source.
      try {
        sessionStorage.setItem('fb-onb-summary', JSON.stringify({
          domain: urlHostname.value,
          competitors: form.value.competitors.filter(c => c.selected).length,
          topics: form.value.keywords.length,
          ts: Date.now(),
        }))
      } catch (_) { /* storage full/blocked: the paywall falls back */ }
      await auth.fetchSession()
      // Route from HERE, not from the parent: the session refresh above
      // flips needs_onboarding, which unmounts the whole flow while this
      // function is still running — an emit at that point can die with
      // the instance (this exact bug shipped: finished users sat on the
      // dashboard instead of the paywall). router.push is app-level and
      // survives the unmount.
      if (auth.session?.next_route === 'paywall') {
        router.push('/paywall')
      }
      onComplete?.()
    } catch (e) {
      toast.error(e.response?.data?.error?.message || 'Could not save. Try again.')
    } finally {
      saving.value = false
    }
  }

  const flow = {
    steps: STEPS,
    scanTasks: SCAN_TASKS,
    step,
    direction,
    displayStep,
    urlInput,
    loading,
    saving,
    error,
    form,
    newTopic,
    newCompetitorName,
    newCompetitorDomain,
    urlHostname,
    scanPhase,
    begin,
    startScan,
    back,
    goToCompetitors,
    addCustomCompetitor,
    removeCompetitor,
    onLogoError,
    removeKeyword,
    addCustomTopic,
    finish,
    stopScanTicker,
  }
  provide(FlowKey, flow)
  return flow
}

export function useOnboardingFlow() {
  const flow = inject(FlowKey, null)
  if (!flow) {
    throw new Error('useOnboardingFlow() called outside an OnboardingFlow tree')
  }
  return flow
}
