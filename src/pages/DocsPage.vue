<script setup>
/**
 * Public documentation page (/docs).
 *
 * A self-contained docs shell — top bar with search, a section sidebar,
 * the content column, and an FAQ rail — styled entirely through the app's
 * design tokens so it themes light/dark with the rest of Cansee. The
 * content is the same "what we offer / what you need" documentation, now
 * living inside the app instead of a standalone page.
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { SUPPORT_EMAIL } from '@/constants/support'

const navGroups = [
  { title: 'Get started', items: [
    { id: 'welcome', label: 'What is Cansee' },
    { id: 'how', label: 'How Cansee works' },
    { id: 'quickstart', label: 'Quick start' },
  ] },
  { title: 'Concepts', items: [
    { id: 'engines', label: 'The five AI engines' },
    { id: 'metrics', label: 'Metrics that matter' },
  ] },
  { title: 'What we offer', items: [
    { id: 'visibility', label: 'AI Visibility' },
    { id: 'prompts', label: 'Prompts' },
    { id: 'research', label: 'Brand Research' },
    { id: 'security', label: 'Brand Security' },
    { id: 'sources', label: 'Source Influence' },
    { id: 'ingestion', label: 'Brand Ingestion' },
  ] },
  { title: 'For your business', items: [
    { id: 'use-cases', label: 'Use cases' },
    { id: 'integrations', label: 'Integrations' },
  ] },
  { title: 'Reference', items: [
    { id: 'reading', label: 'Reading your results' },
    { id: 'plans', label: 'Plans & limits' },
    { id: 'glossary', label: 'Glossary' },
    { id: 'contact', label: 'Contact us' },
  ] },
]

const faqs = [
  { q: 'Does Cansee work if my site has no traffic?', a: 'Yes. Cansee measures what AI assistants say, not your site analytics. A brand-new project with zero visitors still gets a full read on its first scan.' },
  { q: 'Do you actually change what ChatGPT says about me?', a: 'No tool can retrain the public models from the outside. Cansee measures the gap between your facts and what AI says, then shows you exactly where to publish to close it.' },
  { q: 'Which AI engines do you check?', a: 'Five: ChatGPT, Claude, Gemini, Perplexity, and Grok, plus Google’s AI Overview where it appears.' },
  { q: 'How often do scans run?', a: 'On a schedule you set per prompt, or on demand whenever you want a fresh read.' },
  { q: 'Is Brand Security live monitoring?', a: 'No. It reads the AI answers Cansee has collected and flags the harmful ones, with the exact sentence quoted. It doesn’t watch social or the live web.' },
  { q: 'What counts as a competitor?', a: 'Any real brand an answer names alongside or instead of you. Cansee detects them automatically and filters out generic category terms so they don’t pollute your rankings.' },
  { q: 'Can I get reports in Slack or Teams?', a: 'Yes: Slack, Discord, and Microsoft Teams. Daily reports, brand-security alerts, and hot-lead alerts all deliver to a channel.' },
  { q: 'Do prompts have to mention my brand?', a: 'No, the opposite. A good prompt is a neutral buyer question. Cansee measures whether AI brings you up on its own.' },
]

const supportHref = `mailto:${SUPPORT_EMAIL}`

// ── Section navigation state ───────────────────────────────────────────
const activeId = ref('welcome')
const navOpen = ref(false)
const rootEl = ref(null)
let observer = null

function goTo(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  navOpen.value = false
  clearSearch()
}

// ── Search ─────────────────────────────────────────────────────────────
const query = ref('')
let index = []
const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  return index
    .filter((x) => (x.title + ' ' + x.text).toLowerCase().includes(q))
    .slice(0, 8)
})
const sel = ref(0)
function clearSearch() { query.value = ''; sel.value = 0 }
function onSearchKey(e) {
  if (!results.value.length) return
  if (e.key === 'ArrowDown') { e.preventDefault(); sel.value = Math.min(sel.value + 1, results.value.length - 1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); sel.value = Math.max(sel.value - 1, 0) }
  else if (e.key === 'Enter') { e.preventDefault(); const r = results.value[sel.value]; if (r) goTo(r.id) }
  else if (e.key === 'Escape') { clearSearch() }
}

onMounted(() => {
  // Build the search index + scrollspy from the rendered content.
  const scope = rootEl.value
  if (!scope) return
  const nodes = scope.querySelectorAll('.dx-main section, .dx-main .service[id]')
  index = Array.from(nodes).map((s) => {
    const h = s.querySelector('h2, h3')
    const p = s.querySelector('p:not(.kicker):not(.need)')
    return {
      id: s.id,
      title: h ? h.textContent.trim() : s.id,
      text: s.textContent.replace(/\s+/g, ' ').trim(),
      snip: (p ? p.textContent : '').replace(/\s+/g, ' ').trim(),
    }
  }).filter((x) => x.id)

  const sections = Array.from(scope.querySelectorAll('.dx-main section, .dx-main .service[id]'))
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) activeId.value = e.target.id })
    }, { rootMargin: '-12% 0px -75% 0px' })
    sections.forEach((s) => observer.observe(s))
  }

  const onSlash = (e) => {
    if (e.key === '/' && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) {
      e.preventDefault()
      scope.querySelector('.dx-search-input')?.focus()
    }
  }
  document.addEventListener('keydown', onSlash)
  onBeforeUnmount(() => document.removeEventListener('keydown', onSlash))
})
onBeforeUnmount(() => { if (observer) observer.disconnect() })
</script>

<template>
  <div class="docs" ref="rootEl">
    <!-- Top bar -->
    <header class="dx-top">
      <button class="dx-menu" type="button" aria-label="Open navigation" @click="navOpen = !navOpen">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
      </button>
      <router-link to="/" class="dx-brand">
        <span class="dx-mark">Cansee</span><span class="dx-tag">Docs</span>
      </router-link>
      <div class="dx-search">
        <svg class="dx-search-ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
        <input
          class="dx-search-input"
          type="text"
          placeholder="Search the docs"
          autocomplete="off"
          aria-label="Search documentation"
          v-model="query"
          @keydown="onSearchKey"
        />
        <span class="dx-kbd">/</span>
        <div v-if="query.trim()" class="dx-results">
          <button
            v-for="(r, i) in results"
            :key="r.id"
            type="button"
            class="dx-sr"
            :class="{ sel: i === sel }"
            @click="goTo(r.id)"
            @mouseenter="sel = i"
          >
            <span class="dx-sr-t">{{ r.title }}</span>
            <span class="dx-sr-s">{{ r.snip.slice(0, 78) }}</span>
          </button>
          <p v-if="!results.length" class="dx-sr-empty">No matches. Try “visibility”, “engines”, or “Slack”.</p>
        </div>
      </div>
      <div class="dx-spacer"></div>
      <a class="dx-link hide-sm" :href="supportHref">Contact</a>
      <router-link to="/" class="dx-link hide-sm">Home</router-link>
      <router-link to="/login" class="dx-cta">Get started</router-link>
    </header>

    <div class="dx-shell">
      <!-- Sidebar -->
      <aside class="dx-side" :class="{ open: navOpen }">
        <nav v-for="g in navGroups" :key="g.title" class="dx-grp">
          <p class="dx-grp-t">{{ g.title }}</p>
          <a
            v-for="it in g.items"
            :key="it.id"
            :href="`#${it.id}`"
            class="dx-navlink"
            :class="{ active: activeId === it.id }"
            @click.prevent="goTo(it.id)"
          >{{ it.label }}</a>
        </nav>
      </aside>
      <div class="dx-scrim" :class="{ open: navOpen }" @click="navOpen = false"></div>

      <!-- Content -->
      <main class="dx-main">
        <div class="dx-inner prose">
          <p class="dx-crumb">Docs <span aria-hidden="true">›</span> <strong>Introduction</strong></p>

          <div class="dx-hero">
            <h1>Your brand, as AI describes it.</h1>
            <p class="lede">Cansee measures and helps you shape how AI assistants (ChatGPT, Claude, Gemini, Perplexity, and Grok) answer the questions your customers ask. When someone asks an assistant “what’s the best tool for this?”, Cansee shows whether you come up, what’s said about you, and where those answers come from.</p>
          </div>

          <section id="welcome">
            <h2>What is Cansee</h2>
            <p class="kicker">The one-paragraph version.</p>
            <p>Search is moving from a page of ten blue links to a single spoken answer. More buyers now start with an assistant, not a search box, and the assistant names a handful of brands, or none. Cansee is how you <strong>see your place in that answer</strong> and work to improve it: which questions mention you, who gets recommended instead, whether the tone is fair, and which pages on the open web are teaching the models what to say.</p>
            <p>Everything in the product answers one question in different ways: <em>what do AI assistants say about your market, and can you change it?</em></p>
          </section>

          <section id="how">
            <h2>How Cansee works</h2>
            <p class="kicker">In plain terms.</p>
            <p>Cansee asks the AI assistants the same questions your customers ask, reads the answers, and pulls out which brands were recommended, in what order, and in what tone. For deeper research it also looks across the open web and community discussions to see where those answers come from. The result is a clear picture of where you stand, and what to do about it.</p>
            <div class="note">
              <span class="note-label">Worth knowing</span>
              <p>Some assistants answer from the live web and some from what they were trained on. Cansee shows you both, and never invents a source.</p>
            </div>
          </section>

          <section id="quickstart">
            <h2>Quick start</h2>
            <p class="kicker">From a URL to your first result in minutes.</p>
            <ol class="steps">
              <li><strong>Add your project.</strong> Paste your website. Cansee reads the homepage to learn what your business actually does. That’s what the prompts and measurements are built from.</li>
              <li><strong>Review your prompts.</strong> Cansee drafts a starter set of buyer questions from your site. Keep the ones that fit, edit the rest, add your own.</li>
              <li><strong>Run a scan.</strong> In a few minutes you get your visibility, the brands recommended instead of you, and the sources behind the answers.</li>
              <li><strong>Take action.</strong> Teach the models what’s true about you, find live conversations to join, and catch anything harmful.</li>
            </ol>
          </section>

          <section id="engines">
            <h2>The five AI engines</h2>
            <p class="kicker">Who Cansee asks on your behalf.</p>
            <p>Cansee measures across five assistants, plus Google’s AI Overview where it appears. Each answers the same tracked question, so you see which favour you and which don’t.</p>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Engine</th><th>Maker</th><th>Answers from</th></tr></thead>
                <tbody>
                  <tr><td>ChatGPT <span class="mono">gpt-4</span></td><td>OpenAI</td><td>Training data</td></tr>
                  <tr><td>Claude</td><td>Anthropic</td><td>Training data</td></tr>
                  <tr><td>Gemini</td><td>Google</td><td>Training data</td></tr>
                  <tr><td>Grok</td><td>xAI</td><td>Training data</td></tr>
                  <tr><td>Perplexity</td><td>Perplexity</td><td><strong>Live web</strong></td></tr>
                </tbody>
              </table>
            </div>
            <p>An engine that isn’t configured on your plan is shown greyed out rather than dropped. An absence is information too.</p>
          </section>

          <section id="metrics">
            <h2>Metrics that matter</h2>
            <p class="kicker">The five numbers every result comes back to.</p>
            <dl class="metrics">
              <div class="metric"><dt>Visibility</dt><dd>How often you appear in answers for your tracked questions, as a percentage. <span class="mono">0%</span> means AI never named you. A gap to close, not a bug.</dd></div>
              <div class="metric"><dt>Share of voice</dt><dd>Your presence weighed against every other brand named in the same answers. Who owns the conversation.</dd></div>
              <div class="metric"><dt>Position</dt><dd>When you <em>are</em> named, where you land: first pick, or an afterthought at the bottom.</dd></div>
              <div class="metric"><dt>Sentiment</dt><dd>The tone of the mention, from negative through neutral to positive, scored per answer.</dd></div>
              <div class="metric"><dt>Alignment</dt><dd>How closely an answer matches what <em>you’ve</em> said is true about your brand. A similarity match against your own material, not a fact-check. A “does AI echo your messaging” score.</dd></div>
            </dl>

            <div class="measure-eg">
              <div class="me-label">One measurement, worked through</div>
              <div class="me-row"><span class="me-tag">Prompt</span> <span class="me-q">“What’s the best CRM for a small team?”</span></div>
              <div class="me-row me-answer">
                <span class="me-tag">ChatGPT answered</span>
                <ol class="me-list">
                  <li>HubSpot</li>
                  <li>Pipedrive</li>
                  <li class="me-you"><mark>Acme CRM</mark> <span class="me-you-tag">your brand</span></li>
                  <li>Salesforce</li>
                  <li>Zoho</li>
                </ol>
              </div>
              <div class="me-out">
                <span class="me-chip"><b>Named</b> visibility</span>
                <span class="me-chip"><b>#3</b> position</span>
                <span class="me-chip"><b>+0.6</b> sentiment</span>
                <span class="me-chip"><b>2 of 5</b> engines named you</span>
              </div>
              <p class="me-note">Cansee reads the ranked brands and the tone out of that one answer, then rolls it up across every engine and every prompt into the five numbers above.</p>
            </div>
          </section>

          <section id="visibility">
            <h2>What Cansee offers</h2>
            <p class="kicker">Six places to work, one question, each a different way in. Integrations get their own section below.</p>

            <div class="service">
              <div class="svc-head"><h3>AI Visibility</h3><span class="svc-where">Dashboard</span></div>
              <p>The home base. Where you rank across the engines, your share of voice, who gets recommended instead of you, and how all of it moves over time.</p>
              <p class="svc-how"><b>How you use it:</b> the dashboard fills in automatically once your prompts have run at least once. Use the filters (market, model, topic, date range) to find exactly where you’re strong and where you vanish.</p>
              <p class="need"><span class="need-l">You need</span> at least one prompt and one completed scan. Nothing to install or configure.</p>
            </div>

            <div class="service" id="prompts">
              <div class="svc-head"><h3>Prompts</h3><span class="svc-where">AI Visibility › Prompts</span></div>
              <p>The buyer questions you get measured on: the searches your customers actually make. A prompt is neutral by design: it never names your brand, so a scan measures whether AI brings you up on its own.</p>
              <p class="svc-how"><b>How you use it:</b> Cansee drafts a starter set read from your own site. Add more (one per line, or bulk-upload a CSV), organize them with tags and groups, choose which engines to test, pick a market, and set each prompt to run on a schedule or on demand.</p>
              <p class="need"><span class="need-l">You need</span> a project. Auto-drafted prompts require your site to have been read once (its industry and description); a bare URL gets scanned first so the prompts fit the real business.</p>
            </div>

            <div class="service" id="research">
              <div class="svc-head"><h3>Brand Research</h3><span class="svc-where">AI Visibility › Brand Research</span></div>
              <p>A deep, one-off scan of a single query across the web, community threads, and the AI engines at once. Its payoff isn’t a chart. It’s a <strong>list of places to act</strong>: live threads that name competitors but not you (each with a reply box), unanswered questions to own on your own site, and pages recommending rivals.</p>
              <p class="svc-how"><b>How you use it:</b> type a query a customer would search and hit Scan. In a few minutes you get the map in three views: a <strong>Dashboard</strong> of opportunity cards (the one to act on), a sortable <strong>Table</strong> of brands, or a relationship <strong>Graph</strong>.</p>
              <p class="need"><span class="need-l">You need</span> a query. That’s it on your side. (Web search must be switched on for your workspace; if you see “web search is not configured,” that’s an admin setting.)</p>
            </div>

            <div class="service" id="security">
              <div class="svc-head"><h3>Brand Security</h3><span class="svc-where">AI Visibility › Brand Security</span></div>
              <p>Catches the harmful or wrong things AI says about you. Nine detectors (negative sentiment, factual misrepresentation, unfavourable comparison, weak endorsement, and more), each quoting the <em>exact sentence</em> so you see the evidence, not just a score.</p>
              <p class="svc-how"><b>How you use it:</b> it runs on its own over the answers your scans collect. Open any finding to see the flagged phrase highlighted in place, its severity, and a link straight to the answer it came from.</p>
              <p class="need"><span class="need-l">You need</span> some completed scans for it to read. Adding reference material in Brand Ingestion sharpens how accurately it can judge a claim.</p>
              <div class="note"><span class="note-label">Scope</span><p>Brand Security reads the AI answers Cansee has already collected. It is not live social or SERP monitoring. Findings surface as answers land, from the models themselves.</p></div>
            </div>

            <div class="service" id="sources">
              <div class="svc-head"><h3>Source Influence</h3><span class="svc-where">AI Visibility › URLs</span></div>
              <p>The domains AI cites for your market, ranked, and where your visibility can grow. This is the GEO layer (Generative Engine Optimization, the AI-era cousin of SEO): if you know which pages feed the answers, you know where to earn a mention.</p>
              <p class="svc-how"><b>How you use it:</b> browse the ranked list of cited domains, filter by model, topic, and period, and read the “what to do next” strip that flags where earning a mention would move you the most.</p>
              <p class="need"><span class="need-l">You need</span> completed scans that produced citations. The more your prompts run, the richer this gets.</p>
            </div>

            <div class="service" id="ingestion">
              <div class="svc-head"><h3>Brand Ingestion</h3><span class="svc-where">AI Visibility › Brand Ingestion</span></div>
              <p>Feed Cansee what’s true about you: site pages, docs, pasted copy, quick notes. Cansee grounds its own checks in that material and measures whether the assistants’ answers reflect it (that’s the <em>Alignment</em> metric).</p>
              <p class="svc-how"><b>How you use it:</b> add a URL (optionally crawl the whole site), paste copy or markdown, or jot a quick note. Or flip on <em>“Allow the Cansee agent to crawl your site”</em> and it gathers the material for you. Everything you add becomes context the scans and Brand Security draw on.</p>
              <p class="need"><span class="need-l">You need</span> your own material: a page URL, a document, or a paragraph of facts. The agent crawl only runs after you turn on the consent toggle.</p>
              <div class="note"><span class="note-label">Honest note</span><p>Feeding Cansee your facts does not retrain ChatGPT or Claude. No tool can from the outside. It lets Cansee <em>measure the gap</em> between your truth and what AI says, so you know what to go publish and where.</p></div>
            </div>
          </section>

          <section id="use-cases">
            <h2>How Cansee helps your business</h2>
            <p class="kicker">The same question, answered for a few very different companies.</p>
            <p>Whatever you sell, buyers now ask an assistant before they ask you. Here’s what that looks like in practice.</p>

            <div class="usecase">
              <h3>A local pet shop</h3>
              <p class="uc-q">“Where’s the best place to buy premium dog food near me?” · “Good pet stores in Dallas?”</p>
              <p>Cansee shows whether the shop comes up at all, and who the assistant recommends instead: the big chains like Chewy and PetSmart, or a rival down the road. It surfaces the local threads and community questions where those recommendations get made, so the owner knows exactly where a mention or a helpful reply would win new customers. And if an assistant gives wrong hours or says the shop has closed, Brand Security flags it with the exact wording.</p>
            </div>

            <div class="usecase">
              <h3>A software or SaaS product</h3>
              <p class="uc-q">“Best CRM for a 10-person team?” · “Alternatives to the market leader?”</p>
              <p>See which assistants recommend you, where you land in the list, and which review sites and comparison articles are shaping those answers, the pages to go earn a place on. Track it over time so you can tell whether your content and PR are actually moving the needle.</p>
            </div>

            <div class="usecase">
              <h3>A local service: clinic, law firm, agency</h3>
              <p class="uc-q">“Best family dentist in Austin?” · “Affordable immigration lawyer near me?”</p>
              <p>Measure how you show up market by market, in each city you serve. Catch harmful or incorrect claims early (a wrong price, an outdated service, an unfair comparison), quoted sentence and all, so you can get ahead of it before a customer does.</p>
            </div>

            <div class="usecase">
              <h3>A product or online brand</h3>
              <p class="uc-q">“Most comfortable running shoes for flat feet?” · “Eco-friendly water bottles?”</p>
              <p>See whether AI puts your product on the shortlist, what it says about it, and which reviews and threads shape that opinion, then find the conversations where joining in would move you up the list.</p>
            </div>
          </section>

          <section id="integrations">
            <h2>Integrations</h2>
            <p class="kicker">Get your results where your team already works.</p>
            <p>Connect <strong>Slack</strong>, <strong>Discord</strong>, or <strong>Microsoft Teams</strong>, and Cansee posts your daily report, brand-security alerts, and hot-lead alerts straight to a channel, so the whole team sees movement without logging in. Setup takes a couple of clicks in <span class="mono">Settings › Integrations</span>, with no code, and Cansee never reads your messages. In Slack and Discord you can also ask Cansee a quick question right in the channel.</p>
            <p class="need"><span class="need-l">You need</span> a channel you can post to. The app walks you through connecting each one, step by step.</p>
          </section>

          <section id="reading">
            <h2>Reading your results</h2>
            <p class="kicker">A few things that trip people up.</p>
            <ul>
              <li><strong>“Not named” is the starting line, not a failure.</strong> A brand-new project usually shows <span class="mono">0%</span> visibility. The assistants haven’t connected you to the question yet. That number is what you’re here to move.</li>
              <li><strong>Brands vs. information.</strong> Cansee separates real brands from generic terms (a category like “golf clubs” isn’t a competitor). Only evidence-backed brands count toward your rankings.</li>
              <li><strong>Sentiment is per mention.</strong> One glowing thread and one harsh one don’t cancel to “neutral.” Open the detail to read the actual quotes on both sides.</li>
            </ul>
          </section>

          <section id="plans">
            <h2>Plans &amp; limits</h2>
            <p class="kicker">What each tier includes.</p>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Plan</th><th>Projects</th><th>Prompts / run</th><th>Best for</th></tr></thead>
                <tbody>
                  <tr><td>Free trial</td><td>1</td><td>5</td><td>Seeing your first result</td></tr>
                  <tr><td>Pro</td><td>5</td><td>15</td><td>Tracking a brand over time</td></tr>
                  <tr><td>Business</td><td>Unlimited</td><td>50</td><td>Agencies &amp; multi-brand teams</td></tr>
                </tbody>
              </table>
            </div>
            <p>A live trial runs the full product on one project, so you can judge it on your own brand before you pay.</p>
          </section>

          <section id="glossary">
            <h2>Glossary</h2>
            <p class="kicker">The words you’ll see around the app.</p>
            <dl class="metrics">
              <div class="metric"><dt>Engine</dt><dd>One AI assistant Cansee asks: ChatGPT, Claude, Gemini, Perplexity, or Grok.</dd></div>
              <div class="metric"><dt>Prompt</dt><dd>A buyer question you track, e.g. “best CRM for a small team.” Neutral by design, so it never names your brand.</dd></div>
              <div class="metric"><dt>Scan / run</dt><dd>One measurement of your prompts across the engines at a point in time.</dd></div>
              <div class="metric"><dt>GEO</dt><dd>Generative Engine Optimization: shaping what AI answers about you, the way SEO shapes what Google returns.</dd></div>
            </dl>
          </section>

          <section id="contact">
            <h2>Contact us</h2>
            <p class="kicker">Real people, one business day.</p>
            <p>Questions about your account, a scan that looks off, or anything the docs didn’t cover? Email us and a human replies.</p>
            <div class="contact-card">
              <a class="email" :href="supportHref">{{ SUPPORT_EMAIL }}</a>
              <p class="contact-sub">You can also reach us from the Help &amp; feedback button inside the app.</p>
            </div>
          </section>

          <footer class="docfoot">Cansee: brand intelligence for AI search. Every capability here is a real part of the product; where a limit matters, it’s stated plainly.</footer>
        </div>
      </main>

      <!-- FAQ rail -->
      <aside class="dx-rail">
        <p class="dx-rail-t">Frequently asked</p>
        <details v-for="f in faqs" :key="f.q" class="faq">
          <summary>{{ f.q }}<svg class="chev" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6" /></svg></summary>
          <p>{{ f.a }}</p>
        </details>
        <p class="dx-rail-help">Still stuck? Email <a :href="supportHref">{{ SUPPORT_EMAIL }}</a>.</p>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.docs {
  background: var(--background);
  color: var(--foreground);
  min-height: 100vh;
  font-size: 14px;
  line-height: 1.62;
}
.docs a { color: var(--foreground); text-decoration: none; }
.docs .mono, .docs code { font-family: ui-monospace, "SF Mono", Consolas, monospace; font-size: 0.85em; background: var(--muted); padding: 1px 5px; border-radius: 4px; color: var(--foreground); }

/* Top bar */
.dx-top {
  position: sticky; top: 0; z-index: 50;
  display: flex; align-items: center; gap: 14px;
  height: 54px; padding: 0 18px;
  background: var(--background);
  border-bottom: 1px solid var(--border);
}
.dx-brand { display: flex; align-items: baseline; gap: 7px; flex-shrink: 0; }
.dx-mark { font-size: 20px; font-weight: 700; letter-spacing: -0.01em; color: var(--foreground); }
.dx-tag { font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: var(--muted-foreground); }
.dx-spacer { flex: 1; }
.dx-link { font-size: 12.5px; color: var(--muted-foreground); padding: 6px 10px; border-radius: 7px; }
.dx-link:hover { color: var(--foreground); background: var(--muted); }
.dx-cta { font-size: 12.5px; font-weight: 600; color: var(--primary-foreground); background: var(--primary); padding: 6px 13px; border-radius: 8px; flex-shrink: 0; }
.dx-cta:hover { opacity: .9; }

.dx-search { position: relative; width: min(400px, 40vw); flex-shrink: 1; }
.dx-search-input { width: 100%; height: 34px; padding: 0 12px 0 33px; background: var(--muted); border: 1px solid var(--border); border-radius: 9px; color: var(--foreground); font: inherit; font-size: 13px; outline: none; }
.dx-search-input::placeholder { color: var(--muted-foreground); }
.dx-search-input:focus { border-color: var(--muted-foreground); }
.dx-search-ic { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--muted-foreground); pointer-events: none; }
.dx-kbd { position: absolute; right: 9px; top: 50%; transform: translateY(-50%); font-size: 10.5px; color: var(--muted-foreground); border: 1px solid var(--border); border-radius: 5px; padding: 1px 6px; pointer-events: none; }
.dx-results { position: absolute; top: 42px; left: 0; right: 0; z-index: 60; background: var(--background); border: 1px solid var(--border); border-radius: 12px; box-shadow: 0 12px 34px rgba(0,0,0,.18); padding: 6px; max-height: 60vh; overflow-y: auto; }
.dx-sr { display: flex; flex-direction: column; width: 100%; text-align: left; padding: 8px 11px; border-radius: 8px; background: none; border: 0; cursor: pointer; }
.dx-sr.sel { background: var(--muted); }
.dx-sr-t { font-size: 13px; font-weight: 600; color: var(--foreground); }
.dx-sr-s { font-size: 11.5px; color: var(--muted-foreground); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dx-sr-empty { padding: 12px; font-size: 12.5px; color: var(--muted-foreground); margin: 0; }

/* Layout */
.dx-shell { display: grid; grid-template-columns: 236px minmax(0,1fr) 272px; max-width: 1500px; margin: 0 auto; }
.dx-side { position: sticky; top: 54px; align-self: start; height: calc(100vh - 54px); overflow-y: auto; padding: 22px 16px 60px; border-right: 1px solid var(--border); }
.dx-grp { margin-bottom: 18px; }
.dx-grp-t { font-size: 10px; font-weight: 700; letter-spacing: .13em; text-transform: uppercase; color: var(--muted-foreground); margin: 0 0 6px; padding-left: 9px; }
.dx-navlink { display: block; font-size: 12.5px; color: var(--muted-foreground); padding: 4px 10px; border-radius: 7px; cursor: pointer; }
.dx-navlink:hover { color: var(--foreground); background: var(--muted); }
.dx-navlink.active { color: var(--foreground); font-weight: 600; background: var(--muted); box-shadow: inset 2px 0 0 var(--primary); }

.dx-main { min-width: 0; padding: 0 clamp(18px, 3.4vw, 52px); }
.dx-inner { max-width: 830px; margin: 0 auto; padding-bottom: 90px; }
.dx-crumb { padding: 22px 0 0; font-size: 11.5px; color: var(--muted-foreground); }
.dx-crumb strong { color: var(--foreground); font-weight: 600; }

.docs h1 { font-size: 27px; font-weight: 700; letter-spacing: -0.015em; color: var(--foreground); margin: 12px 0 10px; line-height: 1.12; }
.docs .lede { font-size: 15.5px; color: var(--foreground); margin: 0 0 8px; max-width: 70ch; line-height: 1.55; opacity: .9; }
.dx-hero { padding-bottom: 22px; border-bottom: 1px solid var(--border); }

.docs section { scroll-margin-top: 66px; padding-top: 34px; }
.docs h2 { font-size: 18px; font-weight: 700; letter-spacing: -0.01em; color: var(--foreground); margin: 0 0 3px; }
.docs .kicker { color: var(--muted-foreground); font-size: 12.5px; margin: 0 0 14px; }
.docs h3 { font-size: 13.5px; font-weight: 700; color: var(--foreground); margin: 20px 0 6px; }
.docs p { margin: 0 0 12px; }
.prose > p, .prose > ul, .prose > ol { max-width: 76ch; }
.docs ul, .docs ol { padding-left: 19px; margin: 0 0 12px; }
.docs li { margin: 0 0 6px; }
.docs strong { color: var(--foreground); font-weight: 600; }

ol.steps { list-style: none; counter-reset: s; padding: 0; margin: 14px 0 0; }
ol.steps > li { counter-increment: s; position: relative; padding: 0 0 16px 38px; }
ol.steps > li::before { content: counter(s); position: absolute; left: 0; top: -1px; width: 24px; height: 24px; display: grid; place-items: center; font-size: 11.5px; font-weight: 700; color: var(--foreground); background: var(--card); border: 1px solid var(--border); border-radius: 50%; }
ol.steps > li::after { content: ""; position: absolute; left: 12px; top: 25px; bottom: 1px; width: 1px; background: var(--border); }
ol.steps > li:last-child::after { display: none; }

.note { border: 1px solid var(--border); background: var(--card); border-radius: 10px; padding: 12px 15px; margin: 15px 0; font-size: 13px; }
.note-label { display: inline-block; font-size: 9.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--muted-foreground); margin-bottom: 4px; }
.note p:last-child { margin-bottom: 0; }

.service { border-top: 1px solid var(--border); padding: 20px 0 4px; }
.service:first-of-type { border-top: 0; }
.svc-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 5px; }
.svc-head h3 { margin: 0; font-size: 16px; }
.svc-where { font-size: 11px; color: var(--muted-foreground); font-family: ui-monospace, monospace; }
.service p { margin: 0 0 9px; max-width: 74ch; }
.svc-how { font-size: 13px; color: var(--foreground); max-width: 74ch; margin: 0 0 9px; opacity: .92; }
.svc-how b, .svc-how strong { color: var(--foreground); opacity: 1; }
.need { display: flex; gap: 9px; align-items: baseline; font-size: 12.5px; color: var(--muted-foreground); margin: 6px 0 12px; padding: 8px 12px; background: var(--card); border: 1px solid var(--border); border-radius: 8px; max-width: 74ch; }
.need-l { font-size: 9.5px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; color: var(--foreground); flex-shrink: 0; padding-top: 1px; }

/* Worked measurement example */
.measure-eg { border: 1px solid var(--border); background: var(--card); border-radius: 12px; padding: 16px 18px; margin: 18px 0 4px; }
.me-label { font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--muted-foreground); margin-bottom: 13px; }
.me-row { margin-bottom: 13px; }
.me-tag { display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--muted-foreground); margin-right: 8px; }
.me-q { font-size: 14.5px; color: var(--foreground); font-weight: 500; }
.me-list { list-style: decimal; padding-left: 28px; margin: 8px 0 0; font-size: 13.5px; }
.me-list li { margin: 3px 0; color: var(--muted-foreground); }
.me-you { color: var(--foreground); font-weight: 600; }
.me-list mark { background: var(--foreground); color: var(--background); font-weight: 700; padding: 1px 6px; border-radius: 4px; box-decoration-break: clone; }
.me-you-tag { font-size: 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--muted-foreground); margin-left: 6px; }
.me-out { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 11px; }
.me-chip { font-size: 12px; color: var(--muted-foreground); background: var(--muted); border: 1px solid var(--border); border-radius: 999px; padding: 3px 12px; font-variant-numeric: tabular-nums; }
.me-chip b { color: var(--foreground); font-weight: 700; }
.me-note { font-size: 12.5px; color: var(--muted-foreground); margin: 0; max-width: 74ch; line-height: 1.5; }

.usecase { border-top: 1px solid var(--border); padding: 18px 0 4px; }
.usecase:first-of-type { border-top: 0; }
.usecase h3 { margin: 0 0 4px; font-size: 15px; }
.uc-q { font-size: 12.5px; color: var(--muted-foreground); font-style: italic; margin: 0 0 8px; max-width: 74ch; }
.usecase p { max-width: 74ch; margin: 0 0 9px; }

.plat { border-top: 1px solid var(--border); padding: 18px 0 2px; }
.plat:first-of-type { border-top: 0; }
.plat-head { display: flex; align-items: center; gap: 9px; margin-bottom: 8px; }
.plat-head h3 { margin: 0; }
.plat-badge { font-size: 10px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--muted-foreground); border: 1px solid var(--border); border-radius: 999px; padding: 1px 8px; }

.table-wrap { overflow-x: auto; margin: 14px 0; border: 1px solid var(--border); border-radius: 10px; }
.docs table { border-collapse: collapse; width: 100%; font-size: 13px; }
.docs th, .docs td { text-align: left; padding: 9px 14px; border-bottom: 1px solid var(--border); vertical-align: top; }
.docs th { font-size: 10px; letter-spacing: .07em; text-transform: uppercase; color: var(--muted-foreground); font-weight: 700; background: var(--card); }
.docs tr:last-child td { border-bottom: 0; }
.docs td:first-child, .docs th:first-child { font-weight: 600; color: var(--foreground); }

.metrics { display: grid; margin: 16px 0; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
.metric { display: grid; grid-template-columns: 148px 1fr; gap: 14px; padding: 12px 15px; }
.metric + .metric { border-top: 1px solid var(--border); }
.metric dt { font-weight: 600; color: var(--foreground); font-size: 13px; }
.metric dd { margin: 0; color: var(--foreground); opacity: .88; font-size: 13px; }

.contact-card { border: 1px solid var(--border); background: var(--card); border-radius: 12px; padding: 18px 20px; margin-top: 14px; }
.contact-card .email { font-size: 16px; font-weight: 600; color: var(--foreground); }
.contact-card .email:hover { text-decoration: underline; }
.contact-sub { margin: 6px 0 0; color: var(--muted-foreground); font-size: 12.5px; }

.docfoot { margin-top: 46px; padding-top: 18px; border-top: 1px solid var(--border); font-size: 12px; color: var(--muted-foreground); }

/* FAQ rail */
.dx-rail { position: sticky; top: 54px; align-self: start; height: calc(100vh - 54px); overflow-y: auto; padding: 26px 22px 60px; border-left: 1px solid var(--border); }
.dx-rail-t { font-size: 10.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--muted-foreground); margin: 0 0 12px; }
details.faq { border-bottom: 1px solid var(--border); padding: 9px 0; }
details.faq > summary { list-style: none; cursor: pointer; font-size: 12.5px; font-weight: 600; color: var(--foreground); display: flex; gap: 8px; align-items: flex-start; }
details.faq > summary::-webkit-details-marker { display: none; }
details.faq > summary .chev { margin-left: auto; flex-shrink: 0; color: var(--muted-foreground); transition: transform .18s; margin-top: 3px; }
details.faq[open] > summary .chev { transform: rotate(90deg); }
details.faq p { margin: 7px 0 2px; font-size: 12px; color: var(--muted-foreground); line-height: 1.5; }
.dx-rail-help { margin-top: 20px; font-size: 12px; color: var(--muted-foreground); }
.dx-rail-help a { color: var(--foreground); text-decoration: underline; text-underline-offset: 2px; }

.dx-menu { display: none; }
/* The mobile scrim must never be a grid item on desktop, or it eats the
   middle column and squeezes the content. Only the mobile query shows it. */
.dx-scrim { display: none; }
@media (max-width: 1120px) {
  .dx-shell { grid-template-columns: 220px minmax(0,1fr); }
  .dx-rail { display: none; }
}
@media (max-width: 820px) {
  .dx-shell { grid-template-columns: 1fr; }
  .dx-search { width: auto; flex: 1; }
  .hide-sm { display: none; }
  .dx-side { position: fixed; inset: 54px auto 0 0; width: 260px; z-index: 40; background: var(--background); transform: translateX(-100%); transition: transform .22s; box-shadow: 0 0 40px rgba(0,0,0,.25); }
  .dx-side.open { transform: none; }
  .dx-menu { display: inline-flex; align-items: center; width: 34px; height: 30px; justify-content: center; border: 1px solid var(--border); border-radius: 7px; background: none; color: var(--foreground); cursor: pointer; }
  .dx-scrim { display: none; position: fixed; inset: 54px 0 0 0; background: rgba(0,0,0,.4); z-index: 39; }
  .dx-scrim.open { display: block; }
}
@media (prefers-reduced-motion: reduce) { .dx-side { transition: none; } }
</style>
