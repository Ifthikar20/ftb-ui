<template>
  <AuthLayout title="Verify your email" :subtitle="`Enter the 6-digit code sent to ${email}`">
    <form @submit.prevent="handleVerify" class="flex flex-col gap-[18px]">
      <Alert v-if="error" variant="destructive">
        <CircleX />
        <AlertTitle>Verification failed</AlertTitle>
        <AlertDescription>{{ error }}</AlertDescription>
      </Alert>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-foreground">Verification Code</label>
        <input v-model="otp" class="h-12 w-full rounded-lg border border-input bg-background px-3 text-center text-2xl font-bold tracking-[0.4em] outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="000000" maxlength="6" required />
      </div>

      <Button type="submit" size="lg" class="w-full" :disabled="loading">
        {{ loading ? 'Verifying...' : 'Verify Email' }}
      </Button>

      <p class="text-center text-sm text-muted-foreground">
        Didn't receive the code?
        <Button type="button" variant="link" class="h-auto px-1 py-0 font-semibold text-foreground" @click="handleResend" :disabled="resending">
          {{ resending ? 'Sending...' : 'Resend code' }}
        </Button>
      </p>
    </form>
  </AuthLayout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import authApi from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CircleX } from '@lucide/vue'

const router = useRouter()
const route = useRoute()
const email = ref(route.query.email || '')
const otp = ref('')
const loading = ref(false)
const resending = ref(false)
const error = ref('')

async function handleVerify() {
  loading.value = true
  error.value = ''
  try {
    await authApi.verifyEmail(email.value, otp.value)
    router.push('/login')
  } catch (e) {
    error.value = e.response?.data?.error?.message || 'Invalid or expired code.'
  } finally {
    loading.value = false
  }
}

async function handleResend() {
  resending.value = true
  try {
    await authApi.resendVerification(email.value)
  } catch {}
  resending.value = false
}
</script>
