<script setup lang="ts">
/**
 * Accessible modal. Desktop: centered card over a dimmed backdrop.
 * `fullscreenOnMobile` turns it into a full-screen sheet under 600px.
 */
const props = withDefaults(defineProps<{
  open: boolean
  labelledby?: string
  label?: string
  width?: string
  dismissible?: boolean
  fullscreenOnMobile?: boolean
  bare?: boolean
}>(), { width: '492px', dismissible: true })

const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement | null>(null)
let lastFocused: HTMLElement | null = null

function onKeydown(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape' && props.dismissible) {
    e.stopPropagation()
    emit('close')
  }
  if (e.key === 'Tab' && panel.value) {
    const focusables = panel.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (!focusables.length) return
    const first = focusables[0]!
    const last = focusables[focusables.length - 1]!
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }
}

watch(() => props.open, async (open) => {
  if (open) {
    lastFocused = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    await nextTick()
    const target = panel.value?.querySelector<HTMLElement>('[autofocus], [data-autofocus]')
      ?? panel.value?.querySelector<HTMLElement>('button, input')
    target?.focus()
  } else {
    document.body.style.overflow = ''
    lastFocused?.focus?.()
  }
})

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal" :class="{ 'modal--full': fullscreenOnMobile }" @click.self="dismissible && emit('close')">
        <div
          ref="panel"
          class="modal__panel"
          :class="{ 'modal__panel--bare': bare }"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="labelledby"
          :aria-label="label"
          :style="{ '--modal-width': width }"
        >
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(26, 26, 26, 0.55);
  overflow-y: auto;
  border: 3px solid var(--c-black);
}

.modal__panel {
  width: min(var(--modal-width), 100%);
  padding: 24px;
  background: var(--c-surface);
  border-radius: var(--radius-m);
  box-shadow: var(--shadow-modal);
}

.modal__panel--bare {
  padding: 0;
  background: transparent;
  box-shadow: none;
}

@media (max-width: 600px) {
  .modal--full { padding: 0; }
  .modal--full .modal__panel {
    width: 100%;
    min-height: 100dvh;
    border-radius: 0;
  }
}

.modal-enter-active, .modal-leave-active { transition: opacity 0.18s ease; }
.modal-enter-active .modal__panel, .modal-leave-active .modal__panel { transition: transform 0.18s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal__panel, .modal-leave-to .modal__panel { transform: scale(0.96); }
</style>
