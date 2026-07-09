<script setup>
import { computed } from 'vue'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ExternalLink, Check, X } from '@lucide/vue'
import AgentBadge from './AgentBadge.vue'

const props = defineProps({
  alerts: { type: Array, default: () => [] },
  agentsById: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['resolve', 'dismiss'])

const severityStyle = computed(() => ({
  high:   'bg-red-50 text-red-700',
  medium: 'bg-amber-50 text-amber-800',
  low:    'bg-slate-100 text-slate-700',
}))

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
          <TableHead>Agent</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Issue</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Detected</TableHead>
          <TableHead class="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-if="!alerts.length">
          <TableCell colspan="7" class="text-center text-sm text-muted-foreground py-8">
            {{ loading ? 'Loading...' : 'No alerts. Run a scan to check for issues.' }}
          </TableCell>
        </TableRow>
        <TableRow v-for="alert in alerts" :key="alert.id">
          <TableCell>
            <AgentBadge
              :agent-id="alert.agent_id"
              :display-name="agentsById[alert.agent_id]?.display_name || alert.agent_id"
              :color="agentsById[alert.agent_id]?.color || 'slate'"
            />
          </TableCell>
          <TableCell>
            <span
              class="rounded px-2 py-0.5 text-xs font-medium"
              :class="severityStyle[alert.severity] || 'bg-slate-100'"
            >{{ alert.severity }}</span>
          </TableCell>
          <TableCell class="text-sm">{{ alert.issue }}</TableCell>
          <TableCell class="max-w-md">
            <div class="text-sm font-medium truncate">{{ alert.title || alert.prompt_text || '-' }}</div>
            <div class="text-xs text-muted-foreground truncate">{{ alert.detail || alert.snippet }}</div>
          </TableCell>
          <TableCell class="text-xs uppercase text-muted-foreground">{{ alert.source }}</TableCell>
          <TableCell class="text-xs text-muted-foreground whitespace-nowrap">{{ formatDate(alert.detected_at) }}</TableCell>
          <TableCell class="text-right">
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
      </TableBody>
    </Table>
  </div>
</template>
