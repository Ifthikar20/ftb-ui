<template>
  <div class="pd-page fade-in">
    <!-- Breadcrumb chip -->
    <div class="pd-breadcrumb">
      <router-link :to="`/llm-ranking/${websiteId}/prompts`" class="pd-bc-link">
        <ChevronLeft :size="14" :stroke-width="2" />
        Prompts
      </router-link>
      <span class="pd-bc-sep">/</span>
      <span class="pd-bc-current">{{ promptTextShort }}</span>
    </div>

    <!-- Header -->
    <header class="pd-header">
      <div class="pd-header-top">
        <div>
          <div class="pd-header-eyebrow">
            <Sparkles :size="12" :stroke-width="2" />
            <span>Prompt</span>
          </div>
          <h1 class="pd-title">{{ promptText || 'Loading…' }}</h1>
        </div>
        <div v-if="detail" class="pd-header-actions">
          <button
            type="button"
            class="pd-crawl-btn"
            :disabled="scanInFlight || !!scanQueued"
            @click="runScan"
          >
            <Repeat :size="14" :stroke-width="2" />
            <span v-if="scanInFlight">Scanning…</span>
            <span v-else-if="scanQueued">Scan queued</span>
            <span v-else>Run scan</span>
          </button>
          <button
            type="button"
            class="pd-toggle-btn"
            :class="{ 'is-active': detail?.status === 'active' }"
            :disabled="toggleInFlight"
            @click="togglePromptActive"
          >
            {{ toggleInFlight ? '…' : (detail?.status === 'active' ? 'Disable prompt' : 'Enable prompt') }}
          </button>
        </div>
      </div>
      <div v-if="scanStatusLine" class="pd-scan-status" :class="`is-${scanStatusKind}`">
        <span class="pd-scan-dot" />
        <span>{{ scanStatusLine }}</span>
        <span v-if="scanErrorLine" class="pd-scan-error">— {{ scanErrorLine }}</span>
      </div>
    </header>

    <!-- Metadata strip -->
    <div class="pd-meta-grid">
      <div class="pd-meta">
        <div class="pd-meta-label"><Clock :size="12" :stroke-width="2"/>Date added</div>
        <div class="pd-meta-val">{{ relativeTime(detail?.prompt?.created_at) }}</div>
      </div>
      <div class="pd-meta">
        <div class="pd-meta-label"><Tag :size="12" :stroke-width="2"/>Topic</div>
        <div class="pd-meta-val">{{ detail?.prompt?.topic || '—' }}</div>
      </div>
      <div class="pd-meta">
        <div class="pd-meta-label"><Activity :size="12" :stroke-width="2"/>Demand</div>
        <div class="pd-meta-val pd-meta-bars">
          <span v-for="i in 4" :key="i" class="pd-bar" :class="{ 'is-on': demandLevel >= i }"></span>
        </div>
      </div>
      <div class="pd-meta">
        <div class="pd-meta-label"><Globe :size="12" :stroke-width="2"/>Location</div>
        <div class="pd-meta-val">
          <template v-if="detail?.prompt?.location">{{ flag(detail.prompt.location) }} {{ detail.prompt.location }}</template>
          <template v-else>Global</template>
        </div>
      </div>
      <div class="pd-meta">
        <div class="pd-meta-label"><CircleDot :size="12" :stroke-width="2"/>Status</div>
        <div class="pd-meta-val">
          <span class="pd-status" :class="`is-${detail?.status || 'inactive'}`">
            <span class="pd-status-dot"></span>
            {{ detail?.status === 'active' ? 'Active' : 'Inactive' }}
          </span>
        </div>
      </div>
      <div v-if="detail?.prompt?.effectiveness_score != null" class="pd-meta">
        <div class="pd-meta-label"><Trophy :size="12" :stroke-width="2"/>Effectiveness</div>
        <div class="pd-meta-val">{{ detail.prompt.effectiveness_score }}<span class="pd-mute"> / 100</span></div>
      </div>
    </div>

    <!-- Tags + template -->
    <div v-if="promptTags.length || detail?.prompt?.template_text" class="pd-meta-extra">
      <div v-if="promptTags.length" class="pd-tag-row">
        <span v-for="t in promptTags" :key="t" class="pd-tag-chip">{{ t }}</span>
      </div>
      <div
        v-if="detail?.prompt?.template_text && detail.prompt.template_text !== detail.prompt.text"
        class="pd-template-row"
      >
        <span class="pd-template-label">Template</span>
        <code class="pd-template-text">{{ detail.prompt.template_text }}</code>
      </div>
    </div>

    <!-- Empty / extractor-blanked banners -->
    <div v-if="detail && !succeededResponses" class="pd-empty-banner">
      <strong>No scan data for this prompt yet.</strong>
      <span>Charts and brands populate once a scan runs. Triggering one above will query every configured model with this prompt.</span>
    </div>
    <div v-else-if="detail && !topBrands.length" class="pd-empty-note">
      {{ succeededResponses }} {{ succeededResponses === 1 ? 'response' : 'responses' }} captured — no known brand named. See Recent chats below.
    </div>

    <!-- Overview: Visibility chart + Top brands table -->
    <section class="pd-overview-head">
      <h2 class="pd-section-title">
        <BarChart3 :size="16" :stroke-width="2"/>
        Overview
      </h2>
      <p class="pd-section-sub">How often each brand appears in AI-generated discussions of this prompt.</p>
    </section>

    <div class="pd-grid pd-grid-2">
      <div class="pd-card">
        <div class="pd-card-head">
          <h3>
            <ChartLine :size="14" :stroke-width="2"/>
            Visibility
          </h3>
          <span class="pd-card-meta">
            Across {{ detail?.total_responses || 0 }} model responses
          </span>
        </div>
        <div class="pd-chart">
          <Bar v-if="chartData" :data="chartData" :options="chartOptions" />
          <div v-else class="pd-empty-inline">
            <Inbox :size="32" :stroke-width="1.5"/>
            <p v-if="succeededResponses">
              {{ succeededResponses }} response{{ succeededResponses === 1 ? '' : 's' }} captured, but no brand was named in any of them.
            </p>
            <p v-else>No model responses yet for this prompt.</p>
          </div>
        </div>
      </div>

      <div class="pd-card">
        <div class="pd-card-head">
          <h3>
            <Trophy :size="14" :stroke-width="2"/>
            Top {{ Math.min(7, topBrands.length || 0) }} brands
          </h3>
        </div>
        <div class="pd-table-wrap">
          <Table class="pd-table">
            <TableHeader>
              <TableRow>
                <TableHead class="num">#</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead class="num">
                  <span class="pd-th-help" :title="HELP.visibility">Visibility<sup>?</sup></span>
                </TableHead>
                <TableHead class="num">
                  <span class="pd-th-help" :title="HELP.sov">SOV<sup>?</sup></span>
                </TableHead>
                <TableHead>
                  <span class="pd-th-help" :title="HELP.models">Models<sup>?</sup></span>
                </TableHead>
                <TableHead class="num">
                  <span class="pd-th-help" :title="HELP.sentiment">Sentiment<sup>?</sup></span>
                </TableHead>
                <TableHead class="num">
                  <span class="pd-th-help" :title="HELP.position">Position<sup>?</sup></span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="(b, i) in topBrands" :key="b.name" :class="{ 'is-self': b.is_self }">
                <TableCell class="num">{{ i + 1 }}</TableCell>
                <TableCell>
                  <span class="pd-brand-cell">
                    <BrandLogo :name="b.name" :size="20" />
                    <span class="pd-brand-name">{{ b.name }}</span>
                    <span v-if="b.is_self" class="pd-self-pill">you</span>
                  </span>
                </TableCell>
                <TableCell class="num">{{ b.visibility_pct }}%</TableCell>
                <TableCell class="num">{{ b.sov_pct }}%</TableCell>
                <TableCell>
                  <span class="pd-models-cell" :title="modelsTip(b.models)">
                    <span
                      v-for="mk in (b.models || [])"
                      :key="mk"
                      class="pd-model-dot pd-model-dot-sm"
                      :style="{ background: modelStyle(mk).color }"
                      :title="modelStyle(mk).label"
                    >{{ modelStyle(mk).label[0] }}</span>
                    <span v-if="(b.model_count || 0) > 1" class="pd-models-count">×{{ b.model_count }}</span>
                    <span v-if="!(b.models || []).length" class="text-muted">—</span>
                  </span>
                </TableCell>
                <TableCell class="num">
                  <span v-if="b.sentiment_score != null" class="pd-sent" :title="sentimentTip(b.sentiment_score)">
                    <span class="pd-sent-dot" :class="sentimentClass(b.sentiment_score)"></span>
                    {{ b.sentiment_score }}
                  </span>
                  <span v-else class="text-muted">—</span>
                </TableCell>
                <TableCell class="num">
                  <span v-if="b.avg_position != null">#{{ b.avg_position }}</span>
                  <span v-else class="text-muted">—</span>
                </TableCell>
              </TableRow>
              <TableRow v-if="!topBrands.length">
                <TableCell colspan="6" class="pd-table-empty">No brand mentions yet.</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>

    <!-- Visibility by model -->
    <section class="pd-overview-head" style="margin-top: 28px">
      <h2 class="pd-section-title">
        <BarChart3 :size="16" :stroke-width="2"/>
        Visibility by model
      </h2>
      <p class="pd-section-sub">
        How often {{ brandLabel }} appears in each model's answers to this prompt.
        <span v-if="modelCompletion" class="pd-completion" :class="{ 'is-busy': scanStatusKind === 'running' }">
          · {{ modelCompletion }}
        </span>
      </p>
    </section>

    <div class="pd-card">
      <div class="pd-bymodel">
        <div v-for="m in (detail?.by_model || [])" :key="m.provider" class="pd-bymodel-row">
          <span class="pd-model-dot" :style="{ background: modelStyle(m.model).color }">{{ modelStyle(m.model).label[0] }}</span>
          <span class="pd-bymodel-name">{{ m.label }}</span>
          <span v-if="!m.configured" class="pd-bymodel-na">Not configured</span>
          <span v-else-if="!m.responses && m.unavailable" class="pd-bymodel-na pd-bymodel-unavail">
            Service unavailable
          </span>
          <span v-else-if="!m.responses && m.failed" class="pd-bymodel-na pd-bymodel-unavail">
            Couldn't reach model — will retry
          </span>
          <span v-else-if="!m.responses && scanStatusKind === 'running'" class="pd-bymodel-na pd-bymodel-scanning">
            Scanning…
          </span>
          <template v-else-if="m.responses">
            <div class="pd-bymodel-bar"><span :style="{ width: m.visibility_pct + '%' }"></span></div>
            <span class="pd-bymodel-val">{{ m.visibility_pct }}%</span>
            <span class="pd-bymodel-done" title="Model answered">✓ answered</span>
          </template>
          <span v-else class="pd-bymodel-na pd-bymodel-nodata">No data yet</span>
        </div>
        <div v-if="!(detail?.by_model || []).length" class="pd-mute" style="padding: 8px 0">No model data yet.</div>
      </div>

      <!-- Per-model rank distribution -->
      <div v-if="modelsWithRanks.length" class="pd-rank-dist">
        <div class="pd-rank-dist-head">Rank distribution per model</div>
        <div v-for="m in modelsWithRanks" :key="m.provider" class="pd-rank-row">
          <span class="pd-rank-row-label">
            <span class="pd-model-dot pd-model-dot-sm" :style="{ background: modelStyle(m.model).color }">{{ modelStyle(m.model).label[0] }}</span>
            {{ m.label }}
            <span v-if="m.avg_rank != null" class="pd-mute">· avg #{{ m.avg_rank }}</span>
          </span>
          <div class="pd-rank-stack">
            <span
              v-for="r in rankBucketOrder"
              :key="r"
              class="pd-rank-seg"
              :class="rankBucketClass(r)"
              :style="{ flexGrow: m.rank_buckets[r] || 0 }"
              :title="`Rank ${r}: ${m.rank_buckets[r] || 0}`"
            >
              <span v-if="m.rank_buckets[r]">{{ m.rank_buckets[r] }}</span>
            </span>
          </div>
        </div>
        <div class="pd-rank-legend">
          <span v-for="r in rankBucketOrder" :key="r" class="pd-rank-legend-item">
            <span class="pd-rank-legend-dot" :class="rankBucketClass(r)" />
            Rank {{ r }}
          </span>
        </div>
      </div>
    </div>

    <!-- Fanout queries -->
    <section v-if="fanouts.length || lastFanoutRun" class="pd-overview-head" style="margin-top: 28px">
      <h2 class="pd-section-title">
        <Repeat :size="16" :stroke-width="2"/>
        Fanout queries
      </h2>
      <p class="pd-section-sub">Related sub-queries a search-augmented model would run to research this prompt.</p>
    </section>

    <div v-if="fanouts.length || lastFanoutRun" class="pd-card pd-fanout-card">
      <div v-if="lastFanoutRun" class="pd-fanout-meta">
        <span class="pd-mute">Last fan-out:</span>
        <span class="pd-status" :class="`is-${lastFanoutRun.status === 'completed' ? 'active' : 'inactive'}`">
          <span class="pd-status-dot"></span>
          {{ lastFanoutRun.status }}
        </span>
        <span class="pd-mute">
          · {{ lastFanoutRun.fanout_count || 0 }} sub-queries
          · {{ lastFanoutRun.source_count || 0 }} sources
        </span>
      </div>
      <div v-if="fanouts.length" class="pd-fanout-list">
        <div v-for="f in pagedFanouts" :key="f.id" class="pd-fanout-item">
          <span class="pd-fanout-num">{{ f._n }}</span>
          <span class="pd-fanout-text">{{ f.text }}</span>
        </div>
      </div>
      <div v-if="fanoutPageCount > 1" class="pd-pager">
        <button class="pd-pager-btn" :disabled="fanoutPage === 0" @click="fanoutPage--">‹ Prev</button>
        <span class="pd-pager-info">
          {{ fanoutPage * FANOUT_PAGE_SIZE + 1 }}–{{ Math.min((fanoutPage + 1) * FANOUT_PAGE_SIZE, fanouts.length) }}
          of {{ fanouts.length }}
        </span>
        <button class="pd-pager-btn" :disabled="fanoutPage >= fanoutPageCount - 1" @click="fanoutPage++">Next ›</button>
      </div>
      <div v-if="!fanouts.length" class="pd-empty-inline" style="padding: 20px 0">
        <Inbox :size="28" :stroke-width="1.5"/>
        <p>No fan-out queries captured yet.</p>
      </div>
    </div>

    <!-- Top Domains + Domain type breakdown -->
    <section class="pd-overview-head" style="margin-top: 28px">
      <h2 class="pd-section-title">
        <Globe :size="16" :stroke-width="2"/>
        Top domains
      </h2>
      <p class="pd-section-sub">Domains AI models retrieved when answering this prompt.</p>
    </section>

    <div class="pd-grid pd-grid-2">
      <div class="pd-card">
        <div class="pd-card-head">
          <h3>
            <Link2 :size="14" :stroke-width="2"/>
            By citation count
          </h3>
        </div>
        <div class="pd-table-wrap">
          <Table class="pd-table">
            <TableHeader>
              <TableRow>
                <TableHead class="num">#</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead class="num">Retrieved</TableHead>
                <TableHead class="num">Citation rate</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="(d, i) in topDomains"
                :key="d.apex_domain"
                class="pd-domain-row"
                :class="{ 'is-clickable': (d.sample_result_ids || []).length }"
                @click="openCitingChats(d)"
              >
                <TableCell class="num">{{ i + 1 }}</TableCell>
                <TableCell>
                  <img :src="faviconFor(d.apex_domain)" :alt="d.domain" class="pd-favicon" @error="onFaviconError($event, d)"/>
                  <a :href="`https://${d.apex_domain}`" target="_blank" rel="noopener" @click.stop>{{ d.apex_domain }}</a>
                  <span
                    v-if="(d.sample_result_ids || []).length"
                    class="pd-domain-cited"
                  >
                    · {{ d.sample_result_ids.length }} {{ d.sample_result_ids.length === 1 ? 'chat' : 'chats' }}
                  </span>
                </TableCell>
                <TableCell class="num">{{ d.retrieved_pct }}%</TableCell>
                <TableCell class="num">{{ d.citation_rate.toFixed(1) }}</TableCell>
                <TableCell>
                  <span class="pd-type-pill" :class="`is-${(d.source_class || 'other').toLowerCase()}`">
                    {{ typeLabel(d.source_class) }}
                  </span>
                </TableCell>
              </TableRow>
              <TableRow v-if="!topDomains.length">
                <TableCell colspan="5" class="pd-table-empty">No citations yet.</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <div class="pd-card">
        <div class="pd-card-head">
          <h3>
            <PieChart :size="14" :stroke-width="2"/>
            Domain types
          </h3>
          <span class="pd-card-meta">{{ detail?.total_retrievals || 0 }} retrievals</span>
        </div>
        <ul class="pd-types">
          <li v-for="t in domainTypes" :key="t.key">
            <span class="pd-type-dot" :class="`is-${(t.key || 'other').toLowerCase()}`"></span>
            <span class="pd-type-name">{{ typeLabel(t.key) }}</span>
            <span class="pd-type-pct">{{ t.pct }}%</span>
          </li>
          <li v-if="!domainTypes.length" class="pd-empty-inline" style="padding: 12px">
            No retrievals yet.
          </li>
        </ul>
      </div>
    </div>

    <!-- Recent Chats — one row per AI answer to this prompt. -->
    <section class="pd-overview-head" style="margin-top: 28px">
      <h2 class="pd-section-title">
        <MessageSquare :size="16" :stroke-width="2"/>
        Recent chats
      </h2>
      <p class="pd-section-sub">Recent chats for this prompt, and whether {{ brandLabel }} was mentioned.</p>
    </section>

    <div class="pd-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead style="width: 44%">Chat</TableHead>
            <TableHead>{{ brandLabel }} mentioned</TableHead>
            <TableHead class="num">Position</TableHead>
            <TableHead>Mentions</TableHead>
            <TableHead>Sources</TableHead>
            <TableHead>Location</TableHead>
            <TableHead class="num">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="(c, ci) in recentChats"
            :key="c.result_id"
            class="pd-chat-row"
            :class="{ 'is-clickable': c.status === 'complete' }"
            @click="c.status === 'complete' && openChat(ci)"
          >
            <TableCell>
              <span v-if="c.status === 'complete'" class="pd-chat-preview">{{ c.response_preview || c.prompt }}</span>
              <span v-else-if="c.status === 'unavailable'" class="pd-chat-state is-unavail">
                Service unavailable<span v-if="c.error" class="pd-chat-state-detail"> — {{ c.error }}</span>
              </span>
              <span v-else-if="c.status === 'failed'" class="pd-chat-state is-failed">
                Failed<span v-if="c.error" class="pd-chat-state-detail"> — {{ c.error }}</span>
              </span>
              <span v-else class="pd-chat-state is-pending">Awaiting response…</span>
            </TableCell>
            <TableCell>
              <span :class="c.brand_mentioned ? 'pd-yes' : 'pd-no'">{{ c.brand_mentioned ? 'Yes' : 'No' }}</span>
            </TableCell>
            <TableCell class="num">{{ c.position ?? '—' }}</TableCell>
            <TableCell>
              <span class="pd-icon-row">
                <span
                  v-for="m in c.models"
                  :key="m"
                  class="pd-model-dot"
                  :style="{ background: modelStyle(m).color }"
                  :title="modelStyle(m).label"
                >{{ modelStyle(m).label[0] }}</span>
              </span>
            </TableCell>
            <TableCell>
              <span class="pd-icon-row">
                <img
                  v-for="(s, si) in c.sources.slice(0, 4)"
                  :key="si"
                  :src="faviconFor(s)"
                  alt=""
                  class="pd-fav"
                  @error="(e) => onFaviconError(e, { apex_domain: s })"
                />
                <span v-if="c.sources.length > 4" class="pd-more">+{{ c.sources.length - 4 }}</span>
                <span v-if="!c.sources.length" class="pd-muted">—</span>
              </span>
            </TableCell>
            <TableCell>{{ c.country ? flag(c.country) + ' ' + c.country : '—' }}</TableCell>
            <TableCell class="num">{{ c.created_at ? relativeTime(c.created_at) : '—' }}</TableCell>
          </TableRow>
          <TableRow v-if="!recentChats.length">
            <TableCell colspan="7" style="text-align:center; color: var(--muted-foreground); padding: 28px 0">
              No chats yet for this prompt.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <div v-if="loading && !detail" class="pd-loading">Loading prompt analytics…</div>
    <div v-if="error" class="pd-error">{{ error }}</div>

    <ChatDetailModal
      :open="chatOpen"
      :website-id="websiteId"
      :result-id="currentChatId"
      :has-prev="chatIndex > 0"
      :has-next="chatIndex < recentChats.length - 1"
      @close="chatOpen = false"
      @prev="prevChat"
      @next="nextChat"
    />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from 'chart.js'
import {
  Activity, BarChart3, ChartLine, ChevronLeft, CircleDot, Clock,
  Globe, Inbox, Link2, MessageSquare, PieChart, Repeat, Sparkles, Tag, Trophy,
} from '@lucide/vue'
import promptLibrary from '@/api/promptLibrary'
import ChatDetailModal from '@/components/ChatDetailModal.vue'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import BrandLogo from '@/components/BrandLogo.vue'

const MODELS = {
  chatgpt: { label: 'ChatGPT', color: '#10a37f' },
  perplexity: { label: 'Perplexity', color: '#8b5cf6' },
  gemini: { label: 'Gemini', color: '#5b8def' },
  claude: { label: 'Claude', color: '#f97316' },
  copilot: { label: 'Copilot', color: '#06b6d4' },
  grok: { label: 'Grok', color: '#0f172a' },
  deepseek: { label: 'DeepSeek', color: '#2563eb' },
  mistral: { label: 'Mistral', color: '#ef4444' },
  cohere: { label: 'Cohere', color: '#d946ef' },
  llama: { label: 'Llama', color: '#0ea5e9' },
  nova: { label: 'Nova', color: '#64748b' },
}
function modelStyle(key) {
  return MODELS[key] || { label: key || 'Model', color: '#94a3b8' }
}
function flag(code) {
  if (!code || code.length !== 2) return '🌐'
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 127397 + c.charCodeAt(0)))
}

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const route = useRoute()
// Read fresh from the route each access: Vue Router reuses this component
// when navigating between two prompt-detail URLs (same route, different
// param), so these must not be captured once at setup.
let websiteId = route.params.websiteId
let promptId = route.params.promptId

const detail = ref(null)
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await promptLibrary.promptDetailAgg(websiteId, promptId)
    detail.value = data?.data || data || null
  } catch (e) {
    error.value = e?.displayMessage || 'Could not load prompt analytics.'
  } finally {
    loading.value = false
  }
  // Fan-outs are an independent endpoint; ignore failures here so a
  // missing crawl doesn't blank the rest of the page.
  loadFanouts()
}

// First visit behaviour: if the prompt already has results, read them
// straight from the DB. If it has never been scanned (no responses AND
// no prior crawl run), trigger exactly one scan automatically so the
// page fills itself instead of showing an empty state. Guarded so it
// fires at most once per mount and never loops on a prompt whose scan
// completed with no brands or failed.
const autoScanDone = ref(false)
const backfillDone = ref(false)
const backfilling = ref(false)
async function loadThenMaybeScan() {
  await load()

  // Backfill: if we already have responses captured but some were never
  // run through brand extraction (old crawler rows), re-extract them once
  // so the brand table fills in from data we already have — no re-query.
  if (!backfillDone.value && (detail.value?.unextracted_count || 0) > 0) {
    backfillDone.value = true
    backfilling.value = true
    try {
      await promptLibrary.reextractPrompt(websiteId, promptId)
      await load()
    } catch {
      /* non-fatal — leave the existing data in place */
    } finally {
      backfilling.value = false
    }
  }

  if (autoScanDone.value || scanInFlight.value) return
  const d = detail.value
  if (!d) return

  // If we land on a scan that's still running (e.g. one kicked off from
  // another tab), poll so it resolves on screen and gets healed if stale,
  // rather than ticking forever. We do NOT start a new scan here.
  const liveStatus = d.latest_scan?.status
  if (liveStatus === 'running' || liveStatus === 'pending') {
    startScanPoll()
    return
  }

  // Auto-fill gaps: scan when any configured model still has no answer
  // for this prompt. The crawler skips models that already answered and
  // retries a missing one once, so this only queries what's missing and
  // stops once every configured model has responded. Bounded to once per
  // mount so it can't loop on a genuinely broken model.
  const missingConfigured = (d.by_model || []).some(
    (m) => m.configured && (m.responses || 0) === 0,
  )
  if (missingConfigured) {
    autoScanDone.value = true
    runScan()
  }
}

/* ── Fanouts ── */
const fanouts = ref([])
const lastFanoutRun = ref(null)

/* Fan-out pagination — keep the list short, page through the rest. */
const FANOUT_PAGE_SIZE = 5
const fanoutPage = ref(0)
const fanoutPageCount = computed(() => Math.ceil(fanouts.value.length / FANOUT_PAGE_SIZE) || 1)
const pagedFanouts = computed(() => {
  const start = fanoutPage.value * FANOUT_PAGE_SIZE
  return fanouts.value
    .slice(start, start + FANOUT_PAGE_SIZE)
    .map((f, i) => ({ ...f, _n: start + i + 1 }))
})
async function loadFanouts() {
  try {
    const { data } = await promptLibrary.promptFanouts(websiteId, promptId)
    const payload = data?.data || data || {}
    // Re-crawls append a fresh PromptFanout set, so the same sub-query
    // text can repeat. De-dupe by normalised text, keeping first seen.
    const seen = new Set()
    fanouts.value = (payload.fanouts || []).filter((f) => {
      const key = (f.text || '').trim().toLowerCase()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    lastFanoutRun.value = payload.last_run || null
    fanoutPage.value = 0
  } catch {
    fanouts.value = []
    lastFanoutRun.value = null
    fanoutPage.value = 0
  }
}

/* ── Prompt metadata derivations ── */
const promptTags = computed(() => {
  const raw = detail.value?.prompt?.tags || []
  return Array.isArray(raw) ? raw.filter(Boolean) : []
})

/* ── Rank distribution view-model ── */
const rankBucketOrder = ['1', '2-3', '4-10', '11+']
const rankBucketClassMap = { '1': 'is-1', '2-3': 'is-2-3', '4-10': 'is-4-10', '11+': 'is-11plus' }
function rankBucketClass(r) { return rankBucketClassMap[r] || 'is-other' }
const modelsWithRanks = computed(() => {
  return (detail.value?.by_model || []).filter((m) => {
    if (!m.rank_buckets) return false
    return rankBucketOrder.some((r) => (m.rank_buckets[r] || 0) > 0)
  })
})

// Completion summary for the Visibility-by-model section: how many of the
// configured models have actually answered this prompt. Makes "0%"
// unambiguous (answered, not mentioned) vs. work still in progress.
const modelCompletion = computed(() => {
  const models = (detail.value?.by_model || []).filter((m) => m.configured)
  if (!models.length) return ''
  const answered = models.filter((m) => (m.responses || 0) > 0).length
  if (scanStatusKind.value === 'running') {
    return `Scanning… ${answered}/${models.length} models answered`
  }
  return `${answered}/${models.length} models answered`
})

/* ── Domain drill-through ── */
function openCitingChats(domain) {
  const ids = domain?.sample_result_ids || []
  if (!ids.length) return
  const i = recentChats.value.findIndex((c) => c.result_id === ids[0])
  if (i >= 0) openChat(i)
}

/* ── Run scan ── */
const scanInFlight = ref(false)
const scanQueued = ref(false)
let scanPollTimer = null

async function runScan() {
  if (scanInFlight.value) return
  scanInFlight.value = true
  try {
    const { data } = await promptLibrary.crawlPrompt(websiteId, promptId)
    scanQueued.value = !!data?.queued
    // Refresh the detail (the synchronous fallback path writes results
    // immediately; the queued path needs polling until completed_at is set).
    await load()
    if (scanQueued.value) startScanPoll()
  } catch (e) {
    error.value = e?.displayMessage || 'Could not start the scan.'
  } finally {
    scanInFlight.value = false
  }
}

function startScanPoll() {
  stopScanPoll()
  let elapsed = 0
  scanPollTimer = setInterval(async () => {
    elapsed += 1
    try { await load() } catch { /* ignore polling failures */ }
    const latest = detail.value?.latest_scan
    const done = latest && (latest.status === 'completed' || latest.status === 'failed')
    // Poll until the run resolves. The cap is past the backend's 10-minute
    // staleness window (6s x 110 ≈ 11 min) so a scan that dies mid-run gets
    // healed to "failed" on one of these reloads instead of ticking forever.
    if (done || elapsed > 110) {
      scanQueued.value = false
      stopScanPoll()
    }
  }, 6000)
}

function stopScanPoll() {
  if (scanPollTimer) { clearInterval(scanPollTimer); scanPollTimer = null }
}

/* ── Enable / disable ── */
const toggleInFlight = ref(false)

async function togglePromptActive() {
  if (toggleInFlight.value) return
  toggleInFlight.value = true
  try {
    if (detail.value?.status === 'active') {
      await promptLibrary.disable(promptId)
    } else {
      await promptLibrary.enable(promptId)
    }
    await load()
  } catch (e) {
    error.value = e?.displayMessage || 'Could not update the prompt status.'
  } finally {
    toggleInFlight.value = false
  }
}

/* ── Scan status line ──
 * `nowTick` re-renders the elapsed duration once a second while a scan
 * is running so the user sees the timer move without waiting for the
 * 5s poll. The interval starts when the status enters running/pending
 * and stops when it resolves.
 */
const nowTick = ref(Date.now())
let elapsedTimer = null
function startElapsedTimer() {
  if (elapsedTimer) return
  elapsedTimer = setInterval(() => { nowTick.value = Date.now() }, 1000)
}
function stopElapsedTimer() {
  if (elapsedTimer) { clearInterval(elapsedTimer); elapsedTimer = null }
}

function formatDuration(seconds) {
  if (seconds < 0 || !Number.isFinite(seconds)) return '0s'
  if (seconds < 60) return `${Math.floor(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return rm ? `${h}h ${rm}m` : `${h}h`
}

const scanStatusKind = computed(() => {
  if (scanInFlight.value) return 'running'
  const s = detail.value?.latest_scan?.status
  if (s === 'running' || s === 'pending') return 'running'
  if (s === 'failed') return 'failed'
  if (s === 'completed') return 'ok'
  return ''
})

const scanStatusLine = computed(() => {
  if (scanInFlight.value) return 'Triggering scan…'
  const ls = detail.value?.latest_scan
  if (!ls) return ''
  if (ls.status === 'running' || ls.status === 'pending') {
    const started = ls.started_at ? new Date(ls.started_at).getTime() : null
    const elapsed = started ? Math.max(0, Math.floor((nowTick.value - started) / 1000)) : null
    const label = ls.status === 'pending' ? 'queued' : 'running'
    return elapsed != null
      ? `Scan ${label} · ${formatDuration(elapsed)} elapsed`
      : `Scan ${label}`
  }
  if (ls.status === 'completed') {
    const ran = ls.started_at && ls.completed_at
      ? Math.max(0, (new Date(ls.completed_at) - new Date(ls.started_at)) / 1000)
      : null
    const took = ran != null ? ` in ${formatDuration(ran)}` : ''
    return `Last scan completed ${relativeTime(ls.completed_at)}${took}`
  }
  if (ls.status === 'failed') {
    return `Last scan failed ${relativeTime(ls.completed_at || ls.started_at)}`
  }
  return ''
})

const scanErrorLine = computed(() => {
  const ls = detail.value?.latest_scan
  return ls?.status === 'failed' ? (ls.error || 'unknown error') : ''
})

watch(scanStatusKind, (kind) => {
  if (kind === 'running') startElapsedTimer()
  else stopElapsedTimer()
}, { immediate: true })
/* ── Recent chats + chat modal ── */
const brandLabel = computed(() => detail.value?.brand_label || 'your brand')
const recentChats = computed(() => detail.value?.recent_chats || [])
const chatOpen = ref(false)
const chatIndex = ref(0)
const currentChatId = computed(() => recentChats.value[chatIndex.value]?.result_id || '')
function openChat(i) { chatIndex.value = i; chatOpen.value = true }
function prevChat() { if (chatIndex.value > 0) chatIndex.value -= 1 }
function nextChat() { if (chatIndex.value < recentChats.value.length - 1) chatIndex.value += 1 }

function relativeTime(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s} sec ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hr ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

onMounted(loadThenMaybeScan)
onBeforeUnmount(() => {
  stopScanPoll()
  stopElapsedTimer()
})

// Navigating between two prompt-detail URLs reuses this component, so
// onMounted won't refire. Watch the route param and reload from scratch
// when it changes (this is why a freshly created prompt kept showing the
// previously-open prompt's data).
watch(() => route.params.promptId, (newId, oldId) => {
  if (!newId || newId === oldId) return
  websiteId = route.params.websiteId
  promptId = newId
  // Reset per-prompt state so nothing leaks from the previous prompt.
  detail.value = null
  error.value = ''
  fanouts.value = []
  lastFanoutRun.value = null
  autoScanDone.value = false
  backfillDone.value = false
  backfilling.value = false
  scanQueued.value = false
  chatOpen.value = false
  chatIndex.value = 0
  stopScanPoll()
  stopElapsedTimer()
  loadThenMaybeScan()
})

const promptText = computed(() => detail.value?.prompt?.text || '')
const promptTextShort = computed(() => {
  const t = promptText.value
  return t.length > 60 ? t.slice(0, 60) + '…' : t
})
const demandLevel = computed(() => {
  const score = Number(detail.value?.prompt?.demand_score) || 0
  if (score >= 0.75) return 4
  if (score >= 0.5)  return 3
  if (score >= 0.25) return 2
  if (score > 0)     return 1
  return 0
})

const topBrands = computed(() => (detail.value?.brands || []).slice(0, 7))
const succeededResponses = computed(() => {
  // Sum of provider.responses across by_model — counts only cells that
  // returned text, not failed/unavailable ones, so the banner accurately
  // distinguishes "nothing has been tried" from "responses came back but
  // no brand was extracted".
  return (detail.value?.by_model || []).reduce((n, m) => n + (m.responses || 0), 0)
})
const topDomains = computed(() => detail.value?.top_domains || [])
const domainTypes = computed(() => detail.value?.domain_types || [])

const TYPE_LABELS = {
  your_site: 'Your site',
  competitor: 'Competitor',
  ugc: 'UGC',
  corporate: 'Corporate',
  reference: 'Reference',
  editorial: 'Editorial',
  institutional: 'Institutional',
  other: 'Other',
}
function typeLabel(key) { return TYPE_LABELS[(key || 'other').toLowerCase()] || key }

function sentimentClass(score) {
  if (score == null) return 'is-mute'
  if (score >= 70) return 'is-pos'
  if (score >= 50) return 'is-neu'
  return 'is-neg'
}

function modelsTip(models) {
  const names = (models || []).map((mk) => modelStyle(mk).label)
  if (!names.length) return 'Not named by any model'
  return `Named by ${names.length} model${names.length === 1 ? '' : 's'}: ${names.join(', ')}`
}

function sentimentTip(score) {
  const tone = score >= 70 ? 'positive' : score >= 50 ? 'neutral' : 'negative'
  return `Sentiment ${score}/100 (${tone}). Averaged from how each model talks about this brand: `
    + `positive mention = 85, neutral = 55, negative = 25.`
}

// Column-header explanations shown on hover.
const HELP = {
  visibility:
    'Visibility: the share of answered model responses that mention this brand. '
    + 'Example: named in 1 of 2 model answers = 50%. Failed/unavailable models are not counted.',
  sov:
    'Share of Voice: this brand’s mentions as a percentage of all brand mentions across every '
    + 'model answer for this prompt. Shows how much of the conversation the brand owns vs. competitors.',
  models:
    'Models: which AI models named this brand for this prompt, and how many. A brand named by '
    + 'more models has broader AI visibility and is harder to displace.',
  sentiment:
    'Sentiment: a 0–100 score for how models portray the brand. Each mention is scored '
    + 'positive (85), neutral (55) or negative (25) by the analyzer and averaged. Higher is better.',
  position:
    'Position: the brand’s average rank when it appears in a model’s ranked list '
    + '(#1 = listed first). Lower is better. Blank when no model ranked it in a list.',
}

const BRAND_COLORS = [
  '#10b981', '#374151', '#f59e0b', '#ec4899', '#a3e635', '#06b6d4', '#6366f1', '#94a3b8',
]
const chartData = computed(() => {
  const b = topBrands.value
  if (!b.length) return null
  return {
    labels: b.map((x) => x.name),
    datasets: [{
      label: 'Visibility %',
      data: b.map((x) => x.visibility_pct),
      backgroundColor: b.map((_, i) => BRAND_COLORS[i % BRAND_COLORS.length]),
      borderRadius: 8,
      barThickness: 28,
    }],
  }
})
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y}% visibility` } },
  },
  scales: {
    y: { min: 0, max: 100, ticks: { callback: (v) => v + '%' }, grid: { color: 'rgba(0,0,0,0.05)' } },
    x: { grid: { display: false } },
  },
}

function faviconFor(domain) {
  if (!domain) return ''
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`
}
function onFaviconError(ev, d) {
  const letter = (d.apex_domain || d.domain || '?').charAt(0).toUpperCase()
  ev.target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Crect width='20' height='20' rx='5' fill='%23e5e7eb'/%3E%3Ctext x='10' y='14' text-anchor='middle' font-size='10' font-family='sans-serif' fill='%236b7280' font-weight='600'%3E${letter}%3C/text%3E%3C/svg%3E`
}

</script>

<style scoped>
.pd-page { padding: 32px 40px 56px; color: var(--foreground); }

.pd-breadcrumb {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 8px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 12px;
  color: var(--muted-foreground);
  margin-bottom: 24px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.pd-bc-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--muted-foreground);
  text-decoration: none;
  font-weight: 500;
}
.pd-bc-link:hover { color: var(--foreground); }
.pd-bc-sep { color: var(--border); }
.pd-bc-current { color: var(--foreground); font-weight: 500; }

.pd-header { margin-bottom: 28px; }
.pd-header-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  background: color-mix(in oklab, var(--primary) 10%, transparent);
  color: var(--primary);
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 12px;
}
.pd-title {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--foreground);
  line-height: 1.15;
  max-width: 56rem;
}

.pd-meta-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0;
  padding: 18px 22px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  margin-bottom: 28px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
@media (max-width: 900px) { .pd-meta-grid { grid-template-columns: repeat(2, 1fr); row-gap: 18px; padding: 16px; } }
.pd-meta { padding: 0 18px; border-left: 1px solid var(--border); }
.pd-meta:first-child { border-left: none; padding-left: 0; }
.pd-meta-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted-foreground);
  margin-bottom: 8px;
  font-weight: 600;
}
.pd-meta-label svg { color: var(--muted-foreground); }
.pd-meta-val { font-size: 14px; color: var(--foreground); font-weight: 500; line-height: 1.3; }
.pd-meta-bars { display: inline-flex; gap: 3px; }
.pd-bar { width: 5px; height: 14px; border-radius: 2px; background: var(--border); }
.pd-bar.is-on { background: var(--chart-2); }
.pd-status {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 10px 3px 8px;
  border-radius: 999px;
  font-size: 12px; font-weight: 600;
}
.pd-status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.pd-status.is-active { background: color-mix(in oklab, var(--chart-2) 14%, transparent); color: var(--chart-2); }
.pd-status.is-inactive { background: var(--muted); color: var(--muted-foreground); }

.pd-overview-head { margin-bottom: 14px; }
.pd-section-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 4px;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--foreground);
  letter-spacing: -0.015em;
}
.pd-section-title svg { color: var(--muted-foreground); }
.pd-section-sub { margin: 0; font-size: 0.86rem; color: var(--muted-foreground); }

.pd-grid { display: grid; gap: 18px; }
.pd-grid-2 { grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); }
@media (max-width: 960px) { .pd-grid-2 { grid-template-columns: 1fr; } }

.pd-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px 22px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease;
}
.pd-card:hover {
  box-shadow: 0 4px 16px -8px rgba(15, 23, 42, 0.12), 0 1px 2px rgba(15, 23, 42, 0.04);
  border-color: var(--border);
}
.pd-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 14px;
}
.pd-card-head h3 {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--foreground);
}
.pd-card-head h3 svg { color: var(--muted-foreground); }
.pd-card-meta {
  font-size: 0.78rem;
  color: var(--muted-foreground);
  background: var(--muted);
  padding: 3px 10px;
  border-radius: 999px;
}

.pd-chart { height: 280px; position: relative; }
.pd-empty-inline {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 100%;
  min-height: 200px;
  color: var(--muted-foreground);
  font-size: 0.88rem;
}
.pd-empty-inline svg { color: var(--muted-foreground); opacity: 0.55; }
.pd-empty-inline p { margin: 0; }

.pd-table-wrap { overflow-x: auto; }
.pd-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}
.pd-table th {
  text-align: left;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted-foreground);
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
}
.pd-table th.num, .pd-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
.pd-th-help { cursor: help; border-bottom: 1px dotted var(--muted-foreground); }
.pd-th-help sup { font-size: 0.7em; opacity: 0.6; margin-left: 1px; }
.pd-table td {
  padding: 10px;
  color: var(--foreground);
  border-bottom: 1px solid var(--border);
}
.pd-table tbody tr:last-child td { border-bottom: none; }
.pd-table tbody tr:hover { background: var(--muted); }
.pd-table tr.is-self td:nth-child(2) { font-weight: 600; }
.pd-table-empty { text-align: center; color: var(--muted-foreground); padding: 18px; }

.pd-favicon {
  width: 20px;
  height: 20px;
  border-radius: 5px;
  vertical-align: -5px;
  margin-right: 8px;
  background: var(--muted);
}
.pd-table a { color: var(--foreground); text-decoration: none; border-bottom: 1px solid transparent; }
.pd-table a:hover { border-bottom-color: var(--muted-foreground); }

.pd-brand-cell { display: inline-flex; align-items: center; gap: 8px; }
.pd-brand-logo {
  width: 20px; height: 20px; border-radius: 5px; flex: 0 0 auto;
  object-fit: contain; background: var(--muted);
}
.pd-brand-name { font-weight: 500; }
.pd-self-pill {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 7px;
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: 999px;
  background: var(--primary);
  color: #fff;
}

.pd-sent { display: inline-flex; align-items: center; gap: 6px; }
.pd-sent-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--muted-foreground); }
.pd-sent-dot.is-pos { background: var(--chart-2); }
.pd-sent-dot.is-neu { background: var(--muted-foreground); }
.pd-sent-dot.is-neg { background: var(--destructive); }
.pd-sent-dot.is-mute { background: var(--border); }

.pd-type-pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 8px;
  border-radius: 999px;
}
.pd-type-pill.is-corporate { background: rgba(245,158,11,0.14); color: #b45309; }
.pd-type-pill.is-ugc { background: rgba(99,102,241,0.14); color: #4338ca; }
.pd-type-pill.is-reference { background: rgba(139,92,246,0.14); color: #6d28d9; }
.pd-type-pill.is-editorial { background: rgba(16,185,129,0.14); color: #047857; }
.pd-type-pill.is-institutional { background: rgba(6,182,212,0.14); color: #0e7490; }
.pd-type-pill.is-your_site { background: rgba(255,107,53,0.14); color: #c2410c; }
.pd-type-pill.is-competitor { background: rgba(239,68,68,0.14); color: #b91c1c; }
.pd-type-pill.is-other { background: var(--muted); color: var(--muted-foreground); }

.pd-types { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.pd-types li {
  display: grid;
  grid-template-columns: 10px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  font-size: 0.88rem;
}
.pd-types li:last-child { border-bottom: none; }
.pd-type-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--muted-foreground); }
.pd-type-dot.is-corporate { background: #f59e0b; }
.pd-type-dot.is-ugc { background: #6366f1; }
.pd-type-dot.is-reference { background: #8b5cf6; }
.pd-type-dot.is-editorial { background: #10b981; }
.pd-type-dot.is-institutional { background: #06b6d4; }
.pd-type-dot.is-your_site { background: #ff6b35; }
.pd-type-dot.is-competitor { background: #ef4444; }
.pd-type-dot.is-other { background: #94a3b8; }
.pd-type-name { color: var(--foreground); }
.pd-type-pct { font-variant-numeric: tabular-nums; color: var(--muted-foreground); }

.pd-loading { padding: 40px 0; text-align: center; color: var(--muted-foreground); }

/* Fanout queries card */
.pd-fanout-card { padding-bottom: 8px; }
.pd-fanout-meta { display: flex; align-items: center; gap: 12px; }
.pd-crawl-btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--foreground);
  color: var(--primary-foreground);
  border: none;
  border-radius: 8px;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}
.pd-crawl-btn:hover { opacity: 0.92; }
.pd-crawl-btn:disabled { opacity: 0.55; cursor: progress; }

.pd-header-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.pd-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pd-toggle-btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: transparent;
  color: var(--foreground);
  border: 1px solid var(--border);
  border-radius: 8px;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}
.pd-toggle-btn:hover { background: var(--muted); }
.pd-toggle-btn:disabled { opacity: 0.55; cursor: progress; }
.pd-toggle-btn.is-active {
  color: color-mix(in oklab, var(--destructive, #ef4444) 80%, var(--foreground));
  border-color: color-mix(in oklab, var(--destructive, #ef4444) 35%, var(--border));
}

.pd-scan-status {
  margin-top: 10px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  font-size: 0.78rem;
  color: var(--muted-foreground);
  background: var(--muted);
  border-radius: 999px;
}
.pd-scan-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--muted-foreground);
}
.pd-scan-status.is-running .pd-scan-dot {
  background: var(--chart-1, #5b8def);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--chart-1, #5b8def) 20%, transparent);
  animation: pdScanPulse 1.6s ease-in-out infinite;
}
.pd-scan-status.is-ok .pd-scan-dot { background: var(--chart-2, #22c55e); }
.pd-scan-status.is-failed .pd-scan-dot { background: var(--destructive, #ef4444); }
.pd-scan-status.is-failed { color: color-mix(in oklab, var(--destructive, #ef4444) 70%, var(--foreground)); }
.pd-scan-error { font-style: italic; opacity: 0.85; }
@keyframes pdScanPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

/* Effectiveness + tags + template metadata */
.pd-meta-extra {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pd-tag-row { display: flex; flex-wrap: wrap; gap: 6px; }
.pd-tag-chip {
  font-size: 0.72rem;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--muted);
  color: var(--foreground);
  border: 1px solid var(--border);
}
.pd-template-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.78rem;
}
.pd-template-label {
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.68rem;
  color: var(--muted-foreground);
}
.pd-template-text {
  padding: 3px 8px;
  background: var(--muted);
  border-radius: 6px;
  font-size: 0.78rem;
}

/* Service-unavailable cell */
.pd-bymodel-unavail {
  color: color-mix(in oklab, var(--destructive, #ef4444) 70%, var(--foreground)) !important;
  font-style: italic;
}

/* Rank distribution */
.pd-rank-dist {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px dashed var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pd-rank-dist-head {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted-foreground);
}
.pd-rank-row {
  display: grid;
  grid-template-columns: 160px 1fr;
  align-items: center;
  gap: 12px;
}
.pd-rank-row-label {
  font-size: 0.82rem;
  color: var(--foreground);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.pd-model-dot-sm {
  width: 16px;
  height: 16px;
  font-size: 0.6rem;
}
.pd-rank-stack {
  display: flex;
  height: 14px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--muted);
}
.pd-rank-seg {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.66rem;
  font-weight: 600;
  color: #fff;
  min-width: 0;
}
.pd-rank-seg.is-1     { background: color-mix(in oklab, var(--chart-2, #22c55e) 100%, transparent); }
.pd-rank-seg.is-2-3   { background: color-mix(in oklab, var(--chart-2, #22c55e)  65%, transparent); }
.pd-rank-seg.is-4-10  { background: color-mix(in oklab, var(--chart-3, #f59e0b)  75%, transparent); }
.pd-rank-seg.is-11plus { background: color-mix(in oklab, var(--muted-foreground)  70%, transparent); }
.pd-rank-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 0.72rem;
  color: var(--muted-foreground);
}
.pd-rank-legend-item { display: inline-flex; align-items: center; gap: 4px; }
.pd-rank-legend-dot { width: 8px; height: 8px; border-radius: 2px; }
.pd-rank-legend-dot.is-1     { background: var(--chart-2, #22c55e); }
.pd-rank-legend-dot.is-2-3   { background: color-mix(in oklab, var(--chart-2, #22c55e) 65%, transparent); }
.pd-rank-legend-dot.is-4-10  { background: var(--chart-3, #f59e0b); }
.pd-rank-legend-dot.is-11plus { background: var(--muted-foreground); }

/* Fanout items */
.pd-fanout-item {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  border-bottom: 1px solid var(--border);
}
.pd-fanout-item:last-child { border-bottom: none; }
.pd-fanout-num {
  width: 22px; height: 22px;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 0.72rem; font-variant-numeric: tabular-nums;
  color: var(--muted-foreground);
  background: var(--muted);
  border-radius: 6px;
  flex: 0 0 auto;
}
.pd-pager {
  display: flex; align-items: center; justify-content: flex-end;
  gap: 12px; padding: 10px 8px 2px;
}
.pd-pager-info { font-size: 0.78rem; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
.pd-pager-btn {
  font-size: 0.8rem; padding: 4px 10px;
  border: 1px solid var(--border); border-radius: 7px;
  background: var(--panel, transparent); color: var(--foreground); cursor: pointer;
}
.pd-pager-btn:hover:not(:disabled) { background: var(--muted); }
.pd-pager-btn:disabled { opacity: 0.4; cursor: default; }

/* Domain drill-through */
.pd-domain-row.is-clickable { cursor: pointer; }
.pd-domain-row.is-clickable:hover { background: var(--muted); }
.pd-domain-cited {
  margin-left: 6px;
  font-size: 0.72rem;
  color: var(--muted-foreground);
}

.pd-fanout-list { display: flex; flex-direction: column; gap: 2px; }
.pd-fanout-row {
  display: grid;
  grid-template-columns: 14px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 12px 8px;
  border-bottom: 1px solid var(--border);
}
.pd-fanout-row:last-child { border-bottom: none; }
.pd-fanout-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--primary);
  opacity: 0.85;
}
.pd-fanout-text { font-size: 0.92rem; line-height: 1.4; color: var(--foreground); }
.pd-fanout-prov {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted-foreground);
  padding: 2px 8px;
  background: var(--muted);
  border-radius: 999px;
}

.pd-spinner {
  width: 22px; height: 22px;
  border-radius: 50%;
  border: 2px solid var(--border);
  border-top-color: var(--foreground);
  animation: pd-spin 0.9s linear infinite;
}
@keyframes pd-spin { to { transform: rotate(360deg); } }
[data-theme="dark"] .pd-fanout-prov { background: var(--accent); }

/* Empty banner */
.pd-empty-banner {
  display: flex; flex-direction: column; gap: 4px;
  padding: 14px 16px; border-radius: 10px;
  border: 1px solid var(--border); background: var(--muted);
  font-size: 0.88rem; color: var(--muted-foreground);
}
.pd-empty-banner strong { color: var(--foreground); }
.pd-empty-note {
  font-size: 0.8rem;
  color: var(--muted-foreground);
  padding: 2px 2px 6px;
}

/* Visibility by model */
.pd-bymodel { display: flex; flex-direction: column; gap: 10px; }
.pd-bymodel-row { display: flex; align-items: center; gap: 10px; }
.pd-bymodel-name { width: 110px; font-size: 0.88rem; color: var(--foreground); }
.pd-bymodel-bar {
  flex: 1; height: 8px; border-radius: 9999px; background: var(--muted);
  overflow: hidden;
}
.pd-bymodel-bar > span {
  display: block; height: 100%; border-radius: 9999px;
  background: var(--chart-1, #5b8def);
}
.pd-bymodel-val { width: 48px; text-align: right; font-size: 0.85rem; font-variant-numeric: tabular-nums; color: var(--foreground); }
.pd-bymodel-na { flex: 1; font-size: 0.82rem; color: var(--muted-foreground); }
.pd-bymodel-nodata { font-style: italic; }
.pd-bymodel-scanning { color: var(--chart-1, #5b8def); font-style: italic; }
.pd-bymodel-done {
  font-size: 0.72rem;
  color: var(--chart-2, #22c55e);
  white-space: nowrap;
}
.pd-completion { color: var(--muted-foreground); }
.pd-completion.is-busy { color: var(--chart-1, #5b8def); }

/* Recent chats */
.pd-chat-row.is-clickable { cursor: pointer; }
.pd-chat-row.is-clickable:hover { background: var(--muted); }
.pd-chat-preview {
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; color: var(--foreground); font-size: 0.88rem; line-height: 1.4;
}
.pd-chat-state { font-size: 0.8rem; }
.pd-chat-state.is-pending { color: var(--muted-foreground); font-style: italic; }
.pd-chat-state.is-unavail { color: color-mix(in oklab, #f59e0b 75%, var(--foreground)); }
.pd-chat-state.is-failed { color: #ef4444; }
.pd-chat-state-detail { color: var(--muted-foreground); font-style: italic; }
.pd-yes { color: var(--chart-2, #22c55e); font-weight: 600; font-size: 0.82rem; }
.pd-no { color: #ef4444; font-weight: 600; font-size: 0.82rem; }
.pd-icon-row { display: inline-flex; align-items: center; gap: 4px; }
.pd-model-dot {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; border-radius: 9999px; color: #fff;
  font-size: 9px; font-weight: 700;
}
.pd-models-cell { display: inline-flex; align-items: center; gap: 3px; }
.pd-models-count { font-size: 0.72rem; color: var(--muted-foreground); font-variant-numeric: tabular-nums; margin-left: 2px; }
.pd-fav { width: 16px; height: 16px; border-radius: 3px; }
.pd-more, .pd-muted { font-size: 0.75rem; color: var(--muted-foreground); }
.pd-error { padding: 20px; text-align: center; color: var(--destructive); }
.text-muted { color: var(--muted-foreground); }

[data-theme="dark"] .pd-card,
[data-theme="dark"] .pd-meta-grid { background: var(--card); border-color: var(--border); }
[data-theme="dark"] .pd-table th,
[data-theme="dark"] .pd-table td { border-color: var(--border); color: var(--foreground); }
[data-theme="dark"] .pd-table th { color: var(--muted-foreground); }
[data-theme="dark"] .pd-table tbody tr:hover { background: var(--accent); }
[data-theme="dark"] .pd-favicon { background: var(--accent); }
</style>
