<script setup>
import { ref, watch, computed } from 'vue'
import { Button } from '@/components/ui/button'
import promptLibrary from '@/api/promptLibrary'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  websiteId: { type: String, default: null },
  websiteName: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'saved'])

const toast = useToast()
const loading = ref(false)
const saving = ref(false)
const rows = ref([])  // [{name, value, source}]
const newName = ref('')
const newValue = ref('')

async function load() {
  if (!props.websiteId) {
    rows.value = []
    return
  }
  loading.value = true
  try {
    const { data } = await promptLibrary.getVariables(props.websiteId)
    const payload = data || {}
    const provenance = payload.provenance || []
    if (Array.isArray(provenance) && provenance.length) {
      rows.value = provenance.map(r => ({ name: r.name, value: r.value || '', source: r.source || 'user' }))
    } else {
      const vars = payload.variables || {}
      rows.value = Object.entries(vars).map(([k, v]) => ({ name: k, value: v, source: 'user' }))
    }
  } catch (e) {
    toast.error(e.displayMessage || 'Could not load variables.')
  } finally {
    loading.value = false
  }
}

watch(() => [props.modelValue, props.websiteId], ([open]) => {
  if (open) load()
}, { immediate: true })

function close() { emit('update:modelValue', false) }

function addRow() {
  const name = newName.value.trim()
  if (!name) return
  if (rows.value.some(r => r.name === name)) {
    toast.error('Variable already exists.')
    return
  }
  rows.value.push({ name, value: newValue.value, source: 'user' })
  newName.value = ''
  newValue.value = ''
}

function removeRow(name) {
  rows.value = rows.value.filter(r => r.name !== name || r.source === 'auto')
}

const userRows = computed(() => rows.value.filter(r => r.source !== 'auto'))
const autoRows = computed(() => rows.value.filter(r => r.source === 'auto'))

async function save() {
  if (!props.websiteId) return
  saving.value = true
  try {
    const out = {}
    for (const r of rows.value) {
      if (r.source === 'auto') continue
      if (r.value !== undefined && r.value !== null && String(r.value).length > 0) {
        out[r.name] = r.value
      }
    }
    await promptLibrary.updateVariables(props.websiteId, out)
    toast.success('Variables saved.')
    emit('saved', out)
    close()
  } catch (e) {
    toast.error(e.displayMessage || 'Could not save variables.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="slide-panel">
      <div v-if="modelValue" class="vp-overlay" @click.self="close">
        <aside class="vp-panel" role="dialog" aria-modal="true" aria-label="Edit variables">
          <header class="vp-header">
            <div>
              <div class="vp-eyebrow">Variables</div>
              <h3 class="vp-title">{{ websiteName || 'Your website' }}</h3>
            </div>
            <Button size="sm" :disabled="saving" @click="save">{{ saving ? 'Saving…' : 'Save' }}</Button>
          </header>

          <div class="vp-body">
            <div v-if="loading" class="vp-loading">Loading…</div>
            <template v-else>
              <section v-if="autoRows.length" class="vp-section">
                <h4 class="vp-section-title">Auto-derived</h4>
                <div v-for="r in autoRows" :key="'a-' + r.name" class="vp-row">
                  <input class="vp-input vp-name" :value="r.name" readonly />
                  <input class="vp-input" :value="r.value" readonly />
                  <span class="vp-tag">auto</span>
                </div>
              </section>

              <section class="vp-section">
                <h4 class="vp-section-title">Custom</h4>
                <div v-for="r in userRows" :key="'u-' + r.name" class="vp-row">
                  <input class="vp-input vp-name" :value="r.name" readonly />
                  <input class="vp-input" v-model="r.value" placeholder="Value" />
                  <button type="button" class="vp-remove" @click="removeRow(r.name)" aria-label="Remove">&times;</button>
                </div>
                <div class="vp-row">
                  <input class="vp-input vp-name" v-model="newName" placeholder="variable_name" />
                  <input class="vp-input" v-model="newValue" placeholder="Value" @keyup.enter="addRow" />
                  <Button variant="ghost" size="sm" @click="addRow">Add</Button>
                </div>
              </section>
            </template>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.vp-overlay {
  position: fixed; inset: 0;
  background: rgb(0 0 0 / 0.5);
  backdrop-filter: blur(4px);
  z-index: 200;
  display: flex; justify-content: flex-end;
}
.vp-panel {
  width: 420px; max-width: 100vw;
  height: 100%;
  background: var(--card);
  border-left: 1px solid var(--border);
  display: flex; flex-direction: column;
  box-shadow: -16px 0 40px rgba(0,0,0,0.12);
}
.vp-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px; border-bottom: 1px solid var(--border);
}
.vp-eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted-foreground); }
.vp-title { font-size: 16px; font-weight: 600; color: var(--foreground); margin: 2px 0 0; }
.vp-body { flex: 1; overflow-y: auto; padding: 16px 20px 24px; }
.vp-loading { font-size: 13px; color: var(--muted-foreground); }
.vp-section { margin-bottom: 18px; }
.vp-section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted-foreground); margin: 0 0 8px; }
.vp-row { display: grid; grid-template-columns: 130px 1fr auto; gap: 8px; align-items: center; margin-bottom: 6px; }
.vp-input {
  height: 32px; padding: 0 10px;
  border-radius: 8px; border: 1px solid var(--input);
  background: var(--background); color: var(--foreground);
  font-size: 12px; outline: none;
}
.vp-input:focus-visible { box-shadow: 0 0 0 2px var(--ring); }
.vp-name { font-family: ui-monospace, SFMono-Regular, monospace; }
.vp-tag {
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--muted-foreground); padding: 2px 8px; border-radius: 9999px;
  background: var(--muted); border: 1px solid var(--border);
}
.vp-remove {
  background: transparent; border: 1px solid var(--border); border-radius: 9999px;
  width: 26px; height: 26px; cursor: pointer; color: var(--muted-foreground);
}
.vp-remove:hover { color: var(--destructive); }
.slide-panel-enter-active, .slide-panel-leave-active { transition: opacity 200ms ease-out; }
.slide-panel-enter-from, .slide-panel-leave-to { opacity: 0; }
</style>
