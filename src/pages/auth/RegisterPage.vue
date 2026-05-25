<template>
  <AuthLayout title="Create your account" subtitle="Start your free 7-day trial — no credit card required.">
    <form @submit.prevent="handleRegister" class="flex flex-col gap-[18px]">
      <div v-if="error" class="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{{ error }}</div>

      <!-- ── Trial Banner ── -->
      <div class="flex items-center gap-3.5 rounded-xl border border-[color:var(--chart-4)]/15 bg-[color:var(--chart-4)]/[0.07] px-[18px] py-3.5">
        <div class="shrink-0 text-2xl">🚀</div>
        <div class="text-sm font-semibold leading-relaxed text-foreground">
          <strong>7 days free</strong> — full access to all features.
          <span class="mt-px block text-xs font-normal text-muted-foreground">No commitment. Cancel anytime.</span>
        </div>
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-foreground">Full Name</label>
        <input v-model="fullName" class="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Jane Doe" required />
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-foreground">Email</label>
        <input v-model="email" type="email" class="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="you@company.com" required />
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-foreground">Password</label>
        <div class="relative flex">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            class="h-9 w-full rounded-lg border border-input bg-background pl-3 pr-11 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Min 12 characters"
            required
            autocomplete="new-password"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            :aria-pressed="showPassword"
            @click="showPassword = !showPassword"
          >
            <EyeOff v-if="showPassword" class="size-[18px]" />
            <Eye v-else class="size-[18px]" />
          </Button>
        </div>
      </div>

      <Button type="submit" size="lg" class="w-full" :disabled="loading">
        {{ loading ? 'Creating...' : 'Start Free Trial' }}
      </Button>

      <p class="-mt-1.5 text-center text-xs leading-relaxed text-muted-foreground">
        By signing up you agree to our <a href="/terms" target="_blank" class="text-muted-foreground underline underline-offset-2">Terms</a> and <a href="/privacy" target="_blank" class="text-muted-foreground underline underline-offset-2">Privacy Policy</a>.
      </p>

      <p class="text-center text-sm text-muted-foreground">
        Already have an account? <router-link to="/login" class="font-semibold text-foreground">Sign in</router-link>
      </p>
    </form>
  </AuthLayout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff } from '@lucide/vue'

const router = useRouter()
const authStore = useAuthStore()

const fullName = ref('')
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

async function handleRegister() {
  loading.value = true
  error.value = ''
  try {
    await authStore.register({
      full_name: fullName.value,
      email: email.value,
      password: password.value,
      segment: 'individual',  // Everyone starts as individual
    })
    router.push({ path: '/verify-email', query: { email: email.value } })
  } catch (e) {
    error.value = e.response?.data?.error?.message || e.message || 'Registration failed.'
  } finally {
    loading.value = false
  }
}
</script>
