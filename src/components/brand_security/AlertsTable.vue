<script setup>
import { computed, ref } from 'vue'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ExternalLink, Check, X, ChevronRight, ShieldCheck, ShieldAlert } from '@lucide/vue'
import { captureTypeForIssue, sourceLabel } from '@/constants/captureTypes'

defineProps({
  alerts: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['resolve', 'dismiss'])

const severityStyle = computed(() => ({
  high:   'bg-red-50 text-red-700',
  medium: 'bg-amber-50 text-amber-800',
  low:    'bg-slate-100 text-slate-700',
}))

// Track which finding rows have their detail panel expanded. A Set keeps
// toggling O(1) and avoids re-render churn from a computed map.
const expanded = ref(new Set())

function toggle(id) {
  const next = new Set(expanded.value)
  next.has(id) ? next.delete(id) : next.add(id)
  expanded.value = next
}

function evidenceCount(alert) {
  return Array.isArray(alert.evidence_chunks) ? alert.evidence_chunks.length : 0
}

function formatScore(score) {
  const n = Number(score)
  return Number.isFinite(n) ? n.toFixed(2) : '-'
}

function formatDate(v) {
  if (!v) return ''
  return new Date(v).toLocaleString()
}
</script>

<template>
  <div class="rounded-lg border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead class="w-8"></TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Finding</TableHead>
          <TableHead>Verified against</TableHead>
          <TableHead>Found in</TableHead>
          <TableHead>Detected</TableHead>
          <TableHead class="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-if="!alerts.length">
          <TableCell colspan="8" class="text-center text-sm text-muted-foreground py-8">
            {{ loading ? 'Loading...' : 'No findings yet. Run a scan to check what is being said about your brand.' }}
          </TableCell>
        </TableRow>
        <template v-for="alert in alerts" :key="alert.id">
          <TableRow
            class="cursor-pointer"
            @click="toggle(alert.id)"
          >
            <TableCell class="w-8 align-top pt-3">
              <ChevronRight
                class="size-4 text-muted-foreground transition-transform"
                :class="{ 'rotate-90': expanded.has(alert.id) }"
              />
            </TableCell>
            <TableCell>
              <span
                class="inline-flex whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium"
                :class="captureTypeForIssue(alert.issue).badgeClass"
                :title="captureTypeForIssue(alert.issue).blurb"
              >{{ captureTypeForIssue(alert.issue).label }}</span>
            </TableCell>
            <TableCell>
              <span
                class="rounded px-2 py-0.5 text-xs font-medium"
                :class="severityStyle[alert.severity] || 'bg-slate-100'"
              >{{ alert.severity }}</span>
            </TableCell>
            <TableCell class="max-w-md">
              <div class="text-sm font-medium truncate">{{ alert.title || alert.prompt_text || '-' }}</div>
              <div class="text-xs text-muted-foreground truncate">{{ alert.detail || alert.snippet }}</div>
            </TableCell>
            <TableCell class="text-xs whitespace-nowrap">
              <span
                v-if="evidenceCount(alert) > 0"
                class="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700"
                :title="'Judged against ' + evidenceCount(alert) + ' brand source(s) from your knowledge base'"
              >
                <ShieldCheck class="size-3" />
                {{ evidenceCount(alert) }} brand source{{ evidenceCount(alert) === 1 ? '' : 's' }}
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 font-medium text-amber-800"
                title="No brand material was retrieved for this prompt. Add reference material on the Brand Input tab to improve accuracy."
              >
                <ShieldAlert class="size-3" />
                Ungrounded
              </span>
            </TableCell>
            <TableCell class="text-xs text-muted-foreground whitespace-nowrap">
              {{ sourceLabel(alert.source) }}<template v-if="alert.model"> · {{ alert.model }}</template>
            </TableCell>
            <TableCell class="text-xs text-muted-foreground whitespace-nowrap">{{ formatDate(alert.detected_at) }}</TableCell>
            <TableCell class="text-right" @click.stop>
              <div class="flex justify-end gap-1">
                <a
                  v-if="alert.source_url"
                  :href="alert.source_url" target="_blank" rel="noopener"
                  class="inline-flex size-8 items-center justify-center rounded hover:bg-muted"
                  title="Open source"
                >
                  <ExternalLink class="size-3.5" />
                </a>
                <Button size="sm" variant="ghost" title="Resolve" @click="emit('resolve', alert)">
                  <Check class="size-3.5" />
                </Button>
                <Button size="sm" variant="ghost" title="Dismiss" @click="emit('dismiss', alert)">
                  <X class="size-3.5" />
                </Button>
              </div>
            </TableCell>
          </TableRow>

          <TableRow v-if="expanded.has(alert.id)" class="bg-muted/30 hover:bg-muted/30">
            <TableCell></TableCell>
            <TableCell colspan="7" class="py-4">
              <div class="flex flex-col gap-3">
                <div class="text-xs text-muted-foreground">
                  {{ captureTypeForIssue(alert.issue).blurb }}
                  <template v-if="alert.prompt_text">
                    — captured while checking <span class="font-medium text-foreground">"{{ alert.prompt_text }}"</span>
                  </template>
                </div>

                <div v-if="alert.snippet" class="text-xs">
                  <div class="mb-1 font-semibold uppercase tracking-wider text-muted-foreground">What was said</div>
                  <div class="rounded-md border bg-background p-3 text-sm leading-relaxed text-foreground/90">
                    {{ alert.snippet }}
                  </div>
                </div>

                <div class="text-xs">
                  <div class="mb-1 flex items-center gap-1.5 font-semibold uppercase tracking-wider text-muted-foreground">
                    <ShieldCheck class="size-3" />
                    Brand ground truth used by the judge
                  </div>

                  <div
                    v-if="evidenceCount(alert) === 0"
                    class="rounded-md border border-dashed bg-background p-3 text-sm text-muted-foreground"
                  >
                    No brand reference material matched this prompt. Add pages or paste
                    text on the <strong class="text-foreground">Brand Input</strong> tab
                    so future findings can be verified against your own facts.
                  </div>

                  <div v-else class="flex flex-col gap-2">
                    <div
                      v-for="(chunk, idx) in alert.evidence_chunks"
                      :key="chunk.chunk_id || idx"
                      class="rounded-md border bg-background p-3"
                    >
                      <div class="mb-1 flex items-center justify-between gap-2 text-xs">
                        <div class="flex items-center gap-2">
                          <span class="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                            [{{ idx + 1 }}]
                          </span>
                          <a
                            v-if="chunk.source_url && !chunk.source_url.startsWith('paste://') && !chunk.source_url.startsWith('audit://')"
                            :href="chunk.source_url" target="_blank" rel="noopener"
                            class="truncate font-medium text-foreground hover:underline"
                          >{{ chunk.section_label || chunk.source_url }}</a>
                          <span
                            v-else
                            class="truncate font-medium text-foreground"
                          >{{ chunk.section_label || 'Pasted brand material' }}</span>
                        </div>
                        <span class="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-700">
                          relevance {{ formatScore(chunk.score) }}
                        </span>
                      </div>
                      <div class="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                        {{ chunk.text }}
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="alert.detail" class="text-xs">
                  <div class="mb-1 font-semibold uppercase tracking-wider text-muted-foreground">Judge verdict</div>
                  <div class="rounded-md border bg-background p-3 text-sm text-foreground/90">
                    {{ alert.detail }}
                  </div>
                </div>
              </div>
            </TableCell>
          </TableRow>
        </template>
      </TableBody>
    </Table>
  </div>
</template>
