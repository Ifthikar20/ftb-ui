<template>
  <div class="flex flex-col gap-3.5">
    <div>
      <h3 class="mb-1 text-[1.05rem] text-foreground">Revision history</h3>
      <p class="text-sm leading-relaxed text-muted-foreground">Every approval, edit, supersede, and rejection — who, when, and what changed.</p>
    </div>

    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="i in 4" :key="i" class="h-14 animate-pulse rounded-lg border border-border bg-card" />
    </div>

    <div v-else-if="!revisions.length" class="rounded-2xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
      <p>No changes recorded yet.</p>
    </div>

    <ol v-else class="rt-list relative m-0 list-none p-0">
      <li v-for="rev in revisions" :key="rev.id" class="relative grid grid-cols-[20px_1fr] gap-3.5 py-2.5">
        <span class="z-[1] mt-1.5 ml-1 h-3 w-3 rounded-full border-2 border-card" :class="dotClass(rev.action)" aria-hidden="true"></span>
        <div>
          <div class="flex flex-wrap items-baseline gap-2">
            <span class="text-sm font-semibold text-foreground">{{ actionLabel(rev.action) }}</span>
            <span class="text-xs text-muted-foreground" v-if="rev.actor_email">by {{ rev.actor_email }}</span>
            <span class="ml-auto text-xs text-muted-foreground">{{ formatDate(rev.created_at) }}</span>
          </div>
          <div v-if="changeSummary(rev)" class="mt-1 text-xs leading-relaxed text-muted-foreground">
            {{ changeSummary(rev) }}
          </div>
        </div>
      </li>
    </ol>
  </div>
</template>

<script setup>
defineProps({
  revisions: { type: Array, required: true },
  loading: { type: Boolean, default: false },
})

const ACTION_LABELS = {
  created: 'Fact created',
  approved: 'Approved',
  rejected: 'Rejected',
  edited: 'Edited',
  superseded: 'Superseded',
}
function actionLabel(a) { return ACTION_LABELS[a] || a }

const DOT_CLASS = {
  approved: 'bg-chart-2',
  rejected: 'bg-destructive',
  superseded: 'bg-chart-4',
  edited: 'bg-chart-3',
  created: 'bg-muted-foreground',
}
function dotClass(a) { return DOT_CLASS[a] || 'bg-muted-foreground' }

function changeSummary(rev) {
  const before = rev.before || {}
  const after = rev.after || {}
  // For supersede / edit, surface the meaningful object/subject delta.
  if (before.object && after.object && before.object !== after.object) {
    return `"${truncate(before.object)}" → "${truncate(after.object)}"`
  }
  if (after.subject && after.predicate && after.object) {
    return `${after.subject} · ${after.predicate} · ${truncate(after.object)}`
  }
  return ''
}
function truncate(s) {
  if (!s) return ''
  return s.length > 80 ? s.slice(0, 80) + '…' : s
}
function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.rt-list::before {
  content: '';
  position: absolute;
  left: 9px;
  top: 12px;
  bottom: 12px;
  width: 1px;
  background: var(--border);
}
</style>
