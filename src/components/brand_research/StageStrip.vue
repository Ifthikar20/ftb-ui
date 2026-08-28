<!--
  Per-lane progress for a running scan.

  Replaces the single "Reading sources… 3/10" line. A Brand Research scan
  runs four discovery lanes plus the analysis pass, and they finish at wildly
  different speeds — the SERP lanes land in seconds, the analysis loop takes
  a minute or more. One global spinner made a half-finished scan look stuck,
  so each lane reports its own state.

  Older scans predate SourceScan.stages and send {}. In that case we fall
  back to the scan-level status so the strip still says something useful.
-->
<template>
  <div class="stage-strip" role="status" :aria-busy="anyRunning">
    <span
      v-for="lane in lanes"
      :key="lane.key"
      class="ss-pill"
      :class="lane.status"
      :title="lane.tip"
    >
      <span class="ss-icon">
        <span v-if="lane.status === 'running'" class="ss-spinner"></span>
        <svg v-else-if="lane.status === 'complete'" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
        <svg v-else-if="lane.status === 'failed'" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        <span v-else class="ss-dot"></span>
      </span>
      <span class="ss-label">{{ lane.label }}</span>
      <span v-if="lane.badge" class="ss-badge">{{ lane.badge }}</span>
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // SourceScan.stages: { web: {status, count, detail}, ... }
  stages: { type: Object, default: () => ({}) },
  // Scan-level status, used as the fallback for pre-stages scans.
  scanStatus: { type: String, default: '' },
})

// Display order matches the order the lanes actually run, so the strip
// reads left-to-right as the scan progresses.
const LANES = [
  { key: 'web', label: 'Web' },
  { key: 'serp_features', label: 'SERP features' },
  { key: 'community', label: 'Community' },
  { key: 'engines', label: 'AI engines' },
  { key: 'analysis', label: 'Reading' },
]

const VALID = ['pending', 'running', 'complete', 'skipped', 'failed']

function fallbackStatus() {
  if (['pending', 'running'].includes(props.scanStatus)) return 'running'
  if (props.scanStatus === 'failed') return 'failed'
  if (props.scanStatus === 'complete') return 'complete'
  return 'pending'
}

const lanes = computed(() => {
  const raw = props.stages || {}
  const hasStages = Object.keys(raw).length > 0
  return LANES.map((lane) => {
    const entry = raw[lane.key] || {}
    const status = VALID.includes(entry.status)
      ? entry.status
      : hasStages
        ? 'pending'
        : fallbackStatus()
    const count = Number(entry.count) || 0
    return {
      ...lane,
      status,
      // A count is only meaningful once a lane has actually found
      // something; showing "0" next to a pending lane reads as "found
      // nothing" rather than "not started".
      badge: count > 0 ? String(count) : status === 'skipped' ? 'none' : '',
      tip: entry.detail || `${lane.label}: ${status}`,
    }
  })
})

const anyRunning = computed(() => lanes.value.some((l) => l.status === 'running'))
</script>

<style scoped>
.stage-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.ss-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 8px;
  border-radius: 999px;
  border: 1px solid var(--border);
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  color: var(--muted-foreground);
  transition: color 0.2s, border-color 0.2s, opacity 0.2s;
}
.ss-pill.running {
  color: var(--primary);
  border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
}
.ss-pill.complete { color: var(--foreground); }
.ss-pill.failed {
  color: var(--destructive);
  border-color: color-mix(in srgb, var(--destructive) 40%, var(--border));
}
.ss-pill.pending { opacity: 0.6; }
.ss-pill.skipped { opacity: 0.45; }

.ss-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 11px;
  height: 11px;
  flex-shrink: 0;
}
.ss-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}
.ss-spinner {
  width: 10px;
  height: 10px;
  border: 1.5px solid color-mix(in srgb, currentColor 25%, transparent);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: ss-spin 0.7s linear infinite;
}
@keyframes ss-spin { to { transform: rotate(360deg); } }

.ss-badge {
  padding: 1px 5px;
  border-radius: 999px;
  background: var(--muted);
  font-size: 10px;
  font-weight: 700;
  color: var(--muted-foreground);
}
.ss-pill.running .ss-badge {
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--primary);
}

@media (prefers-reduced-motion: reduce) {
  .ss-spinner { animation-duration: 2.4s; }
}
</style>
