<script setup lang="ts">
import { Check } from 'lucide-vue-next'

defineProps<{ frame: PublicFrame, selected: boolean }>()
defineEmits<{ select: [] }>()
</script>

<template>
  <button
    type="button"
    class="card"
    :class="{ 'card--selected': selected }"
    :aria-pressed="selected"
    :aria-label="`${frame.name}, ${frame.slots.length} photo${frame.slots.length === 1 ? '' : 's'}`"
    @click="$emit('select')"
  >
    <img :src="frame.imageUrl" :alt="''" class="card__img" loading="lazy" decoding="async" draggable="false">
    <span v-if="selected" class="card__check" aria-hidden="true"><Check :size="22" :stroke-width="3" /></span>
  </button>
</template>

<style scoped>
.card {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4;
  padding: 0;
  border: 1px solid var(--c-black);
  border-radius: var(--radius-l);
  background: var(--c-white);
  box-shadow: var(--shadow-card);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.card:hover { transform: translateY(-4px); }

.card--selected {
  box-shadow: 0 0 0 4px var(--c-pink-dark), var(--shadow-card);
  transform: translateY(-4px);
}

.card:focus-visible { box-shadow: var(--focus-ring), var(--shadow-card); }
.card--selected:focus-visible { box-shadow: 0 0 0 4px var(--c-pink-dark), 0 0 0 7px var(--c-white), 0 0 0 10px var(--c-pink-dark); }

.card__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: calc(var(--radius-l) - 1px);
  pointer-events: none;
}

.card__check {
  position: absolute;
  top: -12px;
  right: -12px;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--c-black);
  border-radius: 50%;
  background: var(--c-pink-dark);
  color: var(--c-white);
}
</style>
