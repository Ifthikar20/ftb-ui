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
          <button
            type="button"
            class="pd-schedule-btn"
            :class="{ 'is-scheduled': !!schedule }"
            :title="schedule?.next_run_at ? `Next run ${shortDate(schedule.next_run_at)}` : 'Run this prompt automatically on a cadence'"
            @click="showSchedule = true"
          >
            <CalendarClock :size="14" :stroke-width="2" />
            {{ schedule ? 'Scheduled' : 'Schedule prompt' }}
          </button>
        </div>
      </div>
      <div v-if="scanStatusLine" class="pd-scan-status" :class="`is-${scanStatusKind}`">
        <span class="pd-scan-dot" />
        <span>{{ scanStatusLine }}</span>
        <span v-if="scanErrorLine" class="pd-scan-error">— {{ scanErrorLine }}</span>
      </div>
    </header>

    <PromptScheduleModal
      v-model="showSchedule"
      :website-id="websiteId"
      :prompt-id="promptId"
      @changed="onScheduleChanged"
      @run-now="runScan"
    />

    <!-- Metadata strip -->
    <div class="pd-meta-grid">
      <div class="pd-meta">
        <div class="pd-meta-label"><Clock :size="12" :stroke-width="2"/>Last ran</div>
        <div class="pd-meta-val">
          <template v-if="lastRanAt">
            <span :title="relativeTime(lastRanAt)">{{ ranDate(lastRanAt) }} · {{ ranTime(lastRanAt) }}</span>
          </template>
          <span v-else class="pd-mute">Never</span>
        </div>
      </div>
      <div class="pd-meta">
        <div class="pd-meta-label"><Folder :size="12" :stroke-width="2"/>Group</div>
        <div class="pd-meta-val">{{ detail?.prompt?.topic || 'Default prompts' }}</div>
      </div>
      <div class="pd-meta">
        <div class="pd-meta-label"><Globe :size="12" :stroke-width="2"/>Prompt origin</div>
        <div class="pd-meta-val">
          <template v-if="detail?.prompt?.location">{{ flag(detail.prompt.location) }} {{ countryName(detail.prompt.location) }}</template>
          <template v-else>🌐 Global</template>
        </div>
      </div>
      <div class="pd-meta">
        <div class="pd-meta-label"><CircleDot :size="12" :stroke-width="2"/>Status</div>
        <div class="pd-meta-val">
          <span
            v-if="scanStatusKind === 'running'"
            class="pd-status is-scanning"
            :title="SCAN_PATIENCE_TIP"
          >
            <span class="pd-status-dot"></span>
            {{ scanStatusWord }}<template v-if="scanElapsedLabel"> · {{ scanElapsedLabel }}</template>
            <sup class="pd-status-help">?</sup>
          </span>
          <span v-else class="pd-status" :class="`is-${detail?.status || 'inactive'}`">
            <span class="pd-status-dot"></span>
            {{ detail?.status === 'active' ? 'Active' : 'Inactive' }}
          </span>
        </div>
      </div>
      <div class="pd-meta">
        <div class="pd-meta-label"><Cpu :size="12" :stroke-width="2"/>Models</div>
        <div class="pd-meta-val">
          <span v-if="respondingModels.length" class="pd-models-cell" :title="modelsMetaTip">
            <span
              v-for="m in respondingModels"
              :key="m.provider"
              class="pd-model-dot pd-model-dot-sm"
              :style="{ background: modelStyle(m.model).color }"
              :title="`${m.label}: ${m.responses} ${m.responses === 1 ? 'response' : 'responses'}`"
            >{{ modelStyle(m.model).abbr }}</span>
            <span class="pd-models-count">{{ respondingModels.length }} of {{ configuredModels.length }} responding</span>
          </span>
          <span v-else class="pd-mute" title="No model has answered this prompt yet — run a scan">None yet</span>
        </div>
      </div>
    </div>

    <!-- Tags + template -->
    <div v-if="promptTags.length || detail?.prompt?.template_text" class="pd-meta-extra">
      <div v-if="promptTags.length" class="pd-tag-row">
        <span
          class="pd-template-label"
          title="Tags you assigned to this prompt — used to filter and group prompts on the Prompts page"
        >Tags</span>
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

    <!-- Page-level data scope: the period window and run selection feed the
         backend query, so they re-scope EVERYTHING below (trend, brands,
         domains, chats) — which is why they live here, not inside a card. -->
    <div v-if="detail" class="pd-scopebar">
      <span class="pd-scope-label">
        <CalendarClock :size="13" :stroke-width="2"/>
        Data scope
      </span>
      <label v-if="(detail.runs || []).length" class="pd-run-select">
        <select
          :value="selectedRun || ''"
          aria-label="Show a single run"
          @change="setRun($event.target.value || null)"
        >
          <option value="">All runs ({{ detail.runs.length }})</option>
          <option v-for="r in detail.runs" :key="r.run_id" :value="r.run_id">
            {{ shortDate(r.ran_at) }} · {{ r.visibility_pct }}%
          </option>
        </select>
      </label>
      <span v-if="selectedRun" class="pd-scope-note">
        Showing a single run<template v-if="selectedRunLabel"> from {{ selectedRunLabel }}</template> —
        every section below reflects only that run.
        <button type="button" class="pd-inline-link" @click="setRun(null)">Show all runs</button>
      </span>
    </div>

    <!-- Overview: Visibility chart + Top brands table -->
    <section class="pd-overview-head">
      <h2 class="pd-section-title">
        <BarChart3 :size="16" :stroke-width="2"/>
        Overview
      </h2>
      <p class="pd-section-sub">How often each brand appears in AI-generated discussions of this prompt.</p>
    </section>

    <!-- Trend across runs: one chart, three explicit metrics (visibility /
         position / sentiment) switched by the toggle, each with its own
         plain-English explainer so "performance" is never ambiguous. -->
    <div v-if="detail" class="pd-card pd-trend-card">
      <div class="pd-card-head pd-trend-head">
        <div class="pd-trend-title">
          <h3>
            <ChartLine :size="14" :stroke-width="2"/>
            {{ activeMetric.title }}
          </h3>
          <p class="pd-trend-explainer">{{ activeMetric.explainer(brandLabel) }}</p>
        </div>
        <div class="pd-trend-controls">
          <div class="pd-metric-pills" role="tablist" aria-label="Metric">
            <button
              v-for="(m, key) in TREND_METRICS"
              :key="key"
              type="button"
              class="pd-period-pill"
              :class="{ 'is-on': trendMetric === key }"
              :title="m.explainer(brandLabel)"
              @click="trendMetric = key"
            >{{ m.label }}</button>
          </div>
          <div class="pd-period-pills" role="tablist" aria-label="Time window">
            <button
              v-for="p in PERIODS"
              :key="p.value"
              type="button"
              class="pd-period-pill"
              :class="{ 'is-on': period === p.value }"
              @click="setPeriod(p.value)"
            >{{ p.label }}</button>
          </div>
        </div>
      </div>
      <div class="pd-chart pd-trend-chart">
        <Line v-if="runsChartData" :data="runsChartData" :options="runsChartOptions" />
        <div v-else-if="trendNeedsMoreRuns" class="pd-empty-inline">
          <ChartLine :size="30" :stroke-width="1.5"/>
          <p>
            This prompt needs at least two runs to chart a trend.
            <button type="button" class="pd-inline-link" @click="showSchedule = true">Schedule it</button>
            to build history automatically, or run a scan now.
          </p>
        </div>
        <div v-else class="pd-empty-inline">
          <ChartLine :size="30" :stroke-width="1.5"/>
          <p>{{ activeMetric.emptyNote(brandLabel) }}</p>
        </div>
      </div>
    </div>

    <div class="pd-grid pd-grid-2">
      <div class="pd-card">
        <div class="pd-card-head">
          <h3>
            <ChartLine :size="14" :stroke-width="2"/>
            Visibility
          </h3>
          <span class="pd-card-meta">
            Across {{ detail?.total_responses || 0 }} model responses<template v-if="selectedRun"> · this run</template>
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
                    <BrandLogo :name="b.name" :domain="b.domain" :size="20" />
                    <a
                      v-if="b.domain"
                      :href="`https://${b.domain}`"
                      target="_blank"
                      rel="noopener"
                      class="pd-brand-name pd-brand-link"
                      @click.stop
                    >{{ b.name }}</a>
                    <span v-else class="pd-brand-name">{{ b.name }}</span>
                    <a
                      v-if="b.domain"
                      :href="`https://${b.domain}`"
                      target="_blank"
                      rel="noopener"
                      class="pd-brand-domain"
                      @click.stop
                    >{{ b.domain }}</a>
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
                    >{{ modelStyle(mk).abbr }}</span>
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

    <!-- Top Domains + Domain type breakdown -->
    <section class="pd-overview-head" style="margin-top: 28px">
      <h2 class="pd-section-title">
        <Globe :size="16" :stroke-width="2"/>
        Top domains
      </h2>
      <p class="pd-section-sub">Domains AI models retrieved when answering this prompt.</p>
    </section>

    <div class="pd-grid pd-grid-domains">
      <div class="pd-card">
        <div class="pd-card-head">
          <h3>
            <Link2 :size="14" :stroke-width="2"/>
            By citation count
          </h3>
          <div class="pd-pagescan">
            <span v-if="pageScanStatusLine" class="pd-pagescan-status" :class="`is-${pageScan?.status}`">
              {{ pageScanStatusLine }}
            </span>
            <button
              type="button"
              class="pd-pagescan-btn"
              :disabled="pageScanRunning || !topDomains.length"
              :title="'Fetches the cited pages and scores how ' + brandLabel
                + ' is portrayed on each. Uses AI credits — runs only when you click.'"
              @click="scanSources"
            >
              <Globe :size="13" :stroke-width="2" />
              {{ pageScanRunning ? 'Scanning sources…'
                : (pageScan?.status === 'complete' ? 'Re-scan sources' : 'Scan cited sources') }}
            </button>
          </div>
        </div>
        <div class="pd-table-wrap">
          <Table class="pd-table">
            <TableHeader>
              <TableRow>
                <TableHead class="num">#</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead class="num">
                  <span class="pd-th-help" :title="HELP.citations">Citations<sup>?</sup></span>
                </TableHead>
                <TableHead>
                  <span class="pd-th-help" :title="HELP.cited_in">Cited in<sup>?</sup></span>
                </TableHead>
                <TableHead class="num">
                  <span class="pd-th-help" :title="HELP.domain_sentiment">In answers<sup>?</sup></span>
                </TableHead>
                <TableHead class="num">
                  <span class="pd-th-help" :title="HELP.page_sentiment">On page<sup>?</sup></span>
                </TableHead>
                <TableHead class="num">
                  <span class="pd-th-help" :title="HELP.page_tone">Tone<sup>?</sup></span>
                </TableHead>
                <TableHead>
                  <span class="pd-th-help" :title="HELP.domain_type">Type<sup>?</sup></span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="(d, i) in visibleDomains"
                :key="d.apex_domain"
                class="pd-domain-row"
                :class="{ 'is-clickable': (d.sample_result_ids || []).length }"
                :title="(d.sample_result_ids || []).length ? 'Click to open a chat that cited this domain' : ''"
                @click="openCitingChats(d)"
              >
                <TableCell class="num">{{ i + 1 }}</TableCell>
                <TableCell>
                  <img :src="faviconFor(d.apex_domain)" :alt="d.domain" class="pd-favicon" @error="onFaviconError($event, d)"/>
                  <a :href="`https://${d.apex_domain}`" target="_blank" rel="noopener" @click.stop>{{ d.apex_domain }}</a>
                </TableCell>
                <TableCell class="num">{{ d.count }}</TableCell>
                <TableCell>
                  <template v-if="d.answers_total != null">
                    {{ d.answers_citing }} of {{ d.answers_total }} answers
                    <span class="pd-mute">· {{ d.retrieved_pct }}%</span>
                  </template>
                  <template v-else>{{ d.retrieved_pct }}%</template>
                </TableCell>
                <TableCell class="num">
                  <span
                    v-if="d.brand_sentiment != null"
                    class="pd-sent"
                    :title="sentimentTip(d.brand_sentiment)"
                  >
                    <span class="pd-sent-dot" :class="sentimentClass(d.brand_sentiment)"></span>
                    {{ d.brand_sentiment }}
                  </span>
                  <span v-else class="text-muted" :title="`${brandLabel} was not mentioned in the answers citing this domain`">—</span>
                </TableCell>
                <TableCell class="num">
                  <span
                    v-if="d.page_sentiment != null"
                    class="pd-sent"
                    :title="`How ${brandLabel} is portrayed on this domain's cited page: ` + sentimentTip(d.page_sentiment)"
                  >
                    <span class="pd-sent-dot" :class="sentimentClass(d.page_sentiment)"></span>
                    {{ d.page_sentiment }}
                  </span>
                  <span
                    v-else-if="d.page_analyzed"
                    class="text-muted"
                    :title="`Page analyzed — ${brandLabel} was not mentioned on it`"
                  >—</span>
                  <span
                    v-else
                    class="text-muted"
                    :title="pageScanRunning ? 'Scan in progress…' : 'Not scanned yet — use Scan cited sources'"
                  >{{ pageScanRunning ? '…' : '—' }}</span>
                </TableCell>
                <TableCell class="num">
                  <span
                    v-if="d.page_tone != null"
                    class="pd-sent"
                    :title="`Overall tone of the cited page across every brand it discusses (not just ${brandLabel}): ${d.page_tone}/100`"
                  >
                    <span class="pd-sent-dot" :class="sentimentClass(d.page_tone)"></span>
                    {{ d.page_tone }}
                  </span>
                  <span
                    v-else-if="d.page_analyzed"
                    class="text-muted"
                    title="Page analyzed but no brands were detected to score"
                  >—</span>
                  <span
                    v-else
                    class="text-muted"
                    :title="pageScanRunning ? 'Scan in progress…' : 'Not scanned yet — use Scan cited sources'"
                  >{{ pageScanRunning ? '…' : '—' }}</span>
                </TableCell>
                <TableCell>
                  <span class="pd-type-pill" :class="`is-${(d.source_class || 'other').toLowerCase()}`">
                    {{ typeLabel(d.source_class) }}
                  </span>
                </TableCell>
              </TableRow>
              <TableRow v-if="!topDomains.length">
                <TableCell colspan="8" class="pd-table-empty">No citations yet.</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div v-if="topDomains.length > DOMAINS_PREVIEW" class="pd-domains-more">
            <button type="button" class="pd-inline-link" @click="domainsExpanded = !domainsExpanded">
              {{ domainsExpanded
                ? 'Show top 10 only'
                : `Show all ${topDomains.length} domains` }}
            </button>
          </div>
        </div>
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
            <TableHead style="width: 42%">Chat</TableHead>
            <TableHead>{{ brandLabel }} mentioned</TableHead>
            <TableHead class="num">Position</TableHead>
            <TableHead class="num">
              <span class="pd-th-help" title="How closely this answer reflects your own brand facts and key messages from Brand Input, 0-100.">Alignment<sup>?</sup></span>
            </TableHead>
            <TableHead>Mentions</TableHead>
            <TableHead>Sources</TableHead>
            <TableHead>Location</TableHead>
            <TableHead class="num">
              <span class="pd-th-help" title="When this model answer was captured — the date and time the prompt was run against the model.">Last ran<sup>?</sup></span>
            </TableHead>
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
              <span
                v-else-if="c.status === 'unavailable' || c.status === 'failed'"
                class="pd-chat-state is-unavail"
                :title="c.error || 'This model did not return an answer on this scan. It will be tried again on the next scan.'"
              >
                No response from this model
              </span>
              <span v-else class="pd-chat-state is-pending">Awaiting response…</span>
            </TableCell>
            <TableCell>
              <span :class="c.brand_mentioned ? 'pd-yes' : 'pd-no'">{{ c.brand_mentioned ? 'Yes' : 'No' }}</span>
            </TableCell>
            <TableCell class="num">{{ c.position ?? '—' }}</TableCell>
            <TableCell class="num">{{ c.alignment ?? '—' }}</TableCell>
            <TableCell>
              <span class="pd-icon-row">
                <span
                  v-for="m in c.models"
                  :key="m"
                  class="pd-model-dot"
                  :style="{ background: modelStyle(m).color }"
                  :title="modelStyle(m).label"
                >{{ modelStyle(m).abbr }}</span>
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
            <TableCell class="num pd-ran-cell">
              <template v-if="c.created_at">
                <span class="pd-ran-date" :title="relativeTime(c.created_at)">{{ ranDate(c.created_at) }}</span>
                <span class="pd-ran-time">{{ ranTime(c.created_at) }}</span>
              </template>
              <span v-else class="text-muted">—</span>
            </TableCell>
          </TableRow>
          <TableRow v-if="!recentChats.length">
            <TableCell colspan="8" style="text-align:center; color: var(--muted-foreground); padding: 28px 0">
              No chats yet for this prompt.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Brand alignment -->
    <section class="pd-overview-head" style="margin-top: 28px">
      <h2 class="pd-section-title">
        <Target :size="16" :stroke-width="2"/>
        Brand alignment
      </h2>
      <p class="pd-section-sub">How closely the AI answers to this prompt reflect your own brand facts and key messages from Brand Input.</p>
    </section>

    <div class="pd-card" style="padding: 18px 20px">
      <template v-if="brandAlignment && (brandAlignment.state === 'scored' || brandAlignment.state === 'extraction_pending')">
        <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom: 14px">
          <span
            style="font-size: 22px; font-weight: 800; color: var(--foreground)"
          >{{ brandAlignment.avg_score != null ? Math.round(brandAlignment.avg_score) : '—' }}<span style="font-size:13px; font-weight:600; color: var(--muted-foreground)"> / 100</span></span>
          <span class="pd-mute" style="font-size: 12px">
            {{ brandAlignment.scored }} of {{ brandAlignment.total }} answers benchmarked
          </span>
          <span v-if="brandAlignment.state === 'extraction_pending'" class="pd-mute" style="font-size: 12px">
            · Scored against your pasted content — brand facts are still being extracted, coverage sharpens once they land.
          </span>
        </div>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px">
          <div>
            <div class="pd-section-sub" style="font-weight: 600; margin-bottom: 6px">Messages AI reflects</div>
            <p v-for="(m, i) in brandAlignment.top_reflected" :key="'r' + i" style="font-size: 13px; color: var(--foreground); margin: 0 0 6px">
              {{ m.text }} <span class="pd-mute">({{ m.count }})</span>
            </p>
            <p v-if="!brandAlignment.top_reflected.length" class="pd-mute" style="font-size: 12px">Nothing reflected yet.</p>
          </div>
          <div>
            <div class="pd-section-sub" style="font-weight: 600; margin-bottom: 6px">Messages AI misses</div>
            <p v-for="(m, i) in brandAlignment.top_missing" :key="'m' + i" style="font-size: 13px; color: var(--muted-foreground); margin: 0 0 6px">
              {{ m.text }} <span class="pd-mute">({{ m.count }})</span>
            </p>
            <p v-if="!brandAlignment.top_missing.length" class="pd-mute" style="font-size: 12px">No relevant messages are missing.</p>
          </div>
        </div>
        <div v-if="brandAlignment.unsupported_samples.length" style="margin-top: 14px">
          <div class="pd-section-sub" style="font-weight: 600; margin-bottom: 6px">Claims not backed by your material</div>
          <p v-for="(s, i) in brandAlignment.unsupported_samples" :key="'u' + i" style="font-size: 12px; font-style: italic; color: var(--muted-foreground); margin: 0 0 4px">
            "{{ s.text }}" <span v-if="s.provider">— {{ s.provider }}</span>
          </p>
        </div>
      </template>
      <p v-else-if="brandAlignment && brandAlignment.state === 'no_brand_input'" class="pd-mute" style="font-size: 13px; margin: 0">
        Add your pages, pasted copy or quick notes on the
        <router-link :to="`/llm-ranking/${websiteId}/brand-input`" style="color: var(--foreground); font-weight: 600">Brand Input</router-link>
        page and every answer here will be benchmarked against what you want to be known for.
      </p>
      <p v-else-if="brandAlignment && brandAlignment.state === 'embeddings_unavailable'" class="pd-mute" style="font-size: 13px; margin: 0">
        Semantic embeddings are not configured, so alignment cannot be scored.
      </p>
      <p v-else class="pd-mute" style="font-size: 13px; margin: 0">
        Alignment appears after the next scan of this prompt.
      </p>
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
        <span class="pd-status" :class="`is-${['complete', 'completed'].includes(lastFanoutRun.status) ? 'active' : 'inactive'}`">
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

    <!-- Brand security findings raised from this prompt's own responses (moved to bottom) -->
    <section style="margin-top: 28px">
      <PromptSecurityFindings :website-id="websiteId" :prompt-id="promptId" />
    </section>

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
import { computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Bar, Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend,
} from 'chart.js'
import {
  BarChart3, CalendarClock, ChartLine, ChevronLeft, CircleDot, Clock, Cpu,
  Folder, Globe, Inbox, Link2, MessageSquare, Repeat, Target, Trophy,
} from '@lucide/vue'
import promptLibrary from '@/api/promptLibrary'
import { useAppStore } from '@/stores/app'
import ChatDetailModal from '@/components/ChatDetailModal.vue'
import PromptScheduleModal from '@/components/prompt_library/PromptScheduleModal.vue'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import BrandLogo from '@/components/BrandLogo.vue'
import PromptSecurityFindings from '@/components/prompt_library/PromptSecurityFindings.vue'

const MODELS = {
  chatgpt: { label: 'ChatGPT', abbr: 'GP', color: '#10a37f' },
  perplexity: { label: 'Perplexity', abbr: 'Px', color: '#8b5cf6' },
  gemini: { label: 'Gemini', abbr: 'Ge', color: '#5b8def' },
  claude: { label: 'Claude', abbr: 'Cl', color: '#f97316' },
  copilot: { label: 'Copilot', abbr: 'Co', color: '#06b6d4' },
  grok: { label: 'Grok', abbr: 'Gk', color: '#0f172a' },
  deepseek: { label: 'DeepSeek', abbr: 'Ds', color: '#2563eb' },
  mistral: { label: 'Mistral', abbr: 'Mi', color: '#ef4444' },
  cohere: { label: 'Cohere', abbr: 'Ch', color: '#d946ef' },
  llama: { label: 'Llama', abbr: 'La', color: '#0ea5e9' },
  nova: { label: 'Nova', abbr: 'No', color: '#64748b' },
}
function modelStyle(key) {
  const m = MODELS[key]
  if (m) return m
  const label = key || 'Model'
  return { label, abbr: label.slice(0, 2), color: '#94a3b8' }
}
function flag(code) {
  if (!code || code.length !== 2) return '🌐'
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 127397 + c.charCodeAt(0)))
}
// Full country name from an ISO-2 code (e.g. "LK" -> "Sri Lanka").
function countryName(code) {
  if (!code) return ''
  if (code.length !== 2) return code
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase()) || code
  } catch (_) {
    return code
  }
}

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend)

const route = useRoute()
// Read fresh from the route each access: Vue Router reuses this component
// when navigating between two prompt-detail URLs (same route, different
// param), so these must not be captured once at setup.
let websiteId = route.params.websiteId
let promptId = route.params.promptId

const detail = ref(null)
const loading = ref(true)
const error = ref('')

/* ── Time-series Overview controls ── */
const PERIODS = [
  { value: 'all', label: 'All' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
]
const period = ref('all')          // window applied to the trend + breakdown
const selectedRun = ref(null)      // audit_id when drilled into a single run

async function load() {
  loading.value = true
  error.value = ''
  try {
    const params = {}
    if (period.value && period.value !== 'all') params.period = period.value
    if (selectedRun.value) params.run = selectedRun.value
    const { data } = await promptLibrary.promptDetailAgg(websiteId, promptId, params)
    detail.value = data || null
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

  // Auto-fill gaps: scan when a configured model has never been TRIED for
  // this prompt. A model with recorded failed/unavailable attempts is not
  // retried automatically — a broken key used to make every page visit
  // fire a doomed (billable) scan forever. Manual "Run scan" still retries
  // everything.
  const missingConfigured = (d.by_model || []).some(
    (m) => m.configured
      && (m.responses || 0) === 0
      && (m.failed || 0) === 0
      && (m.unavailable || 0) === 0,
  )
  if (missingConfigured) {
    autoScanDone.value = true
    runScan('missing')   // silent gap-fill: only never-tried models
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
    const payload = data || {}
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

async function runScan(mode) {
  if (scanInFlight.value) return
  scanInFlight.value = true
  // Click handlers pass an Event object — anything that isn't the explicit
  // gap-fill sentinel means a FULL re-run of every configured model.
  const payload = mode === 'missing' ? { mode: 'missing' } : {}
  try {
    const { data } = await promptLibrary.crawlPrompt(websiteId, promptId, payload)
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
    // Backend PromptCrawlRun status is 'complete' (no trailing d) — the
    // old 'completed' comparison never matched, so the poller ran its full
    // cap and the button sat on "Scan queued" for ~11 minutes per scan.
    const done = latest && ['complete', 'completed', 'failed'].includes(latest.status)
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
  if (s === 'complete' || s === 'completed') return 'ok'
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
  // Completed scans show nothing here: the exact run time lives in the
  // "Last ran" meta cell, and the old relative label ("2 min ago") only
  // re-rendered while a scan was running, so it silently went stale.
  if (ls.status === 'complete' || ls.status === 'completed') return ''
  if (ls.status === 'failed') {
    return `Last scan failed ${relativeTime(ls.completed_at || ls.started_at)}`
  }
  return ''
})

const scanErrorLine = computed(() => {
  const ls = detail.value?.latest_scan
  return ls?.status === 'failed'
    ? (ls.error || 'The scan could not complete. The issue has been logged.')
    : ''
})

/* Scan-aware Status cell: while a scan is queued/running the cell reads
 * "Queued to scan"/"Scanning · 42s" with a live timer and a patience
 * tooltip, instead of a static "Active" that hides the work in flight. */
const SCAN_PATIENCE_TIP =
  'A scan is asking every configured AI model this prompt and analyzing '
  + 'their answers. It usually takes one to three minutes — no need to '
  + 'wait here, results are saved automatically and appear when you '
  + 'return or refresh.'
const scanStatusWord = computed(() => {
  if (scanInFlight.value) return 'Starting scan'
  if (detail.value?.latest_scan?.status === 'pending') return 'Queued to scan'
  // First-ever scan = "Learning"; re-scans of a prompt with history =
  // "Relearning" — the platform is refreshing what it knows.
  return (detail.value?.runs || []).length ? 'Relearning' : 'Learning'
})
const scanElapsedLabel = computed(() => {
  const started = detail.value?.latest_scan?.started_at
  if (!started) return ''
  const s = Math.max(0, Math.floor((nowTick.value - new Date(started).getTime()) / 1000))
  return formatDuration(s)
})

watch(scanStatusKind, (kind) => {
  if (kind === 'running') startElapsedTimer()
  else stopElapsedTimer()
}, { immediate: true })
/* ── Recent chats + chat modal ── */
const brandLabel = computed(() => detail.value?.brand_label || 'your brand')
const recentChats = computed(() => detail.value?.recent_chats || [])
const brandAlignment = computed(() => detail.value?.brand_alignment || null)
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

/* ── Per-prompt schedule ── */
const showSchedule = ref(false)
const schedule = ref(null)
async function loadSchedule() {
  try {
    const { data } = await promptLibrary.getPromptSchedule(websiteId, promptId)
    schedule.value = data?.schedule ?? null
  } catch {
    schedule.value = null
  }
}
function onScheduleChanged(s) { schedule.value = s }

/* ── Trend period window + single-run drill-in ── */
function shortDate(v) {
  if (!v) return ''
  const d = new Date(v)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
// Exact run timestamp for the Recent-chats "Last ran" column: real date
// and time, not a relative "2d ago" (that moves to the hover tooltip).
function ranDate(v) {
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  const opts = { month: 'short', day: 'numeric' }
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric'
  return d.toLocaleDateString(undefined, opts)
}
function ranTime(v) {
  const d = new Date(v)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
function setPeriod(p) {
  if (period.value === p) return
  period.value = p
  selectedRun.value = null   // a new window invalidates any drill-in
  load()
}
function setRun(runId) {
  selectedRun.value = runId || null
  load()
}
const selectedRunLabel = computed(() => {
  const r = (detail.value?.runs || []).find((x) => x.run_id === selectedRun.value)
  return r ? shortDate(r.ran_at) : ''
})

onMounted(async () => {
  await loadThenMaybeScan()
  loadSchedule()
  // Landing on a source scan another tab started: resume polling it.
  if (['pending', 'running'].includes(detail.value?.page_scan?.status)) {
    startPageScanPoll()
  }
})
onBeforeUnmount(() => {
  stopScanPoll()
  stopElapsedTimer()
  stopPageScanPoll()
  appStore.setBreadcrumbTail('')
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
  // Reset the time-series controls + schedule so nothing leaks across prompts.
  period.value = 'all'
  selectedRun.value = null
  schedule.value = null
  domainsExpanded.value = false
  stopScanPoll()
  stopElapsedTimer()
  stopPageScanPoll()
  loadThenMaybeScan()
  loadSchedule()
})

const promptText = computed(() => detail.value?.prompt?.text || '')
const promptTextShort = computed(() => {
  const t = promptText.value
  return t.length > 60 ? t.slice(0, 60) + '…' : t
})

// Surface the prompt under inspection in the header breadcrumb, so the
// trail reads FetchBot / AI Visibility / Prompts / <prompt text> instead
// of stopping at the section name. AppLayout wraps pages in <keep-alive>,
// so navigation deactivates rather than unmounts this component — the
// tail must be cleared on deactivate and restored on activate.
const appStore = useAppStore()
watch(promptTextShort, t => appStore.setBreadcrumbTail(t), { immediate: true })
onDeactivated(() => appStore.setBreadcrumbTail(''))
onActivated(() => appStore.setBreadcrumbTail(promptTextShort.value))

const topBrands = computed(() => (detail.value?.brands || []).slice(0, 7))

// When the prompt last actually ran: the newest run in the series (covers
// both audits and single-prompt scans), falling back to the latest crawl's
// completion stamp.
const lastRanAt = computed(() => {
  const runs = detail.value?.runs || []
  if (runs.length) return runs[runs.length - 1].ran_at
  return detail.value?.latest_scan?.completed_at || null
})

/* ── Models responding to this prompt (meta strip). Straight from
 * by_model: a model counts as responding when it has captured answers. ── */
const configuredModels = computed(() =>
  (detail.value?.by_model || []).filter((m) => m.configured))
const respondingModels = computed(() =>
  (detail.value?.by_model || []).filter((m) => (m.responses || 0) > 0))
const modelsMetaTip = computed(() => {
  const parts = respondingModels.value.map(
    (m) => `${m.label}: ${m.responses} ${m.responses === 1 ? 'answer' : 'answers'}`)
  const silent = configuredModels.value
    .filter((m) => !(m.responses || 0))
    .map((m) => m.label)
  if (silent.length) parts.push(`No answers yet: ${silent.join(', ')}`)
  return parts.join(' · ')
})
const succeededResponses = computed(() => {
  // Sum of provider.responses across by_model — counts only cells that
  // returned text, not failed/unavailable ones, so the banner accurately
  // distinguishes "nothing has been tried" from "responses came back but
  // no brand was extracted".
  return (detail.value?.by_model || []).reduce((n, m) => n + (m.responses || 0), 0)
})
const topDomains = computed(() => detail.value?.top_domains || [])

// The domain list can run to 25 rows and dominate the page — show the top
// 10 and let the user expand the rest on demand.
const DOMAINS_PREVIEW = 10
const domainsExpanded = ref(false)
const visibleDomains = computed(() =>
  domainsExpanded.value ? topDomains.value : topDomains.value.slice(0, DOMAINS_PREVIEW))

/* ── "Scan cited sources": page-level sentiment via Source Intelligence ──
 * Explicit trigger only (it spends AI credits). The backend seeds a
 * SourceScan with this prompt's cited URLs; we poll the detail payload's
 * page_scan until it resolves, which also refreshes the On-page column. */
const pageScan = computed(() => detail.value?.page_scan || null)
const pageScanRunning = computed(() =>
  scanSourcesBusy.value
  || ['pending', 'running'].includes(pageScan.value?.status))
const pageScanStatusLine = computed(() => {
  const s = pageScan.value
  if (!s) return ''
  if (s.status === 'complete') {
    const when = s.completed_at ? shortDate(s.completed_at) : ''
    return `Pages scanned${when ? ` ${when}` : ''} · ${s.analyzed_count}/${s.results_count} analyzed`
  }
  if (s.status === 'failed') return 'Last source scan failed'
  return ''
})
const scanSourcesBusy = ref(false)
let pageScanPollTimer = null
function stopPageScanPoll() {
  if (pageScanPollTimer) { clearInterval(pageScanPollTimer); pageScanPollTimer = null }
}
function startPageScanPoll() {
  stopPageScanPoll()
  let ticks = 0
  pageScanPollTimer = setInterval(async () => {
    ticks += 1
    try { await load() } catch { /* keep polling */ }
    const status = detail.value?.page_scan?.status
    // ~6 min cap: a scan fetches up to 10 pages + analyses; well past that
    // it has failed server-side and the next reload will say so.
    if (status === 'complete' || status === 'failed' || ticks > 60) stopPageScanPoll()
  }, 6000)
}
async function scanSources() {
  if (scanSourcesBusy.value || pageScanRunning.value) return
  scanSourcesBusy.value = true
  try {
    await promptLibrary.scanPromptSources(websiteId, promptId)
    await load()
    if (['pending', 'running'].includes(detail.value?.page_scan?.status)) {
      startPageScanPoll()
    }
  } catch (e) {
    error.value = e?.displayMessage || 'Could not start the source scan.'
  } finally {
    scanSourcesBusy.value = false
  }
}

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
  citations:
    'Citations: the total number of times AI answers linked to a page on this domain '
    + 'for this prompt. One answer can cite the same domain several times.',
  cited_in:
    'Cited in: how many of the captured model answers referenced this domain at least '
    + 'once. "1 of 3 answers · 33%" = one in three AI answers pulled information from it. '
    + 'Failed model calls are excluded.',
  domain_type:
    'Type: what kind of site the domain is — UGC (forums, social, reviews), Editorial '
    + '(news, blogs), Corporate (company sites), Reference (wikis, docs), Institutional '
    + '(gov, edu), your own site, or a competitor.',
  domain_sentiment:
    'In answers: how positively AI talks about your brand in the answers that cite this '
    + 'domain (positive 85 / neutral 55 / negative 25, averaged). Measured from the AI '
    + 'answers themselves, not from the domain’s own pages. Blank when the brand was not '
    + 'mentioned in any answer citing the domain.',
  page_sentiment:
    'On page: how your brand is portrayed on the cited page itself, measured by fetching '
    + 'the page and analyzing its content (0–100; higher is better). Produced by "Scan '
    + 'cited sources" — it runs only when you click, because it uses AI credits. Blank '
    + 'with a dash when the page was analyzed but never mentions your brand.',
  page_tone:
    'Tone: the overall sentiment of the cited page — averaged across every brand and '
    + 'product it discusses, not just yours (0–100; green positive, red negative). '
    + 'Tells you whether the content AI leans on for this prompt is positive or '
    + 'negative material. Scored by "Scan cited sources".',
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

/* ── Trend across runs (Line): one point per run this prompt appeared in.
 * Three explicit metrics behind a toggle, so "performance" is never vague:
 *   visibility — likelihood of being mentioned (share of answers naming you)
 *   position   — rank when mentioned (#1 best, axis reversed so up = better)
 *   sentiment  — tone when mentioned (85 positive / 55 neutral / 25 negative)
 * All three series ship in detail.runs; switching metrics is client-only. */
const trendMetric = ref('visibility')
const TREND_METRICS = {
  visibility: {
    label: 'Visibility',
    title: 'Visibility over time',
    color: '#6366f1',
    colorActive: '#4338ca',
    fillColor: 'rgba(99,102,241,0.12)',
    accessor: (r) => r.visibility_pct,
    format: (v) => `${v}% of AI answers mentioned`,
    explainer: (brand) =>
      `How likely AI is to mention ${brand}: the share of model answers in each `
      + 'run that name it. Higher is better.',
    emptyNote: () => 'No visibility data for these runs yet.',
    yScale: { min: 0, max: 100, ticks: { callback: (v) => v + '%' }, grid: { color: 'rgba(0,0,0,0.05)' } },
  },
  position: {
    label: 'Position',
    title: 'Ranking position over time',
    color: '#f59e0b',
    colorActive: '#b45309',
    fillColor: 'rgba(245,158,11,0.10)',
    accessor: (r) => r.avg_position,
    format: (v) => `average position #${v} when mentioned`,
    explainer: (brand) =>
      `Where ${brand} ranks in AI answers when it IS mentioned (#1 = listed `
      + 'first). Lower is better, so up on this chart means improving.',
    emptyNote: (brand) =>
      `${brand} hasn't been ranked in these runs yet — position appears once `
      + 'models mention it in a ranked list.',
    // Reversed so #1 sits at the top: visually climbing = improving rank.
    yScale: { reverse: true, min: 1, suggestedMax: 5, ticks: { stepSize: 1, callback: (v) => '#' + v }, grid: { color: 'rgba(0,0,0,0.05)' } },
  },
  sentiment: {
    label: 'Sentiment',
    title: 'Sentiment over time',
    color: '#10b981',
    colorActive: '#047857',
    fillColor: 'rgba(16,185,129,0.10)',
    accessor: (r) => r.sentiment_score,
    format: (v) => `sentiment ${v}/100 (${v >= 70 ? 'positive' : v >= 50 ? 'neutral' : 'negative'})`,
    explainer: (brand) =>
      `How positively AI talks about ${brand} when it appears: each mention `
      + 'scores positive 85, neutral 55 or negative 25, averaged per run. Higher is better.',
    emptyNote: (brand) =>
      `No sentiment yet — it's measured from runs where models mention ${brand}.`,
    yScale: { min: 0, max: 100, ticks: { stepSize: 25 }, grid: { color: 'rgba(0,0,0,0.05)' } },
  },
  alignment: {
    label: 'Alignment',
    title: 'Brand alignment over time',
    color: '#0ea5e9',
    colorActive: '#0369a1',
    fillColor: 'rgba(14,165,233,0.10)',
    accessor: (r) => r.alignment_avg,
    format: (v) => `alignment ${v}/100 with your brand material`,
    explainer: (brand) =>
      `How closely AI answers reflect ${brand}'s own facts and key messages `
      + 'from Brand Input, averaged per run. Higher is better.',
    emptyNote: () =>
      'No alignment yet — it appears once answers are benchmarked against '
      + 'your Brand Input material.',
    yScale: { min: 0, max: 100, ticks: { stepSize: 25 }, grid: { color: 'rgba(0,0,0,0.05)' } },
  },
}
const activeMetric = computed(() => TREND_METRICS[trendMetric.value])
// brandLabel already exists above (used by Recent chats) — reused here.
const trendNeedsMoreRuns = computed(() => (detail.value?.runs || []).length < 2)

const runsChartData = computed(() => {
  const runs = detail.value?.runs || []
  if (runs.length < 2) return null   // a trend needs at least two points
  const m = activeMetric.value
  const data = runs.map((r) => m.accessor(r))
  // Position/sentiment only exist for runs where the brand was mentioned;
  // an all-null series renders as the metric-specific empty note instead.
  if (!data.some((v) => v != null)) return null
  return {
    labels: runs.map((r) => shortDate(r.ran_at)),
    datasets: [{
      label: m.label,
      data,
      borderColor: m.color,
      backgroundColor: m.fillColor,
      fill: trendMetric.value !== 'position',
      spanGaps: true,          // bridge runs with no value (not mentioned)
      tension: 0.3,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: runs.map((r) =>
        (selectedRun.value && r.run_id === selectedRun.value) ? m.colorActive : m.color),
    }],
  }
})
const runsChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  // Click a point to drill the breakdown below into that single run.
  onClick: (_evt, els) => {
    if (els && els.length) {
      const r = (detail.value?.runs || [])[els[0].index]
      if (r) setRun(r.run_id)
    }
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        // Lead with the active metric, then the other two for context, plus
        // how many answers the run had — every point self-explains.
        label: (ctx) => {
          const r = (detail.value?.runs || [])[ctx.dataIndex] || {}
          const m = activeMetric.value
          const parts = [m.format(ctx.parsed.y)]
          if (trendMetric.value !== 'visibility' && r.visibility_pct != null) {
            parts.push(`visibility ${r.visibility_pct}%`)
          }
          if (trendMetric.value !== 'position' && r.avg_position != null) {
            parts.push(`avg position #${r.avg_position}`)
          }
          if (trendMetric.value !== 'sentiment' && r.sentiment_score != null) {
            parts.push(`sentiment ${r.sentiment_score}`)
          }
          if (r.answers != null) parts.push(`${r.answers} model answers in this run`)
          return parts
        },
      },
    },
  },
  scales: {
    y: activeMetric.value.yScale,
    x: { grid: { display: false } },
  },
}))

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
/* Scan in flight: amber pill, pulsing dot, live elapsed timer, "?" hint. */
.pd-status.is-scanning {
  background: rgba(245, 158, 11, 0.12); color: #b45309;
  font-variant-numeric: tabular-nums; cursor: help;
}
.pd-status.is-scanning .pd-status-dot { animation: pd-scan-pulse 1.2s ease-in-out infinite; }
.pd-status-help { font-size: 0.62rem; font-weight: 700; opacity: 0.7; margin-left: 1px; }
@keyframes pd-scan-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.75); }
}

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
/* Top domains gets the width; Domain types is a compact side card. */
/* Single full-width card: tone/sentiment live as table columns now. */
.pd-grid-domains { grid-template-columns: 1fr; }

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

/* Schedule button (header actions) */
.pd-schedule-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; border: 1px solid var(--border); border-radius: 10px;
  background: var(--card); font: inherit; font-size: 0.82rem; font-weight: 600;
  color: var(--foreground); cursor: pointer;
}
.pd-schedule-btn:hover { background: var(--muted); }
.pd-schedule-btn svg { color: var(--muted-foreground); }
.pd-schedule-btn.is-scheduled { border-color: var(--foreground); }
.pd-schedule-btn.is-scheduled svg { color: var(--foreground); }

/* Trend-over-time card (visibility / position / sentiment toggle) */
.pd-trend-card { margin-bottom: 18px; }
.pd-trend-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.pd-trend-title { min-width: 0; max-width: 520px; }
.pd-trend-explainer {
  margin: 4px 0 0;
  font-size: 0.8rem;
  line-height: 1.45;
  color: var(--muted-foreground);
}
.pd-trend-controls { display: inline-flex; align-items: center; gap: 10px; flex-wrap: wrap; }
/* Metric pills share the period-pill look but sit in their own bordered
   group so "what am I measuring" reads separately from "over what window". */
.pd-metric-pills {
  display: inline-flex; padding: 3px; gap: 2px;
  background: var(--card); border: 1px solid var(--border); border-radius: 9px;
}
.pd-period-pills { display: inline-flex; padding: 3px; gap: 2px; background: var(--muted); border-radius: 9px; }
.pd-period-pill {
  appearance: none; border: none; background: transparent; padding: 4px 12px;
  border-radius: 7px; font: inherit; font-size: 0.78rem; font-weight: 600;
  color: var(--muted-foreground); cursor: pointer;
}
.pd-period-pill.is-on { background: var(--card); color: var(--foreground); box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06); }
.pd-run-select select {
  appearance: none; border: 1px solid var(--border); border-radius: 9px;
  background: var(--card); padding: 6px 10px; font: inherit; font-size: 0.8rem;
  color: var(--foreground); cursor: pointer; max-width: 240px;
}
.pd-trend-chart { height: 240px; }
/* Page-level data-scope bar: window + run selection for everything below. */
.pd-scopebar {
  display: flex; align-items: center; flex-wrap: wrap; gap: 12px;
  padding: 10px 14px; margin-bottom: 4px;
  background: var(--card); border: 1px solid var(--border); border-radius: 12px;
}
.pd-scope-label {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.05em; color: var(--muted-foreground);
}
.pd-scope-label svg { color: var(--muted-foreground); }
.pd-scope-note { font-size: 0.82rem; color: var(--muted-foreground); }
.pd-inline-link {
  appearance: none; border: none; background: none; padding: 0; font: inherit;
  color: var(--foreground); font-weight: 600; text-decoration: underline;
  text-underline-offset: 2px; cursor: pointer;
}
.pd-inline-link:hover { opacity: 0.8; }

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
.pd-brand-link {
  color: inherit;
  text-decoration: none;
}
.pd-brand-link:hover { color: var(--primary); text-decoration: underline; }
.pd-brand-domain {
  margin-left: 6px;
  font-size: 0.78rem;
  color: var(--muted-foreground, #64748b);
  text-decoration: none;
}
.pd-brand-domain:hover { text-decoration: underline; }
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

/* Recent chats "Last ran": exact date over time, relative age on hover. */
.pd-ran-cell { white-space: nowrap; font-variant-numeric: tabular-nums; }
.pd-ran-date { display: block; font-weight: 500; color: var(--foreground); cursor: help; }
.pd-ran-time { display: block; font-size: 0.75rem; color: var(--muted-foreground); }

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
  width: 18px;
  height: 18px;
  font-size: 7.5px;
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

/* "Scan cited sources" (page-level sentiment) */
.pd-pagescan { display: inline-flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.pd-pagescan-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border: 1px solid var(--border); border-radius: 9px;
  background: var(--card); font: inherit; font-size: 0.8rem; font-weight: 600;
  color: var(--foreground); cursor: pointer;
}
.pd-pagescan-btn:hover { background: var(--muted); }
.pd-pagescan-btn:disabled { opacity: 0.55; cursor: progress; }
.pd-pagescan-btn svg { color: var(--muted-foreground); }
.pd-pagescan-status { font-size: 0.75rem; color: var(--muted-foreground); }
.pd-pagescan-status.is-failed { color: #b91c1c; }
.pd-domains-more {
  padding: 10px 14px;
  border-top: 1px solid var(--border);
  text-align: center;
  font-size: 0.82rem;
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
  width: 20px; height: 20px; border-radius: 9999px; color: #fff;
  font-size: 8.5px; font-weight: 700; letter-spacing: -0.02em;
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
