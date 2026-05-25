<template>
  <AuthLayout title="Forgot password?" subtitle="Enter your email and we'll send you a reset link.">
    <form @submit.prevent="handleReset" class="flex flex-col gap-[18px]">
      <div v-if="success" class="rounded-lg border border-[color:var(--chart-2)]/20 bg-[color:var(--chart-2)]/10 px-4 py-3 text-sm font-medium text-[color:var(--chart-2)]">{{ success }}</div>
      <div v-if="error" class="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{{ error }}</div>

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
import AuthLayout from '@/layouts/AuthLayout.vue'
import authApi from '@/api/auth'
import { Button } from '@/components/ui/button'

const email = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')

async function handleReset() {
  loading.value = true
  error.value = ''
  success.value = ''
  try {
    await authApi.forgotPassword(email.value)
    success.value = 'If an account exists with that email, a reset link has been sent.'
  } catch (e) {
    error.value = e.response?.data?.error?.message || 'Something went wrong.'
  } finally {
    loading.value = false
  }
}
</script>
