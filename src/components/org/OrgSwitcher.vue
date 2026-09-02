<template>
  <!-- Whole switcher only exists for org members: B2C accounts have
       session.org === null and see the sidebar exactly as before. -->
  <!-- Slim workspace strip, deliberately NOT a sibling of the project
       switcher: when the org and the project share a name (the common
       single-project case) two identical stacked rows read as a
       duplicate. The org is context — small logo, quiet name, role
       pill — while the project row below stays the prominent control. -->
  <SidebarMenuItem v-if="org">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <!-- No :tooltip here — SidebarMenuButton wraps itself in a
             Tooltip when one is set, and DropdownMenuTrigger's
             as-child props then land on the Tooltip provider
             instead of the button, leaving the menu unopenable. -->
        <SidebarMenuButton
          size="sm"
          class="group/org h-7 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <img
            v-if="org.logo_url"
            :src="org.logo_url"
            alt=""
            class="aspect-square size-4 rounded-sm border border-sidebar-border object-cover"
          />
          <div
            v-else
            class="flex aspect-square size-4 items-center justify-center rounded-sm border border-sidebar-border bg-sidebar text-[0.55rem] font-semibold text-muted-foreground"
          >
            {{ (org.name || 'O').charAt(0).toUpperCase() }}
          </div>
          <span class="min-w-0 flex-1 truncate text-left text-xs font-medium text-muted-foreground">
            {{ org.name }}
          </span>
          <!-- No chevron: the hover background is the affordance (the
               Slack-workspace-name pattern), and every reserved pixel
               here comes out of the org name before it truncates. -->
          <span
            class="flex-shrink-0 rounded-full border border-sidebar-border px-1.5 py-px text-[0.6rem] font-medium text-muted-foreground"
          >
            {{ roleLabel }}
          </span>
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="bottom" :side-offset="4" class="min-w-56 rounded-lg">
        <DropdownMenuLabel class="text-xs text-muted-foreground">
          {{ org.name }} · {{ roleLabel }}
        </DropdownMenuLabel>
        <DropdownMenuItem @select="goTo('team')">
          <Users class="size-4" />
          <span>Team</span>
        </DropdownMenuItem>
        <DropdownMenuItem v-if="authStore.isOrgAdmin" @select="goTo('domains')">
          <ShieldCheck class="size-4" />
          <span>Domains &amp; SSO</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </SidebarMenuItem>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Users, ShieldCheck } from '@lucide/vue'

const router = useRouter()
const authStore = useAuthStore()

const org = computed(() => authStore.org)

const ROLE_LABELS = { owner: 'Owner', admin: 'Admin', member: 'Member', viewer: 'Viewer' }
const roleLabel = computed(() => ROLE_LABELS[authStore.orgRole] || authStore.orgRole || '')

function goTo(section) {
  router.push({ path: '/settings', query: { section } })
}
</script>
