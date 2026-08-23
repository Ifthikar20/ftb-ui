<template>
  <div class="auth-layout">
    <!-- Left side: rounded video card with overlay copy and bottom-anchored logo. -->
    <div class="auth-right">
      <div class="auth-video-card">
        <video class="auth-video-bg" autoplay muted loop playsinline>
          <source :src="assetUrl('/videos/watercolor-main.mp4')" type="video/mp4" />
        </video>
        <div class="auth-video-tint"></div>

        <div class="auth-video-content">
          <div class="auth-video-top">
            <h1 class="auth-headline">
              <strong>MARKETING</strong><br/>
              INTELLIGENCE FOR<br/>
              <strong>AI SEARCH</strong>
            </h1>
            <p class="auth-tagline">
              FetchBot is how modern brands measure and shape their presence inside ChatGPT, Claude, Gemini, and Perplexity.
            </p>
            <span class="auth-version">v2.1</span>
          </div>

          <div class="auth-video-bottom">
            <ul class="auth-features">
              <li class="auth-feature">
                <span class="auth-feature-icon">
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="5"/><path d="M11 11l3 3" stroke-linecap="round"/></svg>
                </span>
                Prompt library
              </li>
              <li class="auth-feature">
                <span class="auth-feature-icon">
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="5" height="5" rx="1"/><rect x="9" y="3" width="5" height="5" rx="1"/><rect x="2" y="10" width="5" height="3" rx="1"/><rect x="9" y="10" width="5" height="3" rx="1"/></svg>
                </span>
                Multi-LLM probing
              </li>
              <li class="auth-feature">
                <span class="auth-feature-icon">
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><path d="M2 8h12M8 2v12" stroke-linecap="round"/></svg>
                </span>
                Source influence
              </li>
              <li class="auth-feature">
                <span class="auth-feature-icon">
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 2h7l3 3v9H3z"/><path d="M10 2v3h3M6 9h4M6 11h4" stroke-linecap="round"/></svg>
                </span>
                Content studio
              </li>
            </ul>

            <div class="auth-brand">
              <img src="/images/fb-logo.png" alt="FetchBot" class="auth-brand-mark" />
              <span class="brand-name">FetchBot</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right side: sign-in form. -->
    <div class="auth-left">
      <div class="auth-form-container">
        <div class="auth-form-header">
          <h2 class="auth-title">{{ title }}</h2>
          <p v-if="subtitle" class="auth-subtitle">{{ subtitle }}</p>
        </div>
        <slot />
      </div>
      <p class="auth-footer">
        © 2026 FetchBot ·
        <router-link class="auth-footer-link" to="/support">Support</router-link> ·
        <router-link class="auth-footer-link" to="/privacy">Privacy</router-link> ·
        <router-link class="auth-footer-link" to="/terms">Terms</router-link>
      </p>
      <!-- Internal-only backend build marker (deliberately near-invisible). -->
      <span v-if="apiBuild" class="auth-build" :title="apiCommit">{{ apiBuild }}</span>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import api from '@/api/client'
import { assetUrl } from '@/utils/assetUrl'

defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
})

// Backend build marker for the footer. Internal use: tells us which
// API build is live without opening the server. Stays empty (and the
// element unrendered) if the endpoint is unreachable. The commit hash
// goes into the title attribute so hovering the marker reveals it.
const apiBuild = ref('')
const apiCommit = ref('')

// Auth screens are light-only. Stash whatever theme the rest of the app
// was using and restore it on unmount so we don't surprise authenticated
// users when they navigate away.
let _previousTheme = null
onMounted(async () => {
  _previousTheme = document.documentElement.getAttribute('data-theme')
  document.documentElement.setAttribute('data-theme', 'light')

  try {
    const res = await api.get('/version/', { _silentError: true })
    const v = res.data || {}
    // Prefer the server-computed vMMDD-N label; fall back to the raw
    // commit hash if talking to an older backend without it.
    if (v.label) {
      apiBuild.value = v.label
      apiCommit.value = v.version || ''
    } else if (v.version) {
      apiBuild.value = `api ${v.version}`
    }
  } catch {
    // Version marker is cosmetic; never let it disturb the login page.
  }
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
  width: 720px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 56px 88px;
  position: relative;
}

.auth-form-container {
  width: 100%;
  max-width: 500px;
}

.auth-form-header {
  margin-bottom: 40px;
}

.auth-title {
  font-family: var(--font-display);
  font-size: clamp(2rem, 3vw, 2.6rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
  color: var(--foreground);
  margin-bottom: 10px;
}

.auth-subtitle {
  font-family: var(--font-display);
  font-size: 1.05rem;
  color: var(--muted-foreground);
}

.auth-footer {
  position: absolute;
  bottom: 24px;
  font-size: var(--font-xs);
  color: var(--muted-foreground);
}
.auth-footer-link {
  color: inherit;
  text-decoration: none;
  transition: color 0.15s;
}
.auth-footer-link:hover {
  color: var(--foreground);
  text-decoration: underline;
}

/* Internal backend build marker. Deliberately tiny and faint: it is
   for our own deploy tracking, not something users should notice. */
.auth-build {
  position: absolute;
  bottom: 6px;
  font-size: 9px;
  line-height: 1;
  letter-spacing: 0.02em;
  color: var(--muted-foreground);
  opacity: 0.45;
  user-select: none;
}

/* ── Right Panel — rounded video card ── */
.auth-right {
  flex: 1;
  display: flex;
  align-items: stretch;
  padding: 24px 0 24px 24px;
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
  flex-direction: column;
  align-items: flex-start;
  gap: 24px;
}

.auth-version {
  display: inline-block;
  margin-top: 18px;
  padding: 5px 14px;
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 999px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.auth-features {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 14px 28px;
}

.auth-feature {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
}

.auth-feature-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.95);
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
