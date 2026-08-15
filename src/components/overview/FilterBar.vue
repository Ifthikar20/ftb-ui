<script setup>
// Functional filter pills for the dashboard Overview. Each pill is a
// single-select dropdown (null = All) that patches the parent's filter
// state; the parent refetches the dashboard with the new params. Menu
// contents come from the backend's filter_options payload so the pills
// never invent an option that cannot match anything.
//
// Pattern copied from SourcesUrlsPage.vue (the one pill row in the app
// that already worked): data-filter-menu + document click-away.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  Building2, Calendar, Tag, BrainCircuit, Folder, ChevronDown, Check,
} from '@lucide/vue'

const props = defineProps({
  projectName: { type: String, default: 'Project' },
  // { range, model, tag, topic, ... } — owned by DashboardPage.
  filters: { type: Object, default: () => ({}) },
  // filter_options from the dashboard payload:
  // { models: [{value,label}], tags: [{name,count}], topics: [{name,count}] }
  options: { type: Object, default: null },
})
const emit = defineEmits(['update:filters'])

const openMenu = ref(null)

const RANGE_OPTIONS = [
  { value: 'overall', label: 'All time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
]

const rangeLabel = computed(
  () => RANGE_OPTIONS.find(o => o.value === props.filters.range)?.label || 'Last 30 days',
)
const modelOptions = computed(() => props.options?.models || [])
const tagOptions = computed(() => props.options?.tags || [])
const topicOptions = computed(() => props.options?.topics || [])

const modelLabel = computed(
  () => modelOptions.value.find(m => m.value === props.filters.model)?.label || 'All Models',
)
const tagLabel = computed(() => props.filters.tag || 'All Tags')
const topicLabel = computed(() => props.filters.topic || 'All Topics')

function toggleMenu(name) {
  openMenu.value = openMenu.value === name ? null : name
}
function closeMenus() { openMenu.value = null }
function onDocClick(e) {
  if (!e.target.closest?.('[data-filter-menu]')) closeMenus()
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

function patch(key, value) {
  closeMenus()
  emit('update:filters', { ...props.filters, [key]: value })
}

const pillBtn = 'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg border bg-card px-2 text-[13px] font-medium text-foreground shadow-sm transition-colors hover:border-ring'
const itemBtn = 'flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-sm hover:bg-secondary'
</script>

<template>
  <!-- flex-wrap, never overflow-x-auto: an overflow container clips the
       absolute-positioned menus, leaving pills that open nothing. The
       working pill row on SourcesUrlsPage wraps for the same reason. -->
  <div class="flex flex-wrap items-center gap-1.5">
    <!-- Project label. Single-project accounts have nothing to switch. -->
    <span :class="[pillBtn, 'cursor-default border-border']">
      <Building2 class="size-3.5 text-muted-foreground" />
      <span class="max-w-[140px] truncate">{{ projectName || 'Project' }}</span>
    </span>

    <!-- Time range -->
    <div class="relative" data-filter-menu>
      <button
        :class="[pillBtn, filters.range && filters.range !== '30d' ? 'border-ring' : 'border-border']"
        @click="toggleMenu('range')"
      >
        <Calendar class="size-3.5 text-muted-foreground" />
        <span>{{ rangeLabel }}</span>
        <ChevronDown class="size-3.5 text-muted-foreground" />
      </button>
      <div
        v-if="openMenu === 'range'"
        class="absolute left-0 z-20 mt-1 w-44 rounded-lg border border-border bg-popover p-1 shadow-md"
      >
        <button
          v-for="o in RANGE_OPTIONS"
          :key="o.value"
          :class="[itemBtn, filters.range === o.value ? 'font-semibold text-foreground' : 'text-muted-foreground']"
          @click="patch('range', o.value)"
        >
          <span>{{ o.label }}</span>
          <Check v-if="filters.range === o.value" class="size-3.5 text-[color:var(--chart-1)]" />
        </button>
      </div>
    </div>

    <!-- Tags -->
    <div class="relative" data-filter-menu>
      <button
        :class="[pillBtn, filters.tag ? 'border-ring' : 'border-border']"
        @click="toggleMenu('tags')"
      >
        <Tag class="size-3.5 text-muted-foreground" />
        <span class="max-w-[120px] truncate">{{ tagLabel }}</span>
        <ChevronDown class="size-3.5 text-muted-foreground" />
      </button>
      <div
        v-if="openMenu === 'tags'"
        class="absolute left-0 z-20 mt-1 w-56 rounded-lg border border-border bg-popover p-1 shadow-md"
      >
        <p v-if="!tagOptions.length" class="px-2.5 py-2 text-xs text-muted-foreground">
          No measured tags yet. Tag prompts on the Prompts page; tags appear
          here after an audit measures those prompts.
        </p>
        <template v-else>
          <button
            :class="[itemBtn, !filters.tag ? 'font-semibold text-foreground' : 'text-muted-foreground']"
            @click="patch('tag', '')"
          >All Tags</button>
          <button
            v-for="t in tagOptions"
            :key="t.name"
            :class="[itemBtn, filters.tag === t.name ? 'font-semibold text-foreground' : 'text-muted-foreground']"
            @click="patch('tag', t.name)"
          >
            <span class="truncate">{{ t.name }}</span>
            <span class="ml-2 flex shrink-0 items-center gap-1.5">
              <span class="text-xs tabular-nums">{{ t.count }}</span>
              <Check v-if="filters.tag === t.name" class="size-3.5 text-[color:var(--chart-1)]" />
            </span>
          </button>
        </template>
      </div>
    </div>

    <!-- Models -->
    <div class="relative" data-filter-menu>
      <button
        :class="[pillBtn, filters.model ? 'border-ring' : 'border-border']"
        @click="toggleMenu('models')"
      >
        <BrainCircuit class="size-3.5 text-muted-foreground" />
        <span>{{ modelLabel }}</span>
        <ChevronDown class="size-3.5 text-muted-foreground" />
      </button>
      <div
        v-if="openMenu === 'models'"
        class="absolute left-0 z-20 mt-1 w-48 rounded-lg border border-border bg-popover p-1 shadow-md"
      >
        <p v-if="!modelOptions.length" class="px-2.5 py-2 text-xs text-muted-foreground">
          Models appear here after your first audit.
        </p>
        <template v-else>
          <button
            :class="[itemBtn, !filters.model ? 'font-semibold text-foreground' : 'text-muted-foreground']"
            @click="patch('model', '')"
          >All Models</button>
          <button
            v-for="m in modelOptions"
            :key="m.value"
            :class="[itemBtn, filters.model === m.value ? 'font-semibold text-foreground' : 'text-muted-foreground']"
            @click="patch('model', m.value)"
          >
            <span>{{ m.label }}</span>
            <Check v-if="filters.model === m.value" class="size-3.5 text-[color:var(--chart-1)]" />
          </button>
        </template>
      </div>
    </div>

    <!-- Topics -->
    <div class="relative" data-filter-menu>
      <button
        :class="[pillBtn, filters.topic ? 'border-ring' : 'border-border']"
        @click="toggleMenu('topics')"
      >
        <Folder class="size-3.5 text-muted-foreground" />
        <span class="max-w-[140px] truncate">{{ topicLabel }}</span>
        <ChevronDown class="size-3.5 text-muted-foreground" />
      </button>
      <div
        v-if="openMenu === 'topics'"
        class="absolute left-0 z-20 mt-1 w-60 rounded-lg border border-border bg-popover p-1 shadow-md"
      >
        <p v-if="!topicOptions.length" class="px-2.5 py-2 text-xs text-muted-foreground">
          No topics yet. Saved prompts carry a topic from their industry.
        </p>
        <template v-else>
          <button
            :class="[itemBtn, !filters.topic ? 'font-semibold text-foreground' : 'text-muted-foreground']"
            @click="patch('topic', '')"
          >All Topics</button>
          <button
            v-for="t in topicOptions"
            :key="t.name"
            :class="[itemBtn, filters.topic === t.name ? 'font-semibold text-foreground' : 'text-muted-foreground']"
            @click="patch('topic', t.name)"
          >
            <span class="truncate">{{ t.name }}</span>
            <span class="ml-2 flex shrink-0 items-center gap-1.5">
              <span class="text-xs tabular-nums">{{ t.count }}</span>
              <Check v-if="filters.topic === t.name" class="size-3.5 text-[color:var(--chart-1)]" />
            </span>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
