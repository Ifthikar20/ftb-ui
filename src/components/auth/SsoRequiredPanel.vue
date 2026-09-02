<template>
  <div class="flex flex-col gap-4 rounded-xl border border-input bg-muted/30 p-5">
    <div class="flex items-start gap-3">
      <Building2 class="mt-0.5 size-5 shrink-0 text-muted-foreground" />
      <div>
        <p class="text-base font-semibold text-foreground">
          {{ orgName || 'Your organization' }} requires single sign-on
        </p>
        <p class="mt-1 text-sm text-muted-foreground">
          Password sign-in is turned off for
          <span class="font-medium text-foreground">@{{ domain }}</span>
          accounts. Use your company identity provider instead.
        </p>
      </div>
    </div>

    <Button
      v-if="methods.includes('google')"
      type="button"
      class="h-12 w-full text-base"
      @click="$emit('continue', 'google')"
    >
      Continue with Google
    </Button>

    <Button
      v-if="methods.includes('microsoft')"
      type="button"
      class="h-12 w-full text-base"
      @click="$emit('continue', 'microsoft')"
    >
      Continue with Microsoft
    </Button>

    <Button
      v-if="methods.includes('saml')"
      type="button"
      class="h-12 w-full text-base"
      @click="$emit('continue', 'saml')"
    >
      Continue with company SSO
    </Button>

    <button
      type="button"
      class="text-sm font-medium text-muted-foreground underline hover:text-foreground"
      @click="$emit('reset')"
    >
      Use a different email
    </button>
  </div>
</template>

<script setup>
import { Button } from '@/components/ui/button'
import { Building2 } from '@lucide/vue'

defineProps({
  domain: { type: String, default: '' },
  orgName: { type: String, default: '' },
  email: { type: String, default: '' },
  methods: { type: Array, default: () => ['google'] },
})

defineEmits(['continue', 'reset'])
</script>
