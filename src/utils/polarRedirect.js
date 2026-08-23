// Defense-in-depth for payment redirects: the browser is only ever
// handed to Polar. Even a spoofed or compromised API response must not
// be able to bounce a user to a lookalike "checkout" on another host.
export function isPolarUrl(url) {
  try {
    const u = new URL(url)
    return (
      u.protocol === 'https:'
      && (u.hostname === 'polar.sh' || u.hostname.endsWith('.polar.sh'))
    )
  } catch (_) {
    return false
  }
}
