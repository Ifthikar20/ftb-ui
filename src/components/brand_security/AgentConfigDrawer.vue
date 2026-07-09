<script setup>
import { ref, watch } from 'vue'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import AgentBadge from './AgentBadge.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  agent: { type: Object, default: null },
})
const emit = defineEmits(['update:open', 'save'])

const enabled = ref(true)
const sensitivity = ref('medium')
const schedule = ref('daily')

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
</script>

<template>
  <Sheet :open="open" @update:open="(v) => emit('update:open', v)">
    <SheetContent side="right" class="w-full sm:max-w-md">
      <SheetHeader>
        <SheetTitle class="flex items-center gap-2">
          <AgentBadge
            v-if="agent"
            :agent-id="agent.agent_id"
            :display-name="agent.display_name"
            :color="agent.color"
          />
          Configure
        </SheetTitle>
        <SheetDescription v-if="agent">{{ agent.tagline }}</SheetDescription>
      </SheetHeader>

      <div v-if="agent" class="mt-6 space-y-5">
        <label class="flex items-center justify-between text-sm">
          <span>Enabled</span>
          <input v-model="enabled" type="checkbox" class="size-4" />
        </label>

        <div>
          <div class="mb-1 text-sm font-medium">Sensitivity</div>
          <select v-model="sensitivity" class="w-full rounded border bg-background px-2 py-1 text-sm">
            <option value="low">Low (only high-severity alerts)</option>
            <option value="medium">Medium (default)</option>
            <option value="high">High (surface everything)</option>
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

        <div>
          <div class="mb-1 text-sm font-medium">Sources</div>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="s in agent.sources" :key="s"
              class="rounded bg-muted px-2 py-0.5 text-xs uppercase text-muted-foreground"
            >{{ s }}</span>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <Button variant="ghost" @click="emit('update:open', false)">Cancel</Button>
          <Button @click="save">Save</Button>
        </div>
      </div>
    </SheetContent>
  </Sheet>
</template>
