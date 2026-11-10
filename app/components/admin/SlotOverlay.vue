<script setup lang="ts">
/** Numbered dashed outlines over each detected slot. Sits on top of a frame image of the same box. */
const props = defineProps<{ width: number, height: number, slots: Slot[] }>()
const pct = (v: number, total: number) => `${(v / total) * 100}%`
</script>

<template>
  <div class="slots" aria-hidden="true">
    <div
      v-for="(s, i) in props.slots"
      :key="i"
      class="slots__box"
      :style="{ left: pct(s.x, width), top: pct(s.y, height), width: pct(s.w, width), height: pct(s.h, height) }"
    >
      <span class="slots__num">{{ i + 1 }}</span>
    </div>
  </div>
</template>

<style scoped>
.slots {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.slots__box {
  position: absolute;
  display: grid;
  place-items: center;
  border: 2px dashed var(--c-pink-dark);
  background: rgba(246, 117, 164, 0.18);
}

.slots__num {
  display: grid;
  place-items: center;
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border: 1px solid var(--c-black);
  border-radius: 999px;
  background: var(--c-pink-dark);
  color: var(--c-white);
  font-size: 14px;
  letter-spacing: 0;
}
</style>
