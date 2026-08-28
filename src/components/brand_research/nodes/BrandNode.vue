<template>
  <div class="brand-node" :class="{ own: data.brand.is_own_brand }">
    <Handle type="target" :position="Position.Left" />
    <div
      class="bn-circle"
      :class="{ 'bn-neutral': fallbackStage === 1 }"
      :style="{
        width: `${data.size}px`,
        height: `${data.size}px`,
        borderColor: fallbackStage === 1 ? 'var(--border)' : data.color,
        background: fallbackStage === 1
          ? 'var(--muted)'
          : `color-mix(in srgb, ${data.color} 6%, var(--card))`,
      }"
    >
      <!-- Logo lookup chain: (0) Clearbit → (1) neutral monogram
           plaque. Google's s2/favicons was in the middle but it
           returns a generic globe / browser-tab icon for any domain
           it doesn't recognise, which read as a fake logo. Clearbit
           at least 404s cleanly when it can't identify the brand. -->
      <img
        v-if="fallbackStage === 0 && logoSrc"
        :src="logoSrc"
        :alt="data.brand.name"
        class="bn-logo"
        :style="{ width: `${data.size * 0.66}px`, height: `${data.size * 0.66}px` }"
        @error="fallbackStage = 1"
      />
      <span
        v-else
        class="bn-initials"
        :style="{ fontSize: `${Math.max(11, data.size / 4)}px` }"
      >
        {{ initials }}
      </span>
    </div>
    <div class="bn-name">{{ data.brand.name }}</div>
    <div class="bn-stats">
      <span :style="{ color: data.color }">{{ sentimentLabel }}</span>
      <span>{{ data.brand.mentions }} mentions</span>
    </div>
    <Handle type="source" :position="Position.Right" id="out" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Handle, Position } from '@vue-flow/core'

const props = defineProps({
  data: { type: Object, required: true },
})

// 0 = try Clearbit, 1 = give up and show neutral initials.
const fallbackStage = ref(0)

const domainGuess = computed(() => {
  const slug = (props.data.brand.name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
  return slug ? `${slug}.com` : null
})
const logoSrc = computed(() => {
  if (!domainGuess.value || fallbackStage.value !== 0) return null
  return `https://logo.clearbit.com/${domainGuess.value}`
})
const initials = computed(() =>
  (props.data.brand.name || '')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase(),
)
const sentimentLabel = computed(() => {
  const s = props.data.brand.sentiment || 0
  if (s > 0.25) return 'loved'
  if (s < -0.25) return 'criticized'
  return 'mixed'
})
</script>

<style scoped>
.brand-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 130px;
  animation: node-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes node-in {
  from { opacity: 0; transform: scale(0.6); }
  to { opacity: 1; transform: scale(1); }
}
.bn-circle {
  border: 1.5px solid;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s;
  overflow: hidden;
}
.bn-logo {
  object-fit: contain;
  border-radius: 50%;
  background: var(--card);
}
.brand-node:hover .bn-circle { transform: scale(1.07); }
.brand-node.own .bn-circle {
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 30%, transparent);
}
.bn-initials { font-weight: 800; color: var(--foreground); letter-spacing: 0.02em; }
.bn-neutral .bn-initials { color: var(--muted-foreground); }
.bn-name {
  margin-top: 6px;
  font-size: 11px;
  font-weight: 700;
  color: var(--foreground);
  text-align: center;
  line-height: 1.25;
  max-width: 130px;
}
.bn-stats {
  display: flex;
  gap: 7px;
  font-size: 9px;
  font-weight: 600;
  color: var(--muted-foreground);
  margin-top: 2px;
}
:deep(.vue-flow__handle) {
  width: 7px;
  height: 7px;
  background: var(--muted-foreground);
  border: 2px solid var(--card);
}
</style>
