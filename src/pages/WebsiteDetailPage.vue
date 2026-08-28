<template>
  <div class="detail-page mx-auto max-w-6xl px-6 py-8 sm:px-8">
    <div class="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-foreground">{{ website?.name || 'Website' }}</h1>
        <p class="mt-1 text-sm text-muted-foreground">{{ website?.url }}</p>
      </div>
      <div class="flex gap-2">
        <Button @click="$router.push(`/analytics/${id}`)">View Analytics</Button>
      </div>
    </div>

    <!-- Next steps / onboarding checklist -->
    <Card class="mb-6 next-steps-card">
      <CardHeader>
        <CardTitle>Next steps</CardTitle>
        <CardDescription>Four short steps to get this project producing real data.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol class="next-steps-list">
          <li class="next-step" :class="{ done: website?.pixel_verified }">
            <span class="next-step-num">1</span>
            <div class="next-step-body">
              <div class="next-step-title">Install the pixel on {{ websiteHost }}</div>
              <p class="next-step-why">
                <strong>What:</strong> paste the snippet below into your site's <code>&lt;head&gt;</code>.
                <strong>Why:</strong> the pixel records pageviews, sources, and conversions so the SEO Analytics tab has something to chart. Without it the analytics page stays empty.
              </p>
              <a class="next-step-link" href="#pixel-snippet">Go to the snippet ↓</a>
            </div>
            <span class="next-step-status">{{ website?.pixel_verified ? 'Done' : 'Pending' }}</span>
          </li>

          <li class="next-step" :class="{ done: website?.pixel_verified }">
            <span class="next-step-num">2</span>
            <div class="next-step-body">
              <div class="next-step-title">Verify the pixel fires</div>
              <p class="next-step-why">
                <strong>What:</strong> load any page on {{ websiteHost }} in a browser. We watch for the first event automatically.
                <strong>Why:</strong> we only flip the Analytics tab live once we have proof the pixel is reachable from real traffic. This step usually takes under a minute.
              </p>
            </div>
            <span class="next-step-status">{{ website?.pixel_verified ? 'Verified' : 'Waiting for first event' }}</span>
          </li>

          <li class="next-step" :class="{ done: crawlComplete }">
            <span class="next-step-num">3</span>
            <div class="next-step-body">
              <div class="next-step-title">Wait for the first crawl</div>
              <p class="next-step-why">
                <strong>What:</strong> we crawl your site and read it the way an LLM would (titles, headings, schema, copy).
                <strong>Why:</strong> Brand Vault, Prompt Library, and LLM Ranking all need this snapshot before they can compare your content to the answers ChatGPT, Claude, Gemini, and Perplexity give about your category. Usually finishes in 5–10 minutes.
              </p>
            </div>
            <span class="next-step-status">{{ crawlStatusLabel }}</span>
          </li>

          <li class="next-step">
            <span class="next-step-num">4</span>
            <div class="next-step-body">
              <div class="next-step-title">Run your first LLM scan</div>
              <p class="next-step-why">
                <strong>What:</strong> kick off a scan that asks all four major models the prompts buyers are typing in your category and records whether {{ website?.name || 'your brand' }} shows up.
                <strong>Why:</strong> this is the actual measurement. The Visibility Overview, Source Influence, and Brand Safety panels all populate from the results of this scan and re-fire on a schedule going forward.
              </p>
              <button class="next-step-link" type="button" @click="$router.push(`/llm-ranking/${id}`)">Go to LLM Ranking →</button>
            </div>
            <span class="next-step-status">Optional</span>
          </li>
        </ol>
      </CardContent>
    </Card>

    <!-- Pixel Installation -->
    <Card id="pixel-snippet" class="mb-6">
      <CardHeader class="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle>Pixel Installation</CardTitle>
        <Badge :variant="website?.pixel_verified ? 'success' : 'warning'">
          {{ website?.pixel_verified ? 'Verified' : 'Not Verified' }}
        </Badge>
      </CardHeader>
      <CardContent>
        <p class="mb-4 text-sm text-muted-foreground">
          Add this script to your website's <code>&lt;head&gt;</code> tag to start tracking visitors.
        </p>
        <div class="overflow-x-auto rounded-lg border border-border bg-muted px-4 py-3.5 font-mono text-sm text-[color:var(--chart-2)]">
          <code>&lt;script src="https://cansee.ai/p.js" data-key="{{ website?.pixel_key || 'your-pixel-key' }}"&gt;&lt;/script&gt;</code>
        </div>
        <Button variant="secondary" size="sm" class="mt-3" @click="copyPixel">
          {{ copied ? 'Copied!' : 'Copy Snippet' }}
        </Button>
      </CardContent>
    </Card>

    <!-- External traffic sources: GA4 connect, hosted Google tag, Cloudflare -->
    <TrafficSourcesSection :website-id="id" :host-label="websiteHost" class="mb-6" />

    <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
      <!-- Quick Navigation -->
      <Card>
        <CardHeader>
          <CardTitle>Quick Navigation</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              class="flex flex-col items-center gap-2 rounded-lg bg-muted p-5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              @click="$router.push(`/analytics/${id}`)"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 21V9l6-6 6 6 6-6v18"/></svg>
              <span class="font-semibold">SEO Analytics</span>
            </button>
          </div>
        </CardContent>
      </Card>

      <!-- Website Info -->
      <Card>
        <CardHeader>
          <CardTitle>Website Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="flex flex-col">
            <div class="flex items-center justify-between border-b border-border py-3 text-sm">
              <span class="text-muted-foreground">URL</span>
              <span class="text-foreground">{{ website?.url || '--' }}</span>
            </div>
            <div class="flex items-center justify-between border-b border-border py-3 text-sm">
              <span class="text-muted-foreground">Industry</span>
              <span class="text-foreground">{{ website?.industry || 'Not set' }}</span>
            </div>
            <div class="flex items-center justify-between border-b border-border py-3 text-sm">
              <span class="text-muted-foreground">Crawl Status</span>
              <Badge variant="secondary">{{ website?.crawl_status || 'pending' }}</Badge>
            </div>
            <div class="flex items-center justify-between py-3 text-sm">
              <span class="text-muted-foreground">Created</span>
              <span class="text-foreground">{{ website?.created_at ? new Date(website.created_at).toLocaleDateString() : '--' }}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import websitesApi from '@/api/websites'
import { useResource } from '@/composables/useResource'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import TrafficSourcesSection from '@/components/webAnalytics/TrafficSourcesSection.vue'

const props = defineProps({ id: String })
const { data: website } = useResource(() => websitesApi.get(props.id))
const copied = ref(false)

// Extract just the hostname (no protocol, no trailing slash) for the
// next-steps copy so it reads as "Install the pixel on outfi.ai" instead
// of "https://outfi.ai/".
const websiteHost = computed(() => {
  const raw = website.value?.url || ''
  if (!raw) return 'your site'
  try {
    return new URL(raw).hostname.replace(/^www\./, '')
  } catch {
    return raw
  }
})

const crawlComplete = computed(() => {
  const status = (website.value?.crawl_status || '').toLowerCase()
  return status === 'completed' || status === 'done' || status === 'success'
})

const crawlStatusLabel = computed(() => {
  const status = (website.value?.crawl_status || 'pending').toLowerCase()
  if (crawlComplete.value) return 'Done'
  if (status === 'running' || status === 'in_progress') return 'Crawling now'
  if (status === 'failed' || status === 'error') return 'Failed — retry'
  return 'Waiting'
})

function copyPixel() {
  // eslint-disable-next-line no-useless-escape -- the escaped slash keeps a literal closing script tag out of the SFC source, which would terminate this script block
  const snippet = `<script src="https://cansee.ai/p.js" data-key="${website.value?.pixel_key || ''}"><\/script>`
  navigator.clipboard.writeText(snippet)
  copied.value = true
  setTimeout(() => copied.value = false, 2000)
}
</script>

<style scoped>
.next-steps-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.next-step {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  gap: 16px;
  padding: 18px 0;
  border-bottom: 1px solid var(--border);
  align-items: flex-start;
}
.next-step:last-child { border-bottom: none; padding-bottom: 4px; }
.next-step:first-child { padding-top: 4px; }
.next-step-num {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: var(--muted);
  color: var(--muted-foreground);
  font-size: 13px; font-weight: 700;
  display: inline-flex; align-items: center; justify-content: center;
  margin-top: 2px;
}
.next-step.done .next-step-num {
  background: color-mix(in srgb, var(--chart-2) 18%, transparent);
  color: var(--chart-2);
}
.next-step-body { min-width: 0; }
.next-step-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--foreground);
  margin-bottom: 6px;
}
.next-step-why {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--muted-foreground);
}
.next-step-why strong { color: var(--foreground); font-weight: 600; margin-right: 4px; }
.next-step-why code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12.5px;
  background: var(--muted);
  padding: 1px 5px;
  border-radius: 4px;
}
.next-step-link {
  display: inline-block;
  margin-top: 8px;
  background: transparent;
  border: none;
  padding: 0;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
  cursor: pointer;
  text-decoration: none;
}
.next-step-link:hover { text-decoration: underline; }
.next-step-status {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted-foreground);
  white-space: nowrap;
  margin-top: 6px;
}
.next-step.done .next-step-status {
  color: var(--chart-2);
}
</style>
