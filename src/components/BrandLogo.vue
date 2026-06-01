<script setup>
import { ref, watch } from 'vue'
import { brandColor, brandInitial } from '@/lib/brandLogo'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: Number, default: 20 },
  // Real website logo resolved server-side from a cited domain. When
  // present it is used directly; on error we fall through to the name
  // lookup below.
  logo: { type: String, default: '' },
})

// Resolve a brand name to a real logo via Clearbit's autocomplete API
// (name -> {domain, logo}). Results are cached in-memory and in
// localStorage so we hit the network at most once per brand name. On any
// miss/failure we fall back to a deterministic colored initial badge.

const MEM = new Map()       // name(lower) -> logo url | '' (no logo)
const LS_KEY = 'brandLogoCache.v1'

function loadLS() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} }
}
function saveLS(obj) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(obj)) } catch { /* ignore quota */ }
}

const logoUrl = ref('')
const failed = ref(false)
const triedServerLogo = ref(false)

async function resolve(name) {
  logoUrl.value = ''
  failed.value = false
  triedServerLogo.value = false

  // Prefer the server-resolved website logo (from a cited domain).
  if (props.logo) {
    triedServerLogo.value = true
    logoUrl.value = props.logo
    return
  }
  resolveByName(name)
}

function applyResolved(url) {
  if (url) { logoUrl.value = url; failed.value = false }
  else { logoUrl.value = ''; failed.value = true }
}

function onImgError() {
  // The server logo 404'd — fall through to the name-based lookup before
  // giving up to the badge.
  if (triedServerLogo.value) {
    triedServerLogo.value = false
    logoUrl.value = ''
    resolveByName(props.name)
    return
  }
  failed.value = true
  logoUrl.value = ''
}

// Name-lookup path, split out so onImgError can invoke it after a failed
// server logo without re-checking props.logo.
async function resolveByName(name) {
  const key = String(name || '').trim().toLowerCase()
  if (!key) { failed.value = true; return }
  if (MEM.has(key)) { applyResolved(MEM.get(key)); return }
  const ls = loadLS()
  if (Object.prototype.hasOwnProperty.call(ls, key)) {
    MEM.set(key, ls[key]); applyResolved(ls[key]); return
  }
  try {
    const res = await fetch(
      `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(name)}`,
    )
    const list = res.ok ? await res.json() : []
    const best = Array.isArray(list) && list.length ? list[0] : null
    const url = best?.logo || (best?.domain ? `https://logo.clearbit.com/${best.domain}` : '')
    MEM.set(key, url)
    const next = loadLS(); next[key] = url; saveLS(next)
    applyResolved(url)
  } catch {
    MEM.set(key, ''); applyResolved('')
  }
}

watch(() => [props.name, props.logo], () => resolve(props.name), { immediate: true })
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
