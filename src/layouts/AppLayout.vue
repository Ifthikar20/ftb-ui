<template>
  <div class="flex min-h-screen bg-background text-foreground">
    <!-- Sidebar (hidden while first-run onboarding is required) -->
    <aside
      v-if="!sessionNeedsOnboarding"
      class="fixed inset-y-0 left-0 z-[100] flex flex-col overflow-y-auto overflow-x-hidden border-r border-border bg-card transition-[width] duration-200"
      :class="appStore.sidebarCollapsed ? 'w-[68px]' : 'w-64'"
    >
      <div class="flex items-center gap-3 px-5 pb-4 pt-5">
        <img src="/images/fb-logo.png" alt="FetchBot" class="size-9 shrink-0 object-contain" />
        <span v-if="!appStore.sidebarCollapsed" class="text-lg font-bold tracking-tight">FetchBot</span>
      </div>

      <!-- Project Selector -->
      <div v-if="!appStore.sidebarCollapsed" class="px-4 pb-4">
        <select
          class="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          @change="switchWebsite($event.target.value)"
        >
          <option v-for="w in appStore.websites" :key="w.id" :value="w.id" :selected="w.id === appStore.activeWebsite?.id">
            {{ w.name }}
          </option>
        </select>
        <div class="mt-2 flex items-center justify-between">
          <span class="text-xs font-medium text-muted-foreground">{{ appStore.projectLimitLabel }}</span>
          <button
            class="flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-40"
            :disabled="!appStore.canCreateProject"
            @click="showAddProject = true"
            :title="appStore.canCreateProject ? 'Add a new project' : 'Upgrade your plan to add more'"
          >
            <Plus class="size-3.5" />
          </button>
        </div>
      </div>

      <!-- Nav -->
      <nav class="flex-1 px-3">
        <template v-for="section in navSections" :key="section.label">
          <div
            v-if="!appStore.sidebarCollapsed"
            class="px-2 pb-2 pt-5 text-xs font-bold uppercase tracking-wider text-muted-foreground"
          >
            {{ section.label }}
          </div>
          <div v-else class="my-3 border-t border-border" />
          <router-link
            v-for="item in section.items"
            :key="item.name"
            :to="item.to"
            :active-class="item.exact ? '' : ACTIVE_LINK"
            :exact-active-class="item.exact ? ACTIVE_LINK : ''"
            class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            :class="appStore.sidebarCollapsed ? 'justify-center' : ''"
            :title="item.name"
          >
            <component :is="item.icon" class="size-[18px] shrink-0" />
            <span v-if="!appStore.sidebarCollapsed" class="whitespace-nowrap">{{ item.name }}</span>
          </router-link>
        </template>
      </nav>

      <!-- User Footer -->
      <div
        v-if="!appStore.sidebarCollapsed"
        class="flex items-center justify-between border-t border-border p-4"
      >
        <div class="flex items-center gap-2.5">
          <div class="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {{ userInitials }}
          </div>
          <div>
            <div class="text-sm font-semibold text-foreground">{{ authStore.user?.full_name || 'User' }}</div>
            <div class="text-xs capitalize text-muted-foreground">{{ authStore.user?.plan || 'Free' }}</div>
          </div>
        </div>
        <button
          class="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          @click="handleLogout"
          title="Logout"
        >
          <LogOut class="size-4" />
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <div
      class="flex flex-1 flex-col transition-[margin] duration-200"
      :class="sessionNeedsOnboarding ? 'ml-0' : (appStore.sidebarCollapsed ? 'ml-[68px]' : 'ml-64')"
    >
      <header
        v-if="!sessionNeedsOnboarding"
        class="sticky top-0 z-50 flex h-16 items-center gap-4 border-b border-border bg-card px-7"
      >
        <button
          class="flex items-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          @click="appStore.toggleSidebar"
          :title="appStore.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        >
          <PanelLeftOpen v-if="appStore.sidebarCollapsed" class="size-[18px]" />
          <PanelLeftClose v-else class="size-[18px]" />
        </button>

        <button
          class="flex min-w-[220px] max-w-sm flex-1 items-center gap-2 rounded-full border border-border bg-muted px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-ring hover:bg-background"
          @click="openSearch"
        >
          <Search :size="14" :stroke-width="1.8" />
          <span class="flex-1 text-left">Search pages...</span>
          <span class="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold tracking-wide">
            {{ isMac ? '⌘' : 'Ctrl' }}+K
          </span>
        </button>

        <div class="ml-auto flex items-center gap-2">
          <button
            class="flex items-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            @click="appStore.toggleTheme"
            :title="appStore.theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'"
          >
            <Moon v-if="appStore.theme === 'light'" :size="18" :stroke-width="1.6" />
            <Sun v-else :size="18" :stroke-width="1.6" />
          </button>
          <HelpButton />
        </div>
      </header>

      <main class="min-h-[calc(100vh-4rem)] flex-1 bg-background p-8">
        <router-view v-slot="{ Component }">
          <transition name="page-fade" mode="out-in">
            <keep-alive :max="10">
              <component :is="Component" :key="pageKey" />
            </keep-alive>
          </transition>
        </router-view>
      </main>
    </div>

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
          <p>Your <strong>{{ appStore.userPlan }}</strong> plan allows {{ appStore.projectLimit }} project(s).</p>
          <p class="mt-2">Upgrade to <strong>Growth</strong> for up to 5 projects.</p>
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
              <template v-for="(group, gIdx) in groupedResults" :key="group.label">
                <div class="cmd-group-label">{{ group.label }}</div>
                <div
                  v-for="(item, iIdx) in group.items"
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
  </div>
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
import { Button } from '@/components/ui/button'
import {
  Moon, Search, Sun, Plus, LogOut, PanelLeftClose, PanelLeftOpen,
  LayoutGrid, Globe, BarChart3, Brain, MessageSquare, FlaskConical,
  ShieldCheck, FileText, Plug, CreditCard, Settings,
} from '@lucide/vue'

const toast = useToast()

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const appStore = useAppStore()

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
  { name: 'analytics', label: 'Analytics', description: 'Visitor data, traffic sources, engagement', category: 'Intelligence', routeFn: () => analyticsRoute.value, icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 14V6l4-4 4 4 4-4v12"/></svg>' },
  { name: 'llm-ranking', label: 'LLM Dashboard', description: 'AI visibility scoring across LLMs', category: 'Intelligence', routeFn: () => llmRankingRoute.value, icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 4v4l3 2"/></svg>' },
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

// Drives the visibility of the sidebar / topbar while the account
// onboarding modal is in front of everything.
const sessionNeedsOnboarding = computed(
  () => authStore.session?.onboarding?.needs_onboarding === true,
)

const websiteId = computed(() => appStore.activeWebsite?.id)

// Cache key: one keep-alive instance per page type + website.
// Same page + same website = instant (no reload). Different website = fresh instance.
const pageKey = computed(() => `${route.name || 'page'}-${route.params.websiteId || ''}`)
const analyticsRoute = computed(() => websiteId.value ? `/analytics/${websiteId.value}` : '/websites')
const llmRankingRoute = computed(() => websiteId.value ? `/llm-ranking/${websiteId.value}` : '/websites')
const promptLibraryRoute = computed(() => websiteId.value ? `/llm-ranking/${websiteId.value}/prompts` : '/websites')
const sourceInfluenceRoute = computed(() => websiteId.value ? `/llm-ranking/${websiteId.value}/source-influence` : '/websites')
const brandVaultRoute = computed(() => websiteId.value ? `/llm-ranking/${websiteId.value}/brand-vault` : '/websites')
const contentStudioRoute = computed(() => websiteId.value ? `/llm-ranking/${websiteId.value}/content` : '/websites')

const navSections = computed(() => [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', to: '/dashboard', icon: LayoutGrid, exact: true },
      { name: 'Projects', to: '/websites', icon: Globe, exact: true },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { name: 'Analytics', to: analyticsRoute.value, icon: BarChart3 },
      { name: 'LLM Dashboard', to: llmRankingRoute.value, icon: Brain },
      { name: 'Prompts', to: promptLibraryRoute.value, icon: MessageSquare, sub: true },
      { name: 'Model Test', to: sourceInfluenceRoute.value, icon: FlaskConical, sub: true },
      { name: 'Brand Vault', to: brandVaultRoute.value, icon: ShieldCheck, sub: true },
      { name: 'Content', to: contentStudioRoute.value, icon: FileText, sub: true },
      { name: 'Integrations', to: '/app/integrations', icon: Plug, exact: true },
    ],
  },
  {
    label: 'Account',
    items: [
      { name: 'Billing', to: '/billing', icon: CreditCard, exact: true },
      { name: 'Settings', to: '/settings', icon: Settings, exact: true },
    ],
  },
])

const ACTIVE_LINK = 'bg-accent text-accent-foreground font-semibold'

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
    const { data } = await websitesApi.create(newProject.value)
    const project = data?.data || data
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
  try {
    const { data } = await websitesApi.list({ _silentError: true })
    appStore.setWebsites(data?.results || data || [])
  } catch {}
  // Fetch plan info for project limits
  try {
    const { data } = await billingApi.getCurrent({ _silentError: true })
    const plan = data?.plan || data?.data?.plan || 'starter'
    const limits = { starter: 1, growth: 5, scale: -1 }
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
