<script setup>
// Audit scheduling, extracted from the LLM Dashboard so it can live on the
// main Dashboard.
//
// This is the only audit-trigger UI in the app, which is why it had to move
// rather than be deleted with that page. It also finally exposes "Run now":
// the backend endpoint and a runScheduleNow() function already existed but
// were bound to no button, so a user with a schedule still had no way to
// start an audit without waiting for the cadence.
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { CalendarClock, Play } from '@lucide/vue'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import BaseModal from '@/components/ui/BaseModal.vue'
import llmRankingApi from '@/api/llm_ranking'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  websiteId: { type: String, default: '' },
  websiteName: { type: String, default: '' },
  industry: { type: String, default: '' },
})
const emit = defineEmits(['ran'])

const toast = useToast()

const schedule = ref(null)
const scheduleETA = ref(null)
const providers = ref([])
const showModal = ref(false)
const saving = ref(false)
const runBusy = ref(false)
const error = ref('')
let etaTimer = null

const form = ref({
  business_name: '',
  industry: '',
  location: '',
  frequency: 'weekly',
  providers: ['claude', 'gpt4'],
})

// Only offer providers the backend reports as configured. The old dialog
// listed all five and pre-checked Gemini and Perplexity, both of which fail
// their health check here — so a default save queued two dead providers.
const availableProviders = computed(() =>
  providers.value.map(p => ({ value: p.key, label: p.name, configured: p.configured })),
)

async function loadProviders() {
  if (!props.websiteId) return
  try {
    const { data } = await llmRankingApi.providerHealth(props.websiteId)
    providers.value = (data?.data || data || {}).providers || []
  } catch {
    providers.value = []
  }
}

async function loadSchedule() {
  if (!props.websiteId) return
  try {
    const { data } = await llmRankingApi.getSchedule(props.websiteId)
    schedule.value = data?.data?.schedule || data?.schedule || null
    if (schedule.value) {
      form.value = {
        business_name: schedule.value.business_name || props.websiteName || '',
        industry: schedule.value.industry || props.industry || '',
        location: schedule.value.location || '',
        frequency: schedule.value.frequency || 'weekly',
        providers: schedule.value.providers?.length
          ? schedule.value.providers
          : defaultProviders(),
      }
      loadETA()
      startETAPolling()
    } else {
      // Prefill from the project rather than opening an empty form.
      form.value.business_name = props.websiteName || ''
      form.value.industry = props.industry || ''
      form.value.providers = defaultProviders()
      stopETAPolling()
      scheduleETA.value = null
    }
  } catch {
    schedule.value = null
  }
}

function defaultProviders() {
  const configured = providers.value.filter(p => p.configured).map(p => p.key)
  return configured.length ? configured : ['claude']
}

async function loadETA() {
  if (!schedule.value) return
  try {
    const { data } = await llmRankingApi.scheduleETA(props.websiteId)
    scheduleETA.value = data?.data || data || null
  } catch {
    /* best-effort — keep the stale value rather than blanking the row */
  }
}
function startETAPolling() {
  stopETAPolling()
  etaTimer = setInterval(loadETA, 15000)
}
function stopETAPolling() {
  if (etaTimer) { clearInterval(etaTimer); etaTimer = null }
}

async function save() {
  if (!form.value.business_name) { error.value = 'Business name is required.'; return }
  if (!form.value.industry) { error.value = 'Industry is required.'; return }
  if (!form.value.providers.length) { error.value = 'Pick at least one model.'; return }
  saving.value = true
  error.value = ''
  try {
    const { data } = await llmRankingApi.saveSchedule(props.websiteId, {
      ...form.value,
      is_enabled: true,
    })
    schedule.value = data?.data?.schedule || data?.schedule || null
    showModal.value = false
    toast.success('Schedule saved. Audits will run automatically.')
    loadETA()
  } catch (err) {
    error.value = err.displayMessage || 'Failed to save schedule.'
  } finally {
    saving.value = false
  }
}

async function remove() {
  try {
    await llmRankingApi.deleteSchedule(props.websiteId)
    schedule.value = null
    scheduleETA.value = null
    stopETAPolling()
    showModal.value = false
    toast.success('Schedule removed.')
  } catch (err) {
    toast.error(err.displayMessage || 'Failed to remove schedule.')
  }
}

async function runNow() {
  if (runBusy.value) return
  runBusy.value = true
  try {
    await llmRankingApi.runScheduleNow(props.websiteId)
    toast.success('Audit started. Results appear here when it finishes.')
    await loadETA()
    emit('ran')
  } catch (err) {
    toast.error(err.displayMessage || 'Could not start the audit.')
  } finally {
    runBusy.value = false
  }
}

onMounted(async () => {
  await loadProviders()
  await loadSchedule()
})
watch(() => props.websiteId, async () => {
  await loadProviders()
  await loadSchedule()
})
onBeforeUnmount(stopETAPolling)
</script>

<template>
  <Card class="flex flex-wrap items-center justify-between gap-3 rounded-xl border-border p-4 shadow-none">
    <div class="flex min-w-0 items-start gap-2.5">
      <CalendarClock class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div class="min-w-0">
        <p class="text-[13px] font-bold text-foreground">
          {{ schedule ? 'Scheduled audits active' : 'No audit schedule yet' }}
        </p>
        <p class="mt-0.5 text-[11px] text-muted-foreground">
          <template v-if="schedule">
            {{ schedule.frequency || 'weekly' }}
            <span v-if="scheduleETA?.next_run_human"> · next run {{ scheduleETA.next_run_human }}</span>
          </template>
          <template v-else>
            Audits are what populate this dashboard. Set a cadence, or run one now.
          </template>
        </p>
      </div>
    </div>

    <div class="flex shrink-0 items-center gap-2">
      <Button
        v-if="schedule"
        size="sm"
        variant="secondary"
        :disabled="runBusy || !websiteId"
        @click="runNow"
      >
        <Play class="size-3.5" />
        {{ runBusy ? 'Starting…' : 'Run now' }}
      </Button>
      <Button size="sm" :disabled="!websiteId" @click="showModal = true">
        {{ schedule ? 'Edit schedule' : 'Set up audits' }}
      </Button>
    </div>

    <BaseModal v-model="showModal" title="Schedule periodic audits">
      <p class="mb-3 text-sm text-muted-foreground">
        Audits run automatically on this cadence so visibility can be tracked
        over time. One run queries every selected model with your prompts.
      </p>

      <div class="space-y-3">
        <div>
          <label class="mb-1 block text-xs font-semibold text-foreground">Business name</label>
          <input
            v-model="form.business_name"
            class="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="e.g. Acme Corp"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-semibold text-foreground">Industry</label>
          <input
            v-model="form.industry"
            class="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="e.g. financial-services"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-semibold text-foreground">Location (optional)</label>
          <input
            v-model="form.location"
            class="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="e.g. US, Europe"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-semibold text-foreground">Frequency</label>
          <select
            v-model="form.frequency"
            class="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Every 2 weeks</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs font-semibold text-foreground">Models</label>
          <div class="flex flex-wrap gap-x-4 gap-y-1.5">
            <label
              v-for="p in availableProviders"
              :key="p.value"
              class="inline-flex items-center gap-1.5 text-sm"
              :class="p.configured ? 'text-foreground' : 'text-muted-foreground'"
            >
              <input type="checkbox" :value="p.value" v-model="form.providers" :disabled="!p.configured" />
              {{ p.label }}
              <span v-if="!p.configured" class="text-[10px] uppercase tracking-wide">not configured</span>
            </label>
          </div>
          <p v-if="!availableProviders.length" class="mt-1 text-[11px] text-muted-foreground">
            No models are configured yet. Add provider API keys first.
          </p>
        </div>
      </div>

      <p v-if="error" class="mt-2 text-[12px] font-semibold text-destructive">{{ error }}</p>

      <template #footer>
        <Button v-if="schedule" variant="destructive" class="mr-auto" @click="remove">
          Remove schedule
        </Button>
        <Button variant="secondary" @click="showModal = false">Cancel</Button>
        <Button :disabled="saving" @click="save">
          {{ saving ? 'Saving…' : 'Save schedule' }}
        </Button>
      </template>
    </BaseModal>
  </Card>
</template>
