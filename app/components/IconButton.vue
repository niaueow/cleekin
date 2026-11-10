<script setup lang="ts">
defineProps<{ label: string, pressed?: boolean }>()
</script>

<template>
  <button type="button" class="icon-btn" :aria-label="label" :title="label" :aria-pressed="pressed">
    <slot />
  </button>
</template>

<style scoped>
.icon-btn {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid var(--c-black);
  border-radius: 50%;
  background: var(--c-white);
  color: var(--c-black);
  transition: transform 0.12s ease, background 0.12s ease;
}

.icon-btn:hover { background: var(--c-light-pink); }
.icon-btn:active { transform: scale(0.94); }
.icon-btn :deep(svg) { width: 22px; height: 22px; }
</style>
