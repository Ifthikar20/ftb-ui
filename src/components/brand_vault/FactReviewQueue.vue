<template>
  <div class="flex flex-col gap-3">
    <div
      v-if="pendingFacts.length"
      class="flex items-center justify-between gap-2.5 rounded-xl border border-border bg-card px-3.5 py-2.5"
    >
      <label class="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-input accent-primary"
          :checked="allSelected"
          :indeterminate.prop="someSelected"
          @change="toggleAll"
        />
        <span>{{ allSelected ? 'Deselect all' : 'Select all' }}</span>
      </label>
      <div class="flex items-center gap-2">
        <span v-if="selectedIds.size" class="text-xs text-muted-foreground">
          {{ selectedIds.size }} selected
        </span>
        <Button
          variant="outline"
          size="sm"
          :disabled="!selectedIds.size"
          @click="$emit('bulk-reject', Array.from(selectedIds))"
        >
          Reject {{ selectedIds.size || '' }}
        </Button>
        <Button
          size="sm"
          :disabled="!selectedIds.size"
          @click="bulkApprove"
        >
          Approve {{ selectedIds.size || '' }}
        </Button>
      </div>
    </div>

    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="i in 4" :key="i" class="h-[84px] animate-pulse rounded-xl border border-border bg-card" />
    </div>

    <div
      v-else-if="!pendingFacts.length"
      class="rounded-2xl border border-dashed border-border px-5 py-[60px] text-center text-muted-foreground"
    >
      <div class="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-2/10 text-chart-2" aria-hidden="true">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 12l2 2 4-4"/>
          <circle cx="12" cy="12" r="10"/>
        </svg>
      </div>
      <h3 class="mb-1 text-[1.05rem] text-foreground">Nothing to review</h3>
      <p class="text-sm">No pending facts. Run a re-scan or import facts to build up the vault.</p>
    </div>

    <div v-else class="flex flex-col gap-2">
      <div
        v-for="fact in pendingFacts"
        :key="fact.id"
        class="grid grid-cols-[22px_1fr_auto] items-start gap-3.5 rounded-xl border bg-card px-4 py-3.5 transition-colors hover:border-muted-foreground"
        :class="selectedIds.has(fact.id) ? 'border-chart-1 bg-chart-1/5' : 'border-border'"
      >
        <label class="inline-flex items-center pt-0.5">
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-input accent-primary"
            :checked="selectedIds.has(fact.id)"
            @change="toggle(fact.id)"
          />
        </label>
        <div class="min-w-0">
          <div class="flex flex-wrap gap-1.5 text-[0.92rem] leading-relaxed text-foreground">
            <strong class="font-semibold">{{ fact.subject }}</strong>
            <span class="text-muted-foreground">{{ fact.predicate }}</span>
            <span>{{ fact.object }}</span>
          </div>
          <div class="mt-1.5 flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
            <span class="inline-flex items-center gap-1.5">
              <span class="h-[7px] w-[7px] rounded-full" :class="confidenceClass(fact.confidence)"></span>
              {{ confidencePct(fact.confidence) }}% confidence
            </span>
            <a
              v-if="fact.source_url"
              :href="fact.source_url"
              target="_blank"
              rel="noopener"
              class="text-chart-1 hover:underline"
            >Source ↗</a>
            <span v-if="fact.product_line" class="rounded-full bg-muted px-2 py-px text-[0.7rem] uppercase tracking-[0.04em] text-muted-foreground">{{ fact.product_line }}</span>
            <span v-if="fact.topic" class="rounded-full bg-muted px-2 py-px text-[0.7rem] uppercase tracking-[0.04em] text-muted-foreground">{{ fact.topic }}</span>
          </div>
        </div>
        <div class="flex flex-shrink-0 items-center gap-1.5">
          <Button variant="outline" size="sm" @click="$emit('edit-click', fact)">Edit</Button>
          <Button variant="ghost" size="sm" @click="$emit('reject', fact)">Reject</Button>
          <Button size="sm" @click="$emit('approve', fact)">Approve</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Button } from '@/components/ui/button'

const props = defineProps({
  pendingFacts: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  websiteId: { type: String, required: true },
})

const emit = defineEmits(['approve', 'reject', 'edit-click', 'bulk-approve', 'bulk-reject', 'refresh'])

const selectedIds = ref(new Set())

function toggle(id) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id); else next.add(id)
  selectedIds.value = next
}

function toggleAll() {
  if (allSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(props.pendingFacts.map((f) => f.id))
  }
}

const allSelected = computed(() =>
  props.pendingFacts.length > 0 &&
  selectedIds.value.size === props.pendingFacts.length,
)
const someSelected = computed(() =>
  selectedIds.value.size > 0 && !allSelected.value,
)

function bulkApprove() {
  emit('bulk-approve', Array.from(selectedIds.value))
  selectedIds.value = new Set()
}

// Drop any ids that have left the pending list (approved / rejected elsewhere).
watch(() => props.pendingFacts, (list) => {
  const ids = new Set(list.map((f) => f.id))
  const next = new Set()
  for (const id of selectedIds.value) if (ids.has(id)) next.add(id)
  selectedIds.value = next
})

function confidencePct(c) {
  const v = Number(c) || 0
  const pct = v <= 1 ? v * 100 : v
  return Math.max(0, Math.min(100, Math.round(pct)))
}
function confidenceClass(c) {
  const p = confidencePct(c)
  if (p >= 75) return 'bg-chart-2'
  if (p >= 50) return 'bg-chart-3'
  return 'bg-destructive'
}
</script>
