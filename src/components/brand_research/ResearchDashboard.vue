<template>
  <div class="rd">
    <!-- Summary tiles -->
    <div class="rd-kpis">
      <div class="rd-kpi rd-kpi-accent">
        <div class="rd-kpi-label">Threads to join</div>
        <div class="rd-kpi-num">{{ threads.length }}</div>
        <div class="rd-kpi-sub">communities where you can reply</div>
      </div>
      <div class="rd-kpi">
        <div class="rd-kpi-label">Questions to answer</div>
        <div class="rd-kpi-num">{{ questions.length }}</div>
        <div class="rd-kpi-sub">searches no one owns yet</div>
      </div>
      <div class="rd-kpi">
        <div class="rd-kpi-label">Your visibility</div>
        <div class="rd-kpi-num" :class="{ 'rd-kpi-muted': ownShare === null }">
          {{ ownShare === null ? 'Not named' : ownShare + '%' }}
        </div>
        <div class="rd-kpi-sub">
          {{ ownShare === null ? 'AI never mentions you for this query' : 'share of voice · rank #' + ownRank }}
        </div>
      </div>
      <div class="rd-kpi">
        <div class="rd-kpi-label">Top competitor</div>
        <div class="rd-kpi-num rd-kpi-name">{{ topCompetitor ? topCompetitor.name : '—' }}</div>
        <div class="rd-kpi-sub">
          {{ topCompetitor ? sharePct(topCompetitor) + '% share of voice' : 'no competitors found' }}
        </div>
      </div>
    </div>

    <!-- Join the conversation -->
    <section v-if="threads.length" class="rd-section">
      <div class="rd-head">
        <h3 class="rd-h">Join the conversation<span class="rd-count">{{ threads.length }}</span></h3>
        <p class="rd-sub">Live threads that rank for your query and name competitors — but not you. Each has a reply box.</p>
      </div>
      <div class="rd-grid">
        <article v-for="o in threads" :key="o.url" class="rd-card">
          <div class="rd-card-top">
            <SourceClassBadge :source_class="o.source_class" />
            <span class="rd-card-meta">{{ threadMeta(o) }}</span>
          </div>
          <h4 class="rd-card-title">{{ o.serp_title || o.domain }}</h4>
          <p class="rd-card-reason">{{ o.reason }}</p>
          <div v-if="o.competitors && o.competitors.length" class="rd-chips">
            <span v-for="c in o.competitors.slice(0, 4)" :key="c" class="rd-chip">{{ c }}</span>
          </div>
          <a :href="o.url" target="_blank" rel="noopener" class="rd-cta">Open the conversation →</a>
        </article>
      </div>
    </section>

    <!-- Questions to answer on your own site -->
    <section v-if="questions.length" class="rd-section">
      <div class="rd-head">
        <h3 class="rd-h">Answer these on your site<span class="rd-count">{{ questions.length }}</span></h3>
        <p class="rd-sub">Questions real people ask Google for this query. Publishing a strong answer is a way in that needs no thread.</p>
      </div>
      <div class="rd-grid">
        <article v-for="o in questions" :key="o.serp_title" class="rd-card rd-card-q">
          <h4 class="rd-card-title">{{ o.serp_title }}</h4>
          <p class="rd-card-reason">{{ o.reason }}</p>
          <a
            v-if="o.url"
            :href="o.url"
            target="_blank"
            rel="noopener"
            class="rd-cta"
          >See who answers it now →</a>
        </article>
      </div>
    </section>

    <!-- Where competitors are winning (articles/pages you're absent from) -->
    <section v-if="competitorPages.length" class="rd-section">
      <div class="rd-head">
        <h3 class="rd-h">Where competitors are winning<span class="rd-count">{{ competitorPages.length }}</span></h3>
        <p class="rd-sub">Pages that rank for your query and recommend competitors without mentioning you — worth a pitch, a guest post, or a better answer of your own.</p>
      </div>
      <div class="rd-grid">
        <article v-for="r in competitorPages" :key="r.url" class="rd-card">
          <div class="rd-card-top">
            <SourceClassBadge :source_class="r.source_class" />
            <span class="rd-card-meta">{{ r.domain }}</span>
          </div>
          <h4 class="rd-card-title">{{ r.serp_title || r.domain }}</h4>
          <div v-if="pageCompetitors(r).length" class="rd-chips">
            <span class="rd-chips-lead">Names</span>
            <span v-for="c in pageCompetitors(r).slice(0, 4)" :key="c" class="rd-chip">{{ c }}</span>
          </div>
          <a :href="r.url" target="_blank" rel="noopener" class="rd-cta rd-cta-quiet">Open source →</a>
        </article>
      </div>
    </section>

    <!-- Research next -->
    <section v-if="relatedSearches.length" class="rd-section">
      <div class="rd-head">
        <h3 class="rd-h">Research next</h3>
        <p class="rd-sub">Related searches people run around this topic. Scan one to map its conversation too.</p>
      </div>
      <div class="rd-related">
        <button
          v-for="q in relatedSearches"
          :key="q"
          type="button"
          class="rd-related-chip"
          @click="$emit('research-query', q)"
        >{{ q }}<span class="rd-related-arrow">→</span></button>
      </div>
    </section>

    <!-- Empty / running -->
    <p v-if="!hasAnything" class="rd-empty">
      {{ running
        ? 'Mapping the conversation and finding places to engage…'
        : 'No open places to engage surfaced for this query. Try one where Reddit, forums, or Q&A threads rank higher — those are the pages with a reply box.' }}
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import SourceClassBadge from '@/components/citations/SourceClassBadge.vue'

const props = defineProps({
  opportunities: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] },
  brands: { type: Array, default: () => [] },
  serpFeatures: { type: Object, default: () => ({}) },
  running: { type: Boolean, default: false },
})
defineEmits(['research-query'])

const COMMUNITY_CLASSES = new Set(['reddit', 'forum', 'quora', 'youtube', 'stackoverflow'])

function keyOf(name) {
  return (name || '').trim().toLowerCase()
}

const threads = computed(() =>
  (props.opportunities || []).filter((o) => o.kind !== 'question'),
)
const questions = computed(() =>
  (props.opportunities || []).filter((o) => o.kind === 'question'),
)

// -- KPI derivations ---------------------------------------------------------
const maxScore = computed(() =>
  Math.max(...(props.brands || []).map((b) => b.weighted_score || 0), 0.0001),
)
const sortedBrands = computed(() =>
  [...(props.brands || [])].sort((a, b) => (b.weighted_score || 0) - (a.weighted_score || 0)),
)
const ownBrand = computed(() => (props.brands || []).find((b) => b.is_own_brand) || null)
const ownShare = computed(() =>
  ownBrand.value
    ? Math.round(((ownBrand.value.weighted_score || 0) / maxScore.value) * 100)
    : null,
)
const ownRank = computed(() => {
  const i = sortedBrands.value.findIndex((b) => b.is_own_brand)
  return i >= 0 ? i + 1 : null
})
const topCompetitor = computed(
  () => sortedBrands.value.find((b) => !b.is_own_brand) || null,
)
function sharePct(b) {
  return Math.round(((b.weighted_score || 0) / maxScore.value) * 100)
}

// -- Competitor pages: web-lane results that name a competitor and not you ----
const ownKey = computed(() => keyOf(ownBrand.value?.name))
const competitorPages = computed(() => {
  const own = ownKey.value
  return (props.rows || [])
    .filter((r) => r.relevant !== false && !COMMUNITY_CLASSES.has(r.source_class))
    .filter((r) => {
      const names = (r.brands || []).map((b) => keyOf(b.name)).filter(Boolean)
      const hasCompetitor = names.some((n) => n !== own)
      const hasOwn = own && names.includes(own)
      return hasCompetitor && !hasOwn
    })
    .slice(0, 12)
})
function pageCompetitors(r) {
  const own = ownKey.value
  return (r.brands || [])
    .map((b) => b.name)
    .filter((n) => n && keyOf(n) !== own)
}

const relatedSearches = computed(() =>
  (props.serpFeatures?.related_searches || []).slice(0, 8),
)

const hasAnything = computed(() =>
  threads.value.length
  || questions.value.length
  || competitorPages.value.length
  || relatedSearches.value.length,
)

// -- Card meta ---------------------------------------------------------------
function formatAge(days) {
  if (days == null) return ''
  if (days < 1) return 'today'
  if (days < 30) return `${days}d old`
  if (days < 365) return `${Math.round(days / 30)}mo old`
  return `${Math.round(days / 365)}y old`
}
function threadMeta(o) {
  const bits = []
  if (o.subreddit) bits.push(`r/${o.subreddit}`)
  if (o.num_comments) bits.push(`${o.num_comments} comments`)
  if (o.score_upvotes) bits.push(`${o.score_upvotes} upvotes`)
  const age = formatAge(o.age_days)
  if (age) bits.push(age)
  return bits.join(' · ')
}
</script>

<style scoped>
.rd {
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding-right: 4px;
}

/* KPI tiles */
.rd-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}
.rd-kpi {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px 16px;
}
.rd-kpi-accent { border-color: color-mix(in srgb, var(--chart-3) 45%, var(--border)); }
.rd-kpi-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted-foreground);
}
.rd-kpi-num {
  font-size: 26px;
  font-weight: 800;
  line-height: 1.1;
  color: var(--foreground);
  margin-top: 6px;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.rd-kpi-accent .rd-kpi-num { color: var(--chart-3); }
.rd-kpi-name { font-size: 19px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rd-kpi-muted { font-size: 19px; color: var(--muted-foreground); }
.rd-kpi-sub { font-size: 11px; color: var(--muted-foreground); margin-top: 4px; line-height: 1.35; }

/* Sections */
.rd-section { display: flex; flex-direction: column; gap: 12px; }
.rd-head { display: flex; flex-direction: column; gap: 3px; }
.rd-h {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: var(--foreground);
}
.rd-count {
  font-size: 11px;
  font-weight: 800;
  color: var(--chart-3);
  background: color-mix(in srgb, var(--chart-3) 12%, transparent);
  padding: 1px 8px;
  border-radius: 999px;
}
.rd-sub { font-size: 12.5px; color: var(--muted-foreground); line-height: 1.45; max-width: 70ch; }

.rd-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 12px;
}
.rd-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px 16px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.rd-card:hover { border-color: color-mix(in srgb, var(--chart-3) 40%, var(--border)); box-shadow: 0 2px 12px rgba(0, 0, 0, .05); }
.rd-card-q { border-left: 3px solid var(--border); }
.rd-card-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.rd-card-meta {
  font-size: 11px;
  color: var(--muted-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rd-card-title {
  font-size: 13.5px;
  font-weight: 650;
  color: var(--foreground);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.rd-card-reason {
  font-size: 12px;
  color: var(--muted-foreground);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.rd-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.rd-chips-lead {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted-foreground);
}
.rd-chip {
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 9px;
  border-radius: 999px;
  background: var(--muted);
  color: var(--foreground);
}
.rd-cta {
  margin-top: auto;
  font-size: 12px;
  font-weight: 700;
  color: var(--chart-3);
  padding-top: 4px;
}
.rd-cta:hover { text-decoration: underline; }
.rd-cta-quiet { color: var(--primary); }

/* Related searches */
.rd-related { display: flex; flex-wrap: wrap; gap: 8px; }
.rd-related-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--foreground);
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 7px 14px;
  transition: border-color 0.15s, color 0.15s;
}
.rd-related-chip:hover { border-color: var(--primary); color: var(--primary); }
.rd-related-arrow { color: var(--muted-foreground); font-weight: 700; }
.rd-related-chip:hover .rd-related-arrow { color: var(--primary); }

.rd-empty {
  margin: auto;
  max-width: 46ch;
  text-align: center;
  font-size: 13px;
  color: var(--muted-foreground);
  line-height: 1.55;
  padding: 40px 0;
}
</style>
