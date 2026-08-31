<template>
  <div class="fade-in">
    <!-- While first-run onboarding is pending the dashboard is gated:
         render only the flow on a clean surface so the user can't
         interact with (or even peek at) data they haven't earned yet. -->
    <OnboardingFlow
      v-if="showOnboarding"
      @complete="onOnboardingComplete"
    />

    <PageContainer v-else>
      <div v-if="loading" class="flex flex-1 flex-col space-y-6">
        <Skeleton class="h-9 w-72 rounded-lg" />
        <Skeleton class="h-9 w-80 rounded-lg" />
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton v-for="n in 4" :key="n" class="h-36 rounded-xl" />
        </div>
        <div class="grid gap-4 lg:grid-cols-7">
          <Skeleton class="h-96 rounded-xl lg:col-span-4" />
          <Skeleton class="h-96 rounded-xl lg:col-span-3" />
        </div>
      </div>

      <template v-else>
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-2xl font-bold tracking-tight">
            Good {{ timeOfDay }}, {{ firstName }}
          </h2>
        </div>

        <Tabs default-value="overview" class="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" class="space-y-6">
            <!-- Audit scheduling lives here now: it is the only way to
                 trigger the audits that populate everything below. -->
            <AuditSchedule
              :website-id="activeWebsiteId"
              :website-name="activeName"
              :industry="activeIndustry"
              @ran="refetchDashboard"
            />

            <OverviewSection
              :active-name="activeName"
              :website-id="activeWebsiteId"
              :overview="overview"
              :setup-state="setupState"
              :filters="filters"
              :filter-options="filterOptions"
              @update:filters="onFiltersUpdate"
            />
          </TabsContent>

          <TabsContent value="analytics" class="space-y-4">
            <!-- merge-only on update (Apply emits both events; refetching
                 here too would double-fetch), spread so the pills' keys
                 survive this tab's partial payload. -->
            <AnalyticsFilters
              :model-value="filters"
              :available-prompts="availablePrompts"
              @update:model-value="next => { filters = { ...filters, ...next } }"
              @apply="refetchDashboard"
            />

            <KpiCards :stats="stats" />

            <MetricBreakdowns v-if="analyticsBreakdowns" :breakdowns="analyticsBreakdowns" />

            <MetricDeepDive v-if="analyticsDeepDive" :deep-dive="analyticsDeepDive" />

            <div class="grid grid-cols-1 gap-4 lg:grid-cols-7">
              <div class="lg:col-span-4">
                <VisibilityChart :series="chartSeries" />
              </div>
              <div class="lg:col-span-3">
                <RecentActivity :activity="activity" />
              </div>
            </div>

            <PromptsTable :prompts="prompts" />

            <div class="grid gap-4 lg:grid-cols-2">
              <QuickActions :actions="quickActions" />
              <WeeklyTasks :tasks="actions" />
              <TrendInsights />
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Reports</CardTitle>
                <CardDescription>Scheduled and exported reports will appear here.</CardDescription>
              </CardHeader>
              <CardContent class="py-10 text-center text-sm text-muted-foreground">
                No reports yet — generate one from any analytics view.
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </template>
    </PageContainer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import dashboardApi from '@/api/dashboard'
import OverviewSection from '@/components/overview/OverviewSection.vue'
import AuditSchedule from '@/components/dashboard/AuditSchedule.vue'

import AnalyticsFilters from '@/components/dashboard/AnalyticsFilters.vue'
import KpiCards from '@/components/dashboard/KpiCards.vue'
import MetricBreakdowns from '@/components/dashboard/MetricBreakdowns.vue'
import MetricDeepDive from '@/components/dashboard/MetricDeepDive.vue'
import VisibilityChart from '@/components/dashboard/VisibilityChart.vue'
import PromptsTable from '@/components/dashboard/PromptsTable.vue'
import QuickActions from '@/components/dashboard/QuickActions.vue'
import WeeklyTasks from '@/components/dashboard/WeeklyTasks.vue'
import RecentActivity from '@/components/dashboard/RecentActivity.vue'
import TrendInsights from '@/components/dashboard/TrendInsights.vue'
import OnboardingFlow from '@/components/onboarding/OnboardingFlow.vue'
import PageContainer from '@/components/layout/PageContainer.vue'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

const authStore = useAuthStore()
const appStore = useAppStore()
const activeName = computed(() => appStore.activeWebsite?.name || '')
const activeWebsiteId = computed(() => appStore.activeWebsite?.id || '')
const activeIndustry = computed(() => appStore.activeWebsite?.industry || '')
const firstName = computed(() => (authStore.user?.full_name || 'there').split(' ')[0])

// First-run onboarding shows as a full-page takeover over the dashboard
// rather than its own route. The session view drives this via
// onboarding.needs_onboarding; the flow refreshes the session and
// emits 'complete' once the user finishes.
const showOnboarding = computed(
  () => authStore.session?.onboarding?.needs_onboarding === true,
)

function onOnboardingComplete() {
  // Routing to the paywall (when the refreshed session requires it) is
  // owned by the flow itself (useOnboardingFlow.finish) — the session
  // refresh unmounts the flow mid-save, so an emit-driven redirect here
  // is unreliable. By the time this fires there is nothing left to do:
  // either the flow already navigated, or we simply stay on the
  // dashboard that is now rendering underneath.
}

const hour = new Date().getHours()
const timeOfDay = computed(() => hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening')

const loading = ref(true)
const stats = ref([])
const actions = ref([])
const activity = ref([])
const quickActions = ref([])
const prompts = ref([])
const chartSeries = ref(null)
const analyticsBreakdowns = ref(null)
const analyticsDeepDive = ref(null)
const availablePrompts = ref([])
const overview = ref(null)
const setupState = ref(null)
// range/start/end/prompts drive the Analytics tab's form; model/tag/topic
// are the Overview pills. One shared object so both tabs stay in sync.
const filters = ref({
  range: '30d', start: '', end: '', prompts: [],
  model: '', tag: '', topic: '',
})
// filter_options from the payload. Kept across refetches so pill menus
// don't blank out while a filtered request is in flight.
const filterOptions = ref(null)

function buildParams() {
  const params = {}
  // Scope every dashboard number to the active project — without this
  // the backend falls back to the user's first website.
  if (activeWebsiteId.value) params.website = activeWebsiteId.value
  if (filters.value.range) params.range = filters.value.range
  if (filters.value.range === 'custom') {
    if (filters.value.start) params.start = filters.value.start
    if (filters.value.end) params.end = filters.value.end
  }
  if (filters.value.prompts?.length) params.prompts = filters.value.prompts
  if (filters.value.model) params.models = filters.value.model
  if (filters.value.tag) params.tags = filters.value.tag
  if (filters.value.topic) params.topics = filters.value.topic
  return params
}

function onFiltersUpdate(next) {
  // Spread so a partial patch from either tab never drops the other
  // tab's keys (AnalyticsFilters emits only its own fields).
  filters.value = { ...filters.value, ...next }
  refetchDashboard()
}

async function refetchDashboard() {
  try {
    loading.value = true
    const dashRes = await dashboardApi.get(buildParams())
    const d = dashRes.data
    stats.value = d.stats || []
    actions.value = d.actions || []
    activity.value = d.activity || []
    quickActions.value = d.quick_actions || []
    prompts.value = d.prompts || []
    analyticsBreakdowns.value = d.analytics_breakdowns || null
    analyticsDeepDive.value = d.analytics_deep_dive || null
    availablePrompts.value = d.analytics_deep_dive?.available_prompts || availablePrompts.value
    chartSeries.value = d.visibility_series || null
    overview.value = d.overview || null
    setupState.value = d.setup_state || null
    filterOptions.value = d.filter_options || filterOptions.value
  } catch (e) {
    console.error('Dashboard load error', e)
  } finally {
    loading.value = false
  }
}

// On a cold load the store may not have resolved the active project yet;
// fetching without it would briefly render whichever project the backend
// falls back to. Wait for the id — the watch below fires the first fetch
// as soon as it resolves. (Zero-project accounts never reach here: the
// onboarding takeover covers the dashboard.)
onMounted(() => { if (activeWebsiteId.value) refetchDashboard() })

// The dashboard route carries no :websiteId, so the sidebar project
// switcher only updates the store — refetch when the active project
// changes or first resolves after mount.
watch(activeWebsiteId, (next, prev) => {
  if (next && next !== prev) refetchDashboard()
})
</script>
