import { onBeforeUnmount, watch } from 'vue'

/**
 * Lock the page's scroll while an overlay is open, so wheel/touch inside
 * a modal never scrolls the background. Reference-counted: several
 * overlays can hold a lock at once and the body unlocks only when the
 * last one releases (or its component unmounts).
 */
let locks = 0

function apply() {
    document.body.style.overflow = locks > 0 ? 'hidden' : ''
}

export function useBodyScrollLock(isOpen) {
    let holding = false
    const set = (open) => {
        if (open && !holding) { locks += 1; holding = true; apply() }
        else if (!open && holding) { locks -= 1; holding = false; apply() }
    }
    watch(isOpen, set, { immediate: true })
    onBeforeUnmount(() => set(false))
}
