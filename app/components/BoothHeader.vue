<script setup lang="ts">
defineProps<{ backLabel: string }>()
defineEmits<{ back: [] }>()
</script>

<template>
  <header class="bh">
    <AppLogo class="bh__logo" />
    <div class="bh__row">
      <AppButton variant="secondary" class="bh__back" @click="$emit('back')">{{ backLabel }}</AppButton>
      <div class="bh__tools"><slot /></div>
    </div>
  </header>
</template>

<style scoped>
.bh {
  padding: 60px var(--page-gutter) 0;
}

.bh__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 20px;
}

.bh__tools {
  display: flex;
  gap: 8px;
}

@media (max-width: 900px), (max-height: 820px) {
  .bh { padding-top: 20px; display: flex; align-items: center; gap: 16px; }
  .bh__logo { order: 2; margin: 0 auto; }
  .bh { --logo-size: 52px; }
  .bh__row { display: contents; }
  .bh__back { order: 1; }
  .bh__tools { order: 3; }
}

@media (max-width: 600px) {
  .bh { padding-top: 12px; gap: 8px; }
  .bh { --logo-size: 36px; }
  .bh__back { min-height: 44px; padding: 10px 12px; font-size: 15px; }
}
</style>
