<template>
  <div class="settings-page mx-auto max-w-4xl px-6 py-8 sm:px-8">
    <div class="mb-8">
      <h1 class="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
      <p class="mt-1 text-sm text-muted-foreground">Manage your account, preferences, and AI usage.</p>
    </div>

    <Tabs default-value="profile" class="w-full">
      <TabsList class="mb-6">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="usage">AI Usage</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="appearance">Appearance</TabsTrigger>
      </TabsList>

      <!-- Profile -->
      <TabsContent value="profile">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form @submit.prevent="saveProfile" class="flex max-w-md flex-col gap-4">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-foreground">Full Name</label>
                <input v-model="profile.full_name" class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-foreground">Email</label>
                <input v-model="profile.email" class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60" disabled />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-foreground">Company</label>
                <input v-model="profile.company_name" class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <Button type="submit" size="sm" class="w-fit" :disabled="saving">{{ saving ? 'Saving...' : 'Save Changes' }}</Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- AI Usage & Token Tracking -->
      <TabsContent value="usage">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between gap-4 space-y-0">
            <CardTitle class="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M12 6v6l4 2"/></svg>
              AI Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div v-if="usageLoading" class="flex items-center gap-2.5 p-8 text-sm text-muted-foreground">
              <div class="spinner"></div>
              <span>Loading usage data...</span>
            </div>

            <div v-else-if="usage">
              <!-- Monthly allowance, expressed in tokens. Dollar figures stay
                   in the database for audit; the user-facing unit is usage. -->
              <div v-if="usage.cap_status && usage.cap_status.capacity_tokens > 0" class="mb-6 rounded-xl border border-border bg-muted px-4 py-3.5">
                <div class="mb-1.5 flex items-baseline justify-between">
                  <span class="text-sm font-semibold text-foreground">Monthly usage</span>
                  <span class="text-sm text-muted-foreground">
                    {{ formatTokens(usage.cap_status.used_tokens) }} of ~{{ formatTokens(usage.cap_status.capacity_tokens) }} tokens<span class="align-super text-[10px]">*</span>
                    <span class="ml-1 font-semibold text-foreground">({{ usage.cap_status.pct }}%)</span>
                  </span>
                </div>
                <div class="h-2 overflow-hidden rounded bg-border">
                  <div
                    class="cap-bar-fill h-full"
                    :class="{ 'cap-bar-warn': usage.cap_status.warning, 'cap-bar-exceeded': usage.cap_status.exceeded }"
                    :style="{ width: Math.min(100, usage.cap_status.pct || 0) + '%' }"
                  ></div>
                </div>
                <p class="mt-1.5 text-[11px] text-muted-foreground">
                  Allowance renews {{ new Date(usage.cap_status.resets_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) }}.
                </p>
                <p v-if="usage.cap_status.exceeded" class="mt-2 text-xs font-semibold text-destructive">
                  Monthly allowance reached. AI features resume at the renewal date.
                </p>
                <p v-else-if="usage.cap_status.warning" class="mt-2 text-xs font-semibold text-[#B25E09]">
                  Over 80% of this month's allowance used.
                </p>
              </div>

              <!-- Month + week, one screen, no period picker -->
              <div class="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                <div class="rounded-xl border border-border bg-muted p-3.5 text-center">
                  <div class="text-xl font-bold tracking-tight text-foreground">{{ formatTokens(monthTotals.tokens) }}</div>
                  <div class="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tokens · 30 days</div>
                </div>
                <div class="rounded-xl border border-border bg-muted p-3.5 text-center">
                  <div class="text-xl font-bold tracking-tight text-foreground">{{ formatNum(monthTotals.calls) }}</div>
                  <div class="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Requests · 30 days</div>
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

              <!-- Daily usage (last 30 days) -->
              <div class="mb-6" v-if="dailySeries.length">
                <h4 class="usage-section-title">Daily usage</h4>
                <div class="usage-chart">
                  <div v-for="d in dailySeries" :key="d.day" class="chart-bar-wrap" :title="`${d.day}: ${formatTokens(d.tokens)} tokens, ${d.calls} requests`">
                    <div class="chart-bar" :style="{ height: pctOfMax(d.tokens, dailySeries) + '%' }"></div>
                    <span class="chart-label">{{ formatDay(d.day) }}</span>
                  </div>
                </div>
              </div>

              <!-- Weekly usage (last 12 weeks) -->
              <div class="mb-6" v-if="weeklySeries.length">
                <h4 class="usage-section-title">Weekly usage</h4>
                <div class="usage-chart">
                  <div v-for="w in weeklySeries" :key="w.week" class="chart-bar-wrap" :title="`Week of ${formatDay(w.week)}: ${formatTokens(w.tokens)} tokens, ${w.calls} requests`">
                    <div class="chart-bar" :style="{ height: pctOfMax(w.tokens, weeklySeries) + '%' }"></div>
                    <span class="chart-label">{{ formatDay(w.week) }}</span>
                  </div>
                </div>
              </div>

              <!-- Empty state -->
              <div v-if="!usage.totals.calls" class="flex flex-col items-center gap-2.5 p-8 text-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" stroke-width="1.5"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M12 6v6l4 2"/></svg>
                <p class="max-w-md text-sm text-muted-foreground">No AI usage recorded yet. Token tracking starts automatically when you use AI features like audits, agents, or the prompt library.</p>
              </div>

              <p class="border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
                <span class="align-super text-[10px]">*</span>
                Token capacity is an estimate and varies with the mix of AI models
                your account uses. Usage is calculated against the current market
                rates of the underlying AI providers (Anthropic, OpenAI, xAI,
                Perplexity, Google); allowances may be adjusted if provider
                pricing changes.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- Notification Preferences -->
      <TabsContent value="notifications">
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="flex max-w-md flex-col">
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
      </TabsContent>

      <!-- Theme -->
      <TabsContent value="appearance">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="flex max-w-md flex-col">
              <label class="toggle-row">
                <span>Dark Mode</span>
                <input type="checkbox" :checked="appStore.theme === 'dark'" @change="appStore.toggleTheme()" />
              </label>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import notificationsApi from '@/api/notifications'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

const authStore = useAuthStore()
const appStore = useAppStore()
const saving = ref(false)

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

// Last-7-days rollup derived client-side from the 30-day daily series, so
// month and week share one screen without a period picker or second fetch.
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

// Client-side rollups from the 90-day daily series: the daily chart shows
// the last 30 days, the weekly chart buckets the full window by week, and
// the tiles sum fixed ranges — one fetch, no period picker.
function entriesSince(days) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - (days - 1))
  cutoff.setHours(0, 0, 0, 0)
  return (usage.value?.daily || []).filter(d => d.day && new Date(d.day) >= cutoff)
}

const dailySeries = computed(() => entriesSince(30))

const monthTotals = computed(() => {
  let tokens = 0, calls = 0
  for (const d of dailySeries.value) { tokens += d.tokens || 0; calls += d.calls || 0 }
  return { tokens, calls }
})

const weeklySeries = computed(() => {
  const buckets = new Map()
  for (const d of usage.value?.daily || []) {
    if (!d.day) continue
    const date = new Date(d.day)
    // Bucket by the Monday of the entry's week.
    const monday = new Date(date)
    monday.setDate(date.getDate() - ((date.getDay() + 6) % 7))
    const key = monday.toISOString().slice(0, 10)
    const b = buckets.get(key) || { week: key, tokens: 0, calls: 0 }
    b.tokens += d.tokens || 0
    b.calls += d.calls || 0
    buckets.set(key, b)
  }
  return [...buckets.values()].sort((a, b) => a.week.localeCompare(b.week))
})

function pctOfMax(value, series) {
  const max = Math.max(...series.map(x => x.tokens || 0))
  return max > 0 ? Math.max(4, (value / max) * 100) : 4
}


const moduleLabels = {
  llm_ranking: 'LLM Dashboard',
  rag: 'RAG / Embeddings',
  onboarding: 'Onboarding scan',
}

const providerLabels = {
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI (GPT)',
  google: 'Google (Gemini)',
  perplexity: 'Perplexity',
  meta: 'Meta (Llama)',
  mistral: 'Mistral AI',
  cohere: 'Cohere',
  deepseek: 'DeepSeek',
  xai: 'xAI (Grok)',
  amazon: 'Amazon (Nova / Bedrock)',
}

const roleLabels = {
  upstream: 'Upstream LLM (audit query)',
  extraction: 'Internal parsing (Haiku extraction)',
  prompt_generation: 'Prompt generation',
  context_inference: 'Audit context inference',
}

function formatNum(n) { return (n || 0).toLocaleString() }
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

function barHeight(tokens) {
  if (!usage.value?.daily?.length) return 0
  const max = Math.max(...usage.value.daily.map(d => d.tokens || 0))
  return max > 0 ? Math.max(4, (tokens / max) * 100) : 4
}

async function loadUsage() {
  usageLoading.value = true
  try {
    // Use the auth store's accessToken (the previous code referenced
    // ``authStore.token`` which doesn't exist — the store exports
    // ``accessToken`` — so the request silently 401'd and the Usage
    // card stayed empty).
    const token = authStore.accessToken || localStorage.getItem('access_token')
    const res = await fetch('/api/v1/auth/me/ai-usage/?days=90', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (res.ok) {
      // Responses are enveloped {success, data} by the API middleware;
      // assigning the wrapper left every field undefined and the tab
      // permanently on its empty state.
      const body = await res.json()
      usage.value = body?.data || body
    } else {
      console.warn('AI usage fetch returned', res.status)
    }
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
    const d = data?.data || data
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

.module-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  display: inline-block;
}
.module-dot.llm_ranking { background: var(--chart-1); }
.module-dot.rag { background: var(--chart-2); }
.module-dot.onboarding { background: var(--chart-3); }

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
