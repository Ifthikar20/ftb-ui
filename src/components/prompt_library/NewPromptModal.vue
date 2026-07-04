<script setup>
import { ref, computed, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import promptLibrary from '@/api/promptLibrary'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  websiteId: { type: String, default: null },
  variables: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:modelValue', 'created'])

const toast = useToast()

const text = ref('')
const style = ref('question')
const intentBucket = ref('category')
const autoTemplating = ref(false)
const saving = ref(false)
const detectedVars = ref([])

// After a prompt is created we keep the modal open and surface a list of
// related prompts (generated from the one just added) that the user can
// add to the library with one click.
const created = ref(false)
const suggestions = ref([])
const suggestLoading = ref(false)
const suggestError = ref(false)
let suggUid = 0

function norm(s) { return (s || '').trim().toLowerCase() }

const styles = [
  { value: 'question', label: 'Question' },
  { value: 'story', label: 'Story' },
  { value: 'comparison', label: 'Comparison' },
  { value: 'local', label: 'Local' },
  { value: 'how_to', label: 'How-to' },
  { value: 'listicle', label: 'Listicle' },
]
const intents = [
  { value: 'category', label: 'Category' },
  { value: 'comparison', label: 'Comparison' },
  { value: 'problem', label: 'Problem' },
  { value: 'local', label: 'Local' },
]

const TEMPLATE_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g
function detect(t) {
  const out = []
  TEMPLATE_RE.lastIndex = 0
  let m
  while ((m = TEMPLATE_RE.exec(t || '')) !== null) {
    if (!out.includes(m[1])) out.push(m[1])
  }
  return out
}

watch(text, (v) => { detectedVars.value = detect(v) })

const filledPreview = computed(() => {
  let body = text.value || ''
  return body.replace(TEMPLATE_RE, (_, name) => {
    const v = props.variables?.[name]
    return v != null && String(v).length ? String(v) : `{{ ${name} }}`
  })
})

watch(() => props.modelValue, (open) => {
  if (open) {
    text.value = ''
    style.value = 'question'
    intentBucket.value = 'category'
    detectedVars.value = []
    created.value = false
    suggestions.value = []
    suggestLoading.value = false
    suggestError.value = false
  }
})

function close() { emit('update:modelValue', false) }

async function autoTemplate() {
  if (!text.value.trim()) return
  autoTemplating.value = true
  try {
    const { data } = await promptLibrary.autoTemplate(text.value)
    const payload = data?.data || data || {}
    if (payload.template_text) {
      text.value = payload.template_text
      if (payload.style) style.value = payload.style
    }
  } catch (e) {
    toast.error(e.displayMessage || 'Auto-template failed.')
  } finally {
    autoTemplating.value = false
  }
}

async function save() {
  if (!props.websiteId) {
    toast.error('Pick an active website first.')
    return
  }
  if (!text.value.trim()) return
  saving.value = true
  try {
    const payload = {
      template_text: text.value,
      style: style.value,
      intent_bucket: intentBucket.value,
    }
    const { data } = await promptLibrary.createWebsitePrompt(props.websiteId, payload)
    const row = data?.data || data
    toast.success('Prompt created.')
    emit('created', row)
    // Keep the modal open and surface related prompts to add next.
    created.value = true
    fetchSuggestions(text.value)
  } catch (e) {
    toast.error(e.displayMessage || 'Could not create prompt.')
  } finally {
    saving.value = false
  }
}

async function fetchSuggestions(seedText) {
  const seed = (seedText || '').trim()
  if (!seed) return
  suggestLoading.value = true
  suggestError.value = false
  suggestions.value = []
  try {
    const { data } = await promptLibrary.generateRelated({ prompt: seed, count: 5 })
    const payload = data?.data || data || {}
    const items = Array.isArray(payload.generated) ? payload.generated : []
    const seedNorm = norm(seed)
    suggestions.value = items
      .map((it) => {
        suggUid += 1
        const tmpl = it.template_text || it.preview_text || ''
        return {
          _uid: 's' + suggUid,
          _adding: false,
          _added: false,
          text: it.preview_text || tmpl,
          template_text: tmpl,
          style: it.style || 'question',
          intent_bucket: it.intent_bucket || 'category',
        }
      })
      .filter((s) => s.template_text && norm(s.text) !== seedNorm)
    if (!suggestions.value.length) suggestError.value = true
  } catch (e) {
    suggestError.value = true
  } finally {
    suggestLoading.value = false
  }
}

async function addSuggestion(s) {
  if (!props.websiteId || s._adding || s._added) return
  s._adding = true
  try {
    const { data } = await promptLibrary.createWebsitePrompt(props.websiteId, {
      template_text: s.template_text,
      style: s.style,
      intent_bucket: s.intent_bucket,
      text: s.text,
    })
    const row = data?.data || data
    s._added = true
    emit('created', row)
    toast.success('Added to library.')
  } catch (e) {
    toast.error(e.displayMessage || 'Could not add prompt.')
  } finally {
    s._adding = false
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Create a prompt"
    subtitle="Write a question your customers ask, or paste a real one. We will detect variables and let you fill them per-website."
    wide
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="np-grid">
      <div class="np-col">
        <label class="mb-1.5 block text-sm font-medium text-foreground">Prompt text or template</label>
        <textarea
          v-model="text"
          rows="6"
          class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none resize-y focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="E.g. What is the best {{ industry }} agency in {{ location }}?"
        ></textarea>

        <div v-if="detectedVars.length" class="np-vars">
          <span class="np-vars-label">Detected:</span>
          <Badge v-for="v in detectedVars" :key="v" variant="secondary">{{ v }}</Badge>
        </div>

        <div class="np-row">
          <div class="np-field">
            <label class="mb-1.5 block text-sm font-medium text-foreground">Style</label>
            <select v-model="style" class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option v-for="s in styles" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
          </div>
          <div class="np-field">
            <label class="mb-1.5 block text-sm font-medium text-foreground">Intent</label>
            <select v-model="intentBucket" class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option v-for="i in intents" :key="i.value" :value="i.value">{{ i.label }}</option>
            </select>
          </div>
        </div>
      </div>

      <div class="np-col">
        <label class="mb-1.5 block text-sm font-medium text-foreground">Live preview</label>
        <div class="np-preview">{{ filledPreview || 'Start typing — preview shows here.' }}</div>
      </div>
    </div>

    <div v-if="created" class="np-sugg">
      <div class="np-sugg-head">
        <div>
          <div class="np-sugg-title">Suggested prompts</div>
          <div class="np-sugg-sub">Related questions based on the prompt you just added. Add any to your library.</div>
        </div>
        <Button variant="outline" size="sm" :disabled="suggestLoading" @click="fetchSuggestions(text)">
          {{ suggestLoading ? 'Loading…' : 'Refresh' }}
        </Button>
      </div>

      <div v-if="suggestLoading" class="np-sugg-empty">Generating suggestions…</div>
      <div v-else-if="!suggestions.length" class="np-sugg-empty">No suggestions right now. Try Refresh.</div>
      <ul v-else class="np-sugg-list">
        <li v-for="s in suggestions" :key="s._uid" class="np-sugg-item">
          <div class="np-sugg-text">
            <span class="np-sugg-prompt">{{ s.text }}</span>
            <Badge variant="secondary">{{ s.style }}</Badge>
          </div>
          <Button
            size="sm"
            :variant="s._added ? 'ghost' : 'outline'"
            :disabled="s._adding || s._added"
            @click="addSuggestion(s)"
          >
            {{ s._added ? 'Added' : (s._adding ? 'Adding…' : 'Add') }}
          </Button>
        </li>
      </ul>
    </div>

    <template #footer>
      <div class="np-footer">
        <Button v-if="!created" variant="outline" :disabled="autoTemplating || !text.trim()" @click="autoTemplate">
          {{ autoTemplating ? 'Templating…' : 'Auto-template this' }}
        </Button>
        <div class="np-spacer"></div>
        <template v-if="created">
          <Button @click="close">Done</Button>
        </template>
        <template v-else>
          <Button variant="ghost" @click="close">Cancel</Button>
          <Button :disabled="saving || !text.trim()" @click="save">{{ saving ? 'Saving…' : 'Save' }}</Button>
        </template>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.np-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 720px) { .np-grid { grid-template-columns: 1fr; } }
.np-col { display: flex; flex-direction: column; gap: 8px; }
.np-vars { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.np-vars-label { font-size: 11px; color: var(--muted-foreground); }
.np-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.np-field { display: flex; flex-direction: column; gap: 4px; }
.np-preview {
  border: 1px dashed var(--border); border-radius: 10px;
  padding: 12px; background: var(--muted);
  color: var(--foreground); font-size: 14px; line-height: 1.55;
  min-height: 140px; white-space: pre-wrap;
}
.np-footer { display: flex; align-items: center; gap: 8px; width: 100%; }
.np-spacer { flex: 1; }

.np-sugg { margin-top: 18px; border-top: 1px solid var(--border); padding-top: 14px; }
.np-sugg-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.np-sugg-title { font-size: 14px; font-weight: 600; color: var(--foreground); }
.np-sugg-sub { font-size: 12px; color: var(--muted-foreground); margin-top: 2px; }
.np-sugg-empty { font-size: 13px; color: var(--muted-foreground); padding: 8px 0; }
.np-sugg-list { display: flex; flex-direction: column; gap: 8px; max-height: 280px; overflow-y: auto; }
.np-sugg-item {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; background: var(--background);
}
.np-sugg-text { display: flex; align-items: center; gap: 8px; min-width: 0; }
.np-sugg-prompt { font-size: 13px; color: var(--foreground); line-height: 1.45; }
</style>
