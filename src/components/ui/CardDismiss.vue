<script setup>
/**
 * Standard dismiss control for a dashboard card.
 *
 * Belongs INSIDE `CardHeader`, as the last child of the header row — not
 * absolutely positioned over the card. Sitting in the flex row is what keeps
 * it on the title's baseline no matter what else the header carries, and lets
 * it sit beside a badge or a caption instead of on top of one.
 *
 * Always visible rather than revealed on hover: a hover-only control is
 * undiscoverable and unreachable on touch.
 */
defineProps({
  /** Card title, used to build an accessible name ("Remove Top Pages"). */
  label: { type: String, default: '' },
  /**
   * For cards with no header row to join — a bare stat tile, or a card whose
   * body is its own component. Pins to the top-right of the nearest
   * positioned ancestor, inset to match the card's own padding rather than
   * hugging the border radius.
   */
  floating: { type: Boolean, default: false },
})
defineEmits(['dismiss'])
</script>

<template>
  <button
    type="button"
    class="card-dismiss"
    :class="{ 'is-floating': floating }"
    :aria-label="label ? `Remove ${label}` : 'Remove card'"
    :title="label ? `Remove ${label}` : 'Remove card'"
    @click="$emit('dismiss')"
  >
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"
         stroke-width="1.75" stroke-linecap="round" aria-hidden="true">
      <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
    </svg>
  </button>
</template>

<style scoped>
.card-dismiss {
  /* -6px right pulls the 28px hit area out to the header's padding edge, so
     the icon optically aligns with the card's right margin while the target
     stays comfortably large. Vertical centring is the header row's job
     (align-items: center), not a negative margin here. */
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin: 0 -6px 0 0;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm, 6px);
  background: transparent;
  color: var(--muted-foreground);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.card-dismiss:hover {
  background: var(--muted);
  color: var(--foreground);
}
.card-dismiss:focus-visible {
  outline: 2px solid var(--ring, var(--foreground));
  outline-offset: 2px;
}

/* 12px inset matches the stat tile's own padding, so the control lines up
   with the content edge instead of sitting on the corner radius. */
.card-dismiss.is-floating {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  margin: 0;
}
</style>
