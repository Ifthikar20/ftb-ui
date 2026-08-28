import { defineStore } from 'pinia'
import { ref } from 'vue'

import assistantApi from '@/api/assistant'

// State for Ask Cansee. The conversation list lives here because the app
// sidebar renders it on every route, while the thread itself is owned by
// the chat page.
//
// Threads are persisted server-side, so this store is a cache rather than
// the record: a reload re-reads both the list and the open thread.
export const useAssistantStore = defineStore('assistant', () => {
  // Sidebar list: [{id, title, message_count, last_message_at}]
  const conversations = ref([])
  const conversationsLoaded = ref(false)
  const activeId = ref(null)

  // Messages of the open thread.
  // { role: 'user' | 'assistant', content, grounded?, error?, streaming? }
  const messages = ref([])

  // Entitlement / maintenance switch, mirrored from the server. Starts
  // enabled so the trigger doesn't flicker; a failed check leaves it on
  // and the 503 path still protects the backend.
  const enabled = ref(true)
  const maintenanceMessage = ref('')
  const statusLoaded = ref(false)

  async function loadStatus() {
    try {
      const res = await assistantApi.status()
      enabled.value = res?.data?.enabled !== false
      maintenanceMessage.value = res?.data?.message || ''
    } catch (_) {
      // Network/permission hiccup: leave the feature visible.
    } finally {
      statusLoaded.value = true
    }
  }

  // Called when the API reports 503 mid-session so the UI flips to
  // maintenance without a reload.
  function markDisabled(message) {
    enabled.value = false
    if (message) maintenanceMessage.value = message
  }

  async function loadConversations(websiteId) {
    if (!websiteId) {
      conversations.value = []
      conversationsLoaded.value = true
      return
    }
    try {
      const res = await assistantApi.conversations(websiteId)
      conversations.value = res?.data?.conversations || []
    } catch (_) {
      conversations.value = []
    } finally {
      conversationsLoaded.value = true
    }
  }

  async function openConversation(websiteId, conversationId) {
    activeId.value = conversationId
    messages.value = []
    if (!websiteId || !conversationId) return
    try {
      const res = await assistantApi.conversation(websiteId, conversationId)
      messages.value = (res?.data?.messages || []).map((m) => ({
        role: m.role,
        content: m.content,
        grounded: m.grounded,
      }))
    } catch (_) {
      // A deleted or foreign thread: drop back to a blank composer rather
      // than stranding the page on a spinner.
      messages.value = []
      activeId.value = null
    }
  }

  // Start a thread locally without a round trip. The server creates the
  // real row on the first question, which keeps empty chats out of the
  // sidebar when someone clicks New chat and walks away.
  function startNewChat() {
    activeId.value = null
    messages.value = []
  }

  // Called after /ask/ reports which thread the turn landed in.
  function adoptConversation(id) {
    if (id) activeId.value = id
  }

  async function removeConversation(websiteId, conversationId) {
    await assistantApi.deleteConversation(websiteId, conversationId)
    conversations.value = conversations.value.filter((c) => c.id !== conversationId)
    if (activeId.value === conversationId) startNewChat()
  }

  async function renameConversation(websiteId, conversationId, title) {
    const res = await assistantApi.renameConversation(websiteId, conversationId, title)
    const next = res?.data
    const row = conversations.value.find((c) => c.id === conversationId)
    if (row && next) row.title = next.title
    return next
  }

  return {
    conversations, conversationsLoaded, activeId, messages,
    enabled, maintenanceMessage, statusLoaded,
    loadStatus, markDisabled,
    loadConversations, openConversation, startNewChat, adoptConversation,
    removeConversation, renameConversation,
  }
})
