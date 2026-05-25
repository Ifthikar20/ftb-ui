<template>
  <div class="flex flex-col gap-4">
    <div>
      <h3 class="mb-1 text-[1.05rem] text-foreground">Tone of voice</h3>
      <p class="text-sm leading-relaxed text-muted-foreground">
        Real samples of your brand's writing. Content Studio reads these when
        generating drafts so the output sounds like you, not a generic LLM.
      </p>
    </div>

    <form class="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5" @submit.prevent="onAdd">
      <textarea
        v-model="text"
        rows="3"
        maxlength="4000"
        placeholder="Paste a paragraph from a blog post, sales email, or product page…"
        class="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div class="flex items-center justify-between">
        <span class="text-xs text-muted-foreground">{{ (text || '').length }} / 4000</span>
        <Button type="submit" size="sm" :disabled="!text.trim() || saving">
          {{ saving ? 'Saving…' : 'Add sample' }}
        </Button>
      </div>
    </form>

    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="i in 3" :key="i" class="h-[88px] animate-pulse rounded-xl border border-border bg-card" />
    </div>

    <div v-else-if="!samples.length" class="rounded-2xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
      <p>No tone samples yet. Add a paragraph above to teach the agents your voice.</p>
    </div>

    <ul v-else class="flex flex-col gap-2">
      <li v-for="sample in samples" :key="sample.id" class="rounded-xl border border-border bg-card px-4 py-3.5">
        <p class="mb-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{{ sample.text }}</p>
        <div class="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{{ sample.word_count || 0 }} words</span>
          <span>·</span>
          <span>{{ formatDate(sample.created_at) }}</span>
          <button class="ml-auto text-destructive hover:underline" type="button" @click="onRemove(sample)">Remove</button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useToast } from '@/composables/useToast'
import brandVaultApi from '@/api/brandVault'
import { Button } from '@/components/ui/button'

const props = defineProps({
  websiteId: { type: String, required: true },
  samples: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['refresh'])

const toast = useToast()
const text = ref('')
const saving = ref(false)

async function onAdd() {
  const t = text.value.trim()
  if (!t) return
  saving.value = true
  try {
    await brandVaultApi.addToneSample(props.websiteId, t)
    text.value = ''
    toast.success('Sample added.')
    emit('refresh')
  } catch (e) {
    toast.error(e.displayMessage || 'Could not add sample.')
  } finally {
    saving.value = false
  }
}

async function onRemove(sample) {
  try {
    await brandVaultApi.deleteToneSample(sample.id)
    toast.success('Sample removed.')
    emit('refresh')
  } catch (e) {
    toast.error(e.displayMessage || 'Could not remove sample.')
  }
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>
