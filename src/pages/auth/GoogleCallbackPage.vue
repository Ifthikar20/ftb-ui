<template>
  <AuthLayout>
    <div class="flex flex-col items-center gap-4 py-16 text-center">
      <template v-if="!failed">
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground"></div>
        <p class="text-base text-muted-foreground">Signing you in with Google...</p>
      </template>
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

const failed = ref(false)
const message = ref('')

function fail(text) {
  failed.value = true
  message.value = text
}

onMounted(async () => {
  const { code, state, error } = route.query

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
  if (!expectedState || state !== expectedState) {
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
  } catch {
    fail('Google sign-in failed. Please try again.')
  }
})
</script>
