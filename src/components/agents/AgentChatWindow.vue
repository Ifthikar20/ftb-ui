<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { Button } from '@/components/ui/button'
import agentsApi from '@/api/agents'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  hiredId: { type: String, required: true },
})

const toast = useToast()
const messages = ref([])
const draft = ref('')
const sending = ref(false)
const loading = ref(true)
const scroller = ref(null)

async function scrollDown() {
  await nextTick()
  if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight
}

async function load() {
  loading.value = true
  try {
    const { data } = await agentsApi.chatHistory(props.hiredId)
    messages.value = data?.data || data || []
  } catch (_) {
    messages.value = []
  } finally {
    loading.value = false
    scrollDown()
  }
}

async function send() {
  const text = draft.value.trim()
  if (!text || sending.value) return
  sending.value = true
  // optimistic user bubble
  messages.value.push({ id: `tmp-${Date.now()}`, role: 'user', text })
  draft.value = ''
  scrollDown()
  try {
    const { data } = await agentsApi.sendMessage(props.hiredId, text)
    const reply = data?.data || data
    if (reply) messages.value.push(reply)
    scrollDown()
  } catch (e) {
    toast.error(e.displayMessage || 'Message failed.')
  } finally {
    sending.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="cw">
    <div ref="scroller" class="cw-scroll">
      <div v-if="loading" class="cw-empty">Loading…</div>
      <div v-else-if="!messages.length" class="cw-empty">
        Ask this agent anything about its area — it answers with your latest data in context.
      </div>
      <div
        v-for="m in messages"
        :key="m.id"
        class="cw-msg"
        :class="m.role === 'user' ? 'is-user' : 'is-agent'"
      >
        <div class="cw-bubble">{{ m.text }}</div>
      </div>
    </div>
    <div class="cw-input">
      <textarea
        v-model="draft"
        rows="2"
        class="cw-textarea"
        placeholder="Message your agent…"
        @keydown.enter.exact.prevent="send"
      ></textarea>
      <Button size="sm" :disabled="sending || !draft.trim()" @click="send">
        {{ sending ? '…' : 'Send' }}
      </Button>
    </div>
  </div>
</template>

<style scoped>
.cw { display: flex; flex-direction: column; height: 480px; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-card); }
.cw-scroll { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.cw-empty { color: var(--text-muted); font-size: 13px; margin: auto; text-align: center; max-width: 320px; }
.cw-msg { display: flex; }
.cw-msg.is-user { justify-content: flex-end; }
.cw-bubble { max-width: 78%; padding: 9px 13px; border-radius: var(--radius-md); font-size: 13px; line-height: 1.5; white-space: pre-wrap; }
.is-user .cw-bubble { background: var(--brand-accent); color: #fff; }
.is-agent .cw-bubble { background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color); }
.cw-input { display: flex; gap: 8px; padding: 12px; border-top: 1px solid var(--border-color); align-items: flex-end; }
.cw-textarea { flex: 1; resize: none; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--bg-input); padding: 8px 10px; font-size: 13px; color: var(--text-primary); }
</style>
