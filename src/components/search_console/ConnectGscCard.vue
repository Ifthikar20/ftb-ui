<template>
  <Card class="max-w-2xl mx-auto">
    <CardHeader>
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Search class="h-5 w-5 text-primary" />
        </div>
        <div>
          <CardTitle>Connect Google Search Console</CardTitle>
          <CardDescription>
            Pull real Google ranking data: queries, clicks, impressions, and positions.
          </CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent class="space-y-4">
      <ul class="space-y-2 text-sm text-muted-foreground">
        <li class="flex items-start gap-2">
          <Check class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>See which Google searches bring visitors to your site, updated nightly.</span>
        </li>
        <li class="flex items-start gap-2">
          <Check class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>Track average position and click-through rate per query and page.</span>
        </li>
        <li class="flex items-start gap-2">
          <Check class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>Feed real search demand into your prompt library for AI visibility audits.</span>
        </li>
        <li class="flex items-start gap-2">
          <Lock class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span>Read-only access. FetchBot can never change anything in your Search Console.</span>
        </li>
      </ul>
      <div class="flex items-center gap-3 pt-2">
        <Button :disabled="connecting" @click="$emit('connect')">
          {{ connecting ? 'Redirecting to Google...' : 'Connect with Google' }}
        </Button>
        <span class="text-xs text-muted-foreground">
          You will be asked to grant the webmasters.readonly permission.
        </span>
      </div>
    </CardContent>
  </Card>
</template>

<script setup>
import { Check, Lock, Search } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

defineProps({
  connecting: { type: Boolean, default: false },
})
defineEmits(['connect'])
</script>
