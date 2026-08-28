<!--
  Ask Cansee — the full-page chat.

  This replaced a 400px right-hand slide-out. The assistant answers with
  multi-section markdown (tables of prompts, per-provider breakdowns,
  ranked findings), and a narrow rail turned every one of those into a
  column of wrapped fragments. The page gives answers a readable measure
  and gives the conversation somewhere to live.

  Threads persist server-side; the sidebar list in AppLayout reads the same
  store this page writes.
-->
<template>
  <div class="ask-page">
    <!-- Maintenance: the feature is switched off deployment-wide. -->
    <div v-if="!store.enabled" class="ask-state">
      <span class="ask-state-icon is-maintenance"><Wrench :size="22" :stroke-width="1.8" /></span>
      <h2 class="ask-state-title">Temporarily unavailable</h2>
      <p class="ask-state-sub">
        {{ store.maintenanceMessage || 'Ask Cansee is offline for maintenance. It will be back shortly.' }}
      </p>
    </div>

    <!-- No website selected: nothing to ground answers in. -->
    <div v-else-if="!websiteId" class="ask-state">
      <span class="ask-state-icon"><Sparkles :size="22" :stroke-width="1.8" /></span>
      <h2 class="ask-state-title">Pick a project first</h2>
      <p class="ask-state-sub">
        Answers are grounded in one project's own data, so choose one from the
        switcher above to start asking.
      </p>
      <router-link to="/websites" class="ask-cta">Go to projects</router-link>
    </div>

    <template v-else>
      <!-- Thread -->
      <div ref="threadEl" class="ask-thread">
        <div class="ask-measure">
          <!-- Empty state doubles as the launcher. -->
          <div v-if="!store.messages.length && !pending" class="ask-intro">
            <span class="ask-intro-icon"><Sparkles :size="24" :stroke-width="1.7" /></span>
            <h1 class="ask-intro-title">Ask anything about {{ websiteName || 'your project' }}</h1>
            <p class="ask-intro-sub">
              Traffic, AI-search visibility, brand security, saved prompts —
              answered from your own numbers, not the open web.
            </p>
            <div class="ask-suggestions">
              <button
                v-for="s in SUGGESTIONS"
                :key="s.text"
                type="button"
                class="ask-suggestion"
                @click="sendText(s.text)"
              >
                <component :is="s.icon" :size="15" :stroke-width="1.8" class="ask-suggestion-icon" />
                <span>{{ s.text }}</span>
              </button>
            </div>
          </div>

          <!-- Turns -->
          <article
            v-for="(m, i) in store.messages"
            :key="i"
            class="turn"
            :class="m.role"
          >
            <template v-if="m.role === 'user'">
              <div class="turn-user">{{ m.content }}</div>
            </template>
            <template v-else>
              <div class="turn-head">
                <span class="turn-avatar"><Sparkles :size="13" :stroke-width="2" /></span>
                <span class="turn-name">Cansee</span>
                <span
                  v-if="m.grounded"
                  class="turn-grounded"
                  title="Answered from your project's own data"
                >grounded</span>
              </div>
              <div class="turn-body md" :class="{ 'is-error': m.error }">
                <div v-html="render(m.content)"></div>
                <span v-if="m.streaming" class="caret" aria-hidden="true"></span>
              </div>
            </template>
          </article>

          <!-- Thinking -->
          <article v-if="pending" class="turn assistant">
            <div class="turn-head">
              <span class="turn-avatar"><Sparkles :size="13" :stroke-width="2" /></span>
              <span class="turn-name">Cansee</span>
            </div>
            <div class="turn-body typing" aria-label="Cansee is thinking">
              <span></span><span></span><span></span>
            </div>
          </article>
        </div>
      </div>

      <!-- Composer -->
      <div class="ask-composer-wrap">
        <div class="ask-measure">
          <div class="composer" :class="{ 'is-busy': pending }">
            <textarea
              ref="inputEl"
              v-model="draft"
              class="composer-input"
              placeholder="Ask about your traffic, visibility, prompts, or security…"
              rows="1"
              :disabled="pending"
              @input="autoGrow"
              @keydown="onKeydown"
            ></textarea>
            <button
              type="button"
              class="composer-send"
              :disabled="!draft.trim() || pending"
              title="Send"
              @click="send()"
            >
              <ArrowUp :size="17" :stroke-width="2.3" />
            </button>
          </div>
          <p class="composer-hint">Cansee can be wrong — check important numbers.</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowUp, BarChart3, Brain, ShieldAlert, Sparkles, Wrench,
} from '@lucide/vue'

import { useAppStore } from '@/stores/app'
import { useAssistantStore } from '@/stores/assistant'
import assistantApi from '@/api/assistant'
import { renderMarkdown } from '@/utils/markdown'

const store = useAssistantStore()
const appStore = useAppStore()
const route = useRoute()
const router = useRouter()

const draft = ref('')
const pending = ref(false)
const threadEl = ref(null)
const inputEl = ref(null)

const websiteId = computed(() => appStore.activeWebsite?.id || null)
const websiteName = computed(() => appStore.activeWebsite?.name || '')

const reduceMotion = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const SUGGESTIONS = [
  { text: 'Summarize my traffic over the last 30 days', icon: BarChart3 },
  { text: 'How is my AI visibility trending?', icon: Brain },
  { text: 'Any open brand-security findings?', icon: ShieldAlert },
  { text: 'Which saved prompts never surface my brand?', icon: Sparkles },
]

function render(text) { return renderMarkdown(text) }

function scrollToBottom() {
  nextTick(() => {
    const el = threadEl.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

function autoGrow() {
  const el = inputEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 200) + 'px'
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

// Typewriter reveal. The answer arrives whole (the backend is not
// streaming), so this is presentation only — it makes a 2s wait followed
// by a wall of text feel like a reply rather than a page load.
function revealAnswer(msg, full) {
  if (reduceMotion || full.length < 40) {
    msg.content = full
    msg.streaming = false
    scrollToBottom()
    return
  }
  let idx = 0
  const step = Math.max(2, Math.ceil(full.length / 220))
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
  if (!q || pending.value || !websiteId.value || !store.enabled) return

  const isFirstTurn = !store.messages.length
  store.messages.push({ role: 'user', content: q })
  draft.value = ''
  autoGrow()
  scrollToBottom()

  pending.value = true
  try {
    const res = await assistantApi.ask(websiteId.value, q, store.activeId)
    const answer = res?.data?.answer || "I don't have an answer for that yet."
    const conversationId = res?.data?.conversation_id || null
    pending.value = false

    // The server decides which thread the turn landed in (it opens one on
    // the first question), so adopt whatever it reports.
    if (conversationId && conversationId !== store.activeId) {
      store.adoptConversation(conversationId)
      // Keep the URL shareable and reload-safe from the first answer on.
      router.replace({ name: 'ask-cansee', params: { conversationId } })
    }

    store.messages.push({
      role: 'assistant', content: '', streaming: true,
      grounded: !!res?.data?.grounded,
    })
    // Re-read the pushed element: mutating the local object is not
    // reactive, since Vue tracks the proxy stored in the array.
    const msg = store.messages[store.messages.length - 1]
    revealAnswer(msg, answer)

    // The first answer creates the thread, so the sidebar needs the new
    // row; later turns only move it up the list.
    if (isFirstTurn) store.loadConversations(websiteId.value)
  } catch (e) {
    pending.value = false
    store.messages.push({ role: 'assistant', content: friendlyError(e), error: true })
    scrollToBottom()
  }
}

// Sync the open thread to the URL, so a sidebar click, a browser back, and
// a hard reload all land on the same conversation.
async function syncFromRoute() {
  const id = route.params.conversationId || null
  if (!id) {
    store.startNewChat()
    return
  }
  if (id === store.activeId && store.messages.length) return
  await store.openConversation(websiteId.value, id)
  scrollToBottom()
}

onMounted(async () => {
  await syncFromRoute()
  store.loadConversations(websiteId.value)
  inputEl.value?.focus()
})

watch(() => route.params.conversationId, syncFromRoute)

// Switching project changes which data answers are grounded in, so the
// thread and its list belong to the old project, not this one.
watch(websiteId, (id) => {
  store.startNewChat()
  store.loadConversations(id)
  if (route.params.conversationId) router.replace({ name: 'ask-cansee', params: {} })
})
</script>

<style scoped>
.ask-page {
  display: flex;
  flex-direction: column;
  /* Fills the layout's content area; the thread scrolls, not the page. */
  height: calc(100vh - 112px);
  min-height: 420px;
}

/* Shared measure. ~46rem is the readable line length for the assistant's
   markdown; wider and long answers get hard to track line to line. */
.ask-measure {
  width: 100%;
  max-width: 46rem;
  margin: 0 auto;
}

/* ── Thread ── */
.ask-thread {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 20px 24px;
  scrollbar-width: thin;
}

.turn { margin-bottom: 26px; }
.turn:last-child { margin-bottom: 8px; }

/* The user's own words sit in a bubble on the right; the assistant's answer
   runs full measure like a document. Same asymmetry ChatGPT and Claude use —
   it keeps long answers from looking like chat noise. */
.turn.user { display: flex; justify-content: flex-end; }
.turn-user {
  max-width: 85%;
  padding: 10px 15px;
  border-radius: 16px 16px 4px 16px;
  background: var(--muted);
  color: var(--foreground);
  font-size: 14px;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.turn-head { display: flex; align-items: center; gap: 7px; margin-bottom: 8px; }
.turn-avatar {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 7px;
  color: #fff;
  background: linear-gradient(135deg, #6d5efc, #9b6bff);
  flex-shrink: 0;
}
.turn-name { font-size: 12.5px; font-weight: 700; color: var(--foreground); }
.turn-grounded {
  padding: 1px 7px;
  border-radius: 999px;
  border: 1px solid var(--border);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted-foreground);
}
.turn-body {
  font-size: 14.5px;
  line-height: 1.68;
  color: var(--foreground);
  overflow-wrap: anywhere;
}
.turn-body.is-error { color: var(--destructive); }

.caret {
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 2px;
  vertical-align: text-bottom;
  background: currentColor;
  animation: ask-blink 1s steps(2) infinite;
}
@keyframes ask-blink { 50% { opacity: 0; } }

.typing { display: flex; gap: 5px; padding: 6px 0; }
.typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--muted-foreground);
  animation: ask-bounce 1.2s ease infinite;
}
.typing span:nth-child(2) { animation-delay: 0.15s; }
.typing span:nth-child(3) { animation-delay: 0.3s; }
@keyframes ask-bounce {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-3px); }
}

/* ── Markdown inside an answer ── */
/* utils/markdown.js maps # -> h3, so the heading levels an answer can
   actually contain are h3..h6. Styling h1/h2 here would be dead CSS and
   the real headings would render at body size. */
.md :deep(h3) {
  font-size: 15.5px;
  font-weight: 700;
  margin: 20px 0 8px;
}
.md :deep(h4), .md :deep(h5), .md :deep(h6) {
  font-size: 14px;
  font-weight: 700;
  margin: 17px 0 7px;
  color: var(--foreground);
}
.md :deep(h3:first-child), .md :deep(h4:first-child),
.md :deep(h5:first-child), .md :deep(h6:first-child) { margin-top: 0; }
.md :deep(blockquote) {
  margin: 0 0 12px;
  padding: 2px 0 2px 13px;
  border-left: 2px solid var(--border);
  color: var(--muted-foreground);
}
.md :deep(hr) {
  margin: 18px 0;
  border: 0;
  border-top: 1px solid var(--border);
}
.md :deep(p) { margin: 0 0 11px; }
.md :deep(p:last-child) { margin-bottom: 0; }
.md :deep(ul), .md :deep(ol) { margin: 0 0 12px; padding-left: 20px; }
.md :deep(li) { margin-bottom: 5px; }
.md :deep(strong) { font-weight: 700; }
.md :deep(code) {
  padding: 1px 5px;
  border-radius: 5px;
  background: var(--muted);
  font-size: 12.5px;
}
.md :deep(pre) {
  margin: 0 0 12px;
  padding: 12px 14px;
  border-radius: 9px;
  background: var(--muted);
  overflow-x: auto;
}
.md :deep(pre code) { padding: 0; background: none; }
.md :deep(a) { color: var(--primary); text-decoration: underline; }
/* Wide tables scroll inside the answer rather than stretching the page.
   The renderer emits its own .md-table-wrap, so scroll that and leave the
   table a normal table. */
.md :deep(.md-table-wrap) {
  max-width: 100%;
  overflow-x: auto;
  margin: 0 0 12px;
}
.md :deep(table) {
  border-collapse: collapse;
  font-size: 13px;
}
.md :deep(th), .md :deep(td) {
  border: 1px solid var(--border);
  padding: 6px 10px;
  text-align: left;
}
.md :deep(th) { background: var(--muted); font-weight: 700; }

/* ── Intro / empty ── */
.ask-intro { padding: 48px 0 28px; text-align: center; }
.ask-intro-icon {
  display: inline-grid;
  place-items: center;
  width: 46px;
  height: 46px;
  margin-bottom: 16px;
  border-radius: 14px;
  color: #fff;
  background: linear-gradient(135deg, #6d5efc, #9b6bff);
}
.ask-intro-title { font-size: 21px; font-weight: 700; color: var(--foreground); }
.ask-intro-sub {
  margin: 9px auto 0;
  max-width: 30rem;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--muted-foreground);
}
.ask-suggestions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  margin-top: 26px;
  text-align: left;
}
@media (max-width: 640px) {
  .ask-suggestions { grid-template-columns: 1fr; }
}
.ask-suggestion {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 11px;
  background: var(--card);
  font-size: 13px;
  font-weight: 500;
  color: var(--foreground);
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
}
.ask-suggestion:hover { border-color: var(--ring); background: var(--muted); }
.ask-suggestion-icon { color: var(--muted-foreground); flex-shrink: 0; }

/* ── Composer ── */
.ask-composer-wrap {
  flex-shrink: 0;
  padding: 0 20px 6px;
  background: var(--background);
}
.composer {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 9px 9px 9px 15px;
  border: 1px solid var(--border);
  border-radius: 15px;
  background: var(--card);
  box-shadow: 0 2px 14px rgba(0, 0, 0, 0.05);
  transition: border-color 0.15s;
}
.composer:focus-within { border-color: var(--ring); }
.composer.is-busy { opacity: 0.75; }
.composer-input {
  flex: 1;
  min-width: 0;
  max-height: 200px;
  padding: 6px 0;
  border: none;
  outline: none;
  background: transparent;
  resize: none;
  font-size: 14.5px;
  line-height: 1.55;
  color: var(--foreground);
  font-family: inherit;
}
.composer-input::placeholder { color: var(--muted-foreground); }
.composer-send {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 10px;
  color: #fff;
  background: linear-gradient(135deg, #6d5efc, #9b6bff);
  transition: opacity 0.15s;
}
.composer-send:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  background: var(--muted-foreground);
}
.composer-hint {
  margin-top: 7px;
  text-align: center;
  font-size: 11px;
  color: var(--muted-foreground);
}

/* ── Blocking states ── */
.ask-state {
  margin: auto;
  max-width: 26rem;
  padding: 40px 20px;
  text-align: center;
}
.ask-state-icon {
  display: inline-grid;
  place-items: center;
  width: 46px;
  height: 46px;
  margin-bottom: 15px;
  border-radius: 14px;
  color: #fff;
  background: linear-gradient(135deg, #6d5efc, #9b6bff);
}
.ask-state-icon.is-maintenance {
  color: #b45309;
  background: color-mix(in srgb, #f59e0b 18%, transparent);
}
.ask-state-title { font-size: 17px; font-weight: 700; color: var(--foreground); }
.ask-state-sub {
  margin-top: 8px;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--muted-foreground);
}
.ask-cta {
  display: inline-block;
  margin-top: 18px;
  padding: 8px 18px;
  border-radius: 9px;
  background: var(--primary);
  color: var(--primary-foreground);
  font-size: 13px;
  font-weight: 600;
}
</style>
