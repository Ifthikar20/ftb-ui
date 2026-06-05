<template>
  <div class="websites-page mx-auto max-w-6xl px-6 py-8 sm:px-8">
    <div class="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-foreground">Projects</h1>
        <p class="mt-1 text-sm text-muted-foreground">Manage your projects and tracking pixels.</p>
      </div>
      <Button @click="openWizard" :disabled="!appStore.canCreateProject">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Project
      </Button>
    </div>

    <div
      v-if="websites.length === 0"
      class="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card px-8 py-20 text-center"
    >
      <div class="mb-5">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="var(--muted-foreground)" stroke-width="1.5"><circle cx="24" cy="24" r="20"/><line x1="4" y1="24" x2="44" y2="24"/><ellipse cx="24" cy="24" rx="10" ry="20"/></svg>
      </div>
      <h3 class="text-lg font-semibold text-foreground">No projects yet</h3>
      <p class="mt-2 max-w-md text-sm text-muted-foreground">Add your first project to start tracking visitors, generating leads, and getting AI-powered growth strategies.</p>
      <Button class="mt-6" @click="openWizard">Add Your First Project</Button>
    </div>

    <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card
        v-for="site in websites"
        :key="site.id"
        class="cursor-pointer p-6 transition-shadow hover:shadow-md"
        @click="$router.push(`/websites/${site.id}`)"
      >
        <div class="mb-4 flex items-center gap-3">
          <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
            {{ site.name?.[0]?.toUpperCase() || '?' }}
          </div>
          <div class="min-w-0">
            <h3 class="text-base font-semibold text-foreground">{{ site.name }}</h3>
            <p class="max-w-[200px] truncate text-sm text-muted-foreground">{{ site.url }}</p>
          </div>
          <Badge class="ml-auto" :variant="site.pixel_verified ? 'success' : 'warning'">
            {{ site.pixel_verified ? 'Pixel Active' : 'Pixel Pending' }}
          </Badge>
          <div class="flex flex-shrink-0 gap-1">
            <Button variant="ghost" size="icon" class="size-7" @click.stop="openRename(site)" title="Rename">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            </Button>
            <Button variant="ghost" size="icon" class="size-7 hover:text-destructive" @click.stop="confirmDelete(site)" title="Delete">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </Button>
          </div>
        </div>
        <div class="grid grid-cols-4 gap-3 border-t border-border pt-4">
          <div class="flex flex-col gap-1">
            <span class="text-xs text-muted-foreground">Visitors</span>
            <span class="font-semibold text-foreground">—</span>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-xs text-muted-foreground">Leads</span>
            <span class="font-semibold text-foreground">—</span>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-xs text-muted-foreground">Score</span>
            <span class="font-semibold text-foreground">—</span>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-xs text-muted-foreground">Status</span>
            <Badge variant="success" class="w-fit">Active</Badge>
          </div>
        </div>
      </Card>
    </div>

    <!-- Onboarding Wizard Modal -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal-content slide-up wizard-modal">
        <div class="modal-header">
          <div class="wizard-step-label">STEP {{ wizardStep }} OF {{ TOTAL_STEPS }}</div>
          <Button variant="ghost" size="icon" class="size-8" @click="showAddModal = false">✕</Button>
        </div>

        <!-- Step 1: Basic Info -->
        <div v-if="wizardStep === 1" class="wizard-body">
          <h2 class="wizard-title">Add your project</h2>
          <p class="wizard-subtitle">Tell us about your site so we can tailor the rest of the setup.</p>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-foreground">Project Name</label>
            <input v-model="newSite.name" class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="My Awesome Site" required />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-foreground">Website URL</label>
            <input v-model="newSite.url" class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" type="url" placeholder="https://example.com" required />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-foreground">Industry <span class="text-muted-foreground">(optional)</span></label>
            <input v-model="newSite.industry" class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="SaaS, E-commerce, etc." />
          </div>
          <Button class="mt-2 w-full" size="lg" :disabled="!newSite.name || !newSite.url" @click="wizardStep = 2">
            Continue
          </Button>
        </div>

        <!-- Step 2: Platform Type -->
        <div v-if="wizardStep === 2" class="wizard-body">
          <h2 class="wizard-title">Choose your platform</h2>
          <p class="wizard-subtitle">What platform is your website built on? This helps us optimize tracking and integrations.</p>
          <div class="platform-grid">
            <div v-for="p in platforms" :key="p.id" class="platform-card" :class="{ selected: newSite.platform_type === p.id }" @click="newSite.platform_type = p.id">
              <div class="platform-icon" :style="{ background: p.color }">
                <span v-html="p.icon"></span>
              </div>
              <div class="platform-name">{{ p.name }}</div>
              <div class="platform-desc">{{ p.desc }}</div>
              <div class="platform-check" v-if="newSite.platform_type === p.id">✓</div>
            </div>
          </div>
          <div class="mt-2 flex justify-between gap-3">
            <Button variant="secondary" @click="wizardStep = 1">Back</Button>
            <Button :disabled="!newSite.platform_type" @click="createAndGoToPixel">
              {{ adding ? 'Creating...' : 'Continue' }}
            </Button>
          </div>
        </div>

        <!-- Step 3: Pixel Installation -->
        <div v-if="wizardStep === 3" class="wizard-body">
          <div v-if="newSite.platform_type === 'shopify'" class="pixel-instructions">
            <div class="pixel-icon" style="background: #96bf48"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg></div>
            <h4>Shopify Integration</h4>
            <p>Add this script to your Shopify theme. Go to <strong>Online Store → Themes → Edit Code → theme.liquid</strong> and paste before <code>&lt;/head&gt;</code>:</p>
          </div>
          <div v-else-if="newSite.platform_type === 'wordpress'" class="pixel-instructions">
            <div class="pixel-icon" style="background: #21759b"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h7M7 16h9"/></svg></div>
            <h4>WordPress Installation</h4>
            <p>Install via <strong>Appearance → Theme Editor → header.php</strong> or use a plugin like <em>Insert Headers and Footers</em>. Paste before <code>&lt;/head&gt;</code>:</p>
          </div>
          <div v-else-if="newSite.platform_type === 'woocommerce'" class="pixel-instructions">
            <div class="pixel-icon" style="background: #7f54b3"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5"><circle cx="10" cy="19" r="2"/><circle cx="18" cy="19" r="2"/><path d="M2 3h3l2.5 12h11l2.5-8H7"/></svg></div>
            <h4>WooCommerce Installation</h4>
            <p>Same as WordPress — add to your theme's <code>header.php</code> or use a header script plugin. Paste before <code>&lt;/head&gt;</code>:</p>
          </div>
          <div v-else class="pixel-instructions">
            <div class="pixel-icon" style="background: #6366f1"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/></svg></div>
            <h4>Custom Installation</h4>
            <p>Add this script to every page of your website. Paste it into your HTML <code>&lt;head&gt;</code> section:</p>
          </div>

          <div class="pixel-snippet-box">
            <code class="pixel-code">{{ pixelSnippet }}</code>
            <button class="pixel-copy-btn" @click="copyPixel">{{ copied ? 'Copied!' : 'Copy' }}</button>
          </div>

          <div class="mt-2 flex justify-between gap-3">
            <Button variant="secondary" @click="showAddModal = false">Done</Button>
            <Button @click="showAddModal = false; $router.push(`/websites/${createdSite?.id}`)">
              Go to Project →
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Rename Modal -->
    <div v-if="renameTarget" class="modal-overlay" @click.self="renameTarget = null">
      <div class="modal-content slide-up">
        <div class="modal-header">
          <h2 class="text-lg font-semibold text-foreground">Rename Project</h2>
          <Button variant="ghost" size="icon" class="size-8" @click="renameTarget = null">✕</Button>
        </div>
        <form @submit.prevent="renameWebsite" class="flex flex-col gap-4">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-foreground">Project Name</label>
            <input v-model="renameName" class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Project name" required />
          </div>
          <div class="flex justify-end gap-2">
            <Button type="button" variant="secondary" @click="renameTarget = null">Cancel</Button>
            <Button type="submit" :disabled="renaming || !renameName.trim()">{{ renaming ? 'Saving...' : 'Save' }}</Button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
      <div class="modal-content slide-up">
        <div class="modal-header">
          <h2 class="text-lg font-semibold text-foreground">Delete Project</h2>
          <Button variant="ghost" size="icon" class="size-8" @click="deleteTarget = null">✕</Button>
        </div>
        <p class="mb-4 text-sm text-muted-foreground">Are you sure you want to delete <strong>{{ deleteTarget.name }}</strong>? This will remove all tracking data, analytics, keywords, and audit history. This cannot be undone.</p>
        <div class="flex justify-end gap-2">
          <Button variant="secondary" @click="deleteTarget = null">Cancel</Button>
          <Button variant="destructive" @click="deleteWebsite" :disabled="deleting">{{ deleting ? 'Deleting...' : 'Delete' }}</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import websitesApi from '@/api/websites'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import { useRouter } from 'vue-router'

const router = useRouter()
const appStore = useAppStore()
const websites = ref([])
const showAddModal = ref(false)
const adding = ref(false)
const deleting = ref(false)
const deleteTarget = ref(null)
const renameTarget = ref(null)
const renameName = ref('')
const renaming = ref(false)
const wizardStep = ref(1)
const createdSite = ref(null)
const copied = ref(false)
const newSite = reactive({ name: '', url: '', industry: '', platform_type: 'custom' })

const TOTAL_STEPS = 3

const platforms = [
  { id: 'shopify', name: 'Shopify', desc: 'E-commerce on Shopify', color: '#96bf48', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>' },
  { id: 'wordpress', name: 'WordPress', desc: 'Blog or CMS', color: '#21759b', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h7M7 16h9"/></svg>' },
  { id: 'woocommerce', name: 'WooCommerce', desc: 'WordPress + E-commerce', color: '#7f54b3', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5"><circle cx="10" cy="19" r="2"/><circle cx="18" cy="19" r="2"/><path d="M2 3h3l2.5 12h11l2.5-8H7"/></svg>' },
  { id: 'custom', name: 'Custom / Other', desc: 'Any other platform', color: '#6366f1', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/></svg>' },
]

const pixelSnippet = computed(() => {
  if (!createdSite.value) return ''
  return `<script src="https://fetchbot.ai/pixel/growthpilot.min.js" data-key="${createdSite.value.pixel_key}"><\/script>`
})

onMounted(async () => {
  try {
    const { data } = await websitesApi.list()
    websites.value = data?.data || data || []
    appStore.setWebsites(websites.value)
  } catch { /* empty */ }
})

function openRename(site) {
  renameTarget.value = site
  renameName.value = site.name
}

async function renameWebsite() {
  if (!renameTarget.value || !renameName.value.trim()) return
  renaming.value = true
  try {
    await websitesApi.update(renameTarget.value.id, { name: renameName.value.trim() })
    const site = websites.value.find(s => s.id === renameTarget.value.id)
    if (site) site.name = renameName.value.trim()
    appStore.setWebsites(websites.value)
    renameTarget.value = null
  } catch (e) { console.error('Rename failed', e) }
  finally { renaming.value = false }
}

function confirmDelete(site) {
  if (websites.value.length <= 1) {
    alert('You must have at least one project. Add a new project before deleting this one.')
    return
  }
  deleteTarget.value = site
}

async function deleteWebsite() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    const deletedId = deleteTarget.value.id
    await websitesApi.delete(deletedId)
    websites.value = websites.value.filter(s => s.id !== deletedId)
    appStore.setWebsites(websites.value)
    deleteTarget.value = null
    if (appStore.activeWebsite?.id === deletedId) {
      if (websites.value.length) {
        appStore.setActiveWebsite(websites.value[0])
      } else {
        router.push('/websites')
      }
    }
  } catch (e) { console.error('Delete failed', e) }
  finally { deleting.value = false }
}

async function createAndGoToPixel() {
  adding.value = true
  try {
    const { data } = await websitesApi.create(newSite)
    const site = data?.data || data
    createdSite.value = site
    websites.value.push(site)
    appStore.setWebsites(websites.value)
    appStore.setActiveWebsite(site)
    showAddModal.value = false
  } catch (e) { console.error('Create failed', e) }
  finally { adding.value = false }
}

function copyPixel() {
  navigator.clipboard.writeText(pixelSnippet.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function openWizard() {
  wizardStep.value = 1
  createdSite.value = null
  copied.value = false
  newSite.name = ''
  newSite.url = ''
  newSite.industry = ''
  newSite.platform_type = 'custom'
  showAddModal.value = true
}
</script>

<style scoped>
/* ── Modal shell (kept; remapped to shadcn tokens) ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
}
.modal-content {
  width: 100%;
  max-width: 480px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
  max-height: 90vh;
  overflow-y: auto;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.slide-up { animation: slide-up 0.2s ease both; }
@keyframes slide-up {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── Onboarding Wizard ── */
.wizard-modal { max-width: 560px; }
.wizard-step-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted-foreground);
  letter-spacing: 1.2px;
}
.wizard-title {
  font-size: 26px;
  font-weight: 800;
  color: var(--foreground);
  margin: 4px 0 8px;
  line-height: 1.2;
}
.wizard-subtitle {
  font-size: 14px;
  color: var(--muted-foreground);
  line-height: 1.55;
  margin: 0 0 20px;
}
.wizard-body { display: flex; flex-direction: column; gap: 14px; }
.wizard-helper {
  text-align: center;
  font-size: 12px;
  color: var(--muted-foreground);
  margin: 0;
}

/* Progress dots */
.wizard-dots {
  display: flex;
  gap: 8px;
  margin-top: 18px;
  justify-content: flex-start;
}
.wizard-dots .dot {
  width: 28px;
  height: 4px;
  border-radius: 2px;
  background: var(--border);
  transition: background 0.2s;
}
.wizard-dots .dot.active { background: var(--primary); }

/* Topic Source */
.platform-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.platform-card { position: relative; padding: 16px; border-radius: 14px; border: 2px solid var(--border); cursor: pointer; text-align: center; transition: all 0.2s; background: var(--muted); }
.platform-card:hover { border-color: var(--muted-foreground); transform: translateY(-1px); }
.platform-card.selected { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 4%, transparent); }
.platform-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; font-size: 22px; }
.platform-name { font-weight: 600; font-size: 14px; margin-bottom: 2px; color: var(--foreground); }
.platform-desc { font-size: 12px; color: var(--muted-foreground); }
.platform-check { position: absolute; top: 8px; right: 10px; color: var(--primary); font-weight: 700; font-size: 14px; }

.pixel-instructions { text-align: center; padding: 8px 0; }
.pixel-instructions h4 { margin: 8px 0 4px; font-weight: 700; color: var(--foreground); }
.pixel-instructions p { font-size: 14px; color: var(--muted-foreground); margin: 0; line-height: 1.5; }
.pixel-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto; font-size: 24px; }
.pixel-snippet-box { position: relative; background: #1a1a2e; border-radius: 10px; padding: 16px; margin: 4px 0; }
.pixel-code { display: block; color: #9effa3; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; word-break: break-all; line-height: 1.6; white-space: pre-wrap; }
.pixel-copy-btn { position: absolute; top: 8px; right: 8px; background: rgba(255,255,255,0.1); border: none; color: #fff; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; transition: background 0.2s; }
.pixel-copy-btn:hover { background: rgba(255,255,255,0.2); }
</style>
