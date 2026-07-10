<script setup>
import { ref, watch } from 'vue'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, X, Save } from '@lucide/vue'

const props = defineProps({
  config: { type: Object, default: () => ({ brand_terms: [], negative_keywords: [] }) },
})
const emit = defineEmits(['save'])

const brandTerms = ref([...(props.config.brand_terms || [])])
const negativeKeywords = ref([...(props.config.negative_keywords || [])])
const newTerm = ref('')
const newNegative = ref('')

watch(() => props.config, (v) => {
  brandTerms.value = [...(v?.brand_terms || [])]
  negativeKeywords.value = [...(v?.negative_keywords || [])]
})

function addTerm() {
  const v = newTerm.value.trim()
  if (!v) return
  brandTerms.value.push(v)
  newTerm.value = ''
}
function removeTerm(i) { brandTerms.value.splice(i, 1) }
function addNegative() {
  const v = newNegative.value.trim()
  if (!v) return
  negativeKeywords.value.push(v)
  newNegative.value = ''
}
function removeNegative(i) { negativeKeywords.value.splice(i, 1) }
function submit() {
  emit('save', {
    brand_terms: brandTerms.value,
    negative_keywords: negativeKeywords.value,
  })
}
</script>

<template>
  <Card>
    <CardHeader>
      <div class="text-sm font-semibold">Monitoring configuration</div>
      <p class="text-xs text-muted-foreground">
        Brand terms drive every scan. Negative keywords are appended to SERP
        queries and LLM prompts to fish for risky content.
      </p>
    </CardHeader>
    <CardContent class="space-y-6">
      <div>
        <div class="mb-2 text-xs font-semibold uppercase text-muted-foreground">Brand terms</div>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="(t, i) in brandTerms" :key="t + i"
            class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
          >
            {{ t }}
            <button class="opacity-60 hover:opacity-100" @click="removeTerm(i)">
              <X class="size-3" />
            </button>
          </span>
        </div>
        <div class="mt-2 flex gap-2">
          <input
            v-model="newTerm"
            placeholder="Add a brand term or alias"
            class="flex-1 rounded border bg-background px-2 py-1 text-sm"
            @keydown.enter.prevent="addTerm"
          />
          <Button size="sm" variant="secondary" @click="addTerm">
            <Plus class="size-3.5" /> Add
          </Button>
        </div>
      </div>

      <div>
        <div class="mb-2 text-xs font-semibold uppercase text-muted-foreground">Negative keywords</div>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="(t, i) in negativeKeywords" :key="t + i"
            class="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700"
          >
            {{ t }}
            <button class="opacity-60 hover:opacity-100" @click="removeNegative(i)">
              <X class="size-3" />
            </button>
          </span>
        </div>
        <div class="mt-2 flex gap-2">
          <input
            v-model="newNegative"
            placeholder="scam, lawsuit, complaint..."
            class="flex-1 rounded border bg-background px-2 py-1 text-sm"
            @keydown.enter.prevent="addNegative"
          />
          <Button size="sm" variant="secondary" @click="addNegative">
            <Plus class="size-3.5" /> Add
          </Button>
        </div>
      </div>

      <div class="flex justify-end">
        <Button size="sm" @click="submit">
          <Save class="size-3.5" /> Save configuration
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
