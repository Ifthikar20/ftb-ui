<template>
  <AuthLayout title="Forgot password?" subtitle="Enter your email and we'll send you a reset link.">
    <SsoRequiredPanel
      v-if="ssoRequired"
      :domain="ssoRequired.domain"
      :org-name="ssoRequired.org_name"
      :email="email"
      :methods="ssoRequired.methods || ['google']"
      @continue="goToLogin"
      @reset="ssoRequired = null"
    />
    <form v-else @submit.prevent="handleReset" class="flex flex-col gap-[18px]">
      <Alert v-if="success">
        <CircleCheck />
        <AlertTitle>Check your inbox</AlertTitle>
        <AlertDescription>{{ success }}</AlertDescription>
      </Alert>
      <Alert v-if="error" variant="destructive">
        <CircleX />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>{{ error }}</AlertDescription>
      </Alert>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-foreground">Email</label>
        <input v-model="email" type="email" class="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="you@company.com" required />
      </div>

      <Button type="submit" size="lg" class="w-full" :disabled="loading">
        {{ loading ? 'Sending...' : 'Send Reset Link' }}
      </Button>

      <p class="text-center text-sm">
        <router-link to="/login" class="font-semibold text-foreground">← Back to login</router-link>
      </p>
    </form>
  </AuthLayout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import SsoRequiredPanel from '@/components/auth/SsoRequiredPanel.vue'
import authApi from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CircleCheck, CircleX } from '@lucide/vue'

const router = useRouter()
const email = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')
const ssoRequired = ref(null)

async function handleReset() {
  loading.value = true
  error.value = ''
  success.value = ''
  try {
    // The serializer expects {email} — passing the bare string used to
    // 400 on every request.
    await authApi.forgotPassword({ email: email.value })
    success.value = 'If an account exists with that email, a reset link has been sent.'
  } catch (e) {
    const err = e.response?.data?.error
    if (err?.code === 'sso_required') {
      ssoRequired.value = err.details || {}
      return
    }
    error.value = err?.message || 'Something went wrong.'
  } finally {
    loading.value = false
  }
}

function goToLogin() {
  // The login page owns the Google redirect plumbing; hand off there.
  router.push({ name: 'login' })
}
</script>
