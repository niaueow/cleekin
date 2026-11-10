<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'blue' | 'danger'
  type?: 'button' | 'submit'
  disabled?: boolean
  loading?: boolean
  to?: RouteLocationRaw
  iconOnly?: boolean
}>(), {
  variant: 'primary',
  type: 'button',
})

const isDisabled = computed(() => props.disabled || props.loading)
</script>

<template>
  <NuxtLink
    v-if="to && !isDisabled"
    :to="to"
    class="btn outlined"
    :class="[`btn--${variant}`, { 'btn--icon': iconOnly }]"
  >
    <slot name="icon" />
    <span v-if="$slots.default" class="btn__label"><slot /></span>
  </NuxtLink>
  <button
    v-else
    :type="type"
    class="btn outlined"
    :class="[`btn--${variant}`, { 'btn--icon': iconOnly, 'btn--loading': loading }]"
    :disabled="isDisabled"
    :aria-busy="loading || undefined"
  >
    <span v-if="loading" class="btn__spinner" aria-hidden="true" />
    <slot v-else name="icon" />
    <span v-if="$slots.default" class="btn__label"><slot /></span>
  </button>
</template>

<style scoped>
.btn {
  --stroke: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 53px;
  padding: 14px 16px;
  border: 3px solid var(--c-black);
  border-radius: var(--radius-m);
  color: var(--c-text-inverse);
  font-size: 20px;
  letter-spacing: 0.12em;
  line-height: 1;
  text-decoration: none;
  white-space: nowrap;
  user-select: none;
  transition: transform 0.12s ease, filter 0.12s ease, opacity 0.12s ease;
}

.btn:hover:not(:disabled) { filter: brightness(1.05); }
.btn:active:not(:disabled) { transform: scale(0.97); }
.btn:disabled { opacity: 0.45; }
.btn--loading:disabled { opacity: 0.8; }

.btn--primary { background: var(--c-pink-dark); }
.btn--secondary { background: var(--c-purple); }
.btn--blue { background: var(--c-blue); }
.btn--danger { background: var(--c-danger); }

.btn--icon { width: 53px; padding: 0; }

.btn :deep(svg) {
  flex: none;
  width: 24px;
  height: 24px;
  color: var(--c-black);
  stroke-width: 2;
  -webkit-text-stroke: 0;
}

.btn__spinner {
  width: 20px;
  height: 20px;
  border: 3px solid var(--c-text-inverse);
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 600px) {
  .btn { min-height: 48px; padding: 12px 14px; font-size: 17px; }
  .btn--icon { width: 48px; }
}
</style>
