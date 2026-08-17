<script setup>
/**
 * One row inside a SourceGroup. Renders the kind icon, title/URL,
 * meta pills, and per-row actions. Emits ``select``/``reingest``/
 * ``delete`` so the parent owns the actual work (API calls, toasts).
 */
import { Globe, BookOpen, Package, FileCode, ShieldCheck, Link2, FileText, Trash2, RefreshCw } from '@lucide/vue'
import StatusPill from './StatusPill.vue'
import { safeHref } from '@/utils/safeHref'

defineProps({
  source: { type: Object, required: true },
})

const emit = defineEmits(['select', 'reingest', 'delete'])

const KIND_ICON = {
  homepage: Globe,
  blog: BookOpen,
  product: Package,
  docs: FileCode,
  review: ShieldCheck,
  other: Link2,
  audit_context: FileText,
}
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-3 rounded-md px-3 py-2.5 hover:bg-secondary/40 cursor-pointer"
    role="button"
    tabindex="0"
    @click="emit('select', source)"
    @keyup.enter="emit('select', source)"
  >
    <!-- Kind icon (paste-uploaded text shows a text icon regardless of kind) -->
    <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
      <FileText v-if="source.is_paste" class="size-4" />
      <component
        v-else
        :is="KIND_ICON[source.kind] || Link2"
        class="size-4"
      />
    </span>

    <!-- Title + URL -->
    <div class="min-w-0 flex-1">
      <div class="truncate text-sm font-semibold text-foreground">
        {{ source.title || (source.is_paste ? 'Pasted text' : source.url) }}
      </div>
      <div class="mt-0.5 truncate text-xs text-muted-foreground">
        <template v-if="source.is_paste">
          Pasted text · SHA-256 fingerprint dedupes identical pastes
        </template>
        <a
          v-else
          :href="safeHref(source.url)"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:text-foreground hover:underline"
          @click.stop
        >{{ source.url }}</a>
      </div>
      <div v-if="source.error_message" class="mt-1 text-xs text-destructive">
        {{ source.error_message }}
      </div>
    </div>

    <!-- Meta pills + actions -->
    <div class="flex items-center gap-2">
      <span class="hidden rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground sm:inline-block">
        {{ source.kind_display || source.kind }}
      </span>
      <span
        class="text-xs tabular-nums text-muted-foreground"
        :title="(source.chunk_count || 0) + ' chunks embedded in the vector store'"
      >
        {{ source.chunk_count || 0 }} chunks
      </span>
      <StatusPill :source="source" />
      <button
        v-if="!source.is_paste"
        class="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
        title="Reingest — re-fetch the URL and re-embed"
        @click.stop="emit('reingest', source)"
      >
        <RefreshCw class="size-4" />
      </button>
      <button
        class="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
        :title="'Delete ' + (source.title || source.url)"
        @click.stop="emit('delete', source)"
      >
        <Trash2 class="size-4" />
      </button>
    </div>
  </div>
</template>
