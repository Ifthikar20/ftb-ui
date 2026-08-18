<script setup>
/**
 * The alert queue: one flat row per finding, detail lives in the
 * AlertDetailSheet drawer (opened via the `open` emit). Severity leads
 * every row; identity (reference + detector code) is always visible so a
 * finding can be quoted, searched and tracked by its code.
 */
import { Check, ExternalLink, ShieldAlert, ShieldCheck, X } from '@lucide/vue'

import { Button } from '@/components/ui/button'
import EmptyState from '@/components/ui/EmptyState.vue'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import SeverityBadge from '@/components/brand_security/SeverityBadge.vue'
import { categoryForAlert, sourceLabel } from '@/constants/detectors'
import { useBrandSecurityStore } from '@/stores/brandSecurity'
import { safeHref } from '@/utils/safeHref'
import { timeAgo } from '@/utils/timeAgo.js'

const props = defineProps({
  alerts: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  // True when any filter/search narrows the list — switches the empty
  // state from "no findings" to "nothing matches".
  filtered: { type: Boolean, default: false },
  // Whether the status column adds information (hidden when the list is
  // already scoped to open findings).
  showStatus: { type: Boolean, default: false },
  websiteId: { type: String, default: '' },
})
const emit = defineEmits(['open', 'resolve', 'dismiss', 'clear-filters'])

const store = useBrandSecurityStore()

function category(alert) {
  return categoryForAlert(alert, store.detectorByCode)
}

function grounded(alert) {
  return Array.isArray(alert.evidence_chunks) && alert.evidence_chunks.length > 0
}

function lastSeen(alert) {
  return timeAgo(alert.last_seen_at || alert.detected_at) || '-'
}

function absolute(v) {
  if (!v) return ''
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString()
}
</script>

<template>
  <div class="rounded-lg border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead class="w-24">Severity</TableHead>
          <TableHead>Finding</TableHead>
          <TableHead class="w-40">Category</TableHead>
          <TableHead class="w-36">Source</TableHead>
          <TableHead class="w-28">Last seen</TableHead>
          <TableHead v-if="showStatus" class="w-24">Status</TableHead>
          <TableHead class="w-28 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <!-- Loading skeleton -->
        <template v-if="loading && !alerts.length">
          <TableRow v-for="n in 5" :key="`skeleton-${n}`">
            <TableCell><Skeleton class="h-5 w-16" /></TableCell>
            <TableCell>
              <Skeleton class="h-4 w-64" />
              <Skeleton class="mt-1.5 h-3 w-40" />
            </TableCell>
            <TableCell><Skeleton class="h-4 w-24" /></TableCell>
            <TableCell><Skeleton class="h-4 w-20" /></TableCell>
            <TableCell><Skeleton class="h-4 w-16" /></TableCell>
            <TableCell v-if="showStatus"><Skeleton class="h-4 w-14" /></TableCell>
            <TableCell></TableCell>
          </TableRow>
        </template>

        <!-- Empty states -->
        <TableRow v-else-if="!alerts.length">
          <TableCell :colspan="showStatus ? 7 : 6" class="p-0">
            <EmptyState
              v-if="filtered"
              title="Nothing matches these filters"
              body="Widen the severity, category or status filters, or clear them to see every finding."
            />
            <EmptyState
              v-else
              title="No findings"
              body="Findings appear automatically as your prompt runs and chat checks complete — there is nothing to trigger manually. Run prompts to give the checks fresh answers to read."
              cta-label="Run prompts"
              :cta-to="websiteId ? `/llm-ranking/${websiteId}/prompts` : ''"
            />
            <div v-if="filtered" class="flex justify-center pb-6">
              <Button size="sm" variant="outline" @click="emit('clear-filters')">
                Clear filters
              </Button>
            </div>
          </TableCell>
        </TableRow>

        <!-- Queue rows -->
        <TableRow
          v-for="alert in alerts"
          :key="alert.id"
          class="cursor-pointer"
          @click="emit('open', alert)"
        >
          <TableCell class="align-top">
            <SeverityBadge :severity="alert.severity" size="sm" />
          </TableCell>

          <TableCell class="max-w-xl align-top">
            <button
              type="button"
              class="block max-w-full truncate text-left text-sm font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              @click.stop="emit('open', alert)"
            >{{ alert.title || alert.prompt_text || '-' }}</button>
            <div class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span
                v-if="alert.reference"
                class="rounded bg-secondary px-1.5 py-px font-mono text-[10px] text-secondary-foreground"
              >{{ alert.reference }}</span>
              <span
                v-if="grounded(alert)"
                class="inline-flex items-center gap-1 whitespace-nowrap text-[color:var(--chart-2)]"
                :title="`Judged against ${alert.evidence_chunks.length} brand source(s) from your knowledge base`"
              >
                <ShieldCheck class="size-3" />
                verified
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1 whitespace-nowrap text-severity-medium"
                title="No brand material was retrieved for this finding. Add reference material on the Brand Input page to improve accuracy."
              >
                <ShieldAlert class="size-3" />
                ungrounded
              </span>
              <span class="truncate">{{ alert.snippet || alert.detail }}</span>
            </div>
          </TableCell>

          <TableCell class="align-top">
            <div class="flex flex-col gap-1">
              <span
                class="inline-flex w-fit items-center gap-1 whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium"
                :class="category(alert).badgeClass"
                :title="category(alert).blurb"
              >
                <component :is="category(alert).icon" class="size-3" aria-hidden="true" />
                {{ category(alert).label }}
              </span>
              <span
                v-if="alert.detector_code"
                class="font-mono text-[11px] text-muted-foreground"
              >{{ alert.detector_code }}</span>
            </div>
          </TableCell>

          <TableCell
            class="align-top text-xs text-muted-foreground"
            :title="alert.prompt_text"
          >
            <span class="whitespace-nowrap">{{ sourceLabel(alert.source) }}</span>
            <div v-if="alert.model" class="truncate">{{ alert.model }}</div>
          </TableCell>

          <TableCell class="whitespace-nowrap align-top text-xs text-muted-foreground">
            <span :title="absolute(alert.last_seen_at || alert.detected_at)">{{ lastSeen(alert) }}</span>
            <span
              v-if="(alert.occurrence_count || 1) > 1"
              class="ml-1 rounded-full bg-muted px-1.5 text-[10px] font-semibold text-foreground"
              :aria-label="`${alert.occurrence_count} occurrences`"
              title="Times this finding recurred across responses"
            >x{{ alert.occurrence_count }}</span>
          </TableCell>

          <TableCell v-if="showStatus" class="align-top">
            <span class="text-xs capitalize text-muted-foreground">{{ alert.status }}</span>
          </TableCell>

          <TableCell class="text-right align-top" @click.stop>
            <div class="flex justify-end gap-1">
              <a
                v-if="safeHref(alert.source_url)"
                :href="safeHref(alert.source_url)" target="_blank" rel="noopener"
                class="inline-flex size-8 items-center justify-center rounded hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Open source"
                aria-label="Open source in a new tab"
              >
                <ExternalLink class="size-3.5" />
              </a>
              <Button
                v-if="alert.status === 'open'"
                size="sm" variant="ghost" title="Resolve" aria-label="Resolve finding"
                @click="emit('resolve', alert)"
              >
                <Check class="size-3.5" />
              </Button>
              <Button
                v-if="alert.status === 'open'"
                size="sm" variant="ghost" title="Dismiss" aria-label="Dismiss finding"
                @click="emit('dismiss', alert)"
              >
                <X class="size-3.5" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
