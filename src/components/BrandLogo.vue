<script setup>
import { ref, watch } from 'vue'
import promptLibrary from '@/api/promptLibrary'
import { brandColor, brandInitial } from '@/lib/brandLogo'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: Number, default: 20 },
  // Domain matched to this brand from cited sources. When present we ask
  // the backend logo crawler for the site's real logo.
  domain: { type: String, default: '' },
})

// Logo resolution order:
//   1. crawl the brand's domain (backend /logo/) for the real site logo
//   2. Clearbit autocomplete by name (known companies)
//   3. deterministic colored initial badge
// Every resolved URL is cached in-memory + localStorage so each
// domain/name hits the network at most once.

const MEM = new Map()
const LS_KEY = 'brandLogoCache.v2'
function loadLS() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} }
}
function saveLS(obj) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(obj)) } catch { /* ignore quota */ }
}
function cacheGet(key) {
  if (MEM.has(key)) return MEM.get(key)
  const ls = loadLS()
  if (Object.prototype.hasOwnProperty.call(ls, key)) { MEM.set(key, ls[key]); return ls[key] }
  return undefined
}
function cacheSet(key, val) {
  MEM.set(key, val)
  const ls = loadLS(); ls[key] = val; saveLS(ls)
}

const logoUrl = ref('')
const failed = ref(false)
const triedName = ref(false)   // have we already fallen back to the name lookup?

async function resolve() {
  logoUrl.value = ''
  failed.value = false
  triedName.value = false

  if (props.domain) {
    const key = `d:${props.domain.toLowerCase()}`
    const cached = cacheGet(key)
    if (cached !== undefined) {
      if (cached) { logoUrl.value = cached; return }
    } else {
      try {
        const { data } = await promptLibrary.brandLogo(props.domain)
        const url = (data?.data || data)?.logo || ''
        cacheSet(key, url)
        if (url) { logoUrl.value = url; return }
      } catch { /* fall through to name lookup */ }
    }
  }
  resolveByName(props.name)
}

async function resolveByName(name) {
  triedName.value = true
  const key = `n:${String(name || '').trim().toLowerCase()}`
  if (key === 'n:') { failed.value = true; return }
  const cached = cacheGet(key)
  if (cached !== undefined) { applyResolved(cached); return }
  try {
    const res = await fetch(
      `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(name)}`,
    )
    const list = res.ok ? await res.json() : []
    const best = Array.isArray(list) && list.length ? list[0] : null
    const url = best?.logo || (best?.domain ? `https://logo.clearbit.com/${best.domain}` : '')
    cacheSet(key, url)
    applyResolved(url)
  } catch {
    cacheSet(key, '')
    applyResolved('')
  }
}

function applyResolved(url) {
  if (url) { logoUrl.value = url; failed.value = false }
  else { logoUrl.value = ''; failed.value = true }
}

function onImgError() {
  // A crawled/Clearbit URL 404'd. If we haven't tried the name lookup
  // yet, do that before giving up to the badge.
  logoUrl.value = ''
  if (!triedName.value) { resolveByName(props.name); return }
  failed.value = true
}

watch(() => [props.name, props.domain], resolve, { immediate: true })
</script>

<template>
  <img
    v-if="logoUrl && !failed"
    :src="logoUrl"
    alt=""
    :width="size"
    :height="size"
    class="brand-logo-img"
    :style="{ width: size + 'px', height: size + 'px' }"
    @error="onImgError"
  />
  <span
    v-else
    class="brand-logo-badge"
    :style="{
      width: size + 'px', height: size + 'px',
      background: brandColor(name), fontSize: Math.round(size * 0.5) + 'px',
    }"
  >{{ brandInitial(name) }}</span>
</template>

<style scoped>
.brand-logo-img {
  border-radius: 5px;
  object-fit: contain;
  background: var(--muted, #f1f5f9);
  flex: 0 0 auto;
}
.brand-logo-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  color: #fff;
  font-weight: 700;
  flex: 0 0 auto;
  line-height: 1;
}
</style>
