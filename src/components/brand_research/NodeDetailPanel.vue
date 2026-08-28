<template>
  <div class="detail-panel">
    <div class="dp-header">
      <span class="dp-type">{{ typeLabel }}</span>
      <button v-if="node" class="dp-close" @click="$emit('close')" aria-label="Close details">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </button>
    </div>

    <!-- Source -->
    <template v-if="node && node.type === 'source'">
      <h3 class="dp-title">{{ node.data.row.serp_title || node.data.row.domain }}</h3>
      <div class="dp-meta">
        <SourceClassBadge :source_class="node.data.row.source_class" />
        <span v-if="node.data.row.published_at">Published {{ node.data.row.published_at }}</span>
        <span v-if="node.data.row.word_count">{{ node.data.row.word_count }} words read</span>
      </div>
      <div v-if="communityMeta" class="dp-meta dp-meta-community">
        <span v-for="bit in communityMeta" :key="bit">{{ bit }}</span>
      </div>
      <div v-if="discoveredBy.length" class="dp-found">
        Found by {{ discoveredBy.join(' + ') }}
      </div>
      <p v-if="node.data.row.serp_snippet" class="dp-text">{{ node.data.row.serp_snippet }}</p>
      <div v-if="node.data.opportunity" class="dp-post">
        <span class="dp-post-tag">Post here</span>
        <p class="dp-post-reason">{{ node.data.opportunity.reason }}</p>
      </div>
      <div v-if="(node.data.row.brands || []).length" class="dp-section">
        <h4 class="dp-section-title">Brands in this source</h4>
        <div v-for="b in node.data.row.brands" :key="b.name" class="dp-brand-row">
          <span class="dp-brand-dot" :style="{ background: sentimentColor(b.sentiment || 0) }"></span>
          <span class="dp-brand-name">{{ b.name }}</span>
          <span class="dp-brand-meta">{{ b.mentions }}x</span>
        </div>
      </div>
      <div v-if="keywords.length" class="dp-section">
        <h4 class="dp-section-title">Keywords</h4>
        <div class="dp-chips">
          <span v-for="k in keywords" :key="k" class="dp-chip">{{ k }}</span>
        </div>
      </div>
      <a :href="node.data.row.url" target="_blank" rel="noopener" class="dp-cta">
        {{ node.data.opportunity ? 'Open the conversation' : 'Open source' }}
      </a>
    </template>

    <!-- Brand -->
    <template v-else-if="node && node.type === 'brand'">
      <h3 class="dp-title">{{ node.data.brand.name }}</h3>
      <div class="dp-meta">
        <span v-if="node.data.brand.is_own_brand" class="dp-own">Your brand</span>
      </div>
      <!-- Stat tiles: at-a-glance numeric summary, replaces the
           previous "3 mentions / in 2 sources" prose. Sentiment is
           shown as a signed decimal so users can tell -0.15 from
           -0.85 without eyeballing a bar. -->
      <div class="dp-stats">
        <div class="dp-stat">
          <div class="dp-stat-num">{{ node.data.brand.mentions }}</div>
          <div class="dp-stat-label">mentions</div>
        </div>
        <div class="dp-stat">
          <div class="dp-stat-num">{{ node.data.brand.results_present_in }}</div>
          <div class="dp-stat-label">sources</div>
        </div>
        <div class="dp-stat">
          <div class="dp-stat-num" :style="{ color: sentimentColor(node.data.brand.sentiment || 0) }">
            {{ sentimentNumber }}
          </div>
          <div class="dp-stat-label">sentiment</div>
        </div>
        <div class="dp-stat">
          <div class="dp-stat-num">{{ sharePct }}%</div>
          <div class="dp-stat-label">share of voice</div>
        </div>
      </div>
      <div v-if="recommendedBy.length || notRecommendedBy.length" class="dp-section">
        <h4 class="dp-section-title">Recommended by AI</h4>
        <div v-if="recommendedBy.length" class="dp-chips">
          <span
            v-for="e in recommendedBy"
            :key="e.provider"
            class="dp-engine-chip"
            :style="{ borderColor: sentimentColor(e.sentiment), color: sentimentColor(e.sentiment) }"
          >
            {{ e.label }}
          </span>
        </div>
        <span v-if="notRecommendedBy.length" class="dp-hint">
          Not named by {{ notRecommendedBy.join(', ') }}.
        </span>
      </div>
      <div class="dp-section">
        <h4 class="dp-section-title">Sentiment</h4>
        <div class="dp-sentiment-track">
          <div
            class="dp-sentiment-fill"
            :style="{
              left: `${Math.min(50, 50 + (node.data.brand.sentiment || 0) * 50)}%`,
              width: `${Math.abs(node.data.brand.sentiment || 0) * 50}%`,
              background: sentimentColor(node.data.brand.sentiment || 0),
            }"
          ></div>
          <div class="dp-sentiment-mid"></div>
        </div>
        <div class="dp-sentiment-labels"><span>negative</span><span>positive</span></div>
      </div>
      <div v-if="positiveQuotes.length" class="dp-section">
        <h4 class="dp-section-title dp-title-positive">Positive comments</h4>
        <blockquote
          v-for="q in positiveQuotes"
          :key="`p-${q.rank}-${q.text.slice(0,20)}`"
          class="dp-quote dp-quote-positive"
        >
          "{{ q.text }}"
          <a :href="q.url" target="_blank" rel="noopener" class="dp-quote-source">
            {{ q.domain }} · #{{ q.rank }}
          </a>
        </blockquote>
      </div>
      <div v-if="negativeQuotes.length" class="dp-section">
        <h4 class="dp-section-title dp-title-negative">Negative comments</h4>
        <blockquote
          v-for="q in negativeQuotes"
          :key="`n-${q.rank}-${q.text.slice(0,20)}`"
          class="dp-quote dp-quote-negative"
        >
          "{{ q.text }}"
          <a :href="q.url" target="_blank" rel="noopener" class="dp-quote-source">
            {{ q.domain }} · #{{ q.rank }}
          </a>
        </blockquote>
      </div>
      <blockquote
        v-if="!positiveQuotes.length && !negativeQuotes.length && node.data.brand.top_quote"
        class="dp-quote"
      >
        "{{ node.data.brand.top_quote }}"
      </blockquote>
      <div v-if="cleanBrandIssues.length" class="dp-section">
        <h4 class="dp-section-title">Issues people raise</h4>
        <ul class="dp-issues">
          <li v-for="issue in cleanBrandIssues" :key="issue">{{ issue }}</li>
        </ul>
      </div>
      <div v-if="keywords.length" class="dp-section">
        <h4 class="dp-section-title">Keywords</h4>
        <div class="dp-chips">
          <span v-for="k in keywords" :key="k" class="dp-chip">{{ k }}</span>
        </div>
      </div>

      <div v-if="mentionedIn.length" class="dp-section">
        <h4 class="dp-section-title">Where in this SERP</h4>
        <a
          v-for="hit in mentionedIn"
          :key="hit.rank"
          :href="hit.url"
          target="_blank"
          rel="noopener"
          class="dp-hit"
        >
          <span class="dp-hit-rank">#{{ hit.rank }}</span>
          <img
            :src="faviconFor(hit.domain)"
            class="dp-hit-fav"
            alt=""
            loading="lazy"
            @error="onFaviconError"
          />
          <span class="dp-hit-domain">{{ hit.domain }}</span>
          <span
            class="dp-hit-sent"
            :style="{ color: sentimentColor(hit.sentiment), borderColor: sentimentColor(hit.sentiment) }"
          >
            {{ hit.sentiment >= 0 ? '+' : '' }}{{ hit.sentiment.toFixed(2) }}
          </span>
          <span class="dp-hit-mentions">{{ hit.mentions }}×</span>
        </a>
        <span class="dp-hint">
          Ranked by position within each channel, so a top community thread
          and a top web result both read as #1.
        </span>
      </div>

      <div v-if="knowledgeGraph" class="dp-section">
        <h4 class="dp-section-title">Knowledge panel</h4>
        <a
          v-if="knowledgeGraph.website"
          :href="knowledgeGraph.website"
          target="_blank"
          rel="noopener"
          class="dp-site"
        >
          {{ knowledgeGraph.website.replace(/^https?:\/\//, '') }}
        </a>
        <p v-if="knowledgeGraph.type" class="dp-kg-type">{{ knowledgeGraph.type }}</p>
        <p v-if="knowledgeGraph.description" class="dp-text">{{ knowledgeGraph.description }}</p>
      </div>

      <div class="dp-section">
        <h4 class="dp-section-title">Web presence</h4>
        <div v-if="enrichmentStillLoading" class="dp-skeleton">
          <Skeleton v-for="i in 4" :key="i" class="dp-skeleton-row" />
        </div>
        <template v-else-if="enrichment && (enrichment.top_results || []).length">
          <a
            v-if="enrichment.website"
            :href="enrichment.website"
            target="_blank"
            rel="noopener"
            class="dp-site"
          >
            {{ enrichment.website.replace(/^https?:\/\//, '') }}
          </a>
          <ol class="dp-serp">
            <li v-for="r in enrichment.top_results.slice(0, 5)" :key="r.url">
              <a :href="r.url" target="_blank" rel="noopener" class="dp-serp-link">
                <span class="dp-serp-rank">#{{ r.rank }}</span>
                <img
                  :src="faviconFor(r.domain)"
                  class="dp-serp-fav"
                  alt=""
                  loading="lazy"
                  @error="onFaviconError"
                />
                <span class="dp-serp-title">{{ r.title || r.domain }}</span>
                <span class="dp-serp-domain">{{ r.domain }}</span>
              </a>
            </li>
          </ol>
        </template>
        <span v-else class="dp-hint">
          Nothing back from search. Try the Google fallback below.
        </span>
      </div>

      <a
        v-if="enrichment && enrichment.website"
        :href="enrichment.website"
        target="_blank"
        rel="noopener"
        class="dp-cta"
      >
        Visit {{ node.data.brand.name }}
      </a>
      <a
        v-if="googleSearchUrl"
        :href="googleSearchUrl"
        target="_blank"
        rel="noopener"
        class="dp-cta dp-cta-secondary"
      >
        Search on Google
      </a>
    </template>

    <!-- Leaf / query -->
    <template v-else-if="node && node.type === 'leaf'">
      <h3 class="dp-title">
        <span class="dp-leaf-brand">{{ node.data.brand }}</span>
        <span class="dp-leaf-sep">·</span>
        <span>{{ node.data.kind === 'issue' ? 'What people are saying' : 'Notable quote' }}</span>
      </h3>
      <p class="dp-text" :class="{ italic: node.data.kind === 'quote' }">{{ node.data.text }}</p>

      <div v-if="leafPostTargets.length" class="dp-section">
        <h4 class="dp-section-title">Where you can chip in</h4>
        <span class="dp-hint" style="margin-top:0;margin-bottom:8px;">
          Threads discussing {{ node.data.brand }} where you can reply about your own brand.
        </span>
        <a
          v-for="hit in leafPostTargets"
          :key="hit.rank"
          :href="hit.url"
          target="_blank"
          rel="noopener"
          class="dp-hit"
        >
          <span class="dp-hit-rank">#{{ hit.rank }}</span>
          <img
            :src="faviconFor(hit.domain)"
            class="dp-hit-fav"
            alt=""
            loading="lazy"
            @error="onFaviconError"
          />
          <span class="dp-hit-domain">{{ hit.domain }}</span>
          <span class="dp-hit-mentions">{{ hit.source_class }}</span>
        </a>
      </div>

      <div v-else-if="node.data.kind === 'issue'" class="dp-hint" style="margin-top:12px;">
        No community threads in this scan are open for a reply about
        {{ node.data.brand }}. Consider running a scan on a query where
        Reddit or forum discussions rank higher.
      </div>
    </template>
    <!-- AI engine -->
    <template v-else-if="node && node.type === 'engine'">
      <h3 class="dp-title">{{ engineLabel(engineDetail.provider) }}</h3>
      <div class="dp-meta">
        <span v-if="engineDetail.model">{{ engineDetail.model }}</span>
        <span v-if="engineDetail.status !== 'ok'" class="dp-engine-state">
          {{ engineDetail.status === 'not_configured' ? 'not connected' : 'no answer' }}
        </span>
      </div>

      <p v-if="engineDetail.status === 'not_configured'" class="dp-text">
        No API key is configured for this engine, so we could not ask it. Add
        one in the server environment to include it in future scans.
      </p>
      <p v-else-if="engineDetail.status !== 'ok'" class="dp-text">
        {{ engineDetail.error || 'This engine did not return an answer.' }}
      </p>

      <template v-else>
        <div v-if="(engineDetail.brands || []).length" class="dp-section">
          <h4 class="dp-section-title">Brands it recommends</h4>
          <div v-for="(b, i) in engineDetail.brands" :key="b.name" class="dp-brand-row">
            <span class="dp-brand-order">{{ i + 1 }}</span>
            <span class="dp-brand-dot" :style="{ background: sentimentColor(b.sentiment || 0) }"></span>
            <span class="dp-brand-name">{{ b.name }}</span>
            <span class="dp-brand-meta">{{ b.mentions }}x</span>
          </div>
        </div>

        <div v-if="engineCitations.length" class="dp-section">
          <h4 class="dp-section-title">What it cited</h4>
          <a
            v-for="c in engineCitations"
            :key="c.url"
            :href="c.url"
            target="_blank"
            rel="noopener"
            class="dp-hit"
          >
            <img
              :src="faviconFor(c.domain)"
              class="dp-hit-fav"
              alt=""
              loading="lazy"
              @error="onFaviconError"
            />
            <span class="dp-hit-domain">{{ c.title || c.domain }}</span>
            <span v-if="citationIsInScan(c)" class="dp-in-scan" title="Also found by this scan">
              in scan
            </span>
          </a>
          <span class="dp-hint">
            Sources marked "in scan" are pages this scan also found, so you can
            see which page shaped the answer.
          </span>
        </div>

        <div v-if="engineDetail.answer_text" class="dp-section">
          <h4 class="dp-section-title">Full answer</h4>
          <p class="dp-answer">{{ engineDetail.answer_text }}</p>
        </div>
      </template>
    </template>

    <!-- Chip-in target -->
    <template v-else-if="node && node.type === 'action'">
      <h3 class="dp-title">{{ actionDetail.serp_title || actionDetail.domain }}</h3>
      <div class="dp-meta">
        <SourceClassBadge
          v-if="actionDetail.kind !== 'question'"
          :source_class="actionDetail.source_class"
        />
        <span v-if="actionDetail.subreddit">r/{{ actionDetail.subreddit }}</span>
        <span v-if="actionDetail.num_comments">{{ actionDetail.num_comments }} comments</span>
        <span v-if="actionDetail.score_upvotes">{{ actionDetail.score_upvotes }} upvotes</span>
        <span v-if="actionDetail.age_days != null">{{ formatAge(actionDetail.age_days) }}</span>
      </div>
      <p class="dp-text">{{ actionDetail.reason }}</p>

      <div v-if="(actionDetail.competitors || []).length" class="dp-section">
        <h4 class="dp-section-title">Competitors named here</h4>
        <div class="dp-chips">
          <span v-for="c in actionDetail.competitors" :key="c" class="dp-chip">{{ c }}</span>
        </div>
      </div>
      <div v-if="(actionDetail.issues || []).length" class="dp-section">
        <h4 class="dp-section-title">What people complain about</h4>
        <ul class="dp-issues">
          <li v-for="issue in actionDetail.issues" :key="issue">{{ issue }}</li>
        </ul>
      </div>

      <a v-if="actionDetail.url" :href="actionDetail.url" target="_blank" rel="noopener" class="dp-cta">
        {{ actionDetail.kind === 'question' ? 'See who answers it now' : 'Open the conversation' }}
      </a>
    </template>

    <!-- A node with no branch of its own (the query) -->
    <template v-else-if="node">
      <h3 class="dp-title">{{ node.data.label }}</h3>
      <p class="dp-text">
        This map traces your search across three channels - the AI engines,
        community threads, and the web - to the brands each one points at, and
        ends on the places you can join the conversation.
      </p>
    </template>

    <!-- Nothing selected: the page still ends on an action -->
    <template v-else>
      <h3 class="dp-title">Where you can talk about your brand</h3>
      <p class="dp-text">
        Ranked by how live the conversation is and how strongly competitors
        already own it. Click any node in the map for its detail.
      </p>

      <div v-if="chipInTargets.length" class="dp-section">
        <a
          v-for="t in chipInTargets"
          :key="t.url"
          :href="t.url"
          target="_blank"
          rel="noopener"
          class="dp-target"
        >
          <div class="dp-target-top">
            <span class="dp-target-kind" :class="t.kind">
              {{ t.kind === 'question' ? 'Answer' : 'Reply' }}
            </span>
            <span class="dp-target-where">{{ targetWhere(t) }}</span>
          </div>
          <div class="dp-target-title">{{ t.serp_title || t.url }}</div>
          <div class="dp-target-meta">
            <span v-if="t.num_comments">{{ t.num_comments }} comments</span>
            <span v-if="t.age_days != null">{{ formatAge(t.age_days) }}</span>
            <span v-if="(t.competitors || []).length">
              {{ t.competitors.slice(0, 2).join(', ') }}
            </span>
          </div>
        </a>
      </div>
      <div v-else-if="opportunitiesPending" class="dp-skeleton">
        <Skeleton v-for="i in 4" :key="i" class="dp-skeleton-row" />
      </div>
      <span v-else class="dp-hint">
        No open threads in this scan. Try a query where Reddit or forum
        discussions rank higher - those are the pages with a reply box.
      </span>

      <div v-if="relatedSearches.length" class="dp-section">
        <h4 class="dp-section-title">Related searches to scan next</h4>
        <div class="dp-chips">
          <span v-for="q in relatedSearches" :key="q" class="dp-chip">{{ q }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import SourceClassBadge from '@/components/citations/SourceClassBadge.vue'
import { sentimentColor } from './buildGraph'
import citationsApi from '@/api/citations'
import { Skeleton } from '@/components/ui/skeleton'

const props = defineProps({
  // Null when nothing is selected. The panel then shows the chip-in
  // summary rather than disappearing, so the page always ends on an action.
  node: { type: Object, default: null },
  maxScore: { type: Number, default: 1 },
  scanRows: { type: Array, default: () => [] },
  engines: { type: Array, default: () => [] },
  opportunities: { type: Array, default: () => [] },
  serpFeatures: { type: Object, default: () => ({}) },
  stages: { type: Object, default: () => ({}) },
})
defineEmits(['close'])

// The small uppercase kicker in the panel header. This was rendered in
// the template but never defined, so the header slot was always blank
// and Vue logged a resolve warning on every open.
const TYPE_LABELS = {
  query: 'Search query',
  source: 'Source',
  brand: 'Brand',
  leaf: 'Signal',
  engine: 'AI engine',
  action: 'Opportunity',
}
const typeLabel = computed(() => TYPE_LABELS[props.node?.type] || 'Detail')

// Bucket the per-source quotes we extracted into positive vs negative
// piles based on the source-level sentiment of that brand mention.
// Uses only data the scan already collects — no extra backend call.
// Threshold matches sentimentColor's split (±0.25) so the "positive"
// pill and the "positive comments" section always agree on what's
// positive. Capped at 4 per bucket so the panel doesn't scroll off.
const QUOTE_CAP = 4
const positiveQuotes = computed(() => bucketQuotes(0.25))
const negativeQuotes = computed(() => bucketQuotes(-0.25, true))
function bucketQuotes(threshold, negative = false) {
  if (props.node?.type !== 'brand') return []
  const brandName = (props.node.data.brand.name || '').trim().toLowerCase()
  if (!brandName) return []
  const out = []
  for (const row of props.scanRows || []) {
    if (row.relevant === false) continue
    const b = (row.brands || []).find(
      (x) => (x.name || '').trim().toLowerCase() === brandName,
    )
    if (!b) continue
    const s = b.sentiment || 0
    const on = negative ? s < threshold : s > threshold
    if (!on) continue
    for (const q of b.quotes || []) {
      if (!q) continue
      out.push({
        text: String(q),
        sentiment: s,
        domain: row.domain,
        rank: row.rank,
        url: row.url,
      })
      if (out.length >= QUOTE_CAP) return out
    }
  }
  return out
}

// Where in the current scan does this brand appear? Computed from
// the scan's per-source brand extractions. Gives the user a quick
// answer to "which sources in this SERP mention this brand and how
// positive/negative was the mention?".
const mentionedIn = computed(() => {
  if (props.node?.type !== 'brand') return []
  const target = (props.node.data.brand.name || '').trim().toLowerCase()
  if (!target) return []
  const hits = []
  for (const row of props.scanRows || []) {
    if (row.relevant === false) continue
    const b = (row.brands || []).find(
      (x) => (x.name || '').trim().toLowerCase() === target,
    )
    if (b) {
      hits.push({
        rank: row.rank,
        domain: row.domain,
        source_class: row.source_class,
        sentiment: b.sentiment || 0,
        mentions: b.mentions || 0,
        url: row.url,
      })
    }
  }
  hits.sort((a, b) => a.rank - b.rank)
  return hits
})

// External-search fallback link — always available even if we can't
// find an official website. Google is the standard "look this up" verb
// for non-technical users.
const googleSearchUrl = computed(() => {
  if (props.node?.type !== 'brand') return null
  const name = props.node.data.brand.name || ''
  return `https://www.google.com/search?q=${encodeURIComponent(name)}`
})

// Perplexity-backed enrichment: canonical website + top web results.
// Fetched on click, cached server-side for 24h so quota isn't an
// issue for repeated views. Silent-fail: if the request errors or
// returns nothing, we just fall back to the Google search link.
const enrichment = ref(null)
const enrichmentLoading = ref(false)
async function loadEnrichment(name) {
  enrichment.value = null
  if (!name) return
  enrichmentLoading.value = true
  try {
    const { data } = await citationsApi.brandLookup(name)
    enrichment.value = data
  } catch {
    enrichment.value = null
  } finally {
    enrichmentLoading.value = false
  }
}
watch(
  () => (props.node?.type === 'brand' ? props.node.data.brand.name : null),
  (name) => loadEnrichment(name),
  { immediate: true },
)

// Claude occasionally invents an "issue" like "Access denied error
// preventing content review" when it's handed a blocked/error page as
// content. Filter those out at the display layer so users don't see
// pipeline artifacts as real user complaints. Backend Perplexity
// fallback for blocked sources is a separate follow-up.
const JUNK_ISSUE_RE = /access\s+denied|preventing\s+content|content\s+review|unable to (access|review|retrieve)|error preventing|no accessible|content is (blocked|unavailable)/i
function cleanIssues(list) {
  return (list || []).filter((s) => s && !JUNK_ISSUE_RE.test(String(s)))
}

const cleanBrandIssues = computed(() =>
  props.node?.type === 'brand' ? cleanIssues(props.node.data.brand?.issues) : [],
)

// Keywords surfaced per node type. No backend keyword model yet — we
// derive from the fields we already have (brand names, cleaned issue
// phrases, top quote). Uniqued and truncated so the panel doesn't wall
// of text out.
function uniq(list, cap = 10) {
  const seen = new Set()
  const out = []
  for (const raw of list) {
    if (!raw) continue
    const key = String(raw).trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(String(raw).trim())
    if (out.length >= cap) break
  }
  return out
}
const keywords = computed(() => {
  const n = props.node
  if (!n) return []
  if (n.type === 'source') {
    const brands = (n.data.row?.brands || []).map((b) => b.name)
    const issues = (n.data.row?.brands || []).flatMap((b) => cleanIssues(b.issues))
    // If this source is also a chip-in opportunity, mix competitors +
    // their weak spots into the keyword set so the tag reads richer.
    const opp = n.data.opportunity
    const oppExtras = opp
      ? [...(opp.competitors || []), ...cleanIssues(opp.issues)]
      : []
    return uniq([...brands, ...issues, ...oppExtras])
  }
  if (n.type === 'brand') {
    return uniq(cleanBrandIssues.value)
  }
  return []
})

const sharePct = computed(() => {
  if (props.node?.type !== 'brand') return 0
  const score = props.node.data.brand.weighted_score || 0
  return Math.round((score / Math.max(props.maxScore, 0.0001)) * 100)
})

const sentimentNumber = computed(() => {
  if (props.node?.type !== 'brand') return '0.00'
  const s = props.node.data.brand.sentiment || 0
  return `${s >= 0 ? '+' : ''}${s.toFixed(2)}`
})

// Favicon for a known source-page domain. Google's s2/favicons is
// reliable here because these are real domains (yelp.com, reddit.com,
// tripadvisor.com) — the generic-globe fallback that made us drop it
// from brand-logo lookup only triggers when the domain is unknown.
// If Google still 404s or serves something empty we hide the img
// entirely rather than showing a broken-image icon.
// From a leaf, surface the engageable sources in this scan that
// discuss the same brand — so the user has a concrete "reply here"
// list instead of dead-ending on a piece of negative feedback. Only
// source classes with an actual comment/reply surface qualify (same
// gate the backend uses to compute opportunities).
const ENGAGEABLE_CLASSES = new Set(['reddit', 'forum', 'quora', 'youtube'])
const leafPostTargets = computed(() => {
  if (props.node?.type !== 'leaf') return []
  const brandName = (props.node.data.brand || '').trim().toLowerCase()
  if (!brandName) return []
  const hits = []
  for (const row of props.scanRows || []) {
    if (row.relevant === false) continue
    if (!ENGAGEABLE_CLASSES.has(row.source_class)) continue
    const mentioned = (row.brands || []).some(
      (b) => (b.name || '').trim().toLowerCase() === brandName,
    )
    if (mentioned) {
      hits.push({
        rank: row.rank,
        domain: row.domain,
        source_class: row.source_class,
        url: row.url,
      })
    }
  }
  return hits.sort((a, b) => a.rank - b.rank)
})

// Mirrors ENGINE_LABELS in apps/citations/services/engine_probe.py.
const ENGINE_LABELS = {
  claude: 'Claude',
  gpt4: 'ChatGPT',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
  grok: 'Grok',
  google_ai_overview: 'Google AI Overview',
}
function engineLabel(provider) {
  return ENGINE_LABELS[provider] || provider || 'Engine'
}

// Which AI engines named this brand, and how warmly. This is the answer to
// "does ChatGPT recommend us?", which is the question the engine lane
// exists for, so it sits high in the brand panel.
const recommendedBy = computed(() => {
  if (props.node?.type !== 'brand') return []
  const target = (props.node.data.brand.name || '').trim().toLowerCase()
  if (!target) return []
  const out = []
  for (const engine of props.engines || []) {
    if (engine.status !== 'ok') continue
    const named = (engine.brands || []).find(
      (b) => (b.name || '').trim().toLowerCase() === target,
    )
    if (named) {
      out.push({
        provider: engine.provider,
        label: engineLabel(engine.provider),
        sentiment: named.sentiment || 0,
      })
    }
  }
  return out
})

// Engines that answered but did NOT name this brand. Absence is the finding
// here, so it deserves to be stated rather than left as a blank.
const notRecommendedBy = computed(() => {
  if (props.node?.type !== 'brand') return []
  const named = new Set(recommendedBy.value.map((e) => e.provider))
  return (props.engines || [])
    .filter((e) => e.status === 'ok' && !named.has(e.provider))
    .map((e) => engineLabel(e.provider))
})

// Google's knowledge panel, when the scan's SERP had one and it is about
// this brand. Free with a call we already made, so it takes precedence over
// the per-click Perplexity lookup.
const knowledgeGraph = computed(() => {
  if (props.node?.type !== 'brand') return null
  const kg = props.serpFeatures?.knowledge_graph
  if (!kg || !kg.title) return null
  const a = (kg.title || '').trim().toLowerCase()
  const b = (props.node.data.brand.name || '').trim().toLowerCase()
  if (!a || !b) return null
  return a === b || a.includes(b) || b.includes(a) ? kg : null
})

const enrichmentStillLoading = computed(
  () => enrichmentLoading.value && !knowledgeGraph.value,
)

// Community rows carry platform-native metadata the web lane has no
// equivalent for.
const communityMeta = computed(() => {
  if (props.node?.type !== 'source') return null
  const meta = props.node.data.row?.platform_meta || {}
  const bits = []
  if (meta.subreddit) bits.push(`r/${meta.subreddit}`)
  if (meta.score) bits.push(`${meta.score} upvotes`)
  if (meta.num_comments) bits.push(`${meta.num_comments} comments`)
  return bits.length ? bits : null
})

const discoveredBy = computed(() => {
  if (props.node?.type !== 'source') return []
  const raw = props.node.data.row?.discovery || ''
  const LABELS = {
    perplexity: 'Perplexity index',
    google: 'Google',
    reddit_search: 'Reddit search',
    google_discussions: 'Google discussions',
    seed: 'Seeded',
  }
  return raw.split(',').filter(Boolean).map((k) => LABELS[k] || k)
})

// -- Engine node ---------------------------------------------------------------

const engineDetail = computed(() =>
  props.node?.type === 'engine' ? props.node.data.engine || {} : {},
)
const engineCitations = computed(() => (engineDetail.value.citations || []).slice(0, 8))
const engineCitedRanks = computed(() => new Set(engineDetail.value.cited_ranks || []))
function citationIsInScan(citation) {
  const row = (props.scanRows || []).find((r) => r.url === citation.url)
  return row ? engineCitedRanks.value.has(row.rank) : false
}

// -- Action node ---------------------------------------------------------------

const actionDetail = computed(() =>
  props.node?.type === 'action' ? props.node.data.opportunity || {} : {},
)

// -- Default (nothing selected) -------------------------------------------------

// The panel is never empty. With no node chosen it answers the question the
// whole page is for: where can I go talk about my brand.
const chipInTargets = computed(() => (props.opportunities || []).slice(0, 8))
const relatedSearches = computed(() =>
  (props.serpFeatures?.related_searches || []).slice(0, 6),
)
const opportunitiesPending = computed(() => {
  const lanes = props.stages || {}
  return ['web', 'community', 'analysis'].some((k) =>
    ['pending', 'running'].includes(lanes[k]?.status),
  )
})

function targetWhere(target) {
  return target.subreddit ? `r/${target.subreddit}` : target.domain
}

function formatAge(days) {
  if (days == null) return ''
  if (days < 1) return 'today'
  if (days < 30) return `${days}d old`
  if (days < 365) return `${Math.round(days / 30)}mo old`
  return `${Math.round(days / 365)}y old`
}

function faviconFor(domain) {
  if (!domain) return ''
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`
}
function onFaviconError(e) {
  if (e && e.target) e.target.style.visibility = 'hidden'
}
</script>

<style scoped>
.detail-panel {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  overflow-y: auto;
}
.dp-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.dp-type {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--muted-foreground);
}
.dp-close {
  color: var(--muted-foreground);
  padding: 4px;
  border-radius: 6px;
  transition: background 0.15s;
}
.dp-close:hover { background: var(--muted); color: var(--foreground); }
.dp-title { font-size: 15px; font-weight: 700; color: var(--foreground); line-height: 1.3; }
.dp-leaf-brand { color: var(--primary); }
.dp-leaf-sep { margin: 0 6px; color: var(--muted-foreground); font-weight: 400; }
.dp-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  font-size: 11px;
  color: var(--muted-foreground);
}
.dp-own {
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--primary);
  font-weight: 700;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 10px;
}
.dp-text { margin-top: 10px; font-size: 12px; line-height: 1.5; color: var(--foreground); }
.dp-text.italic { font-style: italic; color: var(--muted-foreground); }
.dp-section { margin-top: 14px; }
.dp-section-title {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted-foreground);
  margin-bottom: 6px;
}
.dp-brand-row { display: flex; align-items: center; gap: 8px; padding: 3px 0; }
.dp-brand-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.dp-brand-name { font-size: 12px; font-weight: 600; color: var(--foreground); flex: 1; }
.dp-brand-meta { font-size: 10px; color: var(--muted-foreground); }
.dp-sentiment-track {
  position: relative;
  height: 8px;
  background: var(--muted);
  border-radius: 999px;
  overflow: hidden;
}
.dp-sentiment-fill { position: absolute; top: 0; bottom: 0; border-radius: 999px; }
.dp-sentiment-mid {
  position: absolute;
  left: 50%;
  top: -1px;
  bottom: -1px;
  width: 1.5px;
  background: var(--border);
}
.dp-sentiment-labels {
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  color: var(--muted-foreground);
  margin-top: 3px;
}
.dp-share-track { height: 8px; background: var(--muted); border-radius: 999px; overflow: hidden; }
.dp-share-fill { height: 100%; background: var(--primary); border-radius: 999px; transition: width 0.4s; }
.dp-share-value { font-size: 10px; color: var(--muted-foreground); margin-top: 3px; display: block; }
.dp-quote {
  margin-top: 8px;
  padding: 10px 12px;
  border-left: 3px solid var(--border);
  background: var(--muted);
  border-radius: 0 8px 8px 0;
  font-size: 12px;
  font-style: italic;
  color: var(--foreground);
  line-height: 1.45;
}
.dp-quote-positive { border-left-color: var(--chart-2); }
.dp-quote-negative { border-left-color: var(--destructive); }
.dp-quote-source {
  display: block;
  margin-top: 6px;
  font-style: normal;
  font-size: 10px;
  font-weight: 700;
  color: var(--muted-foreground);
  letter-spacing: 0.02em;
}
.dp-quote-source:hover { color: var(--primary); }
.dp-title-positive { color: var(--chart-2); }
.dp-title-negative { color: var(--destructive); }
.dp-issues { display: flex; flex-direction: column; gap: 5px; }
.dp-issues li {
  font-size: 11.5px;
  line-height: 1.4;
  color: var(--foreground);
  padding-left: 14px;
  position: relative;
}
.dp-issues li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--destructive);
}
.dp-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.dp-chip {
  font-size: 10.5px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--muted);
  color: var(--foreground);
}
.dp-cta {
  display: inline-block;
  margin-top: 16px;
  font-size: 12px;
  font-weight: 700;
  color: var(--primary);
}
.dp-cta.accent { color: var(--chart-3); }
.dp-cta:hover { text-decoration: underline; }
/* Chip-in callout inside the Source detail panel — replaces the
   standalone Opportunity node the graph used to render. */
.dp-post {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--chart-3) 10%, transparent);
  border-left: 3px solid var(--chart-3);
}
.dp-post-tag {
  display: inline-block;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--chart-3);
  margin-bottom: 4px;
}
.dp-post-reason {
  font-size: 12px;
  line-height: 1.45;
  color: var(--foreground);
  margin: 0;
}
/* Compact stat tiles at the top of a brand detail — the numbers you
   want first when the panel opens, before the bars and lists. */
.dp-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-top: 10px;
  padding: 10px;
  background: var(--muted);
  border-radius: 8px;
}
.dp-stat { text-align: center; overflow: hidden; }
.dp-stat-num {
  font-size: 16px;
  font-weight: 800;
  color: var(--foreground);
  line-height: 1.1;
  letter-spacing: -0.01em;
}
.dp-stat-label {
  font-size: 8.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted-foreground);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dp-hit {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 6px;
  font-size: 11.5px;
  border-radius: 6px;
  transition: background 0.12s;
}
.dp-hit:hover { background: var(--muted); }
.dp-hit-rank {
  min-width: 26px;
  font-weight: 800;
  color: var(--muted-foreground);
  font-size: 10px;
}
.dp-hit-fav {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  flex-shrink: 0;
  object-fit: contain;
  background: var(--card);
}
.dp-hit-domain {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--foreground);
  font-weight: 600;
}
.dp-hit-sent {
  font-size: 9.5px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 999px;
  border: 1px solid;
  background: var(--card);
  flex-shrink: 0;
}
.dp-hit-mentions { color: var(--muted-foreground); font-size: 10px; font-weight: 700; }
.dp-hint {
  display: block;
  margin-top: 6px;
  font-size: 10px;
  color: var(--muted-foreground);
  font-style: italic;
}
/* Provenance line under a source: which index found it. Two indexes
   agreeing is a relevance signal worth showing. */
.dp-found {
  margin-top: 4px;
  font-size: 10px;
  font-weight: 600;
  color: var(--muted-foreground);
}
.dp-meta-community { margin-top: 4px; }

/* Engine chips in the brand panel */
.dp-engine-chip {
  font-size: 10.5px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid var(--border);
}
.dp-engine-state {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 9.5px;
}
.dp-brand-order {
  font-size: 9.5px;
  font-weight: 800;
  color: var(--muted-foreground);
  min-width: 12px;
}
.dp-in-scan {
  font-size: 8.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 999px;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  flex-shrink: 0;
}
.dp-answer {
  font-size: 12px;
  line-height: 1.55;
  color: var(--muted-foreground);
  white-space: pre-wrap;
  max-height: 260px;
  overflow-y: auto;
}
.dp-kg-type {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted-foreground);
  margin-top: 2px;
}

/* Chip-in targets in the default (nothing selected) view */
.dp-target {
  display: block;
  padding: 9px 11px;
  border: 1px solid var(--border);
  border-radius: 9px;
  margin-bottom: 7px;
  transition: border-color 0.15s, background 0.15s;
}
.dp-target:hover { border-color: var(--chart-3); background: var(--muted); }
.dp-target-top { display: flex; align-items: center; gap: 7px; margin-bottom: 4px; }
.dp-target-kind {
  font-size: 8.5px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 999px;
  color: var(--chart-3);
  background: color-mix(in srgb, var(--chart-3) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--chart-3) 40%, transparent);
  flex-shrink: 0;
}
.dp-target-kind.question {
  color: var(--muted-foreground);
  background: var(--muted);
  border-color: var(--border);
}
.dp-target-where {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dp-target-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--foreground);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.dp-target-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
  font-size: 10px;
  color: var(--muted-foreground);
}
.dp-skeleton { display: flex; flex-direction: column; gap: 8px; }
.dp-skeleton-row { height: 11px; width: 100%; }
.dp-skeleton-row:nth-child(2) { width: 82%; }
.dp-skeleton-row:nth-child(3) { width: 91%; }
.dp-skeleton-row:nth-child(4) { width: 66%; }
.dp-loading {
  font-size: 11px;
  color: var(--muted-foreground);
  padding: 6px 0;
}
.dp-site {
  display: inline-block;
  font-size: 12px;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 8px;
  word-break: break-all;
}
.dp-site:hover { text-decoration: underline; }
.dp-serp { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.dp-serp-link {
  display: grid;
  grid-template-columns: 22px 20px 1fr;
  grid-template-rows: auto auto;
  column-gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  transition: background 0.12s;
}
.dp-serp-link:hover { background: var(--muted); }
.dp-serp-rank {
  grid-row: 1 / span 2;
  align-self: center;
  font-size: 10px;
  font-weight: 800;
  color: var(--muted-foreground);
}
.dp-serp-fav {
  grid-row: 1 / span 2;
  align-self: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  object-fit: contain;
  background: var(--card);
}
.dp-serp-title {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--foreground);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.dp-serp-domain {
  font-size: 9.5px;
  color: var(--muted-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dp-cta-secondary {
  color: var(--muted-foreground);
  margin-left: 12px;
}
</style>
