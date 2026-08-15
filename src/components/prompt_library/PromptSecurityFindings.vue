<script setup>
// Brand Security findings raised from THIS prompt's audit responses.
//
// The point of showing them here rather than only on the Brand Security
// page: a finding is a judgement about a specific answer, and the answer is
// on this page. Reading "negative tone" next to the response that caused it
// is the difference between an alert you can act on and one you have to go
// hunting for.
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ShieldAlert, ShieldCheck, ChevronRight } from '@lucide/vue'
import { Card } from '@/components/ui/card'
import brandSecurity from '@/api/brandSecurity'

const props = defineProps({
  websiteId: { type: String, required: true },
  promptId: { type: String, required: true },
})

const router = useRouter()
const loading = ref(true)
const alerts = ref([])
const error = ref('')

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 }
const SEVERITY_STYLE = {
  high: 'bg-[#FDECEA] text-[#C02926] border-[#C02926]/20',
  medium: 'bg-[#FFF4E5] text-[#B25E09] border-[#B25E09]/20',
  low: 'bg-muted text-muted-foreground border-border',
}

const sorted = computed(() =>
  [...alerts.value].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9),
  ),
)
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
  router.push(`/llm-ranking/${props.websiteId}/brand-security`)
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
          <ShieldAlert v-if="openCount" class="size-4 text-[#C02926]" />
          <ShieldCheck v-else class="size-4 text-[#008A05]" />
          Brand security
        </h2>
        <p class="mt-0.5 text-[11px] text-muted-foreground">
          Risk detected in the AI answers to this prompt
        </p>
      </div>
      <button
        class="shrink-0 text-[11px] font-semibold text-muted-foreground underline underline-offset-2 hover:text-foreground"
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
        class="border-b border-border/60 px-5 py-3 last:border-b-0"
      >
        <div class="flex items-start gap-2">
          <span
            class="mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            :class="SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.low"
          >{{ a.severity }}</span>
          <div class="min-w-0 flex-1">
            <p class="text-[13px] font-semibold text-foreground">{{ a.title || label(a.issue) }}</p>
            <p class="mt-0.5 text-[11px] text-muted-foreground">
              {{ label(a.issue) }}<span v-if="a.model"> · {{ a.model }}</span>
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
        </div>
      </li>
    </ul>
  </Card>
</template>
