<template>
  <Transition name="fd-fade">
    <div v-if="open" class="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm" @click.self="close">
      <Transition name="fd-slide">
        <aside
          v-if="open"
          class="fixed inset-y-0 right-0 z-[201] w-[440px] max-w-[90vw] overflow-y-auto border-l border-border bg-card p-6 shadow-xl"
          role="dialog"
          aria-label="Fact detail"
        >
          <header class="relative mb-1 pb-4">
            <span class="text-[0.7rem] uppercase tracking-[0.06em] text-muted-foreground">Fact</span>
            <h3 class="mt-1 text-lg font-bold -tracking-[0.01em] text-foreground">{{ fact?.subject }}</h3>
            <Button
              variant="ghost"
              size="icon"
              class="absolute right-0 top-0"
              type="button"
              aria-label="Close"
              @click="close"
            >
              <X :size="18" />
            </Button>
          </header>

          <section class="border-t border-border py-4">
            <div class="mb-3 flex flex-wrap gap-1.5 text-[0.95rem] leading-relaxed text-foreground">
              <strong class="font-semibold">{{ fact?.subject }}</strong>
              <span class="text-muted-foreground">{{ fact?.predicate }}</span>
              <span>{{ fact?.object }}</span>
            </div>
            <div class="mb-2.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge :variant="statusVariant">{{ fact?.status }}</Badge>
              <span v-if="fact?.product_line" class="rounded-full bg-muted px-[7px] py-px uppercase tracking-[0.04em]">{{ fact.product_line }}</span>
              <span v-if="fact?.topic" class="rounded-full bg-muted px-[7px] py-px uppercase tracking-[0.04em]">{{ fact.topic }}</span>
              <span class="tabular-nums">{{ confidencePct }}% confidence</span>
            </div>
            <a v-if="fact?.source_url" :href="fact.source_url" target="_blank" rel="noopener" class="inline-block text-sm font-medium text-chart-1 hover:underline">
              View source ↗
            </a>
          </section>

          <section class="border-t border-border py-4">
            <h4 class="mb-2.5 text-[0.78rem] uppercase tracking-[0.06em] text-muted-foreground">Usage</h4>
            <div v-if="loadingUsage" class="text-sm text-muted-foreground">Loading usage…</div>
            <div v-else class="grid grid-cols-3 gap-2.5">
              <div class="rounded-lg bg-muted px-3.5 py-3 text-center">
                <div class="text-xl font-bold text-foreground">{{ usage.audit_count || 0 }}</div>
                <div class="mt-0.5 text-[0.7rem] uppercase tracking-[0.04em] text-muted-foreground">audits since added</div>
              </div>
              <div class="rounded-lg bg-muted px-3.5 py-3 text-center">
                <div class="text-xl font-bold text-foreground">{{ usage.draft_count || 0 }}</div>
                <div class="mt-0.5 text-[0.7rem] uppercase tracking-[0.04em] text-muted-foreground">content drafts</div>
              </div>
              <div class="rounded-lg bg-muted px-3.5 py-3 text-center">
                <div class="text-xl font-bold text-foreground">{{ usage.revision_count || 0 }}</div>
                <div class="mt-0.5 text-[0.7rem] uppercase tracking-[0.04em] text-muted-foreground">revisions</div>
              </div>
            </div>
          </section>

          <section class="border-t border-border py-4">
            <h4 class="mb-2.5 text-[0.78rem] uppercase tracking-[0.06em] text-muted-foreground">Provenance</h4>
            <dl class="grid grid-cols-[max-content_1fr] gap-x-3.5 gap-y-1.5 text-sm">
              <dt class="text-muted-foreground">Added</dt>
              <dd class="m-0 text-foreground">{{ formatDate(fact?.created_at) }}</dd>
              <dt class="text-muted-foreground">Extracted by</dt>
              <dd class="m-0 text-foreground">{{ fact?.extracted_by || 'manual' }}</dd>
              <dt class="text-muted-foreground">Version from</dt>
              <dd class="m-0 text-foreground">{{ formatDate(fact?.version_from) }}</dd>
              <dt v-if="fact?.version_to" class="text-muted-foreground">Superseded at</dt>
              <dd v-if="fact?.version_to" class="m-0 text-foreground">{{ formatDate(fact?.version_to) }}</dd>
            </dl>
          </section>
        </aside>
      </Transition>
    </div>
  </Transition>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { X } from '@lucide/vue'
import brandVaultApi from '@/api/brandVault'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const props = defineProps({
  open: { type: Boolean, default: false },
  fact: { type: Object, default: null },
})
const emit = defineEmits(['update:open'])

const usage = ref({})
const loadingUsage = ref(false)

watch(() => [props.open, props.fact?.id], async ([open, id]) => {
  if (!open || !id) return
  loadingUsage.value = true
  try {
    const { data } = await brandVaultApi.factUsage(id)
    usage.value = data?.data || data || {}
  } catch (_) {
    usage.value = {}
  } finally {
    loadingUsage.value = false
  }
})

const confidencePct = computed(() => {
  const c = Number(props.fact?.confidence) || 0
  const v = c <= 1 ? c * 100 : c
  return Math.max(0, Math.min(100, Math.round(v)))
})

const STATUS_VARIANT = {
  approved: 'success',
  auto: 'default',
  pending: 'warning',
  rejected: 'secondary',
}
const statusVariant = computed(() => STATUS_VARIANT[props.fact?.status] || 'secondary')

function close() { emit('update:open', false) }
function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<style scoped>
.fd-fade-enter-active, .fd-fade-leave-active { transition: opacity 0.2s ease; }
.fd-fade-enter-from, .fd-fade-leave-to { opacity: 0; }
.fd-slide-enter-active, .fd-slide-leave-active { transition: transform 0.22s ease; }
.fd-slide-enter-from, .fd-slide-leave-to { transform: translateX(100%); }
</style>
