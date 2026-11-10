<script setup lang="ts">
import { CameraOff } from 'lucide-vue-next'

const props = defineProps<{ problem: CameraProblem, retrying: boolean }>()
defineEmits<{ retry: [] }>()

const msg = computed(() => CAMERA_MESSAGES[props.problem])
</script>

<template>
  <div class="alert" role="alert">
    <CameraOff class="alert__icon" :size="28" aria-hidden="true" />
    <div class="alert__text">
      <p class="alert__title outlined">{{ msg.title }}</p>
      <p class="alert__body">{{ msg.body }}</p>
    </div>
    <AppButton v-if="problem !== 'in-app' && problem !== 'unsupported'" variant="secondary" :loading="retrying" class="alert__btn" @click="$emit('retry')">
      Try again
    </AppButton>
  </div>
</template>

<style scoped>
.alert {
  display: flex;
  align-items: center;
  gap: 16px;
  width: min(760px, 100%);
  margin: 0 auto;
  padding: 16px 20px;
  border-radius: var(--radius-m);
  background: var(--c-danger);
  color: var(--c-white);
  box-shadow: var(--shadow-modal);
}

.alert__icon { flex: none; }

.alert__text { flex: 1; min-width: 0; }

.alert__title {
  --stroke: 2px;
  font-size: 22px;
  letter-spacing: 0.1em;
}

.alert__body {
  margin-top: 4px;
  font-size: 14px;
  letter-spacing: 0.04em;
  line-height: 1.4;
}

.alert__btn { flex: none; }

@media (max-width: 600px) {
  .alert { flex-wrap: wrap; padding: 14px 16px; gap: 10px 12px; }
  .alert__title { font-size: 18px; }
  .alert__body { font-size: 13px; }
  .alert__btn { width: 100%; min-height: 44px; }
}
</style>
