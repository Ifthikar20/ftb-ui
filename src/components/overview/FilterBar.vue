<script setup>
import { Building2, Calendar, Tag, BrainCircuit, Folder, ChevronDown } from '@lucide/vue'

defineProps({
  projectName: { type: String, default: 'Project' },
})

const btn = 'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-2 text-[13px] font-medium text-foreground shadow-sm transition-colors hover:bg-muted'
</script>

<template>
  <div class="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
    <button :class="btn">
      <Building2 class="size-3.5 text-muted-foreground" />
      <span class="max-w-[140px] truncate">{{ projectName || 'Project' }}</span>
      <ChevronDown class="size-3.5 text-muted-foreground" />
    </button>
    <button :class="btn">
      <Calendar class="size-3.5 text-muted-foreground" />
      <span>All time</span>
      <ChevronDown class="size-3.5 text-muted-foreground" />
    </button>
    <button :class="btn">
      <Tag class="size-3.5 text-muted-foreground" />
      <span>All Tags</span>
      <ChevronDown class="size-3.5 text-muted-foreground" />
    </button>
    <button :class="btn">
      <BrainCircuit class="size-3.5 text-muted-foreground" />
      <span>All Models</span>
      <ChevronDown class="size-3.5 text-muted-foreground" />
    </button>
    <button :class="btn">
      <Folder class="size-3.5 text-muted-foreground" />
      <span>All Topics</span>
      <ChevronDown class="size-3.5 text-muted-foreground" />
    </button>
  </div>
</template>
