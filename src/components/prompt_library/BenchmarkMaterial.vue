<template>
  <section class="bm">
    <header class="bm-head">
      <div>
        <h2 class="bm-title">Benchmark material</h2>
        <p class="bm-sub">
          Ground truth for scoring LLM answers. Add pages, docs, or notes
          about what makes your product distinct — we extract atomic
          claims and, when a prompt runs, check each provider's response
          against them.
        </p>
      </div>
    </header>

    <!-- Add form -->
    <div class="bm-add">
      <div class="bm-add-tabs">
        <button
          type="button"
          class="bm-add-tab"
          :class="{ active: addMode === 'url' }"
          @click="addMode = 'url'"
        >Add URL</button>
        <button
          type="button"
          class="bm-add-tab"
          :class="{ active: addMode === 'markdown' }"
          @click="addMode = 'markdown'"
        >Add Markdown</button>
      </div>

      <div v-if="addMode === 'url'" class="bm-add-row">
        <input
          v-model.trim="urlInput"
          type="url"
          placeholder="https://your-site.com/product/reader"
          class="bm-input"
          :disabled="submitting"
          @keydown.enter="submit"
        />
        <button class="bm-btn" :disabled="!canSubmit" @click="submit">
          {{ submitting ? 'Extracting…' : 'Add' }}
        </button>
      </div>

      <div v-else class="bm-add-md">
        <input
          v-model.trim="mdLabel"
          type="text"
          placeholder="Label (e.g. Product one-pager)"
          class="bm-input"
          :disabled="submitting"
        />
        <textarea
          v-model="mdInput"
          placeholder="Paste markdown or notes about your product…"
          class="bm-textarea"
          rows="6"
          :disabled="submitting"
        />
        <button class="bm-btn" :disabled="!canSubmit" @click="submit">
          {{ submitting ? 'Extracting…' : 'Add markdown' }}
        </button>
      </div>

      <p v-if="lastError" class="bm-error">{{ lastError }}</p>
    </div>

    <!-- Pack list -->
    <div v-if="loading" class="bm-loading">Loading…</div>
    <div v-else-if="!packs.length" class="bm-empty">
      No benchmark material yet. Add a URL or paste some markdown above.
    </div>
    <div v-else class="bm-packs">
      <article v-for="p in packs" :key="p.id" class="bm-pack">
        <header class="bm-pack-head">
          <div class="bm-pack-title-row">
            <span class="bm-pack-kind">{{ p.source_kind === 'url' ? 'URL' : 'MD' }}</span>
            <a
              v-if="p.source_kind === 'url'"
              :href="p.url"
              target="_blank"
              rel="noopener"
              class="bm-pack-label"
            >{{ p.label }}</a>
            <span v-else class="bm-pack-label">{{ p.label }}</span>
            <span class="bm-pack-status" :class="`is-${p.status}`">{{ p.status }}</span>
          </div>
          <button
            class="bm-pack-del"
            aria-label="Delete pack"
            :disabled="deleting === p.id"
            @click="del(p)"
          >×</button>
        </header>
        <p v-if="p.extraction_error" class="bm-pack-err">{{ p.extraction_error }}</p>
        <ul v-else-if="(p.claims || []).length" class="bm-claims">
          <li v-for="c in p.claims" :key="c.id" class="bm-claim">
            <span class="bm-claim-cat" :data-cat="c.category">{{ c.category }}</span>
            <span class="bm-claim-text">{{ c.text }}</span>
          </li>
        </ul>
        <p v-else class="bm-pack-note">No claims extracted.</p>
      </article>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import promptLibrary from '@/api/promptLibrary'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  websiteId: { type: String, required: true },
})

const toast = useToast()

const addMode = ref('url')
const urlInput = ref('')
const mdInput = ref('')
const mdLabel = ref('')
const submitting = ref(false)
const lastError = ref('')

const packs = ref([])
const loading = ref(false)
const deleting = ref(null)

const canSubmit = computed(() => {
  if (submitting.value || !props.websiteId) return false
  if (addMode.value === 'url') return /^https?:\/\/\S+/.test(urlInput.value)
  return mdInput.value.trim().length > 0
})

async function load() {
  if (!props.websiteId) return
  loading.value = true
  try {
    const { data } = await promptLibrary.listBenchmarks(props.websiteId)
    packs.value = data?.packs || data?.data?.packs || []
  } catch (e) {
    lastError.value = e?.response?.data?.error || 'Failed to load benchmarks.'
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!canSubmit.value) return
  submitting.value = true
  lastError.value = ''
  try {
    const payload = addMode.value === 'url'
      ? { source_kind: 'url', url: urlInput.value, label: urlInput.value }
      : { source_kind: 'markdown', label: mdLabel.value || 'Markdown pack', markdown_content: mdInput.value }
    const { data } = await promptLibrary.createBenchmark(props.websiteId, payload)
    const pack = data?.data || data
    packs.value = [pack, ...packs.value]
    if (pack.status === 'failed') {
      lastError.value = pack.extraction_error || 'Extraction failed.'
    } else {
      toast.success(`Added ${(pack.claims || []).length} claims from ${pack.label}`)
      urlInput.value = ''
      mdInput.value = ''
      mdLabel.value = ''
    }
  } catch (e) {
    lastError.value = e?.response?.data?.error || 'Failed to add benchmark.'
  } finally {
    submitting.value = false
  }
}

async function del(pack) {
  if (!confirm(`Remove "${pack.label}"?`)) return
  deleting.value = pack.id
  try {
    await promptLibrary.deleteBenchmark(props.websiteId, pack.id)
    packs.value = packs.value.filter(x => x.id !== pack.id)
  } catch (e) {
    toast.error(e?.response?.data?.error || 'Delete failed.')
  } finally {
    deleting.value = null
  }
}

onMounted(load)
watch(() => props.websiteId, load)
</script>

<style scoped>
.bm {
  border: 1px solid var(--border);
  background: var(--card);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.bm-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.bm-title { font-size: 14px; font-weight: 800; color: var(--foreground); margin: 0; }
.bm-sub { margin: 4px 0 0; font-size: 11.5px; color: var(--muted-foreground); max-width: 640px; line-height: 1.5; }

.bm-add { background: var(--muted); border-radius: 10px; padding: 10px; }
.bm-add-tabs { display: flex; gap: 4px; margin-bottom: 8px; }
.bm-add-tab {
  font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px;
  color: var(--muted-foreground); background: transparent; border: 1px solid transparent;
  cursor: pointer; transition: background 0.12s;
}
.bm-add-tab:hover { background: var(--card); }
.bm-add-tab.active { background: var(--card); color: var(--foreground); border-color: var(--border); }

.bm-add-row { display: flex; gap: 6px; }
.bm-add-md { display: flex; flex-direction: column; gap: 6px; }
.bm-input {
  flex: 1; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border);
  background: var(--card); color: var(--foreground); font-size: 12.5px;
}
.bm-input:focus { outline: 2px solid var(--primary); outline-offset: -1px; }
.bm-textarea {
  padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border);
  background: var(--card); color: var(--foreground); font-size: 12px;
  font-family: ui-monospace, monospace; resize: vertical;
}
.bm-btn {
  padding: 6px 14px; border-radius: 6px; background: var(--primary); color: var(--primary-foreground);
  font-size: 12px; font-weight: 700; border: none; cursor: pointer;
  transition: opacity 0.12s;
}
.bm-btn:hover:not(:disabled) { opacity: 0.9; }
.bm-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.bm-error { margin: 4px 0 0; font-size: 11px; color: var(--destructive); }

.bm-loading, .bm-empty {
  font-size: 12px; color: var(--muted-foreground); padding: 12px 0; text-align: center;
  font-style: italic;
}

.bm-packs { display: flex; flex-direction: column; gap: 8px; }
.bm-pack {
  border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px;
  background: var(--card);
}
.bm-pack-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.bm-pack-title-row { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.bm-pack-kind {
  font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em;
  padding: 2px 6px; border-radius: 4px; background: var(--muted); color: var(--muted-foreground);
}
.bm-pack-label {
  font-size: 12.5px; font-weight: 700; color: var(--foreground);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;
}
a.bm-pack-label:hover { color: var(--primary); text-decoration: underline; }
.bm-pack-status {
  font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
  padding: 2px 7px; border-radius: 999px;
}
.bm-pack-status.is-ready { background: color-mix(in srgb, var(--chart-2) 15%, transparent); color: var(--chart-2); }
.bm-pack-status.is-failed { background: color-mix(in srgb, var(--destructive) 15%, transparent); color: var(--destructive); }
.bm-pack-status.is-pending, .bm-pack-status.is-extracting {
  background: color-mix(in srgb, var(--primary) 15%, transparent); color: var(--primary);
}
.bm-pack-del {
  background: transparent; border: none; color: var(--muted-foreground); cursor: pointer;
  font-size: 14px; padding: 2px 6px; border-radius: 4px;
}
.bm-pack-del:hover { background: var(--muted); color: var(--destructive); }
.bm-pack-err { margin: 6px 0 0; font-size: 11px; color: var(--destructive); }
.bm-pack-note { margin: 6px 0 0; font-size: 11px; color: var(--muted-foreground); font-style: italic; }

.bm-claims { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.bm-claim { display: flex; align-items: baseline; gap: 8px; font-size: 12px; line-height: 1.4; }
.bm-claim-cat {
  font-size: 8.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;
  padding: 2px 6px; border-radius: 4px; min-width: 62px; text-align: center;
  background: var(--muted); color: var(--muted-foreground);
}
.bm-claim-cat[data-cat="product"] { background: color-mix(in srgb, var(--chart-1) 18%, transparent); color: var(--chart-1); }
.bm-claim-cat[data-cat="customer"] { background: color-mix(in srgb, var(--chart-2) 18%, transparent); color: var(--chart-2); }
.bm-claim-cat[data-cat="pricing"] { background: color-mix(in srgb, var(--chart-4) 18%, transparent); color: var(--chart-4); }
.bm-claim-cat[data-cat="feature"] { background: color-mix(in srgb, var(--primary) 15%, transparent); color: var(--primary); }
.bm-claim-cat[data-cat="proof"] { background: color-mix(in srgb, var(--chart-3) 18%, transparent); color: var(--chart-3); }
.bm-claim-text { color: var(--foreground); }
</style>
