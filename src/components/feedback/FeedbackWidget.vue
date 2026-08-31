<template>
  <span class="relative inline-flex">
    <Button
      variant="ghost"
      size="icon"
      class="h-8 w-8 text-muted-foreground"
      title="Help & feedback"
      @click="openWidget"
    >
      <Headphones class="size-4" />
    </Button>
    <span
      v-if="unreadCount"
      class="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white"
    >{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
  </span>

  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      @click.self="open = false"
    >
      <div class="fw-card w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <!-- ── Home: pick a category + your requests ── -->
        <template v-if="view === 'home'">
          <div class="mb-1 flex items-center gap-2">
            <Headphones class="size-5 text-foreground" />
            <h2 class="text-lg font-semibold text-foreground">Help & feedback</h2>
            <button class="ml-auto text-muted-foreground hover:text-foreground" @click="open = false"><X class="size-4" /></button>
          </div>
          <p class="mb-4 text-sm text-muted-foreground">Ask for help, report a problem, or share an idea.</p>

          <p class="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Start a request</p>
          <div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              v-for="cat in CATEGORIES"
              :key="cat.id"
              type="button"
              class="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-secondary"
              @click="startCompose(cat.id)"
            >
              <span class="flex size-9 flex-shrink-0 items-center justify-center rounded-full" :style="{ background: cat.bg, color: cat.fg }">
                <component :is="cat.icon" class="size-4" />
              </span>
              <span class="text-sm font-semibold text-foreground">{{ cat.label }}</span>
            </button>
          </div>

          <template v-if="tickets.length">
            <p class="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Your requests</p>
            <div class="mb-3 max-h-52 overflow-y-auto rounded-xl border border-border">
              <button
                v-for="t in tickets"
                :key="t.id"
                type="button"
                class="flex w-full items-center gap-3 border-b border-border px-3 py-2.5 text-left last:border-b-0 hover:bg-secondary"
                @click="openThread(t)"
              >
                <span class="flex size-7 flex-shrink-0 items-center justify-center rounded-full" :style="{ background: catFor(t.category).bg, color: catFor(t.category).fg }">
                  <component :is="catFor(t.category).icon" class="size-3.5" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm text-foreground" :class="{ 'font-semibold': isUnread(t) }">{{ t.last_message_preview }}</span>
                  <span class="block text-xs text-muted-foreground">
                    {{ t.last_message_author === 'agent' ? 'Support replied' : 'You' }} · {{ shortDate(t.updated_at) }}
                    <span v-if="t.status === 'closed'"> · closed</span>
                  </span>
                </span>
                <span v-if="isUnread(t)" class="size-2 flex-shrink-0 rounded-full bg-destructive" aria-label="Unread reply"></span>
              </button>
            </div>
          </template>

          <p class="text-xs text-muted-foreground">
            We usually reply within one business day. Replies stay right here — check back any time.
          </p>
        </template>

        <!-- ── Compose ── -->
        <template v-else-if="view === 'compose'">
          <div class="mb-3 flex items-center gap-2">
            <button class="flex size-8 items-center justify-center rounded-full border border-border text-foreground hover:bg-secondary" @click="view = 'home'">
              <ChevronLeft class="size-4" />
            </button>
            <span class="flex size-8 items-center justify-center rounded-full" :style="{ background: activeCat.bg, color: activeCat.fg }">
              <component :is="activeCat.icon" class="size-4" />
            </span>
            <h2 class="text-base font-semibold text-foreground">{{ activeCat.label }}</h2>
          </div>
          <p class="mb-2 text-sm text-muted-foreground">{{ activeCat.prompt }}</p>
          <textarea
            v-model="draft"
            class="mb-2 min-h-32 w-full rounded-xl border border-input bg-background p-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :placeholder="activeCat.placeholder"
          ></textarea>
          <p v-if="error" class="mb-2 text-sm text-destructive">{{ error }}</p>
          <button
            type="button"
            class="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            :disabled="draft.trim().length < 2 || sending"
            @click="submit"
          >{{ sending ? 'Sending…' : 'Send message' }}</button>
        </template>

        <!-- ── Thread ── -->
        <template v-else-if="view === 'thread' && thread">
          <div class="mb-3 flex items-center gap-2">
            <button class="flex size-8 items-center justify-center rounded-full border border-border text-foreground hover:bg-secondary" @click="backToHome">
              <ChevronLeft class="size-4" />
            </button>
            <span class="flex size-8 items-center justify-center rounded-full" :style="{ background: catFor(thread.category).bg, color: catFor(thread.category).fg }">
              <component :is="catFor(thread.category).icon" class="size-4" />
            </span>
            <h2 class="text-base font-semibold text-foreground">{{ catFor(thread.category).label }}</h2>
            <span v-if="thread.status === 'closed'" class="ml-auto rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">Closed</span>
          </div>
          <p class="mb-2 text-sm text-muted-foreground">Replies stay here and are connected to this browser.</p>

          <div class="mb-3 max-h-64 space-y-2 overflow-y-auto rounded-xl border border-border p-3">
            <div v-for="m in thread.messages" :key="m.id" class="flex" :class="m.author === 'user' ? 'justify-end' : 'justify-start'">
              <div class="max-w-[85%]">
                <div
                  class="whitespace-pre-wrap rounded-xl px-3 py-2 text-sm"
                  :class="m.author === 'user' ? 'bg-foreground text-background' : 'bg-secondary text-foreground'"
                >{{ m.body }}</div>
                <div class="mt-0.5 text-[11px] text-muted-foreground" :class="m.author === 'user' ? 'text-right' : ''">
                  {{ m.author === 'user' ? 'You' : 'Support' }} · {{ shortDate(m.created_at) }}
                </div>
              </div>
            </div>
          </div>

          <textarea
            v-model="draft"
            class="mb-2 min-h-20 w-full rounded-xl border border-input bg-background p-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Write a reply…"
          ></textarea>
          <p v-if="error" class="mb-2 text-sm text-destructive">{{ error }}</p>
          <button
            type="button"
            class="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            :disabled="draft.trim().length < 1 || sending"
            @click="sendReply"
          >{{ sending ? 'Sending…' : 'Send message' }}</button>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Bug, ChevronLeft, CreditCard, Headphones, Lightbulb, LifeBuoy, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth'
import { useBodyScrollLock } from '@/composables/useBodyScrollLock'
import { diagnosticsSnapshot } from '@/lib/diagnostics'
import feedback, { loadTokens, rememberToken } from '@/api/feedbackClient'

const CATEGORIES = [
  {
    id: 'bug', label: 'Bug report', icon: Bug,
    fg: '#dc2626', bg: 'rgba(220, 38, 38, 0.12)',
    prompt: 'What went wrong?',
    placeholder: 'What happened, and what did you expect instead?',
  },
  {
    id: 'idea', label: 'Feature idea', icon: Lightbulb,
    fg: '#7c3aed', bg: 'rgba(124, 58, 237, 0.12)',
    prompt: 'What should we build?',
    placeholder: 'Describe the idea and the problem it would solve for you…',
  },
  {
    id: 'help', label: 'Help request', icon: LifeBuoy,
    fg: '#2563eb', bg: 'rgba(37, 99, 235, 0.12)',
    prompt: 'What are you trying to do?',
    placeholder: 'Tell us what you need help with…',
  },
  {
    id: 'billing', label: 'Billing & account', icon: CreditCard,
    fg: '#059669', bg: 'rgba(5, 150, 105, 0.12)',
    prompt: 'What can we sort out?',
    placeholder: 'Plans, invoices, account access — ask away…',
  },
]

const route = useRoute()
const authStore = useAuthStore()

const open = ref(false)
useBodyScrollLock(open)
const view = ref('home')          // 'home' | 'compose' | 'thread'
const activeCategory = ref('help')
const draft = ref('')
const sending = ref(false)
const error = ref('')
const tickets = ref([])
const thread = ref(null)
const threadToken = ref('')

const activeCat = computed(() => catFor(activeCategory.value))
function catFor(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[2]
}

/* ── Unread tracking: per-thread "messages seen" count in this browser.
 * A thread is unread when Support spoke last and there are more messages
 * than the user has viewed. The badge polls quietly in the background. */
const SEEN_KEY = 'cs-feedback-seen'
const seen = ref((() => {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') } catch { return {} }
})())

function markSeen(ticketId, messageCount) {
  seen.value = { ...seen.value, [ticketId]: messageCount }
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen.value)) } catch { /* per-browser nicety */ }
}

function isUnread(t) {
  return t.last_message_author === 'agent'
    && t.message_count > (seen.value[t.id] ?? 0)
}

const unreadCount = computed(() => tickets.value.filter(isUnread).length)

const POLL_MS = 60_000
let pollTimer = null
onMounted(() => {
  refreshInbox()
  pollTimer = setInterval(refreshInbox, POLL_MS)
})
onBeforeUnmount(() => clearInterval(pollTimer))

function shortDate(d) {
  return new Date(d).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

async function openWidget() {
  open.value = true
  view.value = 'home'
  error.value = ''
  await refreshInbox()
}

async function refreshInbox() {
  const tokens = loadTokens()
  if (!tokens.length) { tickets.value = []; return }
  try {
    const { tickets: list } = await feedback.summaries(tokens)
    tickets.value = list
  } catch { /* the inbox is a convenience — leave whatever we had */ }
}

// Page + diagnostics snapshot: this is what lets support match a ticket
// to the exact server log lines (client_id) and see recent JS errors and
// failed API calls from this browser session.
function buildContext() {
  return { app: 'cansee', page: route.fullPath, ...diagnosticsSnapshot() }
}

function startCompose(categoryId) {
  activeCategory.value = categoryId
  draft.value = ''
  error.value = ''
  view.value = 'compose'
}

async function submit() {
  if (sending.value) return
  sending.value = true
  error.value = ''
  try {
    const { token, ticket } = await feedback.createTicket({
      category: activeCategory.value,
      message: draft.value.trim(),
      email: authStore.user?.email || '',
      name: authStore.user?.full_name || '',
      context: buildContext(),
      // Tokens this browser holds: if one points at an open ticket, the
      // service appends there instead of opening a second conversation.
      tokens: loadTokens(),
    })
    rememberToken(token)
    threadToken.value = token
    thread.value = ticket
    markSeen(ticket.id, ticket.messages.length)
    draft.value = ''
    view.value = 'thread'
    refreshInbox()
  } catch (e) {
    error.value = e.message
  } finally {
    sending.value = false
  }
}

async function openThread(summary) {
  error.value = ''
  try {
    thread.value = await feedback.getTicket(summary.id, summary.token)
    threadToken.value = summary.token
    markSeen(thread.value.id, thread.value.messages.length)
    draft.value = ''
    view.value = 'thread'
  } catch (e) {
    error.value = e.message
  }
}

async function sendReply() {
  if (sending.value || !thread.value) return
  sending.value = true
  error.value = ''
  try {
    await feedback.reply(thread.value.id, threadToken.value, draft.value.trim(), buildContext())
    thread.value = await feedback.getTicket(thread.value.id, threadToken.value)
    markSeen(thread.value.id, thread.value.messages.length)
    draft.value = ''
  } catch (e) {
    error.value = e.message
  } finally {
    sending.value = false
  }
}

function backToHome() {
  view.value = 'home'
  thread.value = null
  refreshInbox()
}
</script>
