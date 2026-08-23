import { defineStore } from 'pinia'
import { ref } from 'vue'

import assistantApi from '@/api/assistant'

// Global state for the Ask FetchBot side panel. Conversation lives here
// so it survives route changes while the app is open (the panel unmounts
// visually but the thread persists until the user resets or reloads).
export const useAssistantStore = defineStore('assistant', () => {
  const isOpen = ref(false)
  // { role: 'user' | 'assistant', content: string, error?: bool, streaming?: bool }
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

  function open() { isOpen.value = true }
  function close() { isOpen.value = false }
  function toggle() { isOpen.value = !isOpen.value }
  function reset() { messages.value = [] }

  return {
    isOpen, messages, enabled, maintenanceMessage, statusLoaded,
    loadStatus, markDisabled, open, close, toggle, reset,
  }
})
