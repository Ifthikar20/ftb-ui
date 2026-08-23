<template>
  <div class="mx-auto max-w-6xl px-6 py-8 pb-24 sm:px-8 fade-in">
    <!-- Breadcrumb: parent is a link back to settings, current section is plain -->
    <nav class="mb-8 flex items-center gap-2.5 text-2xl font-semibold tracking-tight md:mb-10">
      <router-link
        to="/settings"
        class="text-muted-foreground/60 transition-colors hover:text-foreground"
      >Settings</router-link>
      <span class="select-none text-muted-foreground/40">&rsaquo;</span>
      <span class="text-foreground">{{ activeLabel }}</span>
    </nav>

    <div class="flex flex-col gap-6 md:flex-row md:gap-14">
      <!-- Desktop sub-navigation: grouped column, icon + label, active pill.
           Holds its place beside the content as the window narrows; below
           md it disappears in favour of the disclosure row. -->
      <aside class="hidden shrink-0 md:block md:w-52">
        <ul class="flex flex-col gap-1">
          <template v-for="group in NAV" :key="group.label || 'top'">
            <li
              v-if="group.label"
              class="select-none px-3 pb-2 pt-7 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70 first:pt-0"
            >{{ group.label }}</li>
            <li v-for="item in group.items" :key="item.key">
              <router-link
                :to="item.to"
                class="flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors"
                :class="active === item.key
                  ? 'bg-muted font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'"
              >
                <NavIcon :paths="item.icon" />
                {{ item.label }}
              </router-link>
            </li>
          </template>
        </ul>
      </aside>

      <!-- Content column: one width for every section, which is what keeps
           panels consistent across pages. -->
      <main class="min-w-0 max-w-3xl flex-1">
        <!-- Small screens: the sub-nav condenses into a disclosure row
             showing the current section; tapping unfolds the grouped
             list in place. The content stays put - it never sits below
             a full nav column. -->
        <div class="mb-6 border-b border-border md:hidden">
          <button
            type="button"
            class="flex w-full items-center gap-2.5 py-3 text-left text-base font-semibold text-foreground"
            :aria-expanded="open ? 'true' : 'false'"
            @click="open = !open"
          >
            <NavIcon :paths="activeItem.icon" />
            {{ activeLabel }}
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              class="ml-auto shrink-0 text-muted-foreground transition-transform duration-200"
              :class="open ? 'rotate-180' : ''"
            ><path d="m6 9 6 6 6-6" /></svg>
          </button>

          <div v-if="open" class="pb-3">
            <template v-for="group in NAV" :key="group.label || 'top'">
              <p
                v-if="group.label"
                class="select-none px-3 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70"
              >{{ group.label }}</p>
              <router-link
                v-for="item in group.items" :key="item.key"
                :to="item.to"
                class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors"
                :class="active === item.key
                  ? 'bg-muted font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'"
              >
                <NavIcon :paths="item.icon" />
                {{ item.label }}
              </router-link>
            </template>
          </div>
        </div>

        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, h, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps({
  /** Key of the active nav item: account | subscription | notifications | usage | appearance */
  active: { type: String, required: true },
})

/* Tiny functional icon: stroke paths only, inherits currentColor. */
const NavIcon = (p) =>
  h(
    'svg',
    {
      width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none',
      stroke: 'currentColor', 'stroke-width': 1.8,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      class: 'shrink-0 opacity-75',
    },
    (p.paths || []).map((d) => h('path', { d })),
  )
NavIcon.props = { paths: Array }

const NAV = [
  {
    label: 'General',
    items: [
      {
        key: 'account', label: 'Account',
        to: { path: '/settings', query: { section: 'account' } },
        icon: [
          'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2',
          'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
        ],
      },
      {
        key: 'subscription', label: 'Subscription',
        to: { path: '/billing' },
        icon: [
          'M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
          'M2 10h20',
        ],
      },
      {
        key: 'notifications', label: 'Notifications',
        to: { path: '/settings', query: { section: 'notifications' } },
        icon: [
          'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9',
          'M13.7 21a2 2 0 0 1-3.4 0',
        ],
      },
    ],
  },
  {
    label: 'Application',
    items: [
      {
        key: 'usage', label: 'AI Usage',
        to: { path: '/settings', query: { section: 'usage' } },
        icon: ['M22 12h-4l-3 9L9 3l-3 9H2'],
      },
      {
        key: 'appearance', label: 'Appearance',
        to: { path: '/settings', query: { section: 'appearance' } },
        icon: ['M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'],
      },
    ],
  },
]

const FLAT = NAV.flatMap((g) => g.items)

const activeItem = computed(
  () => FLAT.find((i) => i.key === props.active) || FLAT[0],
)
const activeLabel = computed(() => activeItem.value.label)

/* Mobile disclosure: navigating anywhere folds it back up. */
const open = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => { open.value = false })
</script>
