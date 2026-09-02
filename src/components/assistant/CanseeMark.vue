<!--
  The animated Cansee mark — a looping clip of floating_video_cansee.mp4,
  clipped to a circle, standing in for the flat purple gradient badge.

  Only the first LOOP_SECONDS of the film are used: it is the part that
  reads at 22px, and looping the whole thing would drift out of sync with
  itself across the several instances on a page.

  Decorative by definition (aria-hidden): the assistant's name sits next
  to it in text, so a screen reader loses nothing.
-->
<template>
  <!-- Class is ask-mark, not cansee-mark: the latter is already the
       sidebar brand <img>, and AppLayout applies a GLOBAL
       .cansee-mark { filter: brightness(0) invert(1) } to it, which
       would invert this video. -->
  <span class="ask-mark" :style="{ width: px, height: px }" aria-hidden="true">
    <!-- Reduced motion: no <video> at all. The gradient underneath is the
         permanent surface, matching the badge this replaced. -->
    <video
      v-if="!reduceMotion && !failed"
      ref="videoRef"
      class="ask-mark-video"
      :class="{ 'is-ready': ready }"
      autoplay
      muted
      loop
      playsinline
      preload="auto"
      disablepictureinpicture
      tabindex="-1"
      @canplay="ready = true"
      @timeupdate="onTimeUpdate"
      @error="failed = true"
    >
      <source :src="assetUrl(src)" type="video/mp4" />
    </video>
    <!-- Fallback surface: a still from the same film. Shown until the
         video paints, and permanently when motion is reduced or the file
         fails to load, so the mark is never an empty hole and never a
         different-looking placeholder. -->
    <img
      v-if="!ready || reduceMotion || failed"
      class="ask-mark-fallback"
      :src="assetUrl(poster)"
      alt=""
    />
  </span>
</template>

<script setup>
import { computed, ref, watchEffect } from 'vue'
import { useDocumentVisibility, useMediaQuery } from '@vueuse/core'

import { assetUrl } from '@/utils/assetUrl'

const props = defineProps({
  size: { type: Number, default: 22 },
  src: { type: String, default: '/videos/floating_video_cansee.mp4' },
  poster: {
    type: String,
    default: '/images/fallbackimages/fall-back-image-cansee-ai.jpg',
  },
})

// Only the opening seconds are used as the mark.
const LOOP_SECONDS = 5

const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
const visibility = useDocumentVisibility()
const videoRef = ref(null)
const ready = ref(false)
const failed = ref(false)

const px = computed(() => `${props.size}px`)

// `loop` restarts at the end of the file; this restarts at the end of the
// excerpt. Seeking on every tick would stutter, so only when we pass it.
function onTimeUpdate(e) {
  const v = e.target
  if (v.currentTime >= LOOP_SECONDS) v.currentTime = 0
}

// Pause while the tab is hidden — several of these can be on screen at
// once and there is no reason to decode any of them in the background.
// play() may reject under autoplay policies; never let that throw.
watchEffect(() => {
  const v = videoRef.value
  if (!v) return
  if (visibility.value === 'hidden') v.pause()
  else v.play().catch(() => {})
})
</script>

<style scoped>
.ask-mark {
  position: relative;
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  /* Neutral until the still or the film paints. No purple gradient: the
     mark should only ever look like the artwork. */
  background: var(--muted);
}
.ask-mark-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 400ms ease;
}
.ask-mark-video.is-ready { opacity: 1; }
.ask-mark-fallback {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
