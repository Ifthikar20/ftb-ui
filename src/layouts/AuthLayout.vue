<template>
  <div class="auth-layout">
    <!-- Sign-in form lives on the left, untouched. -->
    <div class="auth-left">
      <div class="auth-form-container">
        <div class="auth-form-header">
          <h2 class="auth-title">{{ title }}</h2>
          <p v-if="subtitle" class="auth-subtitle">{{ subtitle }}</p>
        </div>
        <slot />
      </div>
      <p class="auth-footer">© 2026 FetchBot · Privacy · Terms</p>
    </div>

    <!-- Right side: rounded video card with overlay copy and bottom-anchored logo. -->
    <div class="auth-right">
      <div class="auth-video-card">
        <video class="auth-video-bg" autoplay muted loop playsinline>
          <source src="/videos/watercolor-main.mp4" type="video/mp4" />
        </video>
        <div class="auth-video-tint"></div>

        <div class="auth-video-content">
          <div class="auth-video-top">
            <h1 class="auth-headline">
              THE LEADING <strong>AI</strong><br/>
              PLATFORM FOR<br/>
              <strong>BRAND VISIBILITY</strong>
            </h1>
            <p class="auth-tagline">
              FetchBot is how modern brands measure and shape their presence inside ChatGPT, Claude, Gemini, and Perplexity.
            </p>
          </div>

          <div class="auth-video-bottom">
            <div class="auth-brand">
              <img src="/images/fb-logo.png" alt="FetchBot" class="auth-brand-mark" />
              <span class="brand-name">FetchBot</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'

defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
})

// Auth screens are light-only. Stash whatever theme the rest of the app
// was using and restore it on unmount so we don't surprise authenticated
// users when they navigate away.
let _previousTheme = null
onMounted(() => {
  _previousTheme = document.documentElement.getAttribute('data-theme')
  document.documentElement.setAttribute('data-theme', 'light')
})
onUnmounted(() => {
  if (_previousTheme) {
    document.documentElement.setAttribute('data-theme', _previousTheme)
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
})
</script>

<style scoped>
.auth-layout {
  display: flex;
  min-height: 100vh;
  background: var(--card);
}

/* ── Left Panel — Sign-in form (unchanged) ── */
.auth-left {
  width: 640px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 56px 72px;
  position: relative;
}

.auth-form-container {
  width: 100%;
  max-width: 440px;
}

.auth-form-header {
  margin-bottom: 32px;
}

.auth-title {
  font-family: var(--font-display);
  font-size: var(--font-2xl);
  font-weight: 600;
  color: var(--foreground);
  margin-bottom: 8px;
}

.auth-subtitle {
  font-size: var(--font-base);
  color: var(--muted-foreground);
}

.auth-footer {
  position: absolute;
  bottom: 24px;
  font-size: var(--font-xs);
  color: var(--muted-foreground);
}

/* ── Right Panel — rounded video card ── */
.auth-right {
  flex: 1;
  display: flex;
  align-items: stretch;
  padding: 24px 24px 24px 0;
}

.auth-video-card {
  position: relative;
  flex: 1;
  border-radius: 24px;
  overflow: hidden;
  background: #1a1a2e;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 24px 60px rgba(15, 23, 42, 0.10);
}

.auth-video-bg {
  position: absolute;
  inset: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  z-index: 0;
}

.auth-video-tint {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.05) 0%,
    rgba(0, 0, 0, 0.25) 70%,
    rgba(0, 0, 0, 0.45) 100%
  );
  z-index: 1;
}

.auth-video-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  padding: 56px 56px 40px;
}

.auth-video-top {
  max-width: 640px;
}

.auth-headline {
  font-family: var(--font-display);
  font-size: clamp(2.4rem, 4.2vw, 3.6rem);
  font-weight: 400;
  line-height: 1.08;
  letter-spacing: -0.01em;
  color: #ffffff;
  margin: 0 0 24px;
  text-shadow: 0 2px 24px rgba(0, 0, 0, 0.25);
}

.auth-headline strong {
  font-weight: 800;
}

.auth-tagline {
  font-size: 16px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.88);
  max-width: 460px;
  margin: 0;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.2);
}

.auth-video-bottom {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.auth-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.auth-brand-mark {
  width: 28px;
  height: 28px;
  object-fit: contain;
  filter: brightness(0) invert(1);
}

.brand-name {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #ffffff;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.25);
}

/* ── Responsive ── */
@media (max-width: 980px) {
  .auth-layout { flex-direction: column; }
  .auth-left { width: 100%; padding: 48px 32px; order: 1; }
  .auth-right { padding: 0 16px 24px; order: 2; }
  .auth-video-card { min-height: 320px; }
  .auth-video-content { padding: 40px 32px 28px; }
}

@media (max-width: 640px) {
  .auth-right { display: none; }
}
</style>
