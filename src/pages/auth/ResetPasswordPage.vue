<template>
  <AuthLayout title="Set a new password" subtitle="Choose a new password for your account.">
    <form @submit.prevent="handleSubmit" class="flex flex-col gap-[18px]">
      <Alert v-if="done">
        <CircleCheck />
        <AlertTitle>Password updated</AlertTitle>
        <AlertDescription>
          You can now sign in with your new password.
        </AlertDescription>
      </Alert>
      <Alert v-if="error" variant="destructive">
        <CircleX />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>{{ error }}</AlertDescription>
      </Alert>

      <template v-if="!done">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-foreground">New password</label>
          <input
            v-model="password"
            type="password"
            minlength="12"
            autocomplete="new-password"
            class="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="At least 12 characters"
            required
          />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-foreground">Confirm password</label>
          <input
            v-model="confirm"
            type="password"
            minlength="12"
            autocomplete="new-password"
            class="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Repeat the password"
            required
          />
        </div>
        <Button type="submit" size="lg" class="w-full" :disabled="loading || !token">
          {{ loading ? 'Saving...' : 'Reset Password' }}
        </Button>
      </template>

      <p class="text-center text-sm">
        <router-link to="/login" class="font-semibold text-foreground">← Back to login</router-link>
      </p>
    </form>
  </AuthLayout>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import authApi from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CircleCheck, CircleX } from '@lucide/vue'

const route = useRoute()
const token = route.query.token || ''
const password = ref('')
const confirm = ref('')
const loading = ref(false)
const error = ref('')
const done = ref(false)

onMounted(() => {
  if (!token) {
    error.value = 'This reset link is incomplete — request a new one from the sign-in page.'
  }
})

async function handleSubmit() {
  if (password.value !== confirm.value) {
    error.value = 'The passwords do not match.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await authApi.resetPassword({ token, new_password: password.value })
    done.value = true
  } catch (e) {
    error.value = e.response?.data?.error?.message
      || 'This reset link is invalid or has expired. Request a new one.'
  } finally {
    loading.value = false
  }
}
</script>
