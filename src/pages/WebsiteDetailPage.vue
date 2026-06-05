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

    <!-- Pixel Installation -->
    <Card class="mb-6">
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
          <code>&lt;script src="https://fetchbot.ai/pixel/growthpilot.min.js" data-key="{{ website?.pixel_key || 'your-pixel-key' }}"&gt;&lt;/script&gt;</code>
        </div>
        <Button variant="secondary" size="sm" class="mt-3" @click="copyPixel">
          {{ copied ? 'Copied!' : 'Copy Snippet' }}
        </Button>
      </CardContent>
    </Card>

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
import { ref, onMounted } from 'vue'
import websitesApi from '@/api/websites'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const props = defineProps({ id: String })
const website = ref(null)
const copied = ref(false)

onMounted(async () => {
  try {
    const { data } = await websitesApi.get(props.id)
    website.value = data?.data || data
  } catch { /* handle */ }
})

function copyPixel() {
  const snippet = `<script src="https://fetchbot.ai/pixel/growthpilot.min.js" data-key="${website.value?.pixel_key || ''}">\<\/script>`
  navigator.clipboard.writeText(snippet)
  copied.value = true
  setTimeout(() => copied.value = false, 2000)
}
</script>
