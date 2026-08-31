<template>
  <AuthLayout title="Welcome back" subtitle="Sign in to your Cansee account.">
    <form @submit.prevent="handleLogin" class="auth-form flex flex-col gap-6">
      <Alert v-if="error" variant="destructive">
        <CircleX />
        <AlertTitle>Sign in failed</AlertTitle>
        <AlertDescription>{{ error }}</AlertDescription>
      </Alert>

      <div>
        <label class="mb-2.5 block text-base font-semibold text-foreground">Email</label>
        <input v-model="email" type="email" class="h-14 w-full rounded-xl border border-input bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="you@company.com" required />
      </div>

      <div>
        <label class="mb-2.5 block text-base font-semibold text-foreground">Password</label>
        <div class="relative flex">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            class="h-14 w-full rounded-xl border border-input bg-background pl-4 pr-12 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="••••••••"
            required
            autocomplete="current-password"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="absolute right-1.5 top-1/2 h-10 w-10 -translate-y-1/2 text-muted-foreground"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            :aria-pressed="showPassword"
            @click="showPassword = !showPassword"
          >
            <EyeOff v-if="showPassword" class="size-5" />
            <Eye v-else class="size-5" />
          </Button>
        </div>
      </div>

      <div class="flex flex-col items-start gap-3 text-base">
        <label class="flex cursor-pointer items-center gap-2.5 text-muted-foreground">
          <input type="checkbox" v-model="remember" class="size-4 accent-foreground" />
          <span>Remember me</span>
        </label>
        <router-link to="/forgot-password" class="font-medium text-muted-foreground hover:text-foreground">Forgot password?</router-link>
      </div>

      <Button type="submit" size="lg" class="h-14 w-full text-base" :disabled="loading">
        {{ loading ? 'Signing in...' : 'Sign In' }}
      </Button>

      <div class="flex items-center gap-4 text-sm text-muted-foreground before:h-px before:flex-1 before:bg-border before:content-[''] after:h-px after:flex-1 after:bg-border after:content-['']"><span>or</span></div>

      <Button type="button" variant="outline" class="h-14 w-full text-base" @click="handleGoogleLogin">
        Continue with Google
      </Button>

      <p class="text-center text-base text-muted-foreground">
        <router-link to="/" class="font-medium text-foreground">← Back to Home</router-link>
      </p>
    </form>
  </AuthLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CircleX, Eye, EyeOff } from '@lucide/vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const remember = ref(false)
const loading = ref(false)
const error = ref('')

// Auto-login from the local dev-login script (scripts/login.sh).
// DEV-ONLY: import.meta.env.DEV is statically false in production builds, so
// Vite/Rollup tree-shakes this entire block out of the shipped bundle. Never
// remove the guard — without it, a link like /login?auto_token=<attacker JWT>
// would silently install an attacker-controlled session in a victim's browser.
onMounted(async () => {
  if (!import.meta.env.DEV) return
  const autoToken = route.query.auto_token
  if (autoToken) {
    authStore.accessToken = autoToken
    try {
      const session = await authStore.fetchSession()
      const next = session?.next_route
      if (next === 'onboarding') {
        router.replace('/dashboard')
      } else if (next === 'paywall') {
        router.replace('/paywall')
      } else {
        router.replace('/dashboard')
      }
    } catch {
      authStore.accessToken = null
    }
  }
})

async function handleLogin() {
  loading.value = true
  error.value = ''
  try {
    await authStore.login(email.value, password.value)
    const session = await authStore.fetchSession()
    const next = session?.next_route
    if (route.query.redirect) {
      router.push(route.query.redirect)
    } else if (next === 'onboarding') {
      router.push('/dashboard')
    } else if (next === 'paywall') {
      router.push('/paywall')
    } else {
      router.push('/dashboard')
    }
  } catch (e) {
    error.value = e.response?.data?.error?.message || e.message || 'Login failed.'
  } finally {
    loading.value = false
  }
}

function handleGoogleLogin() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) {
    error.value = 'Google sign-in is not configured on this deployment.'
    return
  }
  const state = crypto.randomUUID()
  sessionStorage.setItem('google-oauth-state', state)
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${window.location.origin}/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
  })
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}
</script>

<style scoped>
/* Use the same display font as the hero ("AI VISIBILITY, MEASURED.") across
   the sign-in form so the auth screen matches the landing page typography. */
.auth-form,
.auth-form :deep(input),
.auth-form :deep(button),
.auth-form :deep(label),
.auth-form :deep(a) {
  font-family: var(--font-display);
}
</style>
