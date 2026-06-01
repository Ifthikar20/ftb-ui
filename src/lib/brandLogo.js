// Brand logo helpers.
//
// Brand extraction only yields names, not domains, so we can't always
// resolve a real logo. We make a best-effort guess at the brand's domain
// and load its logo from a favicon service; when that 404s the caller
// swaps in a deterministic colored initial badge via `onBrandLogoError`.

const BADGE_COLORS = [
  '#5b8def', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
]

// Strip punctuation/spaces and append .com. Works for the many brands
// whose domain is just their squashed name (pizzahut.com, doordash.com,
// grubhub.com, ubereats.com, papajohns.com, postmates.com). When it
// guesses wrong the image errors and we fall back to the badge.
export function brandDomainGuess(name) {
  const slug = String(name || '')
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/&/g, 'and')
    .replace(/\b(inc|llc|corp|co|app)\b/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim()
  return slug ? `${slug}.com` : ''
}

export function brandLogoUrl(name) {
  const domain = brandDomainGuess(name)
  if (!domain) return ''
  // Clearbit returns a real company logo for known domains and a 404
  // for unknown ones, so a wrong domain guess cleanly triggers the
  // initial-badge fallback instead of showing a generic globe.
  return `https://logo.clearbit.com/${domain}`
}

export function brandInitial(name) {
  const m = String(name || '').trim().match(/[a-z0-9]/i)
  return m ? m[0].toUpperCase() : '?'
}

export function brandColor(name) {
  const s = String(name || '')
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return BADGE_COLORS[h % BADGE_COLORS.length]
}

// Swap a failed/blank logo <img> for an inline SVG initial badge.
export function onBrandLogoError(ev, name) {
  const letter = brandInitial(name)
  const color = brandColor(name).replace('#', '%23')
  ev.target.src =
    `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E` +
    `%3Crect width='24' height='24' rx='6' fill='${color}'/%3E` +
    `%3Ctext x='12' y='16' text-anchor='middle' font-size='12' font-family='sans-serif' ` +
    `fill='white' font-weight='700'%3E${letter}%3C/text%3E%3C/svg%3E`
  ev.target.onerror = null
}
