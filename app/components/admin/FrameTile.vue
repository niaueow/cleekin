<script setup lang="ts">
import { Eye, EyeOff, Trash2 } from 'lucide-vue-next'

const props = defineProps<{ frame: AdminFrame, busy?: boolean }>()
defineEmits<{ open: [], delete: [], toggle: [] }>()

const date = computed(() => {
  const d = new Date(props.frame.createdAt)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
})
const visibility = computed(() => (props.frame.isActive ? 'Visible to visitors' : 'Hidden from visitors'))
</script>

<template>
  <article class="tile" :class="{ 'tile--inactive': !frame.isActive }">
    <button type="button" class="tile__open" :aria-label="`Open ${frame.name}`" @click="$emit('open')">
      <img :src="frame.imageUrl" alt="" class="tile__img" loading="lazy" decoding="async">
    </button>

    <button type="button" class="tile__icon tile__icon--delete" :aria-label="`Delete ${frame.name}`" title="Delete" :disabled="busy" @click="$emit('delete')">
      <Trash2 :size="22" aria-hidden="true" />
    </button>

    <button
      type="button"
      class="tile__icon tile__icon--eye"
      :class="{ 'tile__icon--off': !frame.isActive }"
      role="switch"
      :aria-checked="frame.isActive"
      :aria-label="`${frame.name}: ${visibility}`"
      :title="`${visibility}. Click to ${frame.isActive ? 'hide' : 'show'}.`"
      :disabled="busy"
      @click="$emit('toggle')"
    >
      <Eye v-if="frame.isActive" :size="22" aria-hidden="true" />
      <EyeOff v-else :size="22" aria-hidden="true" />
    </button>

    <div class="tile__info">
      <p class="tile__name outlined">{{ frame.name }}</p>
      <p class="tile__meta outlined">{{ date }}</p>
    </div>
  </article>
</template>

<style scoped>
.tile {
  position: relative;
  aspect-ratio: 3 / 4;
  border: 1px solid var(--c-black);
  border-radius: var(--radius-l);
  background: var(--c-placeholder-bg);
  overflow: hidden;
}

.tile__open {
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: zoom-in;
}

.tile__open:focus-visible { box-shadow: inset 0 0 0 4px var(--c-pink-dark); }

.tile__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.tile__open:hover .tile__img { transform: scale(1.02); }
.tile--inactive .tile__img { opacity: 0.55; }

.tile__icon {
  position: absolute;
  top: 24px;
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  padding: 0;
  border: 1px solid;
  border-radius: var(--radius-l);
  background: var(--c-white);
  transition: transform 0.12s ease;
}

.tile__icon:hover:not(:disabled) { transform: scale(1.08); }
.tile__icon:disabled { opacity: 0.5; }

.tile__icon--delete { left: 24px; border-color: var(--c-danger-border); color: var(--c-danger-border); }
.tile__icon--eye { right: 24px; border-color: var(--c-warning); color: var(--c-warning); }
.tile__icon--off { border-color: #8a8a8a; color: #6b6b6b; }

.tile__info {
  position: absolute;
  right: 24px;
  bottom: 24px;
  left: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px 24px;
  border: 1px solid var(--c-black);
  border-radius: var(--radius-l);
  background: var(--c-white);
  pointer-events: none;
}

.tile__name {
  --stroke: 2px;
  overflow: hidden;
  color: var(--c-pink-dark);
  font-size: 24px;
  line-height: 1.1;
  letter-spacing: 0.16em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tile__meta {
  --stroke: 1.5px;
  color: var(--c-blue);
  font-size: 14px;
  letter-spacing: 0.16em;
}

@media (max-width: 600px) {
  .tile__icon { top: 12px; width: 38px; height: 38px; }
  .tile__icon--delete { left: 12px; }
  .tile__icon--eye { right: 12px; }
  .tile__info { right: 10px; bottom: 10px; left: 10px; padding: 12px; gap: 8px; border-radius: var(--radius-m); }
  .tile__name { font-size: 16px; }
  .tile__meta { font-size: 11px; }
}
</style>
