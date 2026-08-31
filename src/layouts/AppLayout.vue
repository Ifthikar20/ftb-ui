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
                  <!-- Square "C" mark only while collapsed: the wordmark
                       cannot fit a 3rem icon rail. -->
                  <div class="hidden aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground group-data-[collapsible=icon]:flex">
                    <img src="/images/cansee-mark.png" alt="" class="size-5 object-contain cansee-mark" />
                  </div>
                  <div class="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                    <!-- The wordmark carries the name, so the old "Cansee"
                         text label would just repeat it. -->
                    <img
                      src="/images/cansee-logo.png"
                      alt="Cansee"
                      class="cansee-wordmark h-5 w-auto self-start object-contain"
                    />
                  </div>
                </router-link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <!-- Project switcher. Uses the project's initial as its avatar so it
                 reads as the current project, distinct from the brand above. -->
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <!-- No :tooltip here — SidebarMenuButton wraps itself in a
                       Tooltip when one is set, and DropdownMenuTrigger's
                       as-child props then land on the Tooltip provider
                       instead of the button, leaving the menu unopenable. -->
                  <SidebarMenuButton class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
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
                <DropdownMenuContent align="start" side="bottom" :side-offset="4" class="min-w-64 rounded-lg">
                  <DropdownMenuLabel class="text-xs text-muted-foreground">
                    Projects · {{ appStore.projectLimitLabel }}
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    v-for="w in appStore.websites"
                    :key="w.id"
                    class="gap-2"
                    @select="switchWebsite(w.id)"
                  >
                    <div class="flex aspect-square size-6 flex-shrink-0 items-center justify-center rounded-md border border-border bg-background text-[0.7rem] font-semibold">
                      {{ (w.name || '?').charAt(0).toUpperCase() }}
                    </div>
                    <div class="grid min-w-0 flex-1 leading-tight">
                      <span class="truncate text-sm">{{ w.name }}</span>
                      <span class="truncate text-xs text-muted-foreground">{{ (w.url || '').replace(/^https?:\/\//, '') }}</span>
                    </div>
                    <Check
                      v-if="appStore.activeWebsite?.id === w.id"
                      class="ml-auto size-4 flex-shrink-0"
                    />
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

          <!-- Chat history. Only appears once there is a thread to show, so
               a new account is not given an empty section to wonder about. -->
          <SidebarGroup v-if="assistantStore.enabled && assistantStore.conversations.length">
            <SidebarGroupLabel>Chats</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton as-child tooltip="New chat">
                  <button type="button" class="w-full" @click="openAsk()">
                    <SquarePen />
                    <span>New chat</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem
                v-for="chat in visibleChats"
                :key="chat.id"
                class="group/chat relative"
              >
                <SidebarMenuButton
                  as-child
                  :is-active="isChatActive(chat)"
                  :tooltip="chat.title || 'New chat'"
                >
                  <router-link :to="{ name: 'ask-cansee', params: { conversationId: chat.id } }">
                    <MessageSquare />
                    <span class="truncate">{{ chat.title || 'New chat' }}</span>
                  </router-link>
                </SidebarMenuButton>
                <button
                  type="button"
                  class="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-destructive group-hover/chat:block"
                  :title="`Delete ${chat.title || 'this chat'}`"
                  @click.prevent.stop="deleteChat(chat)"
                >
                  <Trash2 :size="13" />
                </button>
              </SidebarMenuItem>
              <SidebarMenuItem v-if="assistantStore.conversations.length > CHAT_LIMIT">
                <SidebarMenuButton as-child>
                  <button type="button" class="w-full" @click="showAllChats = !showAllChats">
                    <span class="text-muted-foreground">
                      {{ showAllChats ? 'Show less' : `Show all ${assistantStore.conversations.length}` }}
                    </span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
                <template v-for="(crumb, i) in breadcrumbs" :key="i">
                  <!-- No leading separator on the first crumb now that the
                       Home icon is gone, or the trail opens with a stray ">". -->
                  <BreadcrumbSeparator v-if="i > 0" class="hidden md:block" />
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
              @click="openAsk()"
            >
              <CanseeMark :size="20" />
              <span class="hidden sm:inline">Ask</span>
            </button>
            <FeedbackWidget />
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
import FeedbackWidget from '@/components/feedback/FeedbackWidget.vue'
import ToastContainer from '@/components/ToastContainer.vue'
import { useAssistantStore } from '@/stores/assistant'
import CanseeMark from '@/components/assistant/CanseeMark.vue'
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
  Search, Plus, LogOut, ChevronsUpDown, Check,
  LayoutGrid, Globe, BarChart3, Brain, Plug, CreditCard, Settings,
  MessageSquare, SquarePen, Trash2,
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
  // ── Navigation ──
  { name: 'dashboard', label: 'Dashboard', description: 'Overview of all your projects', category: 'Navigation', route: '/dashboard', keywords: 'home overview start', icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>' },
  { name: 'websites', label: 'Projects', description: 'Manage your tracked websites', category: 'Navigation', route: '/websites', keywords: 'sites domains brands add website', icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="7"/><line x1="1" y1="8" x2="15" y2="8"/><ellipse cx="8" cy="8" rx="3" ry="7"/></svg>' },

  // ── Intelligence ── every destination the sidebar can reach.
  // These were missing from the palette entirely: the sidebar offered
  // eleven destinations and search indexed six, so half the app was
  // unreachable by keyboard.
  { name: 'analytics', label: 'SEO Analytics', description: 'Search performance, traffic sources, engagement', category: 'Intelligence', routeFn: () => analyticsRoute.value, keywords: 'seo traffic visitors pageviews sessions bounce referrers geo devices', icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 14V6l4-4 4 4 4-4v12"/></svg>' },
  { name: 'prompt-library', label: 'Prompts', description: 'The questions we ask each AI model', category: 'Intelligence', routeFn: () => promptLibraryRoute.value, keywords: 'prompt library questions queries tracked keywords', icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 4v4l3 2"/></svg>' },
  { name: 'sources-urls', label: 'URLs', description: 'Which pages and domains AI cites', category: 'Intelligence', routeFn: () => sourcesUrlsRoute.value, keywords: 'citations sources domains links cited references influence', icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6.5 9.5a3 3 0 0 0 4.2 0l2.3-2.3a3 3 0 0 0-4.2-4.2L7.6 4.2"/><path d="M9.5 6.5a3 3 0 0 0-4.2 0L3 8.8a3 3 0 0 0 4.2 4.2l1.2-1.2"/></svg>' },
  { name: 'brand-research', label: 'Brand Research', description: 'Who owns the conversation, and where you can join it', category: 'Intelligence', routeFn: () => brandResearchRoute.value, keywords: 'search insights opportunities reddit forums quora threads sentiment competitors chatgpt gaps content ideas', icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="5"/><path d="M10.5 10.5 14 14"/></svg>' },
  { name: 'brand-security', label: 'Brand Security', description: 'Catch wrong or hostile AI answers', category: 'Intelligence', routeFn: () => brandSecurityRoute.value, keywords: 'alerts findings sentiment risk reputation detectors negative misrepresentation', icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 1.5 2.5 3.8v4c0 3.2 2.3 6 5.5 6.7 3.2-.7 5.5-3.5 5.5-6.7v-4z"/></svg>' },
  { name: 'brand-input', label: 'Brand Ingestion', description: 'Teach the models what is true about you', category: 'Intelligence', routeFn: () => brandInputRoute.value, keywords: 'knowledge facts sources ingest rag context vault alignment', icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 3.5A1.5 1.5 0 0 1 3.5 2H8v12H3.5A1.5 1.5 0 0 1 2 12.5z"/><path d="M14 3.5A1.5 1.5 0 0 0 12.5 2H8v12h4.5a1.5 1.5 0 0 0 1.5-1.5z"/></svg>' },
  { name: 'integrations', label: 'Integrations', description: 'Connect Slack, Discord, Analytics and more', category: 'Intelligence', route: '/app/integrations', keywords: 'slack discord ga4 google cloudflare search console webhooks connect', icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 1v4M10 1v4"/><path d="M4 5h8v3a4 4 0 0 1-8 0z"/><path d="M8 12v3"/></svg>' },

  // ── Account ──
  { name: 'billing', label: 'Billing', description: 'Subscription plans and payment', category: 'Account', route: '/billing', keywords: 'plan upgrade invoice subscription payment card pro usage', icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="3" width="14" height="10" rx="2"/><line x1="1" y1="7" x2="15" y2="7"/></svg>' },
  { name: 'settings', label: 'Settings', description: 'Account settings and preferences', category: 'Account', route: '/settings', keywords: 'profile password email name company theme dark mode notifications', icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.3 3.3l1.4 1.4M11.3 11.3l1.4 1.4M12.7 3.3l-1.4 1.4M4.7 11.3l-1.4 1.4"/></svg>' },

  // ── Help ── indexed so 'privacy' or 'what do you track' resolves
  // to the page that answers it rather than returning nothing.
  { name: 'what-we-track', label: 'What We Track', description: 'Exactly what data we collect and for how long', category: 'Help', route: '/what-we-track', keywords: 'privacy data retention cookies gdpr tracking pixel consent', icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8z"/><circle cx="8" cy="8" r="2"/></svg>' },
  { name: 'support', label: 'Support', description: 'Get help or contact us', category: 'Help', route: '/support', keywords: 'help contact email question problem bug', icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="2.5"/><path d="M3.8 3.8 6.2 6.2M9.8 9.8l2.4 2.4M12.2 3.8 9.8 6.2M6.2 9.8l-2.4 2.4"/></svg>' },
  { name: 'status', label: 'Status', description: 'Live service status', category: 'Help', route: '/status', keywords: 'uptime incident outage health', icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="2.5"/><path d="M3.8 3.8 6.2 6.2M9.8 9.8l2.4 2.4M12.2 3.8 9.8 6.2M6.2 9.8l-2.4 2.4"/></svg>' },
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
  // keywords is searched but never displayed: it carries the words people
  // actually type that do not appear in the label. Nobody searching for
  // "gdpr", "invoice" or "slack" would otherwise find What We Track,
  // Billing or Integrations, because none of those pages say the word.
  const haystack = [
    page.label,
    page.description,
    page.category,
    page.name || '',
    page.keywords || '',
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
const brandResearchRoute = computed(() => websiteId.value ? `/llm-ranking/${websiteId.value}/brand-research` : '/websites')
const brandInputRoute = computed(() => websiteId.value ? `/llm-ranking/${websiteId.value}/brand-input` : '/websites')

/* ── Ask Cansee chat list ──
 * The list is rendered on every route, so it is capped by default: a heavy
 * user with 60 threads should not push Billing and Settings off-screen.
 */
const CHAT_LIMIT = 6
const showAllChats = ref(false)
const visibleChats = computed(() =>
  showAllChats.value
    ? assistantStore.conversations
    : assistantStore.conversations.slice(0, CHAT_LIMIT))

function isChatActive(chat) {
  return route.name === 'ask-cansee' && route.params.conversationId === chat.id
}

function openAsk() {
  assistantStore.startNewChat()
  router.push({ name: 'ask-cansee', params: {} })
}

async function deleteChat(chat) {
  const wasOpen = isChatActive(chat)
  try {
    await assistantStore.removeConversation(websiteId.value, chat.id)
  } catch (_) {
    return  // interceptor toasts the failure
  }
  // Deleting the thread you are reading would otherwise leave the page
  // pointed at a row that no longer exists.
  if (wasOpen) router.replace({ name: 'ask-cansee', params: {} })
}

// Threads are per-project, so switching projects swaps the whole list.
watch(websiteId, (id) => { assistantStore.loadConversations(id) })

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
          { title: 'Brand Research', to: brandResearchRoute.value, match: '/brand-research' },
          { title: 'Brand Security', to: brandSecurityRoute.value, match: '/brand-security' },
          { title: 'Brand Ingestion', to: brandInputRoute.value, match: '/brand-input' },
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

  // Keep the user on the SAME section, re-pointed at the new project.
  // Detail leaves (a specific prompt, a specific source URL) belong to
  // the old project's records, so they fall back to their section root
  // rather than 404ing on a foreign id.
  const path = route.path
  let target = null
  const section = path.match(/^\/llm-ranking\/[^/]+\/([^/]+)/)
  if (section) {
    target = `/llm-ranking/${id}/${section[1]}`
  } else if (path.startsWith('/analytics/')) {
    target = `/analytics/${id}`
  } else if (path.startsWith('/websites/')) {
    // Project detail (pixel setup, integrations) → same page, new project.
    target = `/websites/${id}`
  }
  // Dashboard, billing, settings carry no websiteId — the store update
  // alone re-scopes them (the dashboard watches activeWebsite).
  if (target && target !== path) router.push(target)
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
  assistantStore.loadConversations(websiteId.value)
  try {
    const { data } = await websitesApi.list({ _silentError: true })
    appStore.setWebsites(data || [])
  } catch {}
  // Fetch plan info for project limits. The backend resolves the
  // allowance (trial-aware: a live trial keeps the Free 1-project cap);
  // never re-derive it from the plan name here.
  try {
    const { data } = await billingApi.getCurrent({ _silentError: true })
    appStore.setPlanInfo(data?.plan || 'free', data?.limits?.projects ?? -1)
  } catch {}
  // Search keyboard shortcut
  document.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<!-- Page transition. Deliberately UNSCOPED: <transition> applies these
     classes to the routed child page's root element, which belongs to a
     different component and so carries a different data-v- hash. Scoped,
     the compiled selectors became .page-fade-leave-active[data-v-<layout>]
     and matched nothing -- so with mode="out-in" the leave never produced a
     transitionend, the enter never ran, and every in-app navigation
     rendered the PREVIOUS page until the next navigation flushed it. -->
<style>
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
/* Wordmark artwork is a single navy: readable on the light sidebar
   (#f7f7f5), invisible on the dark one (#000). Flip it only there rather
   than shipping a second file. */
:root[data-theme='dark'] .cansee-wordmark { filter: brightness(0) invert(1); }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) .cansee-wordmark { filter: brightness(0) invert(1); }
}
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
