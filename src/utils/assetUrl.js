// Serve large static assets (video, images) from a CDN when configured
// so the Docker image stays lean and the origin doesn't ship the same
// bytes to every visitor. Set VITE_ASSET_CDN at build time to a bucket
// or CDN base URL (e.g. https://cdn.cansee.ai). When empty, paths
// resolve locally against the site origin — the dev/CI default.
const BASE = (import.meta.env.VITE_ASSET_CDN || '').replace(/\/$/, '')

export function assetUrl(path) {
  const clean = path.startsWith('/') ? path : `/${path}`
  return `${BASE}${clean}`
}
