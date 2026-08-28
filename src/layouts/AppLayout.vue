<template>
  <template v-if="!sessionNeedsOnboarding">
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader>
          <SidebarMenu>
            <!-- Cansee brand mark. Placed in the sidebar header (not the page)
                 so it collapses to the logo icon when the sidebar is collapsed
                 and shows the wordmark when expanded. Links home. -->
            <SidebarMenuItem>
              <SidebarMenuButton as-child size="lg" tooltip="Cansee">
                <router-link to="/dashboard">
                  <div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <!-- Square "C" mark, not the wordmark: this slot is what
                         remains visible when the sidebar collapses. -->
                    <img src="/images/cansee-mark.png" alt="Cansee" class="size-5 object-contain cansee-mark" />
                  </div>
                  <div class="grid flex-1 text-left text-sm leading-tight">
                    <span class="truncate font-semibold">Cansee</span>
                    <span class="truncate text-xs text-muted-foreground">AI visibility</span>
                  </div>
                </router-link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <!-- Project switcher. Uses the project's initial as its avatar so it
                 reads as the current project, distinct from the brand above. -->
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <SidebarMenuButton :tooltip="appStore.activeWebsite?.name || 'Select project'" class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                    <div class="flex aspect-square size-6 items-center justify-center rounded-md border border-sidebar-border bg-sidebar text-[0.7rem] font-semibold text-sidebar-foreground">
                      {{ (appStore.activeWebsite?.name || 'P').charAt(0).toUpperCase() }}
                    </div>
                    <div class="grid flex-1 text-left leading-tight">
                      <span class="truncate text-sm">{{ appStore.activeWebsite?.name || 'Select project' }}</span>
                      <span class="truncate text-xs text-muted-foreground">{{ appStore.projectLimitLabel }}</span>
                    </div>
                    <ChevronsUpDown class="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="bottom" :side-offset="4" class="min-w-56 rounded-lg">
                  <DropdownMenuLabel class="text-xs text-muted-foreground">Projects</DropdownMenuLabel>
                  <DropdownMenuItem v-for="w in appStore.websites" :key="w.id" @select="switchWebsite(w.id)">
                    <Globe class="size-4" />
                    <span class="truncate">{{ w.name }}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem :disabled="!appStore.canCreateProject" @select="showAddProject = true">
                    <Plus class="size-4" />
                    <span>Add project</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup v-for="group in navMain" :key="group.group">
            <SidebarGroupLabel>{{ group.group }}</SidebarGroupLabel>
            <SidebarMenu>
              <template v-for="item in group.items" :key="item.title">
                <SidebarMenuItem>
                  <SidebarMenuButton as-child :is-active="isActive(item)" :tooltip="item.title">
                    <router-link :to="item.to">
                      <component :is="item.icon" />
                      <span>{{ item.title }}</span>
                    </router-link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuSub v-if="item.children && (item.alwaysOpen || isActive(item))">
                  <SidebarMenuSubItem v-for="child in item.children" :key="child.title">
                    <SidebarMenuSubButton as-child :is-active="isChildActive(child)">
                      <router-link :to="child.to">
                        <span>{{ child.title }}</span>
                      </router-link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </template>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <SidebarMenuButton size="lg" class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                    <Avatar class="size-8 rounded-lg" :class="planState.badge?.tone === 'gold' ? 'ring-1 ring-amber-400/70' : ''">
                      <AvatarFallback class="rounded-lg">{{ userInitials }}</AvatarFallback>
                    </Avatar>
                    <div class="grid flex-1 text-left text-sm leading-tight">
                      <span class="flex min-w-0 items-center gap-1.5 font-semibold">
                        <span class="truncate">{{ authStore.user?.full_name || 'User' }}</span>
                        <!-- Plan mark: gold only once the card has actually
                             been charged (Active); a free trial is a quiet
                             neutral TRIAL; past-due is an amber warning. -->
                        <span
                          v-if="planState.badge"
                          class="shrink-0 rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wider"
                          :class="badgeClass"
                        >{{ planState.badge.text }}</span>
                      </span>
                      <span class="truncate text-xs text-muted-foreground">{{ authStore.user?.email || '' }}</span>
                    </div>
                    <ChevronsUpDown class="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="bottom" :side-offset="4" class="min-w-56 rounded-lg">
                  <DropdownMenuLabel class="font-normal">
                    <div class="flex flex-col">
                      <span class="text-sm font-semibold">{{ authStore.user?.full_name || 'User' }}</span>
                      <!-- Plan from the session's subscription — user.plan is
                           denormalized and defaults to a paid tier. -->
                      <span class="text-xs text-muted-foreground">{{ planState.planLabel }}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem @select="router.push('/settings')">
                    <Settings class="size-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem @select="router.push('/billing')">
                    <CreditCard class="size-4" />
                    <span>Billing</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem @select="appStore.toggleTheme()">
                    <Sun v-if="appStore.isDark" class="size-4" />
                    <Moon v-else class="size-4" />
                    <span>{{ appStore.isDark ? 'Light mode' : 'Dark mode' }}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem @select="handleLogout">
                    <LogOut class="size-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset class="md:m-2 md:min-h-[calc(100svh-1rem)] md:overflow-hidden md:rounded-xl md:border md:border-border md:shadow-sm">
        <header class="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-card transition-[width,height] ease-linear">
          <div class="flex items-center gap-2 px-4 md:px-6">
            <SidebarTrigger class="-ml-1 size-9 border border-border bg-muted/60 shadow-sm hover:bg-muted" />
            <Separator orientation="vertical" class="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem class="hidden md:block">
                  <BreadcrumbLink as="router-link" to="/dashboard" aria-label="Home" class="flex items-center">
                    <Home class="size-4" />
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <template v-for="(crumb, i) in breadcrumbs" :key="i">
                  <BreadcrumbSeparator class="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage v-if="i === breadcrumbs.length - 1">{{ crumb.label }}</BreadcrumbPage>
                    <BreadcrumbLink v-else as="router-link" :to="crumb.to">{{ crumb.label }}</BreadcrumbLink>
                  </BreadcrumbItem>
                </template>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div class="ml-auto flex items-center gap-2 px-4 md:px-6">
            <button
              class="flex items-center gap-2 rounded-full border border-border bg-muted px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-ring hover:bg-background"
              @click="openSearch"
            >
              <Search :size="14" :stroke-width="1.8" />
              <span class="hidden sm:inline">Search...</span>
              <span class="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold tracking-wide">
                {{ isMac ? '⌘' : 'Ctrl' }}+K
              </span>
            </button>
            <button
              v-if="assistantStore.enabled"
              class="flex items-center gap-2 rounded-full border border-border bg-muted px-2.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-ring hover:bg-background"
              title="Ask Cansee"
              @click="assistantStore.toggle()"
            >
              <span class="grid size-5 place-items-center rounded-md text-white" style="background: linear-gradient(135deg, #6d5efc, #9b6bff);">
                <Sparkles :size="12" :stroke-width="2.2" />
              </span>
              <span class="hidden sm:inline">Ask</span>
            </button>
            <HelpButton />
          </div>
        </header>

        <div class="flex w-full min-w-0 flex-1 flex-col gap-4 p-4 md:p-6">
          <router-view v-slot="{ Component }">
            <transition name="page-fade" mode="out-in">
              <keep-alive :max="10">
                <component :is="Component" :key="pageKey" />
              </keep-alive>
            </transition>
          </router-view>
        </div>
      </SidebarInset>
    </SidebarProvider>
  </template>

  <div v-else class="min-h-svh bg-background">
    <router-view />
  </div>

    <!-- Ask Cansee assistant (global slide-out panel) -->
    <AskCanseePanel />
    <!-- Toast Notifications (global) -->
    <ToastContainer />
    <!-- Add Project Modal -->
    <div
      v-if="showAddProject"
      class="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      @click.self="showAddProject = false"
    >
      <div class="w-[440px] max-w-[90vw] rounded-xl border border-border bg-card p-7 shadow-xl">
        <h3 class="mb-4 text-lg font-bold text-card-foreground">Add New Project</h3>
        <div v-if="!appStore.canCreateProject" class="py-3 text-center text-sm text-muted-foreground">
          <p>Your <strong>{{ planState.tierLabel }}</strong> allows {{ appStore.projectLimit }} project(s).</p>
          <p class="mt-2">Upgrade to <strong>Pro</strong> for up to 5 projects.</p>
          <Button as="router-link" to="/billing" class="mt-4" @click="showAddProject = false">View Plans</Button>
        </div>
        <template v-else>
          <div class="mb-3">
            <label class="mb-1.5 block text-sm font-semibold text-foreground">Project Name</label>
            <input v-model="newProject.name" class="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="My Website" />
          </div>
          <div class="mb-3">
            <label class="mb-1.5 block text-sm font-semibold text-foreground">Website URL</label>
            <input v-model="newProject.url" class="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="https://example.com" />
          </div>
          <div class="mb-4">
            <label class="mb-1.5 block text-sm font-semibold text-foreground">Industry (optional)</label>
            <input v-model="newProject.industry" class="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="SaaS, E-commerce, etc." />
          </div>
          <div class="flex justify-end gap-2">
            <Button variant="outline" @click="showAddProject = false">Cancel</Button>
            <Button @click="createProject" :disabled="!newProject.name || !newProject.url || creating">
              {{ creating ? 'Creating...' : 'Create Project' }}
            </Button>
          </div>
          <p v-if="createError" class="mt-3 text-sm text-destructive">{{ createError }}</p>
        </template>
      </div>
    </div>

    <!-- Command Palette Search -->
    <Teleport to="body">
      <div v-if="showSearch" class="cmd-backdrop" @click="showSearch = false">
        <div class="cmd-palette" @click.stop>
          <div class="cmd-input-wrap">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" class="cmd-search-icon"><circle cx="7" cy="7" r="5"/><line x1="11" y1="11" x2="14" y2="14"/></svg>
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              class="cmd-input"
              placeholder='Search — type words, "exact phrase", or /regex/'
              @keydown.down.prevent="moveHighlight(1)"
              @keydown.up.prevent="moveHighlight(-1)"
              @keydown.enter.prevent="selectHighlighted"
              @keydown.escape="showSearch = false"
            />
          </div>
          <div class="cmd-results">
            <template v-if="filteredSearchPages.length">
              <template v-for="group in groupedResults" :key="group.label">
                <div class="cmd-group-label">{{ group.label }}</div>
                <div
                  v-for="item in group.items"
                  :key="item.name"
                  class="cmd-item"
                  :class="{ 'cmd-item-active': item._flatIdx === highlightIdx }"
                  @click="navigateToPage(item)"
                  @mouseenter="highlightIdx = item._flatIdx"
                >
                  <span class="cmd-item-icon" v-html="item.icon"></span>
                  <div class="cmd-item-text">
                    <span class="cmd-item-name">{{ item.label }}</span>
                    <span class="cmd-item-desc">{{ item.description }}</span>
                  </div>
                  <span class="cmd-item-shortcut" v-if="item.shortcut">{{ item.shortcut }}</span>
                </div>
              </template>
            </template>
            <div v-else class="cmd-empty">No results for "{{ searchQuery }}"</div>
          </div>
          <div class="cmd-hint">
            <span><kbd>↑↓</kbd> navigate</span>
            <span><kbd>↵</kbd> open</span>
            <span><kbd>esc</kbd> close</span>
            <span class="cmd-hint-spacer"></span>
            <span class="cmd-hint-syntax">tip: <code>/regex/</code> · <code>"exact"</code> · <code>multi term</code></span>
          </div>
        </div>
      </div>
    </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { useToast } from '@/composables/useToast'
import websitesApi from '@/api/websites'
import billingApi from '@/api/billing'
import HelpButton from '@/components/HelpButton.vue'
import ToastContainer from '@/components/ToastContainer.vue'
import AskCanseePanel from '@/components/assistant/AskCanseePanel.vue'
import { useAssistantStore } from '@/stores/assistant'
import { Button } from '@/components/ui/button'
import {
  SidebarProvider, Sidebar, SidebarInset, SidebarTrigger, SidebarRail,
  SidebarHeader, SidebarFooter, SidebarContent, SidebarGroup,
  SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton,
} from '@/components/ui/sidebar'
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Search, Plus, LogOut, ChevronsUpDown, Home,
  LayoutGrid, Globe, BarChart3, Brain, Plug, CreditCard, Settings, Sparkles,
  Sun, Moon,
} from '@lucide/vue'

const toast = useToast()

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const appStore = useAppStore()
const assistantStore = useAssistantStore()

// Add project modal state
const showAddProject = ref(false)
const creating = ref(false)
const createError = ref('')
const newProject = ref({ name: '', url: '', industry: '' })

// ── Command palette search ──
const showSearch = ref(false)
const searchQuery = ref('')
const highlightIdx = ref(0)
const searchInputRef = ref(null)
const isMac = navigator.platform?.toUpperCase().includes('MAC')

const searchPages = [
  { name: 'dashboard', label: 'Dashboard', description: 'Overview of all your projects', category: 'Navigation', route: '/dashboard', icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>' },
  { name: 'websites', label: 'Projects', description: 'Manage your tracked websites', category: 'Navigation', route: '/websites', icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="7"/><line x1="1" y1="8" x2="15" y2="8"/><ellipse cx="8" cy="8" rx="3" ry="7"/></svg>' },
  { name: 'analytics', label: 'SEO Analytics', description: 'Search performance, traffic sources, engagement', category: 'Intelligence', routeFn: () => analyticsRoute.value, icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 14V6l4-4 4 4 4-4v12"/></svg>' },
  { name: 'prompt-library', label: 'Prompts', description: 'The questions we ask each AI model', category: 'Intelligence', routeFn: () => promptLibraryRoute.value, icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 4v4l3 2"/></svg>' },
  { name: 'billing', label: 'Billing', description: 'Subscription plans and payment', category: 'Account', route: '/billing', icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="3" width="14" height="10" rx="2"/><line x1="1" y1="7" x2="15" y2="7"/></svg>' },
  { name: 'settings', label: 'Settings', description: 'Account settings and preferences', category: 'Account', route: '/settings', icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.3 3.3l1.4 1.4M11.3 11.3l1.4 1.4M12.7 3.3l-1.4 1.4M4.7 11.3l-1.4 1.4"/></svg>' },
]

// ── Specific search ──
// The command palette supports three matching modes so power users can
// drill in instead of fishing through fuzzy hits:
//
//   /pattern/flags   → real JavaScript regex (e.g. /^lead/i, /agen.+page/)
//   "exact phrase"   → quoted substring, matched verbatim (case-insensitive)
//   foo bar baz      → AND-of-terms; every whitespace-separated token must
//                      hit somewhere in label/description/category/name.
//
// Invalid regex falls back to plain substring matching so a half-typed
// pattern like /lea never blanks the result list.
function _parseSearchQuery(raw) {
  const trimmed = (raw || '').trim()
  if (!trimmed) return null

  // /regex/flags
  const regexMatch = trimmed.match(/^\/(.+)\/([gimsuy]*)$/)
  if (regexMatch) {
    try {
      const flags = regexMatch[2].includes('i') ? regexMatch[2] : regexMatch[2] + 'i'
      return { kind: 'regex', re: new RegExp(regexMatch[1], flags) }
    } catch {
      // fall through to substring
    }
  }

  // Tokenize: keep "quoted phrases" as single tokens, split the rest.
  const tokens = []
  const re = /"([^"]+)"|'([^']+)'|(\S+)/g
  let m
  while ((m = re.exec(trimmed)) !== null) {
    tokens.push((m[1] || m[2] || m[3]).toLowerCase())
  }
  return { kind: 'tokens', tokens }
}

function _matchPage(page, parsed) {
  const haystack = [
    page.label,
    page.description,
    page.category,
    page.name || '',
  ].join(' ').toLowerCase()

  if (parsed.kind === 'regex') {
    return parsed.re.test(haystack)
  }
  // Every token must appear somewhere — AND, not OR.
  return parsed.tokens.every(t => haystack.includes(t))
}

const filteredSearchPages = computed(() => {
  const parsed = _parseSearchQuery(searchQuery.value)
  if (!parsed) return searchPages
  return searchPages.filter(p => _matchPage(p, parsed))
})

const groupedResults = computed(() => {
  const groups = {}
  let flatIdx = 0
  for (const item of filteredSearchPages.value) {
    if (!groups[item.category]) groups[item.category] = { label: item.category, items: [] }
    groups[item.category].items.push({ ...item, _flatIdx: flatIdx++ })
  }
  return Object.values(groups)
})

function openSearch() {
  showSearch.value = true
  searchQuery.value = ''
  highlightIdx.value = 0
  nextTick(() => searchInputRef.value?.focus())
}

function moveHighlight(dir) {
  const total = filteredSearchPages.value.length
  if (!total) return
  highlightIdx.value = (highlightIdx.value + dir + total) % total
}

function selectHighlighted() {
  const item = filteredSearchPages.value[highlightIdx.value]
  if (item) navigateToPage(item)
}

function navigateToPage(item) {
  showSearch.value = false
  const target = item.routeFn ? item.routeFn() : item.route
  router.push(target)
}

function handleGlobalKeydown(e) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    openSearch()
  }
}

watch(searchQuery, () => {
  highlightIdx.value = 0
})
const userInitials = computed(() => {
  const name = authStore.user?.full_name || ''
  return name.split(' ').map(n => n[0]).filter(Boolean).join('').toUpperCase().slice(0, 2)
})

// Plan words for the sidebar footer come from the shared describer
// (src/lib/plan.js) over the session's subscription — a free trial is
// labelled as a trial until Polar has actually charged the card.
const planState = computed(() => authStore.planState)
const BADGE_CLASS = {
  gold: 'bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 text-amber-900 shadow-sm',
  neutral: 'border border-border bg-muted text-muted-foreground',
  warn: 'border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/15 dark:text-amber-300',
}
const badgeClass = computed(() => BADGE_CLASS[planState.value.badge?.tone] || '')

// Drives the visibility of the sidebar / topbar while the account
// onboarding modal is in front of everything.
const sessionNeedsOnboarding = computed(
  () => authStore.session?.onboarding?.needs_onboarding === true,
)

const websiteId = computed(() => appStore.activeWebsite?.id)

// Cache key: one keep-alive instance per page type + website.
// Same page + same website = instant (no reload). Different website = fresh
// instance. Per-resource detail routes also key on their record id so e.g.
// two prompt-detail pages don't share one cached keep-alive instance (which
// made a freshly-opened prompt show the previously-viewed prompt's data).
const pageKey = computed(() => {
  const base = `${route.name || 'page'}-${route.params.websiteId || ''}`
  const recordId = route.params.promptId || route.params.id || ''
  return recordId ? `${base}-${recordId}` : base
})
const analyticsRoute = computed(() => websiteId.value ? `/analytics/${websiteId.value}` : '/websites')
const promptLibraryRoute = computed(() => websiteId.value ? `/llm-ranking/${websiteId.value}/prompts` : '/websites')
const sourcesUrlsRoute = computed(() => websiteId.value ? `/llm-ranking/${websiteId.value}/urls` : '/websites')
const brandSecurityRoute = computed(() => websiteId.value ? `/llm-ranking/${websiteId.value}/brand-security` : '/websites')
const searchInsightsRoute = computed(() => websiteId.value ? `/llm-ranking/${websiteId.value}/search-insights` : '/websites')
const brandInputRoute = computed(() => websiteId.value ? `/llm-ranking/${websiteId.value}/brand-input` : '/websites')

const navMain = computed(() => [
  {
    group: 'Overview',
    items: [
      { title: 'Dashboard', to: '/dashboard', icon: LayoutGrid, match: '/dashboard' },
      { title: 'Projects', to: '/websites', icon: Globe, match: '/websites' },
    ],
  },
  {
    group: 'Intelligence',
    items: [
      { title: 'SEO Analytics', to: analyticsRoute.value, icon: BarChart3, match: '/analytics' },
      {
        // The LLM Dashboard page is gone; this is now a grouping header for
        // its former children and points at Prompts, the most-used of them.
        title: 'AI Visibility', to: promptLibraryRoute.value, icon: Brain, match: '/llm-ranking',
        alwaysOpen: true,
        children: [
          { title: 'URLs', to: sourcesUrlsRoute.value, match: '/urls' },
          { title: 'Prompts', to: promptLibraryRoute.value, match: '/prompts' },
          { title: 'Search Insights', to: searchInsightsRoute.value, match: '/search-insights' },
          { title: 'Brand Security', to: brandSecurityRoute.value, match: '/brand-security' },
          { title: 'Brand Input', to: brandInputRoute.value, match: '/brand-input' },
        ],
      },
      { title: 'Integrations', to: '/app/integrations', icon: Plug, match: '/app/integrations' },
    ],
  },
  {
    group: 'Account',
    items: [
      { title: 'Billing', to: '/billing', icon: CreditCard, match: '/billing' },
      { title: 'Settings', to: '/settings', icon: Settings, match: '/settings' },
    ],
  },
])

function isActive(item) {
  return route.path === item.match || route.path.startsWith(item.match + '/') || route.path.startsWith(item.match)
}
function isChildActive(child) {
  return route.path.includes(child.match)
}

const breadcrumbs = computed(() => {
  // Detail pages append the entity they show (e.g. the prompt text) via
  // appStore.setBreadcrumbTail; the nav tree only knows section names.
  const tail = appStore.breadcrumbTail
    ? [{ label: appStore.breadcrumbTail }]
    : []

  const path = route.path
  for (const group of navMain.value) {
    for (const item of group.items) {
      if (item.children) {
        for (const child of item.children) {
          if (isChildActive(child))
            return [
              { label: item.title, to: item.to },
              { label: child.title, to: child.to },
              ...tail,
            ]
        }
      }
      if (path === item.match || path.startsWith(item.match))
        return [{ label: item.title, to: item.to }, ...tail]
    }
  }
  const name = String(route.name || 'Page').replace(/[-_]/g, ' ')
  return [{ label: name.charAt(0).toUpperCase() + name.slice(1) }, ...tail]
})

function switchWebsite(id) {
  const website = appStore.websites.find(w => w.id === id)
  if (!website) return
  appStore.setActiveWebsite(website)

  // Re-route current page to use the new project ID
  const path = route.path
  const routeMap = [
    { prefix: '/analytics/', target: `/analytics/${id}` },
    { prefix: '/websites/', target: `/websites/${id}` },
    { prefix: '/llm-ranking/', target: `/llm-ranking/${id}` },
  ]
  const match = routeMap.find(r => path.startsWith(r.prefix))
  if (match) {
    router.push(match.target)
  }
  // Dashboard, billing, settings don't have websiteId — store update is enough
}

async function createProject() {
  creating.value = true
  createError.value = ''
  try {
    const { data: project } = await websitesApi.create(newProject.value)
    appStore.websites.push(project)
    appStore.setActiveWebsite(project)
    newProject.value = { name: '', url: '', industry: '' }
    showAddProject.value = false
    toast.success('Project created successfully!')
  } catch (err) {
    const msg = err.displayMessage || 'We couldn\'t create the project. Please check the URL and try again.'
    createError.value = msg
    toast.error(msg)
  } finally {
    creating.value = false
  }
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

onMounted(async () => {
  if (!authStore.user) {
    try { await authStore.fetchMe() } catch {}
  }
  // Assistant entitlement / maintenance switch — decides whether the
  // header trigger renders at all. Fire and forget.
  assistantStore.loadStatus()
  try {
    const { data } = await websitesApi.list({ _silentError: true })
    appStore.setWebsites(data || [])
  } catch {}
  // Fetch plan info for project limits (plans: free / pro / business)
  try {
    const { data } = await billingApi.getCurrent({ _silentError: true })
    const plan = data?.plan || 'free'
    const limits = { free: 1, pro: 5, business: -1 }
    appStore.setPlanInfo(plan, limits[plan] ?? 1)
  } catch {}
  // Search keyboard shortcut
  document.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<style scoped>
/* Page transition — smooth slide-up + fade (Framer-like) */
.page-fade-leave-active {
  transition: opacity 120ms ease, transform 120ms ease;
}
.page-fade-enter-active {
  transition: opacity 280ms cubic-bezier(0.23, 1, 0.32, 1), transform 280ms cubic-bezier(0.23, 1, 0.32, 1);
}
.page-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.page-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>

<!-- Command palette styles (unscoped for Teleport) -->
<style>
/* The brand mark sits on bg-sidebar-primary, which inverts between
   themes (#1e1e1e light / #ffffff dark). The artwork is a single navy,
   so flip it with a filter instead of shipping two files. */
.cansee-mark { filter: brightness(0) invert(1); }
[data-theme='dark'] .cansee-mark { filter: brightness(0); }

.cmd-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  justify-content: center;
  padding-top: 15vh;
  animation: cmdFadeIn 0.15s ease;
}
@keyframes cmdFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.cmd-palette {
  width: 560px;
  max-height: 480px;
  background: var(--bg-card, #fff);
  border-radius: 12px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: cmdSlideUp 0.2s ease;
}
@keyframes cmdSlideUp {
  from { transform: translateY(12px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.cmd-input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-color, #e5e5e5);
}
.cmd-search-icon {
  color: var(--text-muted, #888);
  flex-shrink: 0;
}
.cmd-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 15px;
  color: var(--text-primary, #111);
  outline: none;
}
.cmd-input::placeholder {
  color: var(--text-muted, #999);
}
.cmd-results {
  overflow-y: auto;
  padding: 8px;
  flex: 1;
}
.cmd-group-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted, #888);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 10px 4px;
}
.cmd-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.1s;
}
.cmd-item:hover,
.cmd-item-active {
  background: var(--bg-surface, #f5f5f5);
}
.cmd-item-icon {
  color: var(--text-muted, #888);
  flex-shrink: 0;
  width: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cmd-item-text {
  flex: 1;
  min-width: 0;
}
.cmd-item-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #111);
}
.cmd-item-desc {
  font-size: 12px;
  color: var(--text-muted, #888);
  margin-left: 8px;
}
.cmd-item-shortcut {
  font-size: 10px;
  color: var(--text-muted, #888);
  background: var(--bg-base, #f0f0f0);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--border-color, #e5e5e5);
}
.cmd-empty {
  padding: 24px;
  text-align: center;
  color: var(--text-muted, #888);
  font-size: 14px;
}
.cmd-hint {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  border-top: 1px solid var(--border);
  background: var(--bg-surface);
  font-size: 12px;
  color: var(--text-muted);
}
.cmd-hint kbd {
  display: inline-block;
  padding: 1px 6px;
  margin-right: 4px;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 11px;
  color: var(--text-secondary);
}
.cmd-hint-spacer { flex: 1; }
.cmd-hint-syntax code {
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 11px;
}
</style>
