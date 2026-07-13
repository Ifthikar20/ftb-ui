<template>
  <AuthLayout>
    <div class="flex flex-col items-center gap-4 py-16 text-center">
      <!-- In progress -->
      <template v-if="state === 'working'">
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground"></div>
        <p class="text-base text-muted-foreground">Signing you in with Google...</p>
      </template>

      <!-- Closed signup: Google account has no FetchBot account -->
      <template v-else-if="state === 'account_required'">
        <h2 class="text-xl font-semibold text-foreground">You need a FetchBot account first</h2>
        <p class="max-w-md text-base text-muted-foreground">{{ message }}</p>
        <p class="max-w-md text-sm text-muted-foreground">
          Account creation is currently invite-only. Reach out through the contact page
          to request access and we will set you up.
        </p>
        <div class="mt-2 flex flex-wrap items-center justify-center gap-3">
          <router-link to="/contact" class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Request access
          </router-link>
          <router-link to="/login" class="text-sm font-medium underline">Back to sign in</router-link>
        </div>
      </template>

      <!-- Generic failure (cancelled, expired state, exchange error) -->
      <template v-else>
        <p class="text-base text-foreground">{{ message }}</p>
        <router-link to="/login" class="text-sm font-medium underline">Back to sign in</router-link>
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

// working | account_required | failed
const state = ref('working')
const message = ref('')

function fail(text) {
  state.value = 'failed'
  message.value = text
}

onMounted(async () => {
  const { code, state: stateParam, error } = route.query

  if (error) {
    fail('Google sign-in was cancelled.')
    return
  }
  if (!code) {
    fail('Google did not return an authorization code. Please try again.')
    return
  }

  const expectedState = sessionStorage.getItem('google-oauth-state')
  sessionStorage.removeItem('google-oauth-state')
  if (!expectedState || stateParam !== expectedState) {
    fail('This sign-in link expired. Please try again.')
    return
  }

  try {
    await authStore.googleLogin(code, `${window.location.origin}/auth/google/callback`)
    const session = await authStore.fetchSession()
    const next = session?.next_route
    if (next === 'paywall') {
      router.replace('/paywall')
    } else {
      router.replace('/dashboard')
    }
  } catch (e) {
    const backendMessage = e?.response?.data?.error?.message
    if (e?.response?.status === 403) {
      // Closed signup: the backend rejected a Google email with no account.
      state.value = 'account_required'
      message.value = backendMessage || 'No FetchBot account exists for this Google email.'
    } else {
      fail(backendMessage || 'Google sign-in failed. Please try again.')
    }
  }
})
</script>
