<script setup lang="ts">
const unsupported = ref(false)

onMounted(() => {
  // Features the booth relies on. Browsers older than ~2 years miss at least one.
  unsupported.value = !(
    'aspectRatio' in document.documentElement.style
    && typeof createImageBitmap === 'function'
    && typeof structuredClone === 'function'
    && CSS.supports('height', '100dvh')
  )
})
</script>

<template>
  <div v-if="unsupported" class="unsupported">
    <AppLogo />
    <p class="unsupported__text">Your browser is too old for Cleekin. Update it, or open this page in the latest Chrome or Safari.</p>
  </div>
  <template v-else>
    <NuxtPage />
    <AppToasts />
  </template>
</template>

<style scoped>
.unsupported {
  display: grid;
  gap: 24px;
  place-content: center;
  min-height: 100vh;
  padding: 24px;
  text-align: center;
}

.unsupported__text {
  max-width: 480px;
  font-size: 20px;
}
</style>
