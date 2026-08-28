import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAppStore = defineStore('app', () => {
    const sidebarCollapsed = ref(false)
    const activeWebsite = ref(null)
    const websites = ref([])
    const notifications = ref([])
    const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)

    // Plan state
    const userPlan = ref('starter')
    const projectLimit = ref(-1) // -1 = unlimited (testing mode)

    const canCreateProject = computed(() => {
        if (projectLimit.value === -1) return true
        return websites.value.length < projectLimit.value
    })

    const projectLimitLabel = computed(() => {
        if (projectLimit.value === -1) return `${websites.value.length} projects`
        return `${websites.value.length}/${projectLimit.value} projects`
    })

    function setPlanInfo(plan, limit) {
        userPlan.value = plan
        projectLimit.value = limit
    }

    // ── Theme ──
    // `theme` is the user's PREFERENCE: 'light' | 'dark' | 'system'.
    // `resolvedTheme` is what is actually on screen ('light' | 'dark').
    // The preference persists in localStorage under THEME_KEY; index.html
    // reads the same key before the app mounts so there is no flash of
    // the wrong theme on reload. Dark mode is pure black + white (see
    // [data-theme="dark"] in assets/tailwind.css and css/theme.css).
    const THEME_KEY = 'cs-theme'
    const THEMES = ['light', 'dark', 'system']
    const systemDark = typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null

    const stored = (() => {
        try { return localStorage.getItem(THEME_KEY) } catch { return null }
    })()
    const theme = ref(THEMES.includes(stored) ? stored : 'light')
    const systemPrefersDark = ref(Boolean(systemDark?.matches))
    const resolvedTheme = computed(() =>
        theme.value === 'system' ? (systemPrefersDark.value ? 'dark' : 'light') : theme.value,
    )
    const isDark = computed(() => resolvedTheme.value === 'dark')

    function applyTheme() {
        const root = document.documentElement
        root.setAttribute('data-theme', resolvedTheme.value)
        root.style.colorScheme = resolvedTheme.value
    }

    function setTheme(pref) {
        theme.value = THEMES.includes(pref) ? pref : 'light'
        try { localStorage.setItem(THEME_KEY, theme.value) } catch {}
        applyTheme()
    }

    /** Flip between light and dark (a 'system' preference becomes explicit). */
    function toggleTheme() {
        setTheme(resolvedTheme.value === 'dark' ? 'light' : 'dark')
    }

    systemDark?.addEventListener?.('change', (e) => {
        systemPrefersDark.value = e.matches
        if (theme.value === 'system') applyTheme()
    })

    // Apply on init (index.html already did, but keep the DOM and the
    // store in lockstep — e.g. when the key was edited in another tab).
    applyTheme()

    function toggleSidebar() {
        sidebarCollapsed.value = !sidebarCollapsed.value
    }

    // Last breadcrumb segment for detail pages. The header breadcrumb is
    // derived from the nav tree, which only knows sections — a page showing
    // one entity (a prompt, an audit) sets this so the trail names what is
    // actually on screen. Pages must clear it on unmount.
    const breadcrumbTail = ref('')
    function setBreadcrumbTail(label) {
        breadcrumbTail.value = String(label || '')
    }

    function setActiveWebsite(website) {
        activeWebsite.value = website
    }

    function setWebsites(list) {
        websites.value = list
        // If active website was deleted or doesn't exist in the new list, reset it
        if (activeWebsite.value) {
            const stillExists = list.find(w => w.id === activeWebsite.value.id)
            if (!stillExists) {
                activeWebsite.value = list.length > 0 ? list[0] : null
            }
        } else if (list.length > 0) {
            activeWebsite.value = list[0]
        }
    }

    return {
        sidebarCollapsed,
        activeWebsite,
        websites,
        notifications,
        unreadCount,
        theme,
        resolvedTheme,
        isDark,
        setTheme,
        userPlan,
        projectLimit,
        canCreateProject,
        projectLimitLabel,
        toggleSidebar,
        toggleTheme,
        setPlanInfo,
        setActiveWebsite,
        setWebsites,
        breadcrumbTail,
        setBreadcrumbTail,
    }
})
