<script setup lang="ts">
import { Download, House } from 'lucide-vue-next'
import { composite, downloadName, loadImage } from '~/utils/photo'

useHead({ title: 'Cleekin · Your photo' })

const route = useRoute()
const id = String(route.params.id)
const editPath = `/booth/${id}`
const toast = useToast()
const booth = useBoothSession()
const s = booth.session

const state = ref<'building' | 'ready' | 'error'>('building')
const downloading = ref(false)
let resultBlob: Blob | null = null

const frame = computed(() => s.frame)

async function build() {
  state.value = 'building'
  try {
    const f = s.frame!
    const art = await loadImage(s.frameSrc, !s.frameSrc.startsWith('/') && !s.frameSrc.startsWith('blob:'))
    resultBlob = await composite(art, f.width, f.height, f.slots, s.photos)
    if (s.resultUrl) URL.revokeObjectURL(s.resultUrl)
    s.resultUrl = URL.createObjectURL(resultBlob)
    state.value = 'ready'
  } catch {
    state.value = 'error'
  }
}

onMounted(() => {
  // Refreshing this page loses the in-memory photos; send the visitor back to the booth.
  if (s.frameId !== id || !s.frame || !booth.isComplete.value) {
    navigateTo(editPath, { replace: true })
    return
  }
  build()
})

function isTouchDevice() {
  return window.matchMedia('(pointer: coarse)').matches
}

async function download() {
  if (!resultBlob || downloading.value) return
  downloading.value = true
  const name = downloadName()
  try {
    const file = new File([resultBlob], name, { type: 'image/jpeg' })
    // Phones: the share sheet offers "Save Image" (Photos) plus WhatsApp, Instagram, etc.
    if (isTouchDevice() && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'My Cleekin photo' })
        s.downloaded = true
        return
      } catch (err) {
        if ((err as DOMException).name === 'AbortError') return
        // Share failed for another reason: fall back to a normal download below.
      }
    }
    const a = document.createElement('a')
    a.href = s.resultUrl!
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    s.downloaded = true
    toast.info('Saved! Check your downloads.')
  } finally {
    downloading.value = false
  }
}

const guard = useLeaveGuard(() => !s.downloaded)

function backToEdit() {
  guard.allow(editPath)
  navigateTo(editPath)
}

onBeforeRouteLeave((to) => {
  if (to.path !== editPath) booth.reset()
})
</script>

<template>
  <div class="result">
    <BoothHeader back-label="Back to edit" @back="backToEdit" />

    <main class="result__main">
      <h1 class="sr-only">Your photo</h1>
      <div class="result__stage">
        <div v-if="state === 'building'" class="result__state" aria-busy="true">
          <span class="spinner" aria-hidden="true" />
          <p>Putting your photo together…</p>
        </div>
        <div v-else-if="state === 'error'" class="result__state">
          <p class="result__title outlined">Couldn't make your photo.</p>
          <AppButton @click="build">Try again</AppButton>
        </div>
        <FitBox v-else-if="frame && s.resultUrl" :width="frame.width" :height="frame.height">
          <img :src="s.resultUrl" alt="Your finished photo" class="result__img">
        </FitBox>
      </div>

      <div class="result__controls">
        <span class="result__spacer" />
        <AppButton :disabled="state !== 'ready'" :loading="downloading" class="result__main-btn" @click="download">
          <template #icon><Download aria-hidden="true" /></template>
          Download
        </AppButton>
        <AppButton variant="secondary" to="/" class="result__home">
          <template #icon><House aria-hidden="true" /></template>
          Home
        </AppButton>
      </div>
      <p v-if="s.downloaded" class="result__done">Saved. Want another? Go Home and pick a new frame.</p>
      <PrivacyNote v-else class="result__privacy" />
    </main>

    <AppFooter class="result__footer" />

    <LeaveModal :open="guard.open.value" @answer="guard.answer" />
  </div>
</template>

<style scoped>
.result {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
}

.result__main {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto auto;
  gap: 16px;
  padding: 16px var(--page-gutter) 8px;
}

.result__stage { min-height: 160px; padding: 8px; }

.result__img {
  width: 100%;
  height: 100%;
  border-radius: 4px;
  box-shadow: var(--shadow-card);
}

.result__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100%;
}

.result__title {
  --stroke: 3px;
  color: var(--c-pink-dark);
  font-size: 28px;
}

.result__controls {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 16px;
  width: min(900px, 100%);
  margin: 0 auto;
}

.result__main-btn { min-width: 180px; }
.result__home { justify-self: end; }

.result__done,
.result__privacy {
  justify-self: center;
  font-size: 14px;
  text-align: center;
}

.result__done { color: var(--c-pink-dark); letter-spacing: 0.08em; }

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
  .result__footer { display: none; }
}

@media (max-width: 600px) {
  .result__footer { display: none; }
  .result__main { gap: 10px; padding-bottom: max(12px, env(safe-area-inset-bottom)); }
  .result__controls { grid-template-columns: 1fr; gap: 8px; }
  .result__spacer { display: none; }
  .result__main-btn, .result__home { width: 100%; }
  .result__done, .result__privacy { font-size: 12px; }
}

@media (orientation: landscape) and (max-height: 600px) {
  .result__main { grid-template-columns: minmax(0, 1fr) 220px; grid-template-rows: 1fr auto; }
  .result__stage { grid-row: 1 / -1; }
  .result__controls { grid-template-columns: 1fr; align-self: center; }
  .result__spacer { display: none; }
  .result__main-btn, .result__home { width: 100%; }
}
</style>
