<template>
  <div class="fade-in">
    <!-- While first-run onboarding is pending the dashboard is gated:
         render only the modal on a clean surface so the user can't
         interact with (or even peek at) data they haven't earned yet. -->
    <OnboardingModal
      v-if="showOnboarding"
      @complete="onOnboardingComplete"
    />

    <template v-else>
      <div v-if="loading" class="space-y-6">
        <Skeleton class="h-10 w-72 rounded-lg" />
        <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Skeleton v-for="n in 4" :key="n" class="h-24 rounded-xl" />
        </div>
        <Skeleton class="h-96 w-full rounded-xl" />
        <div class="grid gap-4 lg:grid-cols-2">
          <Skeleton class="h-64 rounded-xl" />
          <Skeleton class="h-64 rounded-xl" />
        </div>
      </div>

      <div v-else class="space-y-6">
        <GreetingHeader :timeOfDay="timeOfDay" :firstName="firstName" />

        <KpiCards :stats="stats" class="stagger-enter" />

        <VisibilityChart :series="chartSeries" />

        <PromptsTable :prompts="prompts" />

        <div class="grid gap-4 lg:grid-cols-2">
          <MorningBrief :brief="brief" />
          <QuickActions :actions="quickActions" />
          <WeeklyTasks :tasks="actions" />
          <RecentActivity :activity="activity" />
          <TrendInsights />
          <IntegrationStatus :integrations="integrations" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import dashboardApi from '@/api/dashboard'

import GreetingHeader from '@/components/dashboard/GreetingHeader.vue'
import KpiCards from '@/components/dashboard/KpiCards.vue'
import VisibilityChart from '@/components/dashboard/VisibilityChart.vue'
import PromptsTable from '@/components/dashboard/PromptsTable.vue'
import MorningBrief from '@/components/dashboard/MorningBrief.vue'
import QuickActions from '@/components/dashboard/QuickActions.vue'
import WeeklyTasks from '@/components/dashboard/WeeklyTasks.vue'
import RecentActivity from '@/components/dashboard/RecentActivity.vue'
import TrendInsights from '@/components/dashboard/TrendInsights.vue'
import IntegrationStatus from '@/components/dashboard/IntegrationStatus.vue'
import OnboardingModal from '@/components/onboarding/OnboardingModal.vue'
import { Skeleton } from '@/components/ui/skeleton'

const router = useRouter()
const authStore = useAuthStore()
const firstName = computed(() => (authStore.user?.full_name || 'there').split(' ')[0])

// First-run onboarding shows as an overlay over the dashboard rather
// than its own page. The session view drives this via
// onboarding.needs_onboarding; the modal refreshes the session and
// emits 'complete' once the user finishes the flow.
const showOnboarding = computed(
  () => authStore.session?.onboarding?.needs_onboarding === true,
)

function onOnboardingComplete() {
  // The next_route on the refreshed session decides where we land
  // next — paywall for unpaid users, otherwise stay on the dashboard.
  const next = authStore.session?.next_route
  if (next === 'paywall') router.push('/paywall')
}

const hour = new Date().getHours()
const timeOfDay = computed(() => hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening')

const loading = ref(true)
const stats = ref([])
const brief = ref('')
const actions = ref([])
const activity = ref([])
const quickActions = ref([])
const prompts = ref([])
const chartSeries = ref(null)

const DEFAULT_INTEGRATIONS = {
  pixel: { installed: false, verified: false, verified_at: null, pixel_key: null },
  services: [
    { type: 'ga', label: 'Google Analytics', connected: false, connected_at: null },
    { type: 'gsc', label: 'Google Search Console', connected: false, connected_at: null },
    { type: 'facebook', label: 'Facebook Ads', connected: false, connected_at: null },
  ],
}
const integrations = ref({ ...DEFAULT_INTEGRATIONS })

onMounted(async () => {
  try {
    const dashRes = await dashboardApi.get()
    const d = dashRes.data?.data || dashRes.data
    stats.value = d.stats || []
    brief.value = d.brief || 'Your visibility is trending up this week. FetchBot surfaced 3 new prompt opportunities and your brand moved up 2 positions across tracked queries.'
    actions.value = d.actions || []
    activity.value = d.activity || []
    quickActions.value = d.quick_actions || []
    prompts.value = d.prompts || []
    chartSeries.value = d.visibility_series || null
    integrations.value = d.integrations
      ? {
          pixel: { ...DEFAULT_INTEGRATIONS.pixel, ...d.integrations.pixel },
          services: d.integrations.services?.length
            ? d.integrations.services
            : DEFAULT_INTEGRATIONS.services,
        }
      : { ...DEFAULT_INTEGRATIONS }
  } catch (e) {
    console.error('Dashboard load error', e)
  } finally {
    loading.value = false
  }
})
</script>
