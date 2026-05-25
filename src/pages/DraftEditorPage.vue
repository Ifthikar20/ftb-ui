<template>
  <div class="cs-page mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:px-12">
    <!-- Top bar -->
    <header class="mb-8 flex flex-wrap items-center gap-4">
      <Button variant="ghost" size="sm" class="rounded-full" @click="goBack">
        <ChevronLeft class="size-3.5" />
        Back
      </Button>
      <nav class="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <router-link :to="`/llm-ranking/${websiteId}/content`" class="hover:text-foreground">
          Content Studio
        </router-link>
        <span class="text-muted-foreground/50">/</span>
        <span class="truncate text-foreground">{{ briefHeadline }}</span>
      </nav>
      <div class="ml-auto text-xs text-muted-foreground">
        <span v-if="draft">Revision {{ draft.revision || 1 }} ·</span>
        <span>{{ savedLabel }}</span>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="grid gap-6 lg:grid-cols-[3fr,2fr]">
      <div class="h-[600px] animate-pulse rounded-2xl border border-border bg-card"></div>
      <div class="h-[600px] animate-pulse rounded-2xl border border-border bg-card"></div>
    </div>

    <div v-else-if="draft" class="grid gap-6 lg:grid-cols-[3fr,2fr]">
      <!-- LEFT: editor -->
      <section>
        <DraftEditor
          v-model:title="form.title"
          v-model:body="form.body"
        />
      </section>

      <!-- RIGHT: brief & guards -->
      <aside class="flex flex-col gap-4">
        <Card class="p-4">
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <GapTypeBadge v-if="brief?.gap_type" :gap="brief.gap_type" />
            <FormatBadge v-if="brief?.target_format" :format="brief.target_format" />
          </div>
          <h3 class="text-[15px] font-medium text-foreground">
            {{ brief?.headline || 'Brief' }}
          </h3>
          <p
            v-if="brief?.description"
            class="mt-2 text-sm leading-relaxed text-muted-foreground"
          >
            {{ brief.description }}
          </p>
        </Card>

        <Card class="p-4">
          <div class="mb-4">
            <QualityScoreBar :score="Number(draft.voice_score) || 0" label="Voice match" />
            <p v-if="draft.voice_notes" class="mt-1.5 text-xs text-muted-foreground">{{ draft.voice_notes }}</p>
          </div>
          <div>
            <QualityScoreBar :score="Number(draft.accuracy_score) || 0" label="Accuracy" />
            <p v-if="draft.accuracy_notes" class="mt-1.5 text-xs text-muted-foreground">{{ draft.accuracy_notes }}</p>
          </div>
        </Card>

        <Card class="p-4">
          <button
            type="button"
            class="flex w-full items-center justify-between text-left"
            @click="factsOpen = !factsOpen"
          >
            <span class="text-[13px] font-semibold text-foreground">
              Grounded facts ({{ groundedFactIds.length }})
            </span>
            <ChevronDown
              :class="['size-4 text-muted-foreground transition-transform', factsOpen ? 'rotate-180' : '']"
            />
          </button>
          <div v-if="factsOpen" class="mt-3 flex flex-col gap-2">
            <div
              v-if="!groundedFactIds.length"
              class="rounded-xl bg-muted px-4 py-3 text-xs text-muted-foreground"
            >
              No facts were attached to this draft.
            </div>
            <div
              v-for="id in groundedFactIds"
              :key="id"
              class="rounded-xl bg-muted px-4 py-2.5 text-xs text-muted-foreground"
            >
              <span class="font-mono text-[11px] text-muted-foreground/70">{{ String(id).slice(0, 8) }}</span>
              <span class="ml-2">grounded fact reference</span>
            </div>
          </div>
        </Card>

        <Button
          variant="outline"
          :disabled="regenerating"
          @click="regenerate"
        >
          {{ regenerating ? 'Regenerating...' : 'Regenerate draft' }}
        </Button>
      </aside>
    </div>

    <div v-else class="rounded-3xl border border-dashed border-border bg-card px-8 py-20 text-center text-muted-foreground">
      Draft not found.
    </div>

    <!-- Sticky footer action bar -->
    <div
      v-if="draft"
      class="sticky bottom-4 z-30 mt-8 flex flex-wrap items-center justify-end gap-2 rounded-full border border-border bg-card/95 px-4 py-2.5 shadow-md backdrop-blur"
    >
      <Button variant="ghost" :disabled="saving" @click="save">
        {{ saving ? 'Saving...' : 'Save draft' }}
      </Button>
      <Button
        variant="default"
        :disabled="approving || draft.status === 'approved'"
        @click="approve"
      >
        {{ draft.status === 'approved' ? 'Approved' : (approving ? 'Approving...' : 'Approve as publish content') }}
      </Button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import contentStudioApi from '@/api/contentStudio'
import DraftEditor from '@/components/content_studio/DraftEditor.vue'
import GapTypeBadge from '@/components/content_studio/GapTypeBadge.vue'
import FormatBadge from '@/components/content_studio/FormatBadge.vue'
import QualityScoreBar from '@/components/content_studio/QualityScoreBar.vue'
import { ChevronLeft, ChevronDown } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const websiteId = computed(() => route.params.websiteId)
const draftId = computed(() => route.params.draftId)

const loading = ref(true)
const saving = ref(false)
const approving = ref(false)
const regenerating = ref(false)
const lastSavedAt = ref(null)

const draft = ref(null)
const brief = ref(null)
const factsOpen = ref(false)

const form = reactive({ title: '', body: '' })

const briefHeadline = computed(() => brief.value?.headline || 'Draft')

const groundedFactIds = computed(() => brief.value?.grounded_fact_ids || [])

const savedLabel = computed(() => {
  if (saving.value) return 'saving...'
  if (!lastSavedAt.value) return 'unsaved changes'
  const diff = Math.round((Date.now() - lastSavedAt.value) / 60000)
  if (diff <= 0) return 'last saved just now'
  if (diff === 1) return 'last saved 1 min ago'
  return `last saved ${diff} min ago`
})

async function loadDraft() {
  loading.value = true
  try {
    const { data } = await contentStudioApi.draftDetail(draftId.value)
    const body = data?.data || data
    draft.value = body
    form.title = body?.title || ''
    form.body = body?.body_markdown || ''
    if (body?.brief) {
      try {
        const { data: bData } = await contentStudioApi.briefDetail(body.brief)
        brief.value = bData?.data || bData
      } catch {
        // soft fail
      }
    }
  } catch {
    draft.value = null
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!draft.value) return
  saving.value = true
  try {
    const { data } = await contentStudioApi.updateDraft(draft.value.id, {
      title: form.title,
      body_markdown: form.body,
    })
    const body = data?.data || data
    draft.value = body || draft.value
    lastSavedAt.value = Date.now()
    toast.success('Draft saved.')
  } catch {
    // handled
  } finally {
    saving.value = false
  }
}

async function approve() {
  approving.value = true
  try {
    // Save first to persist any edits.
    if (saving.value === false) {
      await contentStudioApi.updateDraft(draft.value.id, {
        title: form.title,
        body_markdown: form.body,
      })
    }
    const { data } = await contentStudioApi.approveDraft(draft.value.id)
    const body = data?.data || data
    draft.value = body || draft.value
    toast.success('Draft approved as publish content.')
  } catch {
    // handled
  } finally {
    approving.value = false
  }
}

async function regenerate() {
  if (!confirm('Regenerate this draft? Your unsaved edits will be replaced.')) return
  regenerating.value = true
  try {
    const { data } = await contentStudioApi.regenerateDraft(draft.value.id)
    const body = data?.data || data
    if (body?.id) {
      router.replace(`/llm-ranking/${websiteId.value}/content/drafts/${body.id}`)
      await loadDraft()
    }
    toast.success('A fresh draft is on the way.')
  } catch {
    // handled
  } finally {
    regenerating.value = false
  }
}

function goBack() {
  router.push(`/llm-ranking/${websiteId.value}/content`)
}

onMounted(() => {
  loadDraft()
})
</script>
