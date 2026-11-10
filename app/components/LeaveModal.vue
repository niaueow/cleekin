<script setup lang="ts">
defineProps<{ open: boolean }>()
const emit = defineEmits<{ answer: [leave: boolean] }>()
</script>

<template>
  <ConfirmModal
    :open="open"
    title="Leave this photo session?"
    message="Your photos will disappear because we never save them."
    confirm-label="Leave"
    cancel-label="Stay"
    @confirm="emit('answer', true)"
    @cancel="emit('answer', false)"
  />
</template>
