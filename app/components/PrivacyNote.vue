<script setup lang="ts">
import { ShieldCheck } from 'lucide-vue-next'
</script>

<template>
  <p class="privacy">
    <ShieldCheck :size="18" aria-hidden="true" />
    <span>Your photos stay on your device. We never save them.</span>
  </p>
</template>

<style scoped>
.privacy {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--c-black);
  font-size: 14px;
  letter-spacing: 0.06em;
  text-align: center;
  opacity: 0.75;
}

.privacy svg { flex: none; color: var(--c-pink-dark); }
</style>
