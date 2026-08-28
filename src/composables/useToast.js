import { ref } from 'vue'

/**
 * Global toast notification system.
 * Shows calming, user-friendly messages — never raw errors.
 *
 * Usage:
 *   import { useToast } from '@/composables/useToast'
 *   const toast = useToast()
 *   toast.error('Something went wrong')
 *   toast.success('Action completed')
 */

const toasts = ref([])
let _id = 0

const TOAST_TYPES = {
    success: { duration: 4000 },
    error: { duration: 6000 },
    warning: { duration: 5000 },
    info: { duration: 4000 },
}

function addToast(type, message, description = '') {
    const id = ++_id
    const config = TOAST_TYPES[type] || TOAST_TYPES.info

    toasts.value.push({ id, type, message, description, leaving: false })

    // Auto-remove after duration
    setTimeout(() => {
        removeToast(id)
    }, config.duration)

    // Max 5 visible toasts
    if (toasts.value.length > 5) {
        removeToast(toasts.value[0].id)
    }
}

function removeToast(id) {
    const idx = toasts.value.findIndex(t => t.id === id)
    if (idx !== -1) {
        toasts.value[idx].leaving = true
        setTimeout(() => {
            toasts.value = toasts.value.filter(t => t.id !== id)
        }, 300)
    }
}

export function useToast() {
    return {
        toasts,
        success: (msg, desc) => addToast('success', msg, desc),
        error: (msg, desc) => addToast('error', msg || 'Something went wrong. Please try again.', desc),
        warning: (msg, desc) => addToast('warning', msg, desc),
        info: (msg, desc) => addToast('info', msg, desc),
        remove: removeToast,
    }
}
