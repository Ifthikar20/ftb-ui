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
              AI Usage &amp; Tokens
            </CardTitle>
            <select v-model="usagePeriod" @change="loadUsage" class="rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </CardHeader>
          <CardContent>
            <div v-if="usageLoading" class="flex items-center gap-2.5 p-8 text-sm text-muted-foreground">
              <div class="spinner"></div>
              <span>Loading usage data...</span>
            </div>

            <div v-else-if="usage">
              <!-- Monthly Cap Progress -->
              <div v-if="usage.cap_status && usage.cap_status.cap_usd > 0" class="mb-5 rounded-lg border border-border bg-muted px-3.5 py-3">
                <div class="mb-1.5 flex justify-between text-sm text-foreground">
                  <span class="font-semibold">Monthly AI spend</span>
                  <span class="text-muted-foreground">
                    ${{ usage.cap_status.spent_usd.toFixed(2) }} / ${{ usage.cap_status.cap_usd.toFixed(2) }}
                    ({{ usage.cap_status.pct }}%)
                  </span>
                </div>
                <div class="h-2 overflow-hidden rounded bg-border">
                  <div
                    class="cap-bar-fill h-full"
                    :class="{ 'cap-bar-warn': usage.cap_status.pct >= 80, 'cap-bar-exceeded': usage.cap_status.exceeded }"
                    :style="{ width: Math.min(100, usage.cap_status.pct) + '%' }"
                  ></div>
                </div>
                <p v-if="usage.cap_status.exceeded" class="mt-2 text-xs text-destructive">
                  Cap reached. New AI runs will be blocked until next month or until you raise the cap.
                </p>
                <div class="mt-2.5 flex items-center gap-2">
                  <label class="text-xs font-semibold text-muted-foreground" for="capInput">Cap (USD)</label>
                  <input
                    id="capInput"
                    v-model.number="capInput"
                    type="number"
                    step="1"
                    min="0"
                    class="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    :disabled="capSaving"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    :disabled="capSaving || capInput === usage.cap_status.cap_usd"
                    @click="saveCap"
                  >{{ capSaving ? 'Saving…' : 'Save' }}</Button>
                  <span v-if="capError" class="text-xs text-destructive">{{ capError }}</span>
                </div>
              </div>
              <div v-else-if="usage.cap_status" class="mb-5 rounded-lg border border-border bg-muted px-3.5 py-3 text-xs italic text-muted-foreground">
                <div>No monthly spend cap set. Add one to control runaway AI cost.</div>
                <div class="mt-2.5 flex items-center gap-2 not-italic">
                  <label class="text-xs font-semibold text-muted-foreground" for="capInputNew">Cap (USD)</label>
                  <input
                    id="capInputNew"
                    v-model.number="capInput"
                    type="number"
                    step="1"
                    min="0"
                    placeholder="50"
                    class="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    :disabled="capSaving"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    :disabled="capSaving || !capInput"
                    @click="saveCap"
                  >{{ capSaving ? 'Saving…' : 'Set cap' }}</Button>
                  <span v-if="capError" class="text-xs text-destructive">{{ capError }}</span>
                </div>
              </div>

              <!-- Totals Row -->
              <div class="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
                <div class="rounded-xl border border-border bg-muted p-3.5 text-center">
                  <div class="text-xl font-bold tracking-tight text-foreground">{{ formatNum(usage.totals.calls) }}</div>
                  <div class="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">API Calls</div>
                </div>
                <div class="rounded-xl border border-border bg-muted p-3.5 text-center">
                  <div class="text-xl font-bold tracking-tight text-foreground">{{ formatTokens(usage.totals.total_tokens) }}</div>
                  <div class="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total Tokens</div>
                </div>
                <div class="rounded-xl border border-border bg-muted p-3.5 text-center">
                  <div class="text-xl font-bold tracking-tight text-foreground">{{ formatTokens(usage.totals.input_tokens) }}</div>
                  <div class="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Input Tokens</div>
                </div>
                <div class="rounded-xl border border-border bg-muted p-3.5 text-center">
                  <div class="text-xl font-bold tracking-tight text-foreground">{{ formatTokens(usage.totals.output_tokens) }}</div>
                  <div class="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Output Tokens</div>
                </div>
                <div class="rounded-xl border border-border bg-accent p-3.5 text-center">
                  <div class="text-xl font-bold tracking-tight text-[color:var(--chart-1)]">${{ usage.totals.estimated_cost_usd.toFixed(4) }}</div>
                  <div class="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Est. Cost</div>
                </div>
              </div>

              <!-- Module Breakdown -->
              <div class="mb-5" v-if="usage.by_module.length">
                <h4 class="usage-section-title">Usage by Module</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Module</TableHead>
                      <TableHead>Calls</TableHead>
                      <TableHead>Tokens</TableHead>
                      <TableHead>Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow v-for="m in usage.by_module" :key="m.module">
                      <TableCell class="font-semibold text-foreground">
                        <span class="inline-flex items-center gap-2">
                          <span class="module-dot" :class="m.module"></span>
                          {{ moduleLabels[m.module] || m.module }}
                        </span>
                      </TableCell>
                      <TableCell>{{ formatNum(m.calls) }}</TableCell>
                      <TableCell>{{ formatTokens(m.tokens) }}</TableCell>
                      <TableCell class="font-semibold text-[color:var(--chart-1)]">${{ m.cost.toFixed(4) }}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <!-- Provider Breakdown -->
              <div class="mb-5" v-if="usage.by_provider && usage.by_provider.length">
                <h4 class="usage-section-title">Usage by Provider</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead>Calls</TableHead>
                      <TableHead>Tokens</TableHead>
                      <TableHead>Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow v-for="p in usage.by_provider" :key="p.provider">
                      <TableCell class="font-medium text-muted-foreground">{{ providerLabels[p.provider] || p.provider }}</TableCell>
                      <TableCell>{{ formatNum(p.calls) }}</TableCell>
                      <TableCell>{{ formatTokens(p.tokens) }}</TableCell>
                      <TableCell class="font-semibold text-[color:var(--chart-1)]">${{ p.cost.toFixed(4) }}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <!-- Role Split -->
              <div class="mb-5" v-if="usage.by_role && usage.by_role.length">
                <h4 class="usage-section-title">Upstream vs Internal Parsing</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>Calls</TableHead>
                      <TableHead>Tokens</TableHead>
                      <TableHead>Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow v-for="r in usage.by_role" :key="r.role">
                      <TableCell class="font-medium text-muted-foreground">{{ roleLabels[r.role] || r.role }}</TableCell>
                      <TableCell>{{ formatNum(r.calls) }}</TableCell>
                      <TableCell>{{ formatTokens(r.tokens) }}</TableCell>
                      <TableCell class="font-semibold text-[color:var(--chart-1)]">${{ r.cost.toFixed(4) }}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <!-- Model Breakdown -->
              <div class="mb-5" v-if="usage.by_model.length">
                <h4 class="usage-section-title">Usage by Model</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model</TableHead>
                      <TableHead>Calls</TableHead>
                      <TableHead>Tokens</TableHead>
                      <TableHead>Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow v-for="m in usage.by_model" :key="m.model_name">
                      <TableCell class="font-mono text-xs font-medium text-muted-foreground">{{ m.model_name }}</TableCell>
                      <TableCell>{{ formatNum(m.calls) }}</TableCell>
                      <TableCell>{{ formatTokens(m.tokens) }}</TableCell>
                      <TableCell class="font-semibold text-[color:var(--chart-1)]">${{ m.cost.toFixed(4) }}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <!-- Daily Chart -->
              <div class="mb-5" v-if="usage.daily.length">
                <h4 class="usage-section-title">Daily Token Usage</h4>
                <div class="usage-chart">
                  <div v-for="d in usage.daily" :key="d.day" class="chart-bar-wrap" :title="`${d.day}: ${formatTokens(d.tokens)} tokens, ${d.calls} calls`">
                    <div class="chart-bar" :style="{ height: barHeight(d.tokens) + '%' }"></div>
                    <span class="chart-label">{{ formatDay(d.day) }}</span>
                  </div>
                </div>
              </div>

              <!-- Empty state -->
              <div v-if="!usage.by_module.length" class="flex flex-col items-center gap-2.5 p-8 text-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" stroke-width="1.5"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M12 6v6l4 2"/></svg>
                <p class="max-w-md text-sm text-muted-foreground">No AI usage recorded yet. Token tracking starts automatically when you use AI features like Lead Finder, Agents, Messaging, or LLM Dashboard.</p>
              </div>
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
import { ref, onMounted } from 'vue'
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
const capInput = ref(0)
const capSaving = ref(false)
const capError = ref('')
const usageLoading = ref(false)
const usagePeriod = ref('30')

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
    const res = await fetch(`/api/v1/auth/me/ai-usage/?days=${usagePeriod.value}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (res.ok) {
      usage.value = await res.json()
      // Seed the cap input from server so the Save button can detect changes.
      const cap = usage.value?.cap_status?.cap_usd
      if (typeof cap === 'number') capInput.value = cap
    } else {
      console.warn('AI usage fetch returned', res.status)
    }
  } catch (e) {
    console.error('Failed to load AI usage', e)
  } finally {
    usageLoading.value = false
  }
}

async function saveCap() {
  capError.value = ''
  const value = Number(capInput.value)
  if (Number.isNaN(value) || value < 0) {
    capError.value = 'Enter a non-negative number.'
    return
  }
  capSaving.value = true
  try {
    const token = authStore.token || localStorage.getItem('access_token')
    const res = await fetch('/api/v1/auth/me/', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ monthly_ai_cost_cap_usd: value }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      capError.value = body?.detail || 'Could not save cap.'
      return
    }
    await loadUsage()
  } catch (e) {
    capError.value = 'Network error. Try again.'
  } finally {
    capSaving.value = false
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
