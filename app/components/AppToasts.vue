<script setup lang="ts">
import { X } from 'lucide-vue-next'

const { toasts, dismiss } = useToast()
</script>

<template>
  <div class="toasts" aria-live="polite" aria-atomic="false">
    <TransitionGroup name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast"
        :class="`toast--${t.tone}`"
        :role="t.tone === 'error' ? 'alert' : 'status'"
      >
        <span class="toast__text" :class="{ outlined: t.tone === 'error' }">{{ t.message }}</span>
        <button class="toast__close" type="button" aria-label="Dismiss" @click="dismiss(t.id)">
          <X :size="18" aria-hidden="true" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  top: max(12px, env(safe-area-inset-top));
  left: 50%;
  z-index: 80;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(562px, calc(100% - 32px));
  transform: translateX(-50%);
  pointer-events: none;
  border: 3px solid var(--c-black);
}

.toast {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 8px 10px 20px;
  border-radius: var(--radius-m);
  box-shadow: var(--shadow-modal), 0 8px 24px rgba(0, 0, 0, 0.12);
  pointer-events: auto;
}

.toast--error {
  --stroke: 2px;
  background: var(--c-danger);
  color: var(--c-white);
}

.toast--info {
  border: 1px solid var(--c-black);
  background: var(--c-surface);
  color: var(--c-black);
}

.toast__text {
  flex: 1;
  font-size: 15px;
  line-height: 1.35;
  letter-spacing: 0.08em;
}

.toast__close {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
}

.toast-enter-active, .toast-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
