/**
 * Compact "N unit ago" formatter used by Brand Input pills and drawers.
 *
 * Kept local instead of importing dayjs / date-fns for this one call
 * site — the RAG list can render hundreds of rows and the extra 30 KB
 * of library code isn't worth it for a formatter this small.
 */
export function timeAgo(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Math.max(0, Date.now() - then) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604_800) return `${Math.floor(diff / 86_400)}d ago`
  if (diff < 2_592_000) return `${Math.floor(diff / 604_800)}w ago`
  return `${Math.floor(diff / 2_592_000)}mo ago`
}
