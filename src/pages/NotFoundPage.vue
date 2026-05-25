<template>
  <div class="flex min-h-screen items-center justify-center">
    <div class="flex flex-col items-center text-center">
      <div class="mb-5 text-muted-foreground"><SearchX :size="48" :stroke-width="1.5" /></div>
      <h1 class="mb-2 text-2xl font-bold text-foreground">Page Not Found</h1>
      <p class="mb-6 text-sm text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p>
      <Button @click="$router.push('/dashboard')">Go to Dashboard</Button>
    </div>
  </div>
</template>

<script setup>
import { Button } from '@/components/ui/button'
import { SearchX } from '@lucide/vue'
</script>
