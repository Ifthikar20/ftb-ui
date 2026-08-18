<script setup>
// Brand Security findings raised from THIS prompt's audit responses.
//
// The point of showing them here rather than only on the Brand Security
// page: a finding is a judgement about a specific answer, and the answer is
// on this page. Reading "negative tone" next to the response that caused it
// is the difference between an alert you can act on and one you have to go
// hunting for. Each row deep-links into the alert center drawer via its
// reference; "All findings" lands on the queue pre-scoped to this prompt.
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ShieldAlert, ShieldCheck, ChevronRight } from '@lucide/vue'
import { Card } from '@/components/ui/card'
import brandSecurity from '@/api/brandSecurity'
import SeverityBadge from '@/components/brand_security/SeverityBadge.vue'
import { compareSeverity } from '@/constants/severity'

const props = defineProps({
  websiteId: { type: String, required: true },
  promptId: { type: String, required: true },
})

const router = useRouter()
const loading = ref(true)
const alerts = ref([])
const error = ref('')

const sorted = computed(() => [...alerts.value].sort(compareSeverity))
const openCount = computed(() => sorted.value.filter(a => a.status === 'open').length)

async function load() {
  if (!props.websiteId || !props.promptId) return
  loading.value = true
  error.value = ''
  try {
    const { data } = await brandSecurity.alertsForPrompt(props.websiteId, props.promptId)
    const payload = data?.data ?? data
    alerts.value = Array.isArray(payload) ? payload : (payload?.results ?? [])
  } catch (e) {
    error.value = e.response?.data?.error?.message || 'Could not load brand security findings.'
    alerts.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => props.promptId, load)

function openSecurity() {
  router.push({
    path: `/llm-ranking/${props.websiteId}/brand-security`,
    query: { prompt: props.promptId },
  })
}

// Deep-link one finding straight into the alert-center drawer.
function openAlert(alert) {
  router.push({
    path: `/llm-ranking/${props.websiteId}/brand-security`,
    query: alert.reference
      ? { alert: alert.reference, status: '' }
      : { prompt: props.promptId },
  })
}

function label(issue) {
  return (issue || '').replace(/_/g, ' ')
}
</script>

<template>
  <Card class="overflow-hidden rounded-xl border-border p-0 shadow-none">
    <div class="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
      <div class="min-w-0">
        <h2 class="inline-flex items-center gap-1.5 text-sm font-bold text-foreground">
          <ShieldAlert v-if="openCount" class="size-4 text-severity-high" />
          <ShieldCheck v-else class="size-4 text-[color:var(--chart-2)]" />
          Brand security
        </h2>
        <p class="mt-0.5 text-[11px] text-muted-foreground">
          Risk detected in the AI answers to this prompt
        </p>
      </div>
      <button
        class="shrink-0 text-[11px] font-semibold text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        @click="openSecurity"
      >
        All findings
      </button>
    </div>

    <div class="h-px w-full bg-border" />

    <p v-if="loading" class="px-5 py-6 text-center text-[12px] text-muted-foreground">
      Checking responses…
    </p>

    <p v-else-if="error" class="px-5 py-6 text-center text-[12px] text-muted-foreground">
      {{ error }}
    </p>

    <div v-else-if="!sorted.length" class="px-5 py-6 text-center">
      <p class="text-[13px] font-semibold text-foreground">No risk detected</p>
      <p class="mx-auto mt-1 max-w-sm text-[11px] leading-relaxed text-muted-foreground">
        Every model answer to this prompt mentioned your brand in an acceptable
        tone, with nothing attributed to you that belongs to someone else.
      </p>
    </div>

    <ul v-else>
      <li
        v-for="a in sorted"
        :key="a.id"
        class="border-b border-border/60 last:border-b-0"
      >
        <button
          type="button"
          class="flex w-full items-start gap-2 px-5 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          :aria-label="`Open finding ${a.reference || a.title || label(a.issue)}`"
          @click="openAlert(a)"
        >
          <SeverityBadge :severity="a.severity" size="sm" class="mt-0.5" />
          <div class="min-w-0 flex-1">
            <p class="text-[13px] font-semibold text-foreground">{{ a.title || label(a.issue) }}</p>
            <p class="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
              <span
                v-if="a.reference"
                class="rounded bg-secondary px-1 py-px font-mono text-[10px] text-secondary-foreground"
              >{{ a.reference }}</span>
              <span
                v-if="a.detector_code"
                class="font-mono text-[10px]"
              >{{ a.detector_code }}</span>
              <span>{{ label(a.issue) }}<span v-if="a.model"> · {{ a.model }}</span></span>
            </p>
            <p v-if="a.detail" class="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              {{ a.detail }}
            </p>
            <blockquote
              v-if="a.snippet"
              class="mt-2 border-l-2 border-border pl-2.5 text-[11px] italic leading-relaxed text-foreground/80"
            >
              {{ a.snippet.length > 260 ? a.snippet.slice(0, 260) + '…' : a.snippet }}
            </blockquote>
          </div>
          <ChevronRight class="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </li>
    </ul>
  </Card>
</template>
