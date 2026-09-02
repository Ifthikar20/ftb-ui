<script setup>
import { computed, ref, watch } from 'vue'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ range: '30d', start: '', end: '', prompts: [] }),
  },
  availablePrompts: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue', 'apply'])

const local = ref({ ...props.modelValue, prompts: [...(props.modelValue.prompts || [])] })

watch(
  () => props.modelValue,
  (next) => {
    local.value = { ...next, prompts: [...(next.prompts || [])] }
  },
)

const presets = [
  { value: 'overall', label: 'Overall' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
  { value: 'custom', label: 'Custom range' },
]

const isCustom = computed(() => local.value.range === 'custom')

const promptOpen = ref(false)
const promptSearch = ref('')
const filteredPrompts = computed(() => {
  const q = promptSearch.value.trim().toLowerCase()
  if (!q) return props.availablePrompts
  return props.availablePrompts.filter((p) => p.label.toLowerCase().includes(q))
})

const selectedSummary = computed(() => {
  const n = local.value.prompts.length
  if (!n) return 'All prompts'
  if (n === 1) return '1 prompt'
  return `${n} prompts`
})

function togglePrompt(value) {
  const i = local.value.prompts.indexOf(value)
  if (i === -1) local.value.prompts.push(value)
  else local.value.prompts.splice(i, 1)
}

function clearPrompts() {
  local.value.prompts = []
}

function shortLabel(label) {
  if (!label) return ''
  return label.length > 90 ? label.slice(0, 90) + '…' : label
}

function apply() {
  emit('update:modelValue', { ...local.value, prompts: [...local.value.prompts] })
  emit('apply', { ...local.value, prompts: [...local.value.prompts] })
  promptOpen.value = false
}

function reset() {
  local.value = { range: '30d', start: '', end: '', prompts: [] }
  apply()
}
</script>

<template>
  <Card>
    <CardContent class="flex flex-col gap-3 py-4 lg:flex-row lg:items-end lg:gap-4">
      <!-- Range select -->
      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-muted-foreground">Time range</label>
        <select
          v-model="local.range"
          class="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option v-for="p in presets" :key="p.value" :value="p.value">{{ p.label }}</option>
        </select>
      </div>

      <!-- Custom range inputs -->
      <template v-if="isCustom">
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-muted-foreground">Start</label>
          <input
            v-model="local.start"
            type="date"
            class="h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-muted-foreground">End</label>
          <input
            v-model="local.end"
            type="date"
            class="h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
      </template>

      <!-- Prompt picker -->
      <div class="relative flex flex-col gap-1">
        <label class="text-xs font-medium text-muted-foreground">Prompts</label>
        <button
          type="button"
          class="flex h-9 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm"
          :class="local.prompts.length ? 'border-primary text-card-foreground' : 'text-muted-foreground'"
          @click="promptOpen = !promptOpen"
        >
          <span>{{ selectedSummary }}</span>
          <span class="text-xs opacity-60">{{ promptOpen ? '▲' : '▼' }}</span>
        </button>
        <div
          v-if="promptOpen"
          class="absolute left-0 top-full z-30 mt-1 w-[min(420px,90vw)] rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-lg"
        >
          <input
            v-model="promptSearch"
            placeholder="Search prompts…"
            class="mb-2 h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
          />
          <div v-if="!availablePrompts.length" class="px-2 py-6 text-center text-xs text-muted-foreground">
            No prompts available yet. Start a prompt run to populate this list.
          </div>
          <div v-else class="max-h-64 overflow-y-auto">
            <label
              v-for="p in filteredPrompts"
              :key="p.value"
              class="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted"
            >
              <input
                type="checkbox"
                class="mt-0.5"
                :checked="local.prompts.includes(p.value)"
                @change="togglePrompt(p.value)"
              />
              <span class="flex-1">
                <span class="text-card-foreground">{{ shortLabel(p.label) }}</span>
                <span class="ml-1 text-muted-foreground">({{ p.count }})</span>
              </span>
            </label>
            <div v-if="filteredPrompts.length === 0" class="px-2 py-6 text-center text-xs text-muted-foreground">
              No matches.
            </div>
          </div>
          <div v-if="availablePrompts.length" class="mt-2 flex items-center justify-between border-t border-border pt-2 text-xs">
            <button type="button" class="text-muted-foreground hover:text-card-foreground" @click="clearPrompts">
              Clear selection
            </button>
            <button type="button" class="font-medium text-primary" @click="promptOpen = false">
              Done
            </button>
          </div>
        </div>
      </div>

      <div class="flex flex-1 items-end justify-end gap-2">
        <Button variant="outline" size="sm" @click="reset">Reset</Button>
        <Button size="sm" @click="apply">Apply</Button>
      </div>
    </CardContent>
  </Card>
</template>
