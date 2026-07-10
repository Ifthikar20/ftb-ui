<script setup>
import { ref, watch, computed } from 'vue'
import { Play, Trash2 } from '@lucide/vue'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import AgentBadge from './AgentBadge.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  agent: { type: Object, default: null },
  prompts: { type: Array, default: () => [] },
  running: { type: Boolean, default: false },
})
const emit = defineEmits([
  'update:open', 'save', 'run', 'add-prompt', 'delete-prompt',
])

const enabled = ref(true)
const sensitivity = ref('medium')
const schedule = ref('daily')
const newPrompt = ref('')

const PROMPT_DRIVEN = ['llm_truth', 'serp_reputation', 'sentiment_pulse']
const isPromptDriven = computed(() => PROMPT_DRIVEN.includes(props.agent?.agent_id))

const agentPrompts = computed(() =>
  props.prompts.filter((p) => (p.agent_id || 'llm_truth') === props.agent?.agent_id),
)

const promptGuide = {
  llm_truth: {
    heading: 'Prompts asked to each LLM',
    body: `Each prompt is sent to Claude, GPT, Gemini, Perplexity and Grok on
      every run. Answers are flagged when they hallucinate, are outdated,
      or make unverified or harmful claims about your brand.`,
    placeholder: 'What is <your brand>?',
  },
  serp_reputation: {
    heading: 'Google queries this agent runs',
    body: `Each prompt is used as a Google search query. Any page returned in
      the top 10 is judged for whether it's negative, misleading or a
      brand-safety issue for you.`,
    placeholder: 'why is <your brand> not lasting',
  },
  sentiment_pulse: {
    heading: 'Social queries this agent runs',
    body: `Each prompt is used as a search on Reddit and X. Mentions are
      scored for sentiment and flagged when the tone turns hostile,
      harmful or shows a sudden negative shift.`,
    placeholder: 'bad experience with <your brand>',
  },
}
const guide = computed(() => promptGuide[props.agent?.agent_id])

const patternDrivenNote = {
  impersonation: `This agent looks for lookalike domains and fake handles
    that impersonate your brand — it does not take natural-language prompts.
    Set your real brand name in Monitoring Config below to steer it.`,
  narrative_watch: `This agent watches Google Trends and Reddit velocity
    around your brand terms — it needs short single-word seeds, not
    sentences. Add your brand terms in Monitoring Config below.`,
}

watch(() => props.agent, (a) => {
  if (!a) return
  enabled.value = a.enabled
  sensitivity.value = a.sensitivity
  schedule.value = a.schedule
}, { immediate: true })

function save() {
  emit('save', {
    enabled: enabled.value,
    sensitivity: sensitivity.value,
    schedule: schedule.value,
  })
  emit('update:open', false)
}

function submitPrompt() {
  const text = newPrompt.value.trim()
  if (!text) return
  emit('add-prompt', text, props.agent?.agent_id)
  newPrompt.value = ''
}

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString()
}

const nextRunLabel = computed(() => {
  if (!enabled.value) return 'Paused'
  if (schedule.value === 'manual') return 'Manual only'
  return fmt(props.agent?.next_run_at)
})

const sourceDescriptions = {
  llms: 'Asks Claude, GPT, Gemini, Perplexity and Grok your prompts and inspects their answers.',
  serp: 'Runs Google searches and inspects the results.',
  reddit: 'Reads recent Reddit discussions.',
  trends: 'Watches Google Trends for rising queries.',
  x: 'Reads recent X (Twitter) posts.',
}
</script>

<template>
  <Sheet :open="open" @update:open="(v) => emit('update:open', v)">
    <SheetContent side="right" class="w-full overflow-y-auto sm:max-w-lg">
      <SheetHeader>
        <SheetTitle class="flex items-center gap-2">
          <AgentBadge
            v-if="agent"
            :agent-id="agent.agent_id"
            :display-name="agent.display_name"
            :color="agent.color"
          />
        </SheetTitle>
        <SheetDescription v-if="agent">{{ agent.tagline }}</SheetDescription>
      </SheetHeader>

      <div v-if="agent" class="mt-6 space-y-5">
        <div class="flex items-center justify-between rounded-lg border p-3">
          <div class="pr-3">
            <div class="text-sm font-medium">Active</div>
            <div class="text-xs text-muted-foreground">
              When on, runs automatically on the schedule below. When off,
              the agent is paused and only runs if you press Run now.
            </div>
          </div>
          <label class="relative inline-block h-5 w-9 shrink-0 cursor-pointer">
            <input v-model="enabled" type="checkbox" class="peer sr-only" />
            <span class="absolute inset-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-emerald-500" />
            <span class="absolute left-0.5 top-0.5 size-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
          </label>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="rounded border p-2">
            <div class="text-muted-foreground">Last run</div>
            <div class="font-medium">{{ fmt(agent.last_run_at) }}</div>
            <div class="mt-0.5 text-muted-foreground capitalize">
              Status: {{ agent.last_status || 'idle' }}
            </div>
            <div v-if="agent.last_status === 'error' && agent.last_error" class="mt-1 break-words text-red-600">
              {{ agent.last_error }}
            </div>
          </div>
          <div class="rounded border p-2">
            <div class="text-muted-foreground">Next run</div>
            <div class="font-medium">{{ nextRunLabel }}</div>
            <div class="mt-0.5 text-muted-foreground capitalize">
              Cadence: {{ schedule }}
            </div>
          </div>
        </div>

        <div>
          <div class="mb-1 text-sm font-medium">What this agent monitors</div>
          <ul class="space-y-1 text-xs">
            <li v-for="s in agent.sources" :key="s" class="flex gap-2">
              <span class="mt-0.5 shrink-0 rounded bg-muted px-1.5 py-0.5 uppercase text-muted-foreground">
                {{ s }}
              </span>
              <span class="text-muted-foreground">
                {{ sourceDescriptions[s] || 'External source.' }}
              </span>
            </li>
          </ul>
        </div>

        <div v-if="isPromptDriven && guide">
          <div class="mb-1 text-sm font-medium">
            {{ guide.heading }} ({{ agentPrompts.length }})
          </div>
          <p class="mb-2 text-xs text-muted-foreground">{{ guide.body }}</p>
          <ul class="mb-2 max-h-56 space-y-1 overflow-y-auto rounded border p-2">
            <li v-if="!agentPrompts.length" class="px-1 py-0.5 text-xs text-muted-foreground">
              No prompts yet. Add your first below.
            </li>
            <li
              v-for="p in agentPrompts" :key="p.id"
              class="flex items-start justify-between gap-2 rounded p-1.5 text-xs hover:bg-muted/40"
            >
              <span class="flex-1 break-words">{{ p.text }}</span>
              <button
                class="shrink-0 text-muted-foreground hover:text-red-600"
                @click="emit('delete-prompt', p)"
              >
                <Trash2 class="size-3.5" />
              </button>
            </li>
          </ul>
          <div class="flex gap-2">
            <input
              v-model="newPrompt"
              :placeholder="guide.placeholder"
              class="flex-1 rounded border bg-background px-2 py-1 text-sm"
              @keyup.enter="submitPrompt"
            />
            <Button size="sm" @click="submitPrompt">Add</Button>
          </div>
        </div>

        <div v-else-if="patternDrivenNote[agent.agent_id]" class="rounded border border-dashed p-3 text-xs text-muted-foreground">
          {{ patternDrivenNote[agent.agent_id] }}
        </div>

        <div>
          <div class="mb-1 text-sm font-medium">Sensitivity</div>
          <select v-model="sensitivity" class="w-full rounded border bg-background px-2 py-1 text-sm">
            <option value="low">Low — only high-severity alerts</option>
            <option value="medium">Medium (default)</option>
            <option value="high">High — surface everything</option>
          </select>
        </div>

        <div>
          <div class="mb-1 text-sm font-medium">Schedule</div>
          <select v-model="schedule" class="w-full rounded border bg-background px-2 py-1 text-sm">
            <option value="manual">Manual only</option>
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>

        <div class="flex items-center justify-between gap-2 pt-2">
          <Button variant="outline" :disabled="running" @click="emit('run', agent)">
            <Play class="size-3.5" />
            {{ running ? 'Running…' : 'Run now' }}
          </Button>
          <div class="flex gap-2">
            <Button variant="ghost" @click="emit('update:open', false)">Cancel</Button>
            <Button @click="save">Save</Button>
          </div>
        </div>
      </div>
    </SheetContent>
  </Sheet>
</template>
