<script setup lang="ts">
/**
 * Scales a fixed-ratio box to the largest size that fits its container.
 * The default slot receives `scale` (display px per source px).
 */
const props = defineProps<{ width: number, height: number }>()

const outer = ref<HTMLElement | null>(null)
const size = reactive({ w: 0, h: 0 })

function measure() {
  const el = outer.value
  if (!el) return
  const s = Math.min(el.clientWidth / props.width, el.clientHeight / props.height)
  size.w = Math.floor(props.width * s)
  size.h = Math.floor(props.height * s)
}

let ro: ResizeObserver | null = null
onMounted(() => {
  measure()
  ro = new ResizeObserver(measure)
  if (outer.value) ro.observe(outer.value)
})
onBeforeUnmount(() => ro?.disconnect())
watch(() => [props.width, props.height], measure)
</script>

<template>
  <div ref="outer" class="fit">
    <div v-if="size.w > 0" class="fit__inner" :style="{ width: `${size.w}px`, height: `${size.h}px` }">
      <slot :scale="size.w / width" />
    </div>
  </div>
</template>

<style scoped>
.fit {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.fit__inner {
  position: relative;
}
</style>
