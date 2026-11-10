<script setup lang="ts">
/** Pill switch matching Figma's bi:toggle icon (pink when on). */
defineProps<{ label: string }>()
const model = defineModel<boolean>({ required: true })
</script>

<template>
  <button type="button" class="toggle" role="switch" :aria-checked="model" :aria-label="label" @click="model = !model">
    <span class="toggle__knob" />
  </button>
</template>

<style scoped>
.toggle {
  position: relative;
  width: 52px;
  height: 30px;
  padding: 0;
  border: 2px solid var(--c-black);
  border-radius: 999px;
  background: var(--c-white);
  transition: background 0.15s ease;
}

.toggle[aria-checked='true'] { background: var(--c-pink-dark); }

.toggle__knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 22px;
  height: 22px;
  border: 2px solid var(--c-black);
  border-radius: 50%;
  background: var(--c-white);
  transition: transform 0.15s ease;
}

.toggle[aria-checked='true'] .toggle__knob { transform: translateX(22px); }
</style>
