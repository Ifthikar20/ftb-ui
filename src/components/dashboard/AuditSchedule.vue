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
import { RouterLink } from 'vue-router'
import { CalendarClock, ListChecks, Play } from '@lucide/vue'
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
// Card-level run failure. The no-saved-prompts refusal renders inline with
// a link to the Prompts page — a toast can't carry the link, and the empty
// state must name the action that produces data.
const runError = ref(null)
let etaTimer = null

// The exact prompts the next run will ask, from the preview endpoint (which
// reads the saved Prompts-page list). Shown inside the modal so "audits run
// your saved prompts" is a visible list, not a claim in the copy.
const preview = ref(null)
const previewLoading = ref(false)

async function loadPreview() {
  if (!props.websiteId) return
  previewLoading.value = true
  try {
    const { data } = await llmRankingApi.previewPrompts(props.websiteId)
    preview.value = data || null
  } catch {
    preview.value = null
  } finally {
    previewLoading.value = false
  }
}

const previewPrompts = computed(() => preview.value?.prompts || [])
const previewEmpty = computed(
  () => preview.value != null && previewPrompts.value.length === 0,
)

// The saved schedule's summary, shown on the card so what was configured
// is visible without opening the dialog: which models run, against how
// many saved prompts, and when the last/next runs happen.
const scheduledModelLabels = computed(() => {
  const keys = schedule.value?.providers || []
  if (!keys.length) return []
  const byKey = Object.fromEntries(
    providers.value.map(p => [p.key, p.name]),
  )
  return keys.map(k => byKey[k] || k)
})

function formatDate(v) {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
const lastRunLabel = computed(() => formatDate(schedule.value?.last_run_at))
// The ETA endpoint's human label is often null; fall back to formatting
// the raw timestamp from either payload so the chip still renders.
const nextRunLabel = computed(
  () => scheduleETA.value?.next_run_human
    || formatDate(scheduleETA.value?.next_run_at || schedule.value?.next_run_at),
)

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
    providers.value = (data || {}).providers || []
  } catch {
    providers.value = []
  }
}

async function loadSchedule() {
  if (!props.websiteId) return
  try {
    const { data } = await llmRankingApi.getSchedule(props.websiteId)
    schedule.value = data?.schedule || null
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
    scheduleETA.value = data || null
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
    schedule.value = data?.schedule || null
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
  runError.value = null
  try {
    await llmRankingApi.runScheduleNow(props.websiteId)
    toast.success('Audit started. Results appear here when it finishes.')
    await loadETA()
    emit('ran')
  } catch (err) {
    const body = err.response?.data || {}
    if (body.code === 'no_saved_prompts') {
      runError.value = {
        code: body.code,
        message: 'This website has no saved prompts yet. Audits run exactly '
          + 'the prompts you save on the Prompts page.',
        ctaTo: body.cta_to || `/llm-ranking/${props.websiteId}/prompts`,
      }
    } else {
      toast.error(err.displayMessage || 'Could not start the audit.')
    }
  } finally {
    runBusy.value = false
  }
}

onMounted(async () => {
  await loadProviders()
  await loadSchedule()
  // Also needed for the card's prompt-count chip, not just the dialog.
  loadPreview()
})
// Fetch the prompt list fresh each time the dialog opens, so edits made on
// the Prompts page since the last open are reflected.
watch(showModal, (open) => {
  if (open) loadPreview()
})
watch(() => props.websiteId, async () => {
  await loadProviders()
  await loadSchedule()
  loadPreview()
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
            <span v-if="nextRunLabel"> · next run {{ nextRunLabel }}</span>
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

    <!-- Saved-schedule summary: what was configured, visible without
         opening the dialog. Every value is read back from the saved
         schedule and the live prompt list, never from form state. -->
    <div
      v-if="schedule"
      class="flex w-full flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-border pt-3"
    >
      <span class="text-[11px] text-muted-foreground">
        <span class="font-semibold uppercase tracking-wide">Models</span>
        <span class="ml-1.5 font-bold text-foreground">
          {{ scheduledModelLabels.length ? scheduledModelLabels.join(', ') : 'All configured' }}
        </span>
      </span>

      <span class="text-[11px] text-muted-foreground">
        <span class="font-semibold uppercase tracking-wide">Prompts</span>
        <RouterLink
          :to="`/llm-ranking/${websiteId}/prompts`"
          class="ml-1.5 font-bold text-foreground underline-offset-2 hover:underline"
        >
          <template v-if="previewPrompts.length">{{ previewPrompts.length }} saved</template>
          <template v-else-if="previewEmpty">none saved</template>
          <template v-else>…</template>
        </RouterLink>
      </span>

      <span v-if="lastRunLabel" class="text-[11px] text-muted-foreground">
        <span class="font-semibold uppercase tracking-wide">Last run</span>
        <span class="ml-1.5 font-bold text-foreground">{{ lastRunLabel }}</span>
      </span>

      <span v-if="nextRunLabel" class="text-[11px] text-muted-foreground">
        <span class="font-semibold uppercase tracking-wide">Next run</span>
        <span class="ml-1.5 font-bold text-foreground">{{ nextRunLabel }}</span>
      </span>
    </div>

    <p
      v-if="runError"
      class="w-full border-t border-border pt-3 text-[12px] text-[#C02926] dark:text-[#f87171]"
    >
      {{ runError.message }}
      <RouterLink
        :to="runError.ctaTo"
        class="ml-1 font-bold underline underline-offset-2"
      >Add prompts</RouterLink>
    </p>

    <BaseModal v-model="showModal" title="Schedule periodic audits">
      <p class="mb-3 text-sm text-muted-foreground">
        Audits run automatically on this cadence so visibility can be tracked
        over time. One run queries every selected model with your saved
        prompts from the Prompts page.
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

        <div>
          <label class="mb-1 flex items-center justify-between text-xs font-semibold text-foreground">
            <span class="inline-flex items-center gap-1.5">
              <ListChecks class="size-3.5 text-muted-foreground" />
              Prompts each run will ask
              <span v-if="previewPrompts.length" class="font-normal text-muted-foreground">
                ({{ previewPrompts.length }})
              </span>
            </span>
            <RouterLink
              :to="`/llm-ranking/${websiteId}/prompts`"
              class="font-semibold text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >Manage on Prompts page</RouterLink>
          </label>

          <p v-if="previewLoading" class="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-[12px] text-muted-foreground">
            Loading your saved prompts…
          </p>

          <p
            v-else-if="previewEmpty"
            class="rounded-lg border border-dashed border-[#C02926]/40 dark:border-[#f87171]/40 bg-[#FDECEA]/40 dark:bg-[#f87171]/10 px-3 py-2.5 text-[12px] text-[#C02926] dark:text-[#f87171]"
          >
            No saved prompts — audits cannot run until you add some.
            <RouterLink
              :to="`/llm-ranking/${websiteId}/prompts`"
              class="font-bold underline underline-offset-2"
            >Add prompts</RouterLink>
          </p>

          <ul
            v-else-if="previewPrompts.length"
            class="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border bg-muted/40 p-1.5"
          >
            <li
              v-for="p in previewPrompts"
              :key="p.prompt_id || p.text"
              class="flex items-start justify-between gap-2 rounded-md bg-card px-2.5 py-1.5"
            >
              <span class="min-w-0 flex-1 text-[12px] leading-snug text-foreground">{{ p.text }}</span>
              <span v-if="p.tags?.length" class="flex shrink-0 flex-wrap justify-end gap-1">
                <span
                  v-for="t in p.tags"
                  :key="t"
                  class="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground"
                >{{ t }}</span>
              </span>
            </li>
          </ul>
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
