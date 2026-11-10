<script setup lang="ts">
withDefaults(defineProps<{ to?: string }>(), { to: '/' })

const letters = ['c', 'l', 'e', 'e', 'k', 'i', 'n']
</script>

<template>
  <NuxtLink :to="to" class="logo outlined" aria-label="Cleekin home">
    <span
      v-for="(ch, i) in letters"
      :key="i"
      aria-hidden="true"
      :style="{ color: i % 2 ? 'var(--c-pink)' : 'var(--c-blue)' }"
    >{{ ch }}</span>
  </NuxtLink>
</template>

<style scoped>
/* Size comes from --logo-size (set per breakpoint in main.css; parents may override). */
.logo {
  --stroke: calc(var(--logo-size) / 24);
  display: inline-block;
  font-size: var(--logo-size);
  line-height: 1;
  letter-spacing: 0.08em;
  text-decoration: none;
  white-space: nowrap;
}
</style>
