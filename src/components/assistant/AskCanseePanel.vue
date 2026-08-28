<template>
  <Teleport to="body">
    <Transition name="ask-fade">
      <div v-if="store.isOpen" class="ask-scrim" @click="store.close()"></div>
    </Transition>
    <Transition name="ask-slide">
      <aside
        v-if="store.isOpen"
        class="ask-panel"
        role="dialog"
        aria-label="Ask Cansee"
        @keydown.esc="store.close()"
      >
        <!-- Header -->
        <header class="ask-head">
          <div class="ask-brand">
            <span class="ask-avatar" aria-hidden="true">
              <Sparkles :size="16" :stroke-width="2" />
            </span>
            <div class="ask-brand-text">
              <span class="ask-title">Ask Cansee</span>
              <span class="ask-sub">{{ websiteName || 'Your workspace' }}</span>
            </div>
          </div>
          <div class="ask-head-actions">
            <button
              v-if="store.messages.length"
              type="button"
              class="ask-icon-btn"
              title="New chat"
              @click="store.reset()"
            ><SquarePen :size="16" :stroke-width="1.9" /></button>
            <button type="button" class="ask-icon-btn" title="Close" @click="store.close()">
              <X :size="17" :stroke-width="1.9" />
            </button>
          </div>
        </header>

        <!-- Body -->
        <div ref="bodyEl" class="ask-body">
          <!-- Maintenance state (entitlement flag off) -->
          <div v-if="!store.enabled" class="ask-empty">
            <span class="ask-empty-avatar is-maintenance" aria-hidden="true">
              <Wrench :size="22" :stroke-width="1.8" />
            </span>
            <h3 class="ask-empty-title">Temporarily unavailable</h3>
            <p class="ask-empty-sub">
              {{ store.maintenanceMessage || 'Ask Cansee is offline for maintenance. It will be back shortly.' }}
            </p>
          </div>

          <!-- Empty state -->
          <div v-else-if="!store.messages.length && !pending" class="ask-empty">
            <span class="ask-empty-avatar" aria-hidden="true">
              <Sparkles :size="22" :stroke-width="1.8" />
            </span>
            <h3 class="ask-empty-title">Ask anything about your data</h3>
            <p class="ask-empty-sub">
              Traffic, AI-search visibility, brand security, saved prompts —
              grounded in your own numbers.
            </p>
            <div class="ask-suggestions">
              <button
                v-for="s in suggestions"
                :key="s"
                type="button"
                class="ask-chip"
                :disabled="!canAsk"
                @click="sendText(s)"
              >{{ s }}</button>
            </div>
            <p v-if="!canAsk" class="ask-note">
              Select a website first to start asking.
            </p>
          </div>

          <!-- Messages -->
          <div
            v-for="(m, i) in store.messages"
            :key="i"
            class="msg"
            :class="m.role"
          >
            <span v-if="m.role === 'assistant'" class="msg-avatar" aria-hidden="true">
              <Sparkles :size="13" :stroke-width="2" />
            </span>
            <div class="bubble" :class="{ 'is-error': m.error }">
              <div
                v-if="m.role === 'assistant'"
                class="md"
                v-html="render(m.content)"
              ></div>
              <template v-else>{{ m.content }}</template>
              <span v-if="m.streaming" class="caret" aria-hidden="true"></span>
            </div>
          </div>

          <!-- Typing indicator -->
          <div v-if="pending" class="msg assistant">
            <span class="msg-avatar" aria-hidden="true">
              <Sparkles :size="13" :stroke-width="2" />
            </span>
            <div class="bubble typing" aria-label="Cansee is typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>

        <!-- Composer (hidden entirely while the feature is off) -->
        <div v-if="store.enabled" class="ask-composer">
          <div class="composer-box" :class="{ 'is-disabled': !canAsk }">
            <textarea
              ref="inputEl"
              v-model="draft"
              class="composer-input"
              :placeholder="canAsk ? 'Ask Cansee about your data…' : 'Select a website to begin'"
              rows="1"
              :disabled="!canAsk || pending"
              @input="autoGrow"
              @keydown="onKeydown"
            ></textarea>
            <button
              type="button"
              class="composer-send"
              :disabled="!draft.trim() || pending || !canAsk"
              title="Send"
              @click="send()"
            >
              <ArrowUp :size="17" :stroke-width="2.2" />
            </button>
          </div>
          <p class="composer-hint">Cansee can be wrong — check important numbers.</p>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { Sparkles, X, SquarePen, ArrowUp, Wrench } from '@lucide/vue'

import { useAppStore } from '@/stores/app'
import { useAssistantStore } from '@/stores/assistant'
import assistantApi from '@/api/assistant'
import { renderMarkdown } from '@/utils/markdown'

const store = useAssistantStore()
const appStore = useAppStore()

const draft = ref('')
const pending = ref(false)
const bodyEl = ref(null)
const inputEl = ref(null)

const websiteId = computed(() => appStore.activeWebsite?.id || null)
const websiteName = computed(() => appStore.activeWebsite?.name || '')
const canAsk = computed(() => !!websiteId.value)

const reduceMotion = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const suggestions = [
  'Summarize my traffic today',
  'How is my AI visibility trending?',
  'Any brand-security issues?',
  'What are my most recent prompts?',
]

function render(text) { return renderMarkdown(text) }

function scrollToBottom() {
  nextTick(() => {
    const el = bodyEl.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

function autoGrow() {
  const el = inputEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

function revealAnswer(msg, full) {
  if (reduceMotion || full.length < 40) {
    msg.content = full
    msg.streaming = false
    scrollToBottom()
    return
  }
  let idx = 0
  const step = Math.max(2, Math.ceil(full.length / 220)) // finish in ~1s
  const timer = setInterval(() => {
    idx = Math.min(full.length, idx + step)
    msg.content = full.slice(0, idx)
    scrollToBottom()
    if (idx >= full.length) {
      clearInterval(timer)
      msg.streaming = false
    }
  }, 14)
}

function friendlyError(e) {
  const code = e?.response?.status
  if (code === 429) return "You're asking a lot very fast — give it a few seconds and try again."
  if (code === 503) {
    // Feature switched off server-side mid-session: flip the UI to
    // maintenance so the composer disappears too.
    const msg = e?.response?.data?.error?.message
      || 'Ask Cansee is temporarily unavailable.'
    store.markDisabled(msg)
    return msg
  }
  return e?.displayMessage || "I couldn't reach the assistant just now. Please try again."
}

async function sendText(text) {
  draft.value = text
  await nextTick()
  send()
}

async function send() {
  const q = draft.value.trim()
  if (!q || pending.value || !canAsk.value || !store.enabled) return

  store.messages.push({ role: 'user', content: q })
  draft.value = ''
  autoGrow()
  scrollToBottom()

  // History = prior turns (exclude the message we just added).
  const history = store.messages
    .slice(0, -1)
    .slice(-8)
    .map(m => ({ role: m.role, content: m.content }))

  pending.value = true
  try {
    const res = await assistantApi.ask(websiteId.value, q, history)
    const answer = res?.data?.answer || "I don't have an answer for that yet."
    pending.value = false
    store.messages.push({ role: 'assistant', content: '', streaming: true })
    // Re-read the pushed element: mutating the local object wouldn't be
    // reactive — Vue tracks the proxy stored in the array, not our ref.
    const msg = store.messages[store.messages.length - 1]
    revealAnswer(msg, answer)
  } catch (e) {
    pending.value = false
    store.messages.push({ role: 'assistant', content: friendlyError(e), error: true })
    scrollToBottom()
  }
}

// Focus the input when the panel opens.
watch(() => store.isOpen, (open) => {
  if (open) nextTick(() => inputEl.value?.focus())
})
</script>

<style scoped>
.ask-scrim {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(10, 12, 20, 0.28);
  backdrop-filter: blur(2px);
}
.ask-panel {
  --ai-1: #6d5efc;
  --ai-2: #9b6bff;
  position: fixed;
  top: 0;
  right: 0;
  z-index: 61;
  height: 100dvh;
  width: min(440px, 100vw);
  display: flex;
  flex-direction: column;
  background: var(--background, #fff);
  color: var(--foreground, #0a0a0a);
  border-left: 1px solid var(--border, rgba(10, 10, 10, 0.1));
  box-shadow: -24px 0 60px rgba(10, 12, 20, 0.16);
}

/* Header */
.ask-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border, rgba(10, 10, 10, 0.08));
}
.ask-brand { display: flex; align-items: center; gap: 11px; min-width: 0; }
.ask-avatar {
  width: 32px; height: 32px; border-radius: 10px;
  display: grid; place-items: center; color: #fff; flex-shrink: 0;
  background: linear-gradient(135deg, var(--ai-1), var(--ai-2));
  box-shadow: 0 4px 14px rgba(109, 94, 252, 0.35);
}
.ask-brand-text { display: flex; flex-direction: column; line-height: 1.2; min-width: 0; }
.ask-title { font-weight: 650; font-size: 14.5px; letter-spacing: -0.01em; }
.ask-sub {
  font-size: 12px; color: var(--muted-foreground, #6b7280);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ask-head-actions { display: flex; align-items: center; gap: 4px; }
.ask-icon-btn {
  display: grid; place-items: center;
  width: 32px; height: 32px; border-radius: 8px;
  border: none; background: transparent; cursor: pointer;
  color: var(--muted-foreground, #6b7280);
  transition: background 0.15s, color 0.15s;
}
.ask-icon-btn:hover { background: var(--muted, #f3f4f6); color: var(--foreground, #0a0a0a); }

/* Body */
.ask-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  scroll-behavior: smooth;
}

/* Empty state */
.ask-empty {
  margin: auto 0;
  text-align: center;
  padding: 20px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.ask-empty-avatar {
  width: 52px; height: 52px; border-radius: 16px;
  display: grid; place-items: center; color: #fff; margin-bottom: 16px;
  background: linear-gradient(135deg, var(--ai-1), var(--ai-2));
  box-shadow: 0 10px 28px rgba(109, 94, 252, 0.32);
}
/* Maintenance uses a neutral amber, not the AI gradient - it should read
   as "paused", not as a feature. */
.ask-empty-avatar.is-maintenance {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  box-shadow: 0 10px 28px rgba(217, 119, 6, 0.28);
}
.ask-empty-title { margin: 0 0 6px; font-size: 17px; font-weight: 650; letter-spacing: -0.01em; }
.ask-empty-sub {
  margin: 0 0 20px; font-size: 13.5px; line-height: 1.55;
  color: var(--muted-foreground, #6b7280); max-width: 32ch;
}
.ask-suggestions { display: flex; flex-direction: column; gap: 8px; width: 100%; }
.ask-chip {
  text-align: left;
  padding: 11px 14px;
  border-radius: 12px;
  border: 1px solid var(--border, rgba(10, 10, 10, 0.1));
  background: var(--card, #fff);
  color: var(--foreground, #0a0a0a);
  font: inherit; font-size: 13px; cursor: pointer;
  transition: border-color 0.18s, transform 0.18s, background 0.18s;
}
.ask-chip:hover:not(:disabled) {
  border-color: var(--ai-1);
  transform: translateY(-1px);
  background: color-mix(in srgb, var(--ai-1) 5%, transparent);
}
.ask-chip:disabled { opacity: 0.5; cursor: not-allowed; }
.ask-note { margin: 14px 0 0; font-size: 12px; color: var(--muted-foreground, #6b7280); }

/* Messages */
.msg { display: flex; gap: 9px; align-items: flex-start; max-width: 100%; }
.msg.user { justify-content: flex-end; }
.msg-avatar {
  width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0; margin-top: 2px;
  display: grid; place-items: center; color: #fff;
  background: linear-gradient(135deg, var(--ai-1), var(--ai-2));
}
.bubble {
  max-width: 86%;
  padding: 10px 13px;
  border-radius: 14px;
  font-size: 13.5px;
  line-height: 1.55;
  word-wrap: break-word;
  overflow-wrap: anywhere;
}
.msg.user .bubble {
  background: var(--primary, #1e1e1e);
  color: var(--primary-foreground, #fff);
  border-bottom-right-radius: 5px;
}
.msg.assistant .bubble {
  background: var(--muted, #f4f4f5);
  color: var(--foreground, #0a0a0a);
  border-bottom-left-radius: 5px;
}
.bubble.is-error {
  background: color-mix(in srgb, #ef4444 10%, transparent);
  color: #b91c1c;
}
.caret {
  display: inline-block; width: 7px; height: 14px; margin-left: 1px;
  background: var(--ai-1); border-radius: 1px; vertical-align: -2px;
  animation: ask-blink 1s steps(2) infinite;
}
@keyframes ask-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

/* Typing dots */
.bubble.typing { display: inline-flex; gap: 4px; align-items: center; padding: 13px 14px; }
.bubble.typing span {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--muted-foreground, #9ca3af);
  animation: ask-bounce 1.2s infinite ease-in-out;
}
.bubble.typing span:nth-child(2) { animation-delay: 0.15s; }
.bubble.typing span:nth-child(3) { animation-delay: 0.3s; }
@keyframes ask-bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
  40% { transform: translateY(-4px); opacity: 1; }
}

/* Markdown typography */
.md :deep(p) { margin: 0 0 8px; }
.md :deep(p:last-child) { margin-bottom: 0; }
.md :deep(h3) { font-size: 14.5px; font-weight: 650; margin: 10px 0 6px; }
.md :deep(h4), .md :deep(h5), .md :deep(h6) { font-size: 13.5px; font-weight: 650; margin: 8px 0 4px; }
.md :deep(ul), .md :deep(ol) { margin: 4px 0 8px; padding-left: 20px; }
.md :deep(li) { margin: 2px 0; }
.md :deep(strong) { font-weight: 650; }
.md :deep(a) { color: var(--ai-1); text-decoration: underline; text-underline-offset: 2px; }
.md :deep(code) {
  font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 12px;
  background: rgba(10, 12, 20, 0.06); padding: 1px 5px; border-radius: 5px;
}
.md :deep(pre) {
  background: #0e1116; color: #e6e9ef; padding: 12px 14px; border-radius: 10px;
  overflow-x: auto; margin: 6px 0 8px;
}
.md :deep(pre code) { background: none; padding: 0; font-size: 12px; color: inherit; }
.md :deep(blockquote) {
  margin: 6px 0; padding: 4px 12px; border-left: 3px solid var(--border, #e5e7eb);
  color: var(--muted-foreground, #6b7280);
}
.md :deep(hr) { border: none; border-top: 1px solid var(--border, #e5e7eb); margin: 10px 0; }
.md :deep(.md-table-wrap) { overflow-x: auto; margin: 6px 0 8px; }
.md :deep(table) { border-collapse: collapse; font-size: 12.5px; width: 100%; }
.md :deep(th), .md :deep(td) {
  border: 1px solid var(--border, #e5e7eb); padding: 5px 9px; text-align: left;
}
.md :deep(th) { background: var(--muted, #f4f4f5); font-weight: 600; }

/* Composer */
.ask-composer { padding: 12px 14px 14px; border-top: 1px solid var(--border, rgba(10, 10, 10, 0.08)); }
.composer-box {
  display: flex; align-items: flex-end; gap: 8px;
  border: 1px solid var(--border, rgba(10, 10, 10, 0.14));
  border-radius: 16px;
  padding: 6px 6px 6px 14px;
  background: var(--card, #fff);
  transition: border-color 0.18s, box-shadow 0.18s;
}
.composer-box:focus-within {
  border-color: var(--ai-1);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ai-1) 15%, transparent);
}
.composer-box.is-disabled { opacity: 0.7; }
.composer-input {
  flex: 1; border: none; outline: none; resize: none; background: transparent;
  font: inherit; font-size: 13.5px; line-height: 1.5; color: var(--foreground, #0a0a0a);
  max-height: 160px; padding: 6px 0;
}
.composer-input::placeholder { color: var(--muted-foreground, #9ca3af); }
.composer-send {
  flex-shrink: 0; width: 34px; height: 34px; border-radius: 11px; border: none;
  display: grid; place-items: center; cursor: pointer; color: #fff;
  background: linear-gradient(135deg, var(--ai-1), var(--ai-2));
  transition: transform 0.15s, opacity 0.15s, box-shadow 0.15s;
}
.composer-send:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(109, 94, 252, 0.4);
}
.composer-send:disabled { opacity: 0.4; cursor: not-allowed; background: var(--muted-foreground, #9ca3af); }
.composer-hint { margin: 8px 2px 0; font-size: 11px; text-align: center; color: var(--muted-foreground, #9ca3af); }

/* Transitions */
.ask-fade-enter-active, .ask-fade-leave-active { transition: opacity 0.25s ease; }
.ask-fade-enter-from, .ask-fade-leave-to { opacity: 0; }
.ask-slide-enter-active { transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1); }
.ask-slide-leave-active { transition: transform 0.26s cubic-bezier(0.4, 0, 1, 1); }
.ask-slide-enter-from, .ask-slide-leave-to { transform: translateX(100%); }

@media (prefers-reduced-motion: reduce) {
  .ask-fade-enter-active, .ask-fade-leave-active,
  .ask-slide-enter-active, .ask-slide-leave-active { transition: none; }
  .caret, .bubble.typing span { animation: none; }
}
</style>
