<template>
  <div class="inline-flex">
    <Button
      variant="ghost"
      size="icon"
      class="h-8 w-8 text-muted-foreground"
      @click="open = !open"
      title="Help & Support"
    >
      <HelpCircle class="size-4" />
    </Button>

    <Teleport to="body">
      <div v-if="open" class="fixed inset-0 z-[300] flex justify-end bg-black/30" @click.self="open = false">
        <div class="flex h-screen w-[380px] max-w-[90vw] flex-col overflow-y-auto border-l border-border bg-card shadow-[-8px_0_30px_rgba(0,0,0,0.1)]">
          <div class="flex items-center justify-between border-b border-border px-6 py-5">
            <h3 class="text-lg font-semibold text-foreground">Help &amp; Setup</h3>
            <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground" @click="open = false">
              <X class="size-4" />
            </Button>
          </div>

          <div class="px-6 py-5">
            <!-- Quick Start -->
            <div class="mb-7">
              <h4 class="mb-4 text-sm font-bold uppercase tracking-wider text-foreground">Quick Start</h4>
              <div class="mb-4 flex gap-3.5">
                <span class="mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
                <div>
                  <strong class="text-foreground">Add your project</strong>
                  <p class="mt-1 text-sm leading-snug text-muted-foreground">Click the + button in the sidebar to add your website URL.</p>
                </div>
              </div>
              <div class="mb-4 flex gap-3.5">
                <span class="mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span>
                <div>
                  <strong class="text-foreground">Install the tracking pixel</strong>
                  <p class="mt-1 text-sm leading-snug text-muted-foreground">Go to your project settings and copy the embed snippet into your website's &lt;head&gt; tag.</p>
                </div>
              </div>
              <div class="mb-4 flex gap-3.5">
                <span class="mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</span>
                <div>
                  <strong class="text-foreground">Run your first audit</strong>
                  <p class="mt-1 text-sm leading-snug text-muted-foreground">Go to Audits and click "Run Audit" to scan your site for SEO, performance, and security issues.</p>
                </div>
              </div>
              <div class="mb-4 flex gap-3.5">
                <span class="mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">4</span>
                <div>
                  <strong class="text-foreground">Track keywords</strong>
                  <p class="mt-1 text-sm leading-snug text-muted-foreground">Go to Keywords and add the search terms you want to monitor.</p>
                </div>
              </div>
            </div>

            <!-- Contextual Help -->
            <div class="mb-7">
              <h4 class="mb-4 text-sm font-bold uppercase tracking-wider text-foreground">Page Guide</h4>
              <div
                v-for="item in pageHelp"
                :key="item.page"
                class="mb-2 overflow-hidden rounded-lg border"
                :class="isCurrentPage(item.page) ? 'border-[color:var(--chart-1)]' : 'border-border'"
              >
                <div class="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted" @click="expandedItem = expandedItem === item.page ? '' : item.page">
                  <span>{{ item.icon }} {{ item.label }}</span>
                  <span class="text-lg text-muted-foreground transition-transform" :class="{ 'rotate-90': expandedItem === item.page }">›</span>
                </div>
                <div v-if="expandedItem === item.page" class="px-4 pb-3.5 text-sm leading-relaxed text-muted-foreground">{{ item.help }}</div>
              </div>
            </div>

            <!-- Reset Onboarding -->
            <div class="mb-7">
              <Button variant="outline" class="w-full" @click="resetOnboarding">Replay Onboarding Tour</Button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { Button } from '@/components/ui/button'
import { HelpCircle, X } from '@lucide/vue'

const route = useRoute()
const open = ref(false)
const expandedItem = ref('')

const pageHelp = [
  { page: 'analytics', icon: '', label: 'SEO Analytics', help: 'See real-time search performance, traffic sources, top pages, and device breakdown. Data appears once you install the tracking pixel on your website.' },
  { page: 'heatmap', icon: '', label: 'Heatmaps', help: 'Visualize where visitors click on your pages. Requires the tracking pixel to capture click coordinates. Hotter colors = more clicks.' },
  { page: 'keywords', icon: '', label: 'Keywords', help: 'Track your search engine rankings for specific keywords. Add keywords manually and monitor their position over time.' },
  { page: 'leads', icon: '', label: 'Leads', help: 'Captured visitor and form submission data. Leads are created when visitors interact with forms on your tracked site.' },


  { page: 'billing', icon: '', label: 'Billing', help: 'Manage your subscription, view usage, and compare plan features.' },
]

function isCurrentPage(page) {
  return route.path.startsWith('/' + page)
}

function resetOnboarding() {
  localStorage.removeItem('fb_onboarding_done')
  open.value = false
  window.location.reload()
}
</script>
