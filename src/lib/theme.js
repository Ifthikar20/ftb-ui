import { useAppStore } from '@/stores/app'

/**
 * Read a design token (CSS custom property) off <html>.
 *
 * Charts and canvases cannot use CSS variables directly, so they resolve
 * colours at build time. Touching the store's resolved theme here means
 * any computed() that calls cssVar() re-evaluates when the user flips
 * between light and dark — the chart recolours without a reload.
 */
export function cssVar(name, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    // Dependency only; the value itself is read from the DOM below.
    void useAppStore().resolvedTheme
  } catch {
    /* called outside an active pinia (tests) — no reactivity, still works */
  }
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}
