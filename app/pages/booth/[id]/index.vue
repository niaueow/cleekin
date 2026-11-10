<script setup lang="ts">
import { Check, RefreshCw, CloudUpload, SwitchCamera, Volume2, VolumeX, ZoomIn, ZoomOut, X } from 'lucide-vue-next'
import { captureFromVideo, clampPhoto, photoFromFile, PhotoFileError, type Photo } from '~/utils/photo'

const route = useRoute()
const id = String(route.params.id)
const toast = useToast()

/* ---------- Frame ---------- */
const frame = ref<PublicFrame | null>(null)
const frameSrc = ref('')
const loadState = ref<'loading' | 'ready' | 'missing' | 'error'>('loading')
useHead({ title: computed(() => (frame.value ? `Cleekin · ${frame.value.name}` : 'Cleekin')) })

async function loadFrame() {
  // Coming back from the result screen: reuse what's already loaded.
  const s = booth.session
  if (s.frame?.id === id && s.frameSrc) {
    frame.value = s.frame
    frameSrc.value = s.frameSrc
    loadState.value = 'ready'
    void camera.start()
    return
  }
  loadState.value = 'loading'
  try {
    const f = await $fetch<PublicFrame>(`/api/frames/${id}`)
    const img = await loadFrameImage(f)
    frame.value = f
    frameSrc.value = img.src
    booth.open(f, img.src)
    loadState.value = 'ready'
    void camera.start()
  } catch (err) {
    loadState.value = (err as { statusCode?: number })?.statusCode === 404 ? 'missing' : 'error'
  }
}

/* ---------- Session + camera ---------- */
const booth = useBoothSession()
const photos = computed(() => booth.session.photos)
const camera = useCamera()

const selectedIndex = ref<number | null>(null)
const retakeIndex = ref<number | null>(null)

const targetIndex = computed<number | null>(() => {
  if (retakeIndex.value !== null) return retakeIndex.value
  const sel = selectedIndex.value
  if (sel !== null && !photos.value[sel]) return sel
  const next = photos.value.findIndex(p => !p)
  return next === -1 ? null : next
})

const selectedPhoto = computed(() => (selectedIndex.value !== null ? photos.value[selectedIndex.value] ?? null : null))

/* ---------- Sound ---------- */
const muted = ref(false)
onMounted(() => {
  try { muted.value = localStorage.getItem('cleekin:muted') === '1' } catch {}
})
function toggleMute() {
  muted.value = !muted.value
  try { localStorage.setItem('cleekin:muted', muted.value ? '1' : '0') } catch {}
}

/* ---------- Countdown + capture ---------- */
const stage = ref<{ $el: HTMLElement } | null>(null)
const countdown = ref<number | null>(null)
const flash = ref(false)
let countdownTimer: ReturnType<typeof setTimeout> | null = null

const busy = computed(() => countdown.value !== null)

function cancelCountdown() {
  if (countdownTimer) clearTimeout(countdownTimer)
  countdownTimer = null
  countdown.value = null
  retakeIndex.value = null
}

function startCountdown(index: number) {
  if (!camera.stream.value || busy.value) return
  retakeIndex.value = index
  countdown.value = 3
  const tick = () => {
    if (countdown.value === null) return
    if (countdown.value > 1) {
      countdown.value -= 1
      countdownTimer = setTimeout(tick, 1000)
    } else {
      countdownTimer = null
      void shoot(index)
    }
  }
  countdownTimer = setTimeout(tick, 1000)
}

async function shoot(index: number) {
  const video = stage.value?.$el.querySelector('video')
  const slot = frame.value?.slots[index]
  try {
    if (!video || !slot || video.readyState < 2) throw new Error('camera not ready')
    const photo = await captureFromVideo(video, slot, camera.mirrored.value)
    if (!muted.value) playShutter()
    flash.value = true
    setTimeout(() => (flash.value = false), 450)
    booth.setPhoto(index, photo)
    selectedIndex.value = null
  } catch {
    toast.error('That photo didn\'t work. Try again.')
  } finally {
    countdown.value = null
    retakeIndex.value = null
  }
}

function onCapture() {
  if (busy.value) return cancelCountdown()
  if (booth.isComplete.value) return finish()
  if (targetIndex.value !== null) startCountdown(targetIndex.value)
}

/* ---------- Retake ---------- */
const confirmRetakeAll = ref(false)
const retakeLabel = computed(() => (selectedPhoto.value ? 'Retake' : 'Retake all'))

function onRetake() {
  const sel = selectedIndex.value
  if (sel !== null && photos.value[sel]) {
    booth.setPhoto(sel, null)
    if (camera.stream.value) startCountdown(sel)
    return
  }
  if (booth.hasPhotos.value) confirmRetakeAll.value = true
}

function retakeAll() {
  photos.value.forEach((_, i) => booth.setPhoto(i, null))
  selectedIndex.value = null
  confirmRetakeAll.value = false
}

/* ---------- Upload ---------- */
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

async function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const files = [...(input.files ?? [])]
  input.value = ''
  if (!files.length || !frame.value) return

  const sel = selectedIndex.value
  const targets = sel !== null ? [sel] : photos.value.map((p, i) => (p ? -1 : i)).filter(i => i >= 0)
  if (!targets.length) {
    toast.info('Every slot has a photo. Tap one to replace it.')
    return
  }

  uploading.value = true
  const used = files.slice(0, targets.length)
  let filled = 0
  for (const [n, file] of used.entries()) {
    try {
      const photo = await photoFromFile(file)
      booth.setPhoto(targets[n]!, clampPhoto(frame.value.slots[targets[n]!]!, photo))
      filled++
    } catch (err) {
      toast.error(err instanceof PhotoFileError ? err.message : `"${file.name}" couldn't be opened. Try another photo.`)
    }
  }
  uploading.value = false

  if (files.length > targets.length) {
    toast.info(targets.length === 1
      ? 'Only 1 slot was free, so we used your first photo.'
      : `Only ${targets.length} slots were free, so we used your first ${targets.length} photos.`)
  }
  // Keep a single replaced upload selected so it can be adjusted right away.
  if (filled === 1 && used.length === 1) selectedIndex.value = targets[0]!
  else selectedIndex.value = null
}

/* ---------- Pan / zoom ---------- */
function updatePhoto(index: number, photo: Photo) {
  booth.setPhoto(index, photo)
}

function zoomSelected(factor: number) {
  const i = selectedIndex.value
  const photo = selectedPhoto.value
  const slot = i !== null ? frame.value?.slots[i] : undefined
  if (!photo || !slot || i === null) return
  booth.setPhoto(i, clampPhoto(slot, { ...photo, zoom: photo.zoom * factor }))
}

/* ---------- Slots ---------- */
function onSlotClick(i: number) {
  if (busy.value) return
  selectedIndex.value = selectedIndex.value === i ? null : i
}

/* ---------- Navigation ---------- */
const resultPath = `/booth/${id}/result`
const guard = useLeaveGuard(() => booth.hasPhotos.value && !booth.session.downloaded)

function finish() {
  guard.allow(resultPath)
  navigateTo(resultPath)
}

function goHome() {
  navigateTo('/')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && busy.value) cancelCountdown()
}

onMounted(() => {
  loadFrame()
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  cancelCountdown()
  window.removeEventListener('keydown', onKeydown)
})

// Leaving to anywhere but the result screen ends the session.
onBeforeRouteLeave((to) => {
  if (to.path !== resultPath) booth.reset()
})

const primaryLabel = computed(() => {
  if (busy.value) return 'Cancel'
  if (booth.isComplete.value) return 'Finish'
  return 'Capture'
})
const primaryDisabled = computed(() => !busy.value && !booth.isComplete.value && (!camera.stream.value || targetIndex.value === null))
const filledCount = computed(() => photos.value.filter(Boolean).length)
</script>

<template>
  <div class="booth">
    <BoothHeader back-label="Back" @back="goHome">
      <template v-if="loadState === 'ready'">
        <IconButton v-if="camera.canSwitch.value && camera.stream.value" label="Switch camera" :disabled="busy" @click="camera.switchCamera()">
          <SwitchCamera aria-hidden="true" />
        </IconButton>
        <IconButton :label="muted ? 'Turn sound on' : 'Mute shutter sound'" :pressed="muted" @click="toggleMute">
          <VolumeX v-if="muted" aria-hidden="true" />
          <Volume2 v-else aria-hidden="true" />
        </IconButton>
      </template>
    </BoothHeader>

    <main class="booth__main">
      <div v-if="loadState === 'loading'" class="booth__state" aria-busy="true">
        <span class="spinner" aria-hidden="true" />
        <p>Getting your frame ready…</p>
      </div>

      <div v-else-if="loadState === 'missing'" class="booth__state">
        <EmptyIllustration />
        <p class="booth__state-title outlined">This frame isn't available anymore.</p>
        <AppButton to="/">Pick another frame</AppButton>
      </div>

      <div v-else-if="loadState === 'error'" class="booth__state">
        <p class="booth__state-title outlined">Couldn't load this frame.</p>
        <p>Check your connection and try again.</p>
        <AppButton @click="loadFrame">Try again</AppButton>
      </div>

      <template v-else-if="frame">
        <div class="booth__alert">
          <CameraAlert v-if="camera.problem.value" :problem="camera.problem.value" :retrying="camera.starting.value" @retry="camera.start()" />
        </div>

        <div class="booth__stage">
          <BoothStage
            ref="stage"
            :frame="frame"
            :frame-src="frameSrc"
            :photos="photos"
            :target-index="targetIndex"
            :selected-index="selectedIndex"
            :stream="camera.stream.value"
            :mirrored="camera.mirrored.value"
            :countdown="countdown"
            :flash="flash"
            :locked="busy"
            @slot-click="onSlotClick"
            @update-photo="updatePhoto"
          />
        </div>

        <div class="booth__status" aria-live="polite">
          <template v-if="selectedPhoto?.source === 'upload' && !busy">
            <IconButton label="Zoom out" @click="zoomSelected(1 / 1.15)"><ZoomOut aria-hidden="true" /></IconButton>
            <span>Drag to move · pinch to zoom</span>
            <IconButton label="Zoom in" @click="zoomSelected(1.15)"><ZoomIn aria-hidden="true" /></IconButton>
          </template>
          <span v-else-if="busy">Smile!</span>
          <span v-else-if="booth.isComplete.value"><Check :size="16" aria-hidden="true" /> All {{ frame.slots.length }} photos taken. Tap one to redo it, or Finish.</span>
          <span v-else>Photo {{ filledCount + 1 }} of {{ frame.slots.length }}</span>
        </div>

        <div class="booth__controls">
          <AppButton variant="secondary" :disabled="busy || !booth.hasPhotos.value" class="ctl ctl--side" @click="onRetake">
            <template #icon><RefreshCw aria-hidden="true" /></template>
            {{ retakeLabel }}
          </AppButton>
          <AppButton :disabled="primaryDisabled" class="ctl ctl--main" @click="onCapture">
            <template v-if="busy" #icon><X aria-hidden="true" /></template>
            {{ primaryLabel }}
          </AppButton>
          <AppButton variant="secondary" :disabled="busy" :loading="uploading" class="ctl ctl--side" @click="fileInput?.click()">
            <template #icon><CloudUpload aria-hidden="true" /></template>
            {{ selectedPhoto ? 'Replace' : 'Upload Image' }}
          </AppButton>
          <input
            ref="fileInput"
            type="file"
            class="sr-only"
            tabindex="-1"
            :accept="PHOTO_RULES.accept"
            :multiple="selectedIndex === null"
            @change="onFiles"
          >
        </div>
        <PrivacyNote class="booth__privacy" />
      </template>
    </main>

    <AppFooter class="booth__footer" />

    <LeaveModal :open="guard.open.value" @answer="guard.answer" />
    <ConfirmModal
      :open="confirmRetakeAll"
      title="Retake all photos?"
      message="Every slot will be cleared so you can start over."
      confirm-label="Retake all"
      @confirm="retakeAll"
      @cancel="confirmRetakeAll = false"
    />
  </div>
</template>

<style scoped>
.booth {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
}

.booth__main {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto auto;
  grid-template-areas: "alert" "stage" "status" "controls" "privacy";
  gap: 12px;
  padding: 16px var(--page-gutter) 8px;
}

.booth__alert { grid-area: alert; }
.booth__alert:empty { display: none; }
.booth__stage { grid-area: stage; min-height: 160px; padding: 8px; }

.booth__status {
  grid-area: status;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 44px;
  color: var(--c-black);
  font-size: 14px;
  letter-spacing: 0.08em;
  text-align: center;
}

.booth__status svg { vertical-align: -3px; color: var(--c-pink-dark); }

.booth__controls {
  grid-area: controls;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 16px;
  width: min(900px, 100%);
  margin: 0 auto;
}

.ctl--side:first-child { justify-self: start; }
.ctl--side:nth-child(3) { justify-self: end; }
.ctl--main { min-width: 160px; }

.booth__privacy { grid-area: privacy; justify-self: center; }

.booth__state {
  grid-row: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
}

.booth__state-title {
  --stroke: 3px;
  color: var(--c-pink-dark);
  font-size: 28px;
  letter-spacing: 0.1em;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--c-pink-dark);
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

@media (max-height: 820px) {
  .booth__footer { display: none; }
}

@media (max-width: 600px) {
  .booth__footer { display: none; }
  .booth__main { gap: 8px; padding-bottom: max(12px, env(safe-area-inset-bottom)); }
  .booth__controls { grid-template-columns: 1fr 1fr; gap: 8px; }
  .ctl--main { grid-column: 1 / -1; grid-row: 1; width: 100%; }
  .ctl--side { width: 100%; }
  .ctl--side:first-child, .ctl--side:nth-child(3) { justify-self: stretch; }
  .booth__status { font-size: 12px; min-height: 36px; }
  .booth__privacy { font-size: 12px; }
}

/* Phones held sideways: controls move beside the frame. */
@media (orientation: landscape) and (max-height: 600px) {
  .booth__main {
    grid-template-columns: minmax(0, 1fr) 220px;
    grid-template-rows: auto minmax(0, 1fr) auto auto;
    grid-template-areas: "alert alert" "stage status" "stage controls" "stage privacy";
    padding-top: 8px;
  }
  .booth__controls { grid-template-columns: 1fr; width: 100%; align-self: start; }
  .ctl--main { grid-row: auto; }
  .ctl--side, .ctl--main { width: 100%; justify-self: stretch !important; }
  .booth__status { align-self: end; }
  .booth__privacy { font-size: 11px; }
}
</style>
