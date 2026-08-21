import { ref, onMounted } from 'vue'

/**
 * The standard fetch cycle — data / loading / error refs around one
 * API-module call — extracted from the ref+try/catch/finally blocks
 * hand-rolled across the app. New data fetching should use this instead
 * of writing the cycle again.
 *
 *   const { data: detail, loading, error, load } = useResource(
 *     () => citationsApi.chatDetail(websiteId, chatId),
 *   )
 *
 * `fetcher` receives whatever `load(...)` is called with, so param-driven
 * refetches are `load(newId)`. `data` is the unwrapped payload (the api
 * client already unwraps the response envelope; this takes `.data` off
 * the envelope object).
 *
 * @param {(...args: any[]) => Promise<any>} fetcher
 * @param {object} [opts]
 * @param {boolean} [opts.immediate=true] load on mount
 * @param {any} [opts.initial=null] initial `data` value
 * @param {(e: Error) => void} [opts.onError] extra error hook (a toast is
 *   already shown by the api client unless the call opts out)
 */
export function useResource(fetcher, { immediate = true, initial = null, onError = null } = {}) {
    const data = ref(initial)
    const loading = ref(false)
    const error = ref(null)

    async function load(...args) {
        loading.value = true
        error.value = null
        try {
            const res = await fetcher(...args)
            data.value = res?.data ?? res ?? initial
            return data.value
        } catch (e) {
            error.value = e?.displayMessage || 'Something went wrong.'
            if (onError) onError(e)
            return null
        } finally {
            loading.value = false
        }
    }

    if (immediate) onMounted(() => { load() })

    return { data, loading, error, load }
}
