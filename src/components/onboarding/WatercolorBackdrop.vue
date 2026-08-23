<template>
  <div class="wb" aria-hidden="true">
    <!-- Reduced motion: no <video> at all — the gradient below is the
         permanent surface. The same gradient is the instant loading
         state while the (auth-page-cached) video buffers. -->
    <video
      v-if="!reduceMotion"
      ref="videoRef"
      class="wb-video"
      :class="{ 'is-ready': ready }"
      autoplay
      muted
      loop
      playsinline
      preload="auto"
      disablepictureinpicture
      tabindex="-1"
      @canplay="ready = true"
    >
      <source :src="assetUrl(src)" type="video/mp4" />
    </video>
    <div class="wb-tint"></div>
  </div>
</template>

<script setup>
import { ref, watchEffect } from 'vue'
import { useDocumentVisibility, useMediaQuery } from '@vueuse/core'

import { assetUrl } from '@/utils/assetUrl'

defineProps({
  // Which watercolor plays. Onboarding uses the main film (cache-warm
  // from the auth pages); the paywall uses the second one.
  src: { type: String, default: '/videos/watercolor-main.mp4' },
})

const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
const visibility = useDocumentVisibility()
const videoRef = ref(null)
const ready = ref(false)

// Pause while the tab is hidden (a scan can run half a minute while the
// user tabs away); resume on return. play() may reject on autoplay
// policies — never let that throw.
watchEffect(() => {
  const v = videoRef.value
  if (!v) return
  if (visibility.value === 'hidden') v.pause()
  else v.play().catch(() => {})
})
</script>

<style scoped>
.wb {
  position: fixed;
  inset: 0;
  z-index: 0;
  /* Warm watercolor-adjacent wash: painted instantly, zero network. */
  background:
    radial-gradient(120% 90% at 20% 10%, #ffe8d6 0%, transparent 50%),
    radial-gradient(100% 80% at 85% 85%, #f5e0cf 0%, transparent 55%),
    linear-gradient(160deg, #fdf6ee 0%, #f3e6da 100%);
}
.wb-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 900ms ease;
}
.wb-video.is-ready {
  opacity: 1;
  /* Ken Burns drift: the paint slowly breathes even where the footage
     is calm. Transform-only, so it stays on the compositor. */
  animation: wb-drift 38s ease-in-out infinite alternate;
}
@keyframes wb-drift {
  from { transform: scale(1) translate(0, 0); }
  to   { transform: scale(1.07) translate(-1.2%, 1%); }
}
@media (prefers-reduced-motion: reduce) {
  .wb-video.is-ready { animation: none; }
}
.wb-tint {
  position: absolute;
  inset: 0;
  /* Darkest at top for the white topbar text, gentle at center where
     the card sits. */
  background: linear-gradient(
    180deg,
    rgba(10, 10, 10, 0.38) 0%,
    rgba(10, 10, 10, 0.14) 26%,
    rgba(10, 10, 10, 0.10) 62%,
    rgba(10, 10, 10, 0.28) 100%
  );
}
</style>
