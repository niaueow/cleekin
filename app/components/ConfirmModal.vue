<script setup lang="ts">
/** Figma's confirm modal: pink title, Cancel (blue) on the left, action on the right. */
withDefaults(defineProps<{
  open: boolean
  title: string
  message?: string
  warning?: string
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
  loading?: boolean
}>(), { cancelLabel: 'Cancel', danger: true })

const emit = defineEmits<{ confirm: [], cancel: [] }>()
const titleId = useId()
</script>

<template>
  <AppModal :open="open" :labelledby="titleId" :dismissible="!loading" @close="emit('cancel')">
    <div class="confirm">
      <h2 :id="titleId" class="confirm__title outlined">{{ title }}</h2>
      <p v-if="message" class="confirm__message">{{ message }}</p>
      <p v-if="warning" class="confirm__warning" role="note">{{ warning }}</p>
      <div class="confirm__actions">
        <AppButton variant="blue" :disabled="loading" data-autofocus @click="emit('cancel')">{{ cancelLabel }}</AppButton>
        <AppButton :variant="danger ? 'danger' : 'primary'" :loading="loading" @click="emit('confirm')">{{ confirmLabel }}</AppButton>
      </div>
    </div>
  </AppModal>
</template>

<style scoped>
.confirm {
  display: flex;
  flex-direction: column;
  gap: 24px;
  text-align: center;
}

.confirm__title {
  --stroke: 3px;
  color: var(--c-pink-dark);
  font-size: 32px;
  line-height: 1.1;
  letter-spacing: 0.12em;
  overflow-wrap: anywhere;
}

.confirm__message {
  color: var(--c-black);
  font-size: 16px;
  letter-spacing: 0.08em;
}

.confirm__warning {
  padding: 12px 16px;
  border: 1px solid var(--c-danger-border);
  border-radius: var(--radius-s);
  background: #fff1f1;
  color: var(--c-danger-border);
  font-size: 14px;
  letter-spacing: 0.06em;
  text-align: left;
}

.confirm__actions {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-top: 8px;
}

@media (max-width: 600px) {
  .confirm__title { font-size: 24px; }
}
</style>
