<script setup lang="ts">
useSeoMeta({ title: 'Cleekin · Pick a frame' })

const { data: frames, status, refresh } = await useFetch<PublicFrame[]>('/api/frames', { default: () => [] })

const selectedId = ref<string | null>(null)
const selected = computed(() => frames.value.find(f => f.id === selectedId.value) ?? null)

// Drop the selection if that frame disappears after a refresh.
watch(frames, (list) => {
  if (selectedId.value && !list.some(f => f.id === selectedId.value)) selectedId.value = null
})

function toggle(id: string) {
  selectedId.value = selectedId.value === id ? null : id
}

function go() {
  if (selected.value) navigateTo(`/booth/${selected.value.id}`)
}
</script>

<template>
  <div class="page">
    <header class="header">
      <AppLogo />
    </header>

    <main class="main">
      <h1 class="sr-only">Pick a frame</h1>

      <div v-if="status === 'pending' && !frames.length" class="grid" aria-busy="true" aria-label="Loading frames">
        <div v-for="n in 3" :key="n" class="skeleton" />
      </div>

      <div v-else-if="status === 'error'" class="state">
        <p class="state__title outlined">Couldn't load the frames.</p>
        <p class="state__text">Check your connection and try again.</p>
        <AppButton @click="refresh()">Try again</AppButton>
      </div>

      <div v-else-if="!frames.length" class="state">
        <EmptyIllustration />
        <p class="state__title outlined">No frames yet.</p>
        <p class="state__text">Check back soon!</p>
      </div>

      <template v-else>
        <p class="hint">Tap a frame you like</p>
        <div class="grid">
          <FrameCard
            v-for="frame in frames"
            :key="frame.id"
            :frame="frame"
            :selected="frame.id === selectedId"
            @select="toggle(frame.id)"
          />
        </div>

        <div class="cta">
          <AppButton :disabled="!selected" @click="go">Select Frame</AppButton>
          <p class="cta__hint" aria-live="polite">
            {{ selected ? `${selected.name} · ${selected.slots.length} photo${selected.slots.length === 1 ? '' : 's'}` : 'Pick a frame first' }}
          </p>
          <PrivacyNote />
        </div>
      </template>
    </main>

    <AppFooter />
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.header {
  padding: 60px var(--page-gutter) 0;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px var(--page-gutter) 32px;
}

.hint {
  margin-bottom: 24px;
  color: var(--c-pink-dark);
  font-size: 18px;
  letter-spacing: 0.12em;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 300px));
  justify-content: center;
  gap: 48px 134px;
  width: 100%;
  max-width: 1168px;
  padding: 12px;
}

.skeleton {
  aspect-ratio: 3 / 4;
  border: 1px solid var(--c-gray);
  border-radius: var(--radius-l);
  background: linear-gradient(100deg, #f4f8fd 40%, #ffffff 50%, #f4f8fd 60%) 0 0 / 300% 100%;
  animation: shimmer 1.4s linear infinite;
}

@keyframes shimmer { to { background-position: -150% 0; } }

.cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: 64px;
}

.cta__hint {
  min-height: 1.4em;
  color: var(--c-black);
  font-size: 14px;
  letter-spacing: 0.08em;
  opacity: 0.7;
}

.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin: auto 0;
  padding: 32px 0;
  text-align: center;
}

.state__title {
  --stroke: 3px;
  color: var(--c-pink-dark);
  font-size: 32px;
  letter-spacing: 0.1em;
}

.state__text {
  margin-bottom: 12px;
  font-size: 16px;
}

@media (max-width: 1100px) {
  .grid { gap: 48px 64px; }
}

@media (max-width: 600px) {
  .header { padding-top: 24px; }
  .main { padding-top: 24px; padding-bottom: 0; }
  .hint { margin-bottom: 12px; font-size: 15px; }
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px 16px;
    padding: 8px 4px;
  }
  .cta {
    position: sticky;
    bottom: 0;
    width: calc(100% + 2 * var(--page-gutter));
    margin-top: 24px;
    padding: 16px var(--page-gutter) max(16px, env(safe-area-inset-bottom));
    background: linear-gradient(to bottom, rgba(220, 236, 251, 0), var(--c-light-blue) 24px);
  }
  .cta :deep(.btn) { width: 100%; }
  .state__title { font-size: 26px; }
}
</style>
