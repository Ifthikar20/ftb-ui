<template>
  <div class="bm-page">
    <header class="bm-head">
      <div class="bm-eyebrow">
        <Target :size="12" :stroke-width="2" />
        <span>Scoring</span>
      </div>
      <h1 class="bm-title">Benchmark material</h1>
      <p class="bm-sub">
        Reference material — a URL or pasted notes — whose factual claims we extract to
        ground how AI answers are scored for this project. Kept separate from your prompts.
      </p>
    </header>

    <BenchmarkMaterial v-if="websiteId" :website-id="websiteId" />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Target } from '@lucide/vue'
import BenchmarkMaterial from '@/components/prompt_library/BenchmarkMaterial.vue'

const route = useRoute()
const websiteId = route.params.websiteId

onMounted(() => { document.title = 'Benchmarks — FetchBot' })
</script>

<style scoped>
.bm-page { padding: 32px 40px 56px; color: var(--foreground); }
.bm-head { margin-bottom: 24px; }
.bm-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  background: color-mix(in oklab, var(--primary) 10%, transparent);
  color: var(--primary);
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 12px;
}
.bm-title {
  margin: 0 0 6px;
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.bm-sub {
  margin: 0;
  max-width: 42rem;
  font-size: 0.9rem;
  color: var(--muted-foreground);
  line-height: 1.6;
}
</style>
