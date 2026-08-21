import { ref, onMounted, unref } from 'vue'

/**
 * localStorage-backed "customizable cards" picker state.
 *
 * Replaces the four hand-rolled copies that used to live in
 * AnalyticsPage (Overview / Retention / Flows / Insights), which had
 * already drifted apart. Unified behavior, taking the best of each:
 *  - add() closes the picker whether or not the card was new
 *  - saved ids are validated against availableCards so renamed/removed
 *    cards never render as ghosts
 *  - optional version guard resets everyone to defaults on bump
 *
 * storageKey / versionKey may be refs or computeds (per-website keys) —
 * they are unref'd at each use, matching the previous behavior of
 * loading on mount for the then-active website.
 *
 * @param {object} opts
 * @param {import('vue').MaybeRef<string>} opts.storageKey
 * @param {Array<{id: string}>} opts.availableCards
 * @param {string[]} [opts.defaults]
 * @param {number|null} [opts.version] bump to reset all users to defaults
 * @param {import('vue').MaybeRef<string>|null} [opts.versionKey] required with version
 */
export function useCardPicker({
    storageKey,
    availableCards,
    defaults = [],
    version = null,
    versionKey = null,
}) {
    const cards = ref([...defaults])
    const showPicker = ref(false)
    const validIds = new Set(availableCards.map(c => c.id))

    function save() {
        try {
            localStorage.setItem(unref(storageKey), JSON.stringify(cards.value))
        } catch { /* storage full/blocked — selection just won't persist */ }
    }

    function load() {
        try {
            if (version !== null && versionKey !== null) {
                const ver = parseInt(localStorage.getItem(unref(versionKey)) || '0', 10)
                if (ver < version) {
                    // Old version or first visit — reset to defaults.
                    localStorage.setItem(unref(versionKey), String(version))
                    localStorage.setItem(unref(storageKey), JSON.stringify(defaults))
                    return
                }
            }
            const saved = localStorage.getItem(unref(storageKey))
            if (saved) {
                const parsed = JSON.parse(saved).filter(id => validIds.has(id))
                if (parsed.length || defaults.length === 0) cards.value = parsed
            }
        } catch { /* ignore — defaults stand */ }
    }

    onMounted(load)

    function add(id) {
        if (!cards.value.includes(id)) {
            cards.value.push(id)
            save()
        }
        showPicker.value = false
    }

    function remove(id) {
        cards.value = cards.value.filter(c => c !== id)
        save()
    }

    return { cards, showPicker, add, remove }
}
