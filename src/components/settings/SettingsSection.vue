<template>
  <!-- One labelled settings group: an uppercase eyebrow, then a card whose
       head carries the title + one-line explanation, a hairline divider,
       and the control(s) below. Every settings page is built from these
       so the anatomy stays identical from section to section. -->
  <section class="sc-wrap">
    <p v-if="label" class="sc-label">{{ label }}</p>
    <div class="sc" :class="{ 'sc--danger': danger }">
      <div class="sc-head">
        <h3 class="sc-title">{{ title }}</h3>
        <p v-if="description" class="sc-desc">{{ description }}</p>
      </div>
      <div class="sc-body">
        <slot />
      </div>
      <div v-if="$slots.footer" class="sc-foot">
        <slot name="footer" />
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  /** Uppercase group eyebrow above the card (e.g. "Profile"). */
  label: { type: String, default: '' },
  /** Card heading. */
  title: { type: String, required: true },
  /** One plain sentence under the heading. */
  description: { type: String, default: '' },
  /** Destructive tone: the card border picks up the destructive colour. */
  danger: { type: Boolean, default: false },
})
</script>

<style scoped>
.sc-wrap { min-width: 0; }

.sc-label {
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted-foreground);
  user-select: none;
}

.sc {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--card);
  color: var(--card-foreground);
  box-shadow: var(--shadow-card, 0 1px 2px rgba(20, 20, 18, 0.04));
  padding: 22px 24px 24px;
}
.sc--danger { border-color: color-mix(in srgb, var(--destructive) 35%, transparent); }

.sc-head {
  padding-bottom: 18px;
  border-bottom: 1px solid var(--border);
}
.sc-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.35;
  color: var(--foreground);
}
.sc-desc {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--muted-foreground);
}

.sc-body { padding-top: 20px; }

.sc-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid var(--border);
}
</style>
