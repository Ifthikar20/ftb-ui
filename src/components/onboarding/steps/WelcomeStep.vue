<template>
  <section class="ob-step ob-step--welcome">
    <div class="ob-stagger">
      <span class="ob-eyebrow">Step 1 of 4</span>
      <h1 class="ob-title" tabindex="-1">Let&rsquo;s set up your Cansee.</h1>
      <p class="ob-sub">
        We'll scan your website, draft how AI should describe you, and
        pick the competitors you're measured against. About two minutes —
        most of it automatic.
      </p>

      <ol class="ob-index">
        <li class="ob-index-item">
          <span class="ob-index-num">01</span>
          <span class="ob-index-label">Your website</span>
        </li>
        <li class="ob-index-item">
          <span class="ob-index-num">02</span>
          <span class="ob-index-label">Your story</span>
        </li>
        <li class="ob-index-item">
          <span class="ob-index-num">03</span>
          <span class="ob-index-label">Your rivals</span>
        </li>
      </ol>

      <div class="ob-step-actions ob-step-actions--start">
        <button type="button" class="ob-cta" @click="begin">
          <span>Let's begin</span>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 8h10M9 4l4 4-4 4"/>
          </svg>
        </button>
      </div>

      <div class="ob-hints">
        <span>No credit card required</span>
        <span class="ob-dot-sep">·</span>
        <span>Everything is editable later</span>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useOnboardingFlow } from '../useOnboardingFlow'

// No name in the greeting on purpose: full_name often defaults to the
// email prefix ("tester+123..."), which reads as a broken username.
// A quiet, generic welcome beats a wrong personal one.
const { begin } = useOnboardingFlow()
</script>
