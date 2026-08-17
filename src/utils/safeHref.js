// Defense-in-depth for links whose URL comes from an external, untrusted
// source (LLM/search-provider citations, scraped source rows, alert source
// URLs). Vue does NOT sanitize :href, so a value like "javascript:alert(1)"
// or "data:text/html,..." surviving from a provider response would execute
// when clicked. The backend already filters citation schemes at storage;
// this is the second layer at the render boundary.
//
// Returns the URL only when it is an absolute http(s) URL, otherwise null.
// Bind it as :href="safeHref(x)" — a null href renders a non-navigable link.
export function safeHref(url) {
  if (typeof url !== 'string' || !url) return null
  const trimmed = url.trim()
  // Browsers ignore embedded control/whitespace characters when parsing a
  // scheme (e.g. "java\tscript:"), so drop every char <= U+0020 before the
  // check to avoid an obfuscated-scheme bypass.
  const probe = Array.from(trimmed)
    .filter((ch) => ch.charCodeAt(0) > 0x20)
    .join('')
  if (!probe) return null
  // Require an explicit, absolute http(s) scheme. Citations are expected to
  // be absolute URLs; rejecting scheme-relative / schemeless values avoids
  // any ambiguity at the href boundary.
  return /^https?:\/\//i.test(probe) ? trimmed : null
}
