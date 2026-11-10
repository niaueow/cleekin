<script setup lang="ts">
import { Camera, Move } from 'lucide-vue-next'
import { clampPhoto, photoRect, type Photo } from '~/utils/photo'

const props = defineProps<{
  frame: PublicFrame
  frameSrc: string
  photos: (Photo | null)[]
  targetIndex: number | null
  selectedIndex: number | null
  stream: MediaStream | null
  mirrored: boolean
  countdown: number | null
  flash: boolean
  locked: boolean
}>()

const emit = defineEmits<{
  'slot-click': [index: number]
  'update-photo': [index: number, photo: Photo]
}>()

const video = ref<HTMLVideoElement | null>(null)

watch([video, () => props.stream], ([el, stream]) => {
  if (!el) return
  if (el.srcObject !== stream) el.srcObject = stream
  if (stream) el.play().catch(() => {})
}, { immediate: true })

const pct = (v: number, total: number) => `${(v / total) * 100}%`

function slotStyle(slot: Slot) {
  const { width: W, height: H } = props.frame
  return { left: pct(slot.x, W), top: pct(slot.y, H), width: pct(slot.w, W), height: pct(slot.h, H) }
}

function photoStyle(slot: Slot, photo: Photo) {
  const r = photoRect(slot, photo)
  return {
    left: pct(r.x - slot.x, slot.w),
    top: pct(r.y - slot.y, slot.h),
    width: pct(r.w, slot.w),
    height: pct(r.h, slot.h),
  }
}

function slotLabel(i: number) {
  const photo = props.photos[i]
  const n = `Photo ${i + 1}`
  if (!photo) return i === props.targetIndex ? `${n}, next to capture` : `${n}, empty`
  return props.selectedIndex === i ? `${n}, selected` : `${n}, taken. Tap to select`
}

/* Pan and zoom for uploaded photos (only on the selected slot). */
const pointers = new Map<number, { x: number, y: number }>()
let gesture: { index: number, scale: number, startX: number, startY: number, moved: boolean, pinchDist: number } | null = null

function canAdjust(i: number) {
  return !props.locked && props.selectedIndex === i && props.photos[i]?.source === 'upload'
}

function onPointerDown(e: PointerEvent, i: number, scale: number) {
  if (props.locked) return
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (pointers.size === 1) {
    gesture = { index: i, scale, startX: e.clientX, startY: e.clientY, moved: false, pinchDist: 0 }
  } else if (pointers.size === 2 && gesture) {
    const [a, b] = [...pointers.values()]
    gesture.pinchDist = Math.hypot(a!.x - b!.x, a!.y - b!.y)
    gesture.moved = true
  }
}

function onPointerMove(e: PointerEvent) {
  const prev = pointers.get(e.pointerId)
  if (!prev || !gesture) return
  const next = { x: e.clientX, y: e.clientY }
  pointers.set(e.pointerId, next)
  if (Math.hypot(e.clientX - gesture.startX, e.clientY - gesture.startY) > 5) gesture.moved = true
  const i = gesture.index
  const photo = props.photos[i]
  const slot = props.frame.slots[i]
  if (!photo || !slot || !canAdjust(i)) return

  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y)
    if (gesture.pinchDist > 0) {
      emit('update-photo', i, clampPhoto(slot, { ...photo, zoom: photo.zoom * (dist / gesture.pinchDist) }))
    }
    gesture.pinchDist = dist
    return
  }
  const dx = (next.x - prev.x) / gesture.scale
  const dy = (next.y - prev.y) / gesture.scale
  emit('update-photo', i, clampPhoto(slot, { ...photo, panX: photo.panX + dx, panY: photo.panY + dy }))
}

function onPointerUp(e: PointerEvent, i: number) {
  pointers.delete(e.pointerId)
  if (pointers.size > 0) return
  const wasTap = gesture && !gesture.moved
  gesture = null
  if (wasTap) emit('slot-click', i)
}

function onWheel(e: WheelEvent, i: number) {
  if (!canAdjust(i)) return
  e.preventDefault()
  const photo = props.photos[i]!
  const slot = props.frame.slots[i]!
  emit('update-photo', i, clampPhoto(slot, { ...photo, zoom: photo.zoom * Math.exp(-e.deltaY * 0.0015) }))
}

function onKeydown(e: KeyboardEvent, i: number) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    if (!props.locked) emit('slot-click', i)
    return
  }
  if (!canAdjust(i)) return
  const photo = props.photos[i]!
  const slot = props.frame.slots[i]!
  const step = slot.w * 0.03
  const moves: Record<string, Partial<Photo>> = {
    ArrowLeft: { panX: photo.panX - step },
    ArrowRight: { panX: photo.panX + step },
    ArrowUp: { panY: photo.panY - step },
    ArrowDown: { panY: photo.panY + step },
    '+': { zoom: photo.zoom * 1.1 },
    '=': { zoom: photo.zoom * 1.1 },
    '-': { zoom: photo.zoom / 1.1 },
  }
  const change = moves[e.key]
  if (!change) return
  e.preventDefault()
  emit('update-photo', i, clampPhoto(slot, { ...photo, ...change }))
}
</script>

<template>
  <FitBox :width="frame.width" :height="frame.height" class="stage">
    <template #default="{ scale }">
      <div class="stage__frame">
        <!-- Photos sit under the frame; the frame's transparent windows show them. -->
        <div
          v-for="(slot, i) in frame.slots"
          :key="i"
          class="slot"
          :class="{ 'slot--adjustable': canAdjust(i), 'slot--locked': locked }"
          :style="slotStyle(slot)"
          role="button"
          :tabindex="locked ? -1 : 0"
          :aria-label="slotLabel(i)"
          :aria-pressed="selectedIndex === i"
          @pointerdown="onPointerDown($event, i, scale)"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp($event, i)"
          @pointercancel="onPointerUp($event, i)"
          @wheel="onWheel($event, i)"
          @keydown="onKeydown($event, i)"
        >
          <img
            v-if="photos[i]"
            :src="photos[i]!.url"
            alt=""
            class="slot__photo"
            :style="photoStyle(slot, photos[i]!)"
            draggable="false"
          >
          <div v-else-if="i !== targetIndex || !stream" class="slot__empty">
            <Camera v-if="i === targetIndex" :size="Math.max(20, slot.w * scale * 0.18)" aria-hidden="true" />
          </div>
        </div>

        <video
          v-show="stream && targetIndex !== null"
          ref="video"
          class="video"
          :class="{ 'video--mirrored': mirrored }"
          :style="targetIndex !== null && frame.slots[targetIndex] ? slotStyle(frame.slots[targetIndex]!) : {}"
          autoplay
          muted
          playsinline
          aria-hidden="true"
        />

        <img :src="frameSrc" :alt="frame.name" class="stage__art" crossorigin="anonymous" draggable="false">

        <!-- Overlays drawn above the frame art. -->
        <div
          v-for="(slot, i) in frame.slots"
          :key="`o${i}`"
          class="overlay"
          :class="{
            'overlay--selected': selectedIndex === i,
            'overlay--target': i === targetIndex && selectedIndex !== i,
          }"
          :style="slotStyle(slot)"
          aria-hidden="true"
        >
          <span v-if="!photos[i] && i !== targetIndex" class="overlay__num outlined">{{ i + 1 }}</span>
          <span v-if="canAdjust(i)" class="overlay__hint"><Move :size="14" /> Drag or pinch</span>
          <Transition name="count">
            <span v-if="countdown !== null && i === targetIndex" :key="countdown" class="overlay__count outlined" :style="{ fontSize: `${Math.min(slot.w, slot.h) * scale * 0.5}px` }">{{ countdown }}</span>
          </Transition>
        </div>

        <div v-if="flash" class="flash" />
      </div>
    </template>
  </FitBox>
</template>

<style scoped>
.stage__frame {
  position: absolute;
  inset: 0;
  filter: drop-shadow(0 20px 25px rgba(0, 0, 0, 0.12)) drop-shadow(0 0 15px rgba(0, 0, 0, 0.12));
}

.stage__art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  user-select: none;
}

.slot {
  position: absolute;
  overflow: hidden;
  background: var(--c-placeholder-bg);
  cursor: pointer;
  touch-action: manipulation;
}

.slot--adjustable { cursor: grab; touch-action: none; }
.slot--adjustable:active { cursor: grabbing; }
.slot--locked { cursor: default; }
.slot:focus-visible { box-shadow: none; outline: 3px solid var(--c-pink-dark); outline-offset: -3px; }

.slot__photo {
  position: absolute;
  max-width: none;
  pointer-events: none;
  user-select: none;
}

.slot__empty {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: #8a8a8a;
}

.video {
  position: absolute;
  object-fit: cover;
  background: var(--c-placeholder-bg);
  pointer-events: none;
}

.video--mirrored { transform: scaleX(-1); }

.overlay {
  position: absolute;
  display: grid;
  place-items: center;
  pointer-events: none;
}

.overlay--selected { box-shadow: inset 0 0 0 4px var(--c-pink-dark); }
.overlay--target { box-shadow: inset 0 0 0 3px var(--c-blue); }

.overlay__num {
  --stroke: 3px;
  color: var(--c-white);
  font-size: clamp(18px, 3vw, 32px);
  opacity: 0.9;
}

.overlay__hint {
  position: absolute;
  bottom: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(26, 26, 26, 0.7);
  color: var(--c-white);
  font-size: 11px;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.overlay__count {
  --stroke: 4px;
  position: absolute;
  color: var(--c-white);
  line-height: 1;
}

.count-enter-active { transition: transform 0.35s cubic-bezier(0.2, 1.6, 0.4, 1), opacity 0.2s ease; }
.count-leave-active { transition: opacity 0.15s ease; }
.count-enter-from { transform: scale(0.4); opacity: 0; }
.count-leave-to { opacity: 0; }

.flash {
  position: absolute;
  inset: 0;
  background: var(--c-white);
  animation: flash 0.45s ease-out forwards;
  pointer-events: none;
}

@keyframes flash { from { opacity: 0.95; } to { opacity: 0; } }
</style>
