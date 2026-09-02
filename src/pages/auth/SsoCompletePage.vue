<template>
  <AuthLayout>
    <div class="flex flex-col items-center gap-4 py-16 text-center">
      <!-- In progress -->
      <template v-if="state === 'working'">
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground"></div>
        <p class="text-base text-muted-foreground">Completing company sign-in...</p>
      </template>

      <!-- First-time JIT/invite join: one beat of orientation -->
      <template v-else-if="state === 'joined'">
        <div class="flex size-14 items-center justify-center rounded-xl bg-foreground text-xl font-bold text-background">
          {{ orgName?.[0] || '?' }}
        </div>
        <h2 class="text-xl font-semibold text-foreground">You've joined {{ orgName }}</h2>
        <p class="max-w-md text-base text-muted-foreground">
          Your team's projects, dashboards, and knowledge base are ready.
        </p>
        <button
          class="mt-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          @click="enterWorkspace"
        >
          Open workspace
        </button>
      </template>

      <!-- Failure (IdP bounce, expired code, exchange error) -->
      <template v-else>
        <p class="text-base font-semibold text-foreground">Company sign-in didn't complete.</p>
        <p class="max-w-md text-base text-muted-foreground">{{ message }}</p>
        <router-link to="/sso" class="text-sm font-medium underline">Back to company sign-in</router-link>
      </template>
    </div>
  </AuthLayout>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// working | joined | failed
const state = ref('working')
const message = ref('')
const orgName = ref('')

// Human copy for the ?err= codes the backend can bounce back with.
// Anything unmapped (incl. the generic sso_failed) gets the fallback.
const ERR_MESSAGES = {
  permission_denied: "Your SSO profile didn't match your organization — contact your admin.",
  no_seats_available: "Your organization is out of seats — ask your admin to add one, then try again.",
}

function fail(text) {
  state.value = 'failed'
  message.value = text
}

async function routeAfterLogin() {
  const session = await authStore.fetchSession()
  // A deep link stashed before the full-page IdP round trip wins.
  const stashed = sessionStorage.getItem('cs-post-auth-redirect')
  sessionStorage.removeItem('cs-post-auth-redirect')
  if (stashed) {
    router.replace(stashed)
    return
  }
  const next = session?.next_route
  if (next === 'paywall') {
    router.replace('/paywall')
  } else {
    router.replace('/dashboard')
  }
}

function enterWorkspace() {
  routeAfterLogin()
}

onMounted(async () => {
  // The backend finishes the SAML round trip itself, then 302s the
  // browser here with either a one-time code (?c=) or a failure (?err=).
  const { c, err } = route.query

  if (err) {
    fail(ERR_MESSAGES[err] || 'Please try again, or contact your admin if this keeps happening.')
    return
  }
  if (!c) {
    fail('The sign-in link is missing its code. Please start again.')
    return
  }

  try {
    const result = await authStore.exchangeSsoCode(c)
    if (result?.joined_org && result?.is_new_user) {
      // Deliberate pause: a first-time team member gets one beat of
      // orientation before landing in a workspace they've never seen.
      orgName.value = result.org?.name || 'your team'
      state.value = 'joined'
      return
    }
    await routeAfterLogin()
  } catch (e) {
    const backendMessage = e?.response?.data?.error?.message
    fail(backendMessage || 'This sign-in link expired. Please try again.')
  }
})
</script>
