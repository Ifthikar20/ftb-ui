<template>
  <section class="ob-step ob-step--scanning" aria-busy="true">
    <div class="ob-stagger">
      <!-- The user's own site in the scanner: favicon in a white core,
           two slow rings, one sweeping radar beam. Falls back to the
           original pulsing dot when the favicon 404s. -->
      <div class="ob-scanner" aria-hidden="true">
        <span class="ob-orbit-ring ob-orbit-r1"></span>
        <span class="ob-orbit-ring ob-orbit-r2"></span>
        <span class="ob-scan-sweep"></span>
        <span class="ob-scan-core">
          <img
            v-if="urlHostname && !faviconErr"
            :src="`https://www.google.com/s2/favicons?domain=${urlHostname}&sz=64`"
            alt=""
            width="28"
            height="28"
            @error="faviconErr = true"
          />
          <span v-else class="ob-scan-dot"></span>
        </span>
      </div>

      <h1 class="ob-title" tabindex="-1">Reading {{ urlHostname }}</h1>

      <ul class="ob-scan-list" aria-live="polite">
        <li
          v-for="(task, i) in scanTasks"
          :key="task"
          class="ob-scan-task"
          :class="{
            'is-done': i < scanPhase,
            'is-active': i === scanPhase,
          }"
        >
          <span class="ob-scan-task-icon">
            <svg
              v-if="i < scanPhase"
              class="ob-scan-check"
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 8.5l3.5 3.5L13 4.5"/>
            </svg>
            <span v-else-if="i === scanPhase" class="ob-spinner ob-scan-spinner" aria-hidden="true"></span>
            <span v-else class="ob-scan-pending"></span>
          </span>
          <span class="ob-scan-task-label">{{ task }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

import { useOnboardingFlow } from '../useOnboardingFlow'

const { urlHostname, scanPhase, scanTasks } = useOnboardingFlow()
const faviconErr = ref(false)
</script>
