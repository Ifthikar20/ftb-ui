<template>
  <SettingsShell :active="section">
    <!-- ── Account ─────────────────────────────────────────────── -->
    <template v-if="section === 'account'">
      <p class="set-label">Profile</p>
      <Card>
        <CardContent class="pt-6">
          <form @submit.prevent="saveProfile" class="flex flex-col gap-4">
            <div class="max-w-md">
              <label class="mb-1.5 block text-sm font-medium text-foreground">Full Name</label>
              <input v-model="profile.full_name" class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <div class="max-w-md">
              <label class="mb-1.5 block text-sm font-medium text-foreground">Email</label>
              <input v-model="profile.email" class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60" disabled />
            </div>
            <div class="max-w-md">
              <label class="mb-1.5 block text-sm font-medium text-foreground">Company</label>
              <input v-model="profile.company_name" class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <Button type="submit" size="sm" class="w-fit" :disabled="saving">{{ saving ? 'Saving...' : 'Save Changes' }}</Button>
          </form>
        </CardContent>
      </Card>

      <p class="set-label mt-10">Danger zone</p>
      <Card class="border-destructive/40">
        <CardContent class="pt-6">
          <div class="flex flex-col gap-3">
            <p class="text-sm font-medium text-foreground">Delete account</p>
            <p class="max-w-xl text-sm text-muted-foreground">
              Permanently erases your account and everything in it — websites,
              analytics history, knowledge base, subscription and profile.
              Nothing is kept, and there is no way back.
            </p>
            <Button
              variant="destructive" size="sm" class="w-fit"
              :disabled="deleting" @click="confirmDeleteAccount"
            >{{ deleting ? 'Deleting…' : 'Delete account' }}</Button>
          </div>
        </CardContent>
      </Card>
    </template>

    <!-- ── AI Usage ────────────────────────────────────────────── -->
    <template v-else-if="section === 'usage'">
      <p class="set-label">Usage</p>
      <Card>
        <CardContent class="pt-6">
          <div v-if="usageLoading" class="flex items-center gap-2.5 p-8 text-sm text-muted-foreground">
            <div class="spinner"></div>
            <span>Loading usage data...</span>
          </div>

          <div v-else-if="usage">
            <!-- The allowance is a dollar spend cap — the same number
                 enforcement uses. Tokens are shown as real counts, never
                 converted into an invented "token capacity". -->
            <div v-if="usage.allowance && usage.allowance.cap_usd > 0" class="mb-6 rounded-xl border border-border bg-muted px-4 py-3.5">
              <div class="mb-1.5 flex items-baseline justify-between">
                <span class="text-sm font-semibold text-foreground">AI allowance · {{ planLabel(usage.allowance.plan) }} plan · this billing period</span>
                <span class="text-sm text-muted-foreground">
                  ${{ usage.allowance.spent_usd.toFixed(2) }} of ${{ usage.allowance.cap_usd.toFixed(2) }}
                  <span class="ml-1 font-semibold text-foreground">({{ usage.allowance.pct_used }}%)</span>
                </span>
              </div>
              <div class="h-2 overflow-hidden rounded bg-border">
                <div
                  class="cap-bar-fill h-full"
                  :class="{ 'cap-bar-warn': usage.allowance.warning, 'cap-bar-exceeded': usage.allowance.exceeded }"
                  :style="{ width: Math.min(100, usage.allowance.pct_used || 0) + '%' }"
                ></div>
              </div>
              <p class="mt-1.5 text-[11px] text-muted-foreground">
                {{ formatTokens(usage.allowance.used_tokens) }} tokens used this period.
                Allowance renews {{ new Date(usage.allowance.resets_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) }}.
              </p>
              <p v-if="usage.allowance.exceeded" class="mt-2 text-xs font-semibold text-destructive">
                Allowance reached. AI features resume at the renewal date.
              </p>
              <p v-else-if="usage.allowance.warning" class="mt-2 text-xs font-semibold text-[#B25E09]">
                Over 80% of this period's allowance used.
              </p>
            </div>

            <!-- Billing period + trailing week, one screen -->
            <div class="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div class="rounded-xl border border-border bg-muted p-3.5 text-center">
                <div class="text-xl font-bold tracking-tight text-foreground">{{ formatTokens(usage.totals.total_tokens) }}</div>
                <div class="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tokens · billing period</div>
              </div>
              <div class="rounded-xl border border-border bg-muted p-3.5 text-center">
                <div class="text-xl font-bold tracking-tight text-foreground">{{ formatNum(usage.totals.calls) }}</div>
                <div class="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Requests · billing period</div>
              </div>
              <div class="rounded-xl border border-border bg-muted p-3.5 text-center">
                <div class="text-xl font-bold tracking-tight text-foreground">{{ formatTokens(weekTotals.tokens) }}</div>
                <div class="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tokens · 7 days</div>
              </div>
              <div class="rounded-xl border border-border bg-muted p-3.5 text-center">
                <div class="text-xl font-bold tracking-tight text-foreground">{{ formatNum(weekTotals.calls) }}</div>
                <div class="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Requests · 7 days</div>
              </div>
            </div>

            <!-- Daily usage across the current billing period -->
            <div class="mb-6" v-if="dailySeries.length">
              <h4 class="usage-section-title">Daily usage · {{ periodLabel }}</h4>
              <div class="usage-chart">
                <div v-for="d in dailySeries" :key="d.day" class="chart-bar-wrap" :title="`${d.day}: ${formatTokens(d.tokens)} tokens, ${d.calls} requests`">
                  <div class="chart-bar" :style="{ height: pctOfMax(d.tokens, dailySeries) + '%' }"></div>
                  <span class="chart-label">{{ formatDay(d.day) }}</span>
                </div>
              </div>
            </div>

            <!-- Empty state -->
            <div v-if="!usage.totals.calls" class="flex flex-col items-center gap-2.5 p-8 text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" stroke-width="1.5"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M12 6v6l4 2"/></svg>
              <p class="max-w-md text-sm text-muted-foreground">No AI usage recorded this billing period. Token tracking starts automatically when you use AI features like audits, agents, or the prompt library.</p>
            </div>

            <p class="border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
              Token counts are reported by the AI providers per request. Costs
              are calculated against the current market rates of the underlying
              providers (Anthropic, OpenAI, xAI, Perplexity, Google); the
              allowance may be adjusted if provider pricing changes.
              <template v-if="usage.source === 'polar'">
                Token totals are served live from Polar metering.
              </template>
            </p>
          </div>
        </CardContent>
      </Card>
    </template>

    <!-- ── Notifications ───────────────────────────────────────── -->
    <template v-else-if="section === 'notifications'">
      <p class="set-label">Notifications</p>
      <Card>
        <CardContent class="pt-6">
          <div class="flex flex-col">
            <label class="toggle-row">
              <span>Hot lead email alerts</span>
              <input type="checkbox" v-model="notifPrefs.hot_lead_email" @change="saveNotifPrefs" />
            </label>
            <label class="toggle-row">
              <span>Weekly report</span>
              <input type="checkbox" v-model="notifPrefs.weekly_report" @change="saveNotifPrefs" />
            </label>
            <label class="toggle-row">
              <span>Competitor change alerts</span>
              <input type="checkbox" v-model="notifPrefs.competitor_changes" @change="saveNotifPrefs" />
            </label>
            <label class="toggle-row">
              <span>Audit complete alerts</span>
              <input type="checkbox" v-model="notifPrefs.audit_complete" @change="saveNotifPrefs" />
            </label>
          </div>
        </CardContent>
      </Card>
    </template>

    <!-- ── Appearance ──────────────────────────────────────────── -->
    <template v-else-if="section === 'appearance'">
      <p class="set-label">Appearance</p>
      <Card>
        <CardContent class="pt-6">
          <div class="flex flex-col">
            <label class="toggle-row">
              <span>Dark Mode</span>
              <input type="checkbox" :checked="appStore.theme === 'dark'" @change="appStore.toggleTheme()" />
            </label>
          </div>
        </CardContent>
      </Card>
    </template>
  </SettingsShell>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import authApi from '@/api/auth'
import notificationsApi from '@/api/notifications'
import SettingsShell from '@/components/settings/SettingsShell.vue'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const authStore = useAuthStore()
const appStore = useAppStore()
const route = useRoute()
const router = useRouter()
const saving = ref(false)
const deleting = ref(false)

// The active section comes from the URL (?section=...), so the shell's
// sub-nav links are ordinary router-links and every section deep-links.
const SECTIONS = ['account', 'usage', 'notifications', 'appearance']
const section = computed(() =>
  SECTIONS.includes(route.query.section) ? route.query.section : 'account',
)

// Deletion is irreversible, so the confirmation is deliberately manual:
// the user must type their email exactly. A misclick cannot pass it.
async function confirmDeleteAccount() {
  const email = authStore.user?.email || profile.value.email
  const typed = window.prompt(
    `This permanently deletes your account and all data. There is no undo.\n\n` +
    `Type your email (${email}) to confirm:`,
  )
  if (typed === null) return
  if (typed.trim().toLowerCase() !== String(email).toLowerCase()) {
    window.alert('Email did not match — nothing was deleted.')
    return
  }
  deleting.value = true
  try {
    await authApi.deleteMe()
    authStore.clearAuth()
    router.push('/')
  } catch (e) {
    window.alert(e?.response?.data?.error?.message || "Deletion failed — nothing was removed.")
  } finally {
    deleting.value = false
  }
}

const profile = ref({
  full_name: '',
  email: '',
  company_name: '',
})

const notifPrefs = ref({
  hot_lead_email: true,
  weekly_report: true,
  competitor_changes: true,
  audit_complete: true,
})

// ── AI Usage ──
const usage = ref(null)
const usageLoading = ref(false)

// The server returns exactly the current billing period — the daily series
// IS the window, no client-side re-windowing. The only derived rollup is
// the trailing-7-days pair of tiles.
const weekTotals = computed(() => {
  const daily = usage.value?.daily || []
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 6)
  cutoff.setHours(0, 0, 0, 0)
  let tokens = 0, calls = 0
  for (const d of daily) {
    if (d.day && new Date(d.day) >= cutoff) {
      tokens += d.tokens || 0
      calls += d.calls || 0
    }
  }
  return { tokens, calls }
})

const dailySeries = computed(() => usage.value?.daily || [])

const periodLabel = computed(() => {
  const p = usage.value?.period
  if (!p?.start) return ''
  const opts = { month: 'short', day: 'numeric' }
  const start = new Date(p.start).toLocaleDateString('en-US', opts)
  const end = new Date(p.end).toLocaleDateString('en-US', opts)
  return `${start} – ${end}`
})

function pctOfMax(value, series) {
  const max = Math.max(...series.map(x => x.tokens || 0))
  return max > 0 ? Math.max(4, (value / max) * 100) : 4
}


function formatNum(n) { return (n || 0).toLocaleString() }
function planLabel(k) {
  return { free: 'Free', pro: 'Pro', business: 'Business' }[k] || (k || 'Free')
}
function formatTokens(n) {
  if (!n) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

function formatDay(isoDate) {
  if (!isoDate) return ''
  const d = new Date(isoDate)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

async function loadUsage() {
  usageLoading.value = true
  try {
    const { data } = await authApi.aiUsage()
    usage.value = data
  } catch (e) {
    console.error('Failed to load AI usage', e)
  } finally {
    usageLoading.value = false
  }
}


onMounted(async () => {
  if (authStore.user) {
    profile.value = {
      full_name: authStore.user.full_name || '',
      email: authStore.user.email || '',
      company_name: authStore.user.company_name || '',
    }
  }
  try {
    const { data } = await notificationsApi.getPreferences()
    const d = data
    if (d) notifPrefs.value = { ...notifPrefs.value, ...d }
  } catch {}

  // Load AI usage
  loadUsage()
})

async function saveProfile() {
  saving.value = true
  try {
    // Would call auth API to update profile
    // For now, update local state
    if (authStore.user) {
      authStore.user.full_name = profile.value.full_name
      authStore.user.company_name = profile.value.company_name
    }
  } finally {
    saving.value = false
  }
}

async function saveNotifPrefs() {
  try {
    await notificationsApi.updatePreferences(notifPrefs.value)
  } catch {}
}
</script>

<style scoped>
/* Uppercase group label above each card, treasury-style. */
.set-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted-foreground);
  margin: 0 0 10px;
}

.cap-bar-fill {
  background: var(--chart-2);
  transition: width 0.2s;
}
.cap-bar-warn { background: var(--chart-3); }
.cap-bar-exceeded { background: var(--destructive); }

.toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
  color: var(--foreground);
  cursor: pointer;
}
.toggle-row:last-child { border-bottom: none; }
.toggle-row input[type="checkbox"] {
  accent-color: var(--primary);
  width: 18px;
  height: 18px;
}

/* ── Spinner ── */
.spinner {
  width: 18px; height: 18px;
  border: 2px solid var(--border);
  border-top-color: var(--chart-1);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.usage-section-title {
  font-size: 13px; font-weight: 700; color: var(--muted-foreground);
  text-transform: uppercase; letter-spacing: 0.05em;
  margin: 0 0 10px; padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

/* Daily chart */
.usage-chart {
  display: flex; align-items: flex-end; gap: 3px;
  height: 120px; padding: 8px 0;
}
.chart-bar-wrap {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; height: 100%; justify-content: flex-end;
  cursor: pointer;
}
.chart-bar {
  width: 100%; min-width: 4px; max-width: 32px;
  background: linear-gradient(180deg, var(--chart-1), var(--chart-4));
  border-radius: 3px 3px 0 0; transition: height 0.3s ease;
}
.chart-bar-wrap:hover .chart-bar { background: var(--primary); }
.chart-label {
  font-size: 9px; color: var(--muted-foreground); margin-top: 4px;
  writing-mode: vertical-rl; text-orientation: mixed;
  transform: rotate(180deg); white-space: nowrap;
}
</style>
