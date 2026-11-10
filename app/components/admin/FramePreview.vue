<script setup lang="ts">
import { X, Pencil, Check } from 'lucide-vue-next'

const props = defineProps<{ frame: AdminFrame | null, existingNames: string[] }>()
const emit = defineEmits<{ close: [], renamed: [frame: AdminFrame] }>()

const showSlots = ref(false)
const editing = ref(false)
const draft = ref('')
const error = ref('')
const saving = ref(false)
const titleId = useId()
const nameInput = ref<HTMLInputElement | null>(null)

watch(() => props.frame?.id, () => {
  showSlots.value = false
  editing.value = false
  error.value = ''
})

async function startEdit() {
  if (!props.frame) return
  draft.value = props.frame.name
  error.value = ''
  editing.value = true
  await nextTick()
  nameInput.value?.select()
}

function cancelEdit() {
  editing.value = false
  error.value = ''
}

async function save() {
  const frame = props.frame
  if (!frame) return
  const parsed = frameNameSchema.safeParse(draft.value)
  if (!parsed.success) {
    error.value = parsed.error.issues[0]?.message ?? 'Check the name.'
    return
  }
  if (parsed.data === frame.name) return cancelEdit()
  if (nameKey(parsed.data) !== nameKey(frame.name) && props.existingNames.includes(nameKey(parsed.data))) {
    error.value = 'A frame with this name already exists.'
    return
  }
  saving.value = true
  try {
    const updated = await $fetch<AdminFrame>(`/api/admin/frames/${frame.id}`, { method: 'PATCH', body: { name: parsed.data } })
    emit('renamed', updated)
    editing.value = false
  } catch (err) {
    error.value = errorMessage(err, 'Couldn\'t rename the frame. Try again.')
  } finally {
    saving.value = false
  }
}

function onNameKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    cancelEdit()
  }
}
</script>

<template>
  <AppModal :open="!!frame" :labelledby="titleId" width="min(1100px, 100%)" fullscreen-on-mobile bare :dismissible="!editing" @close="emit('close')">
    <div v-if="frame" class="pv">
      <button type="button" class="pv__close" aria-label="Close" data-autofocus @click="emit('close')">
        <X :size="26" aria-hidden="true" />
      </button>

      <div class="pv__bar">
        <form v-if="editing" class="pv__rename" @submit.prevent="save">
          <label class="sr-only" :for="`${titleId}-input`">Frame name</label>
          <input
            :id="`${titleId}-input`"
            ref="nameInput"
            v-model="draft"
            class="pv__input"
            :maxlength="FRAME_RULES.maxNameLength"
            :disabled="saving"
            @keydown="onNameKeydown"
          >
          <button type="submit" class="pv__icon" aria-label="Save name" :disabled="saving"><Check :size="20" aria-hidden="true" /></button>
          <button type="button" class="pv__icon" aria-label="Cancel rename" :disabled="saving" @click="cancelEdit"><X :size="20" aria-hidden="true" /></button>
        </form>
        <div v-else class="pv__title-row">
          <h2 :id="titleId" class="pv__title outlined">{{ frame.name }}</h2>
          <button type="button" class="pv__icon" aria-label="Rename frame" title="Rename" @click="startEdit"><Pencil :size="18" aria-hidden="true" /></button>
        </div>
        <p v-if="error" class="pv__error" role="alert">{{ error }}</p>

        <label class="pv__slots-toggle">
          <AdminActiveToggle v-model="showSlots" label="Show slots" />
          <span>Show slots</span>
        </label>
      </div>

      <div class="pv__stage">
        <FitBox :width="frame.width" :height="frame.height">
          <div class="pv__art">
            <img :src="frame.imageUrl" :alt="frame.name">
            <AdminSlotOverlay v-if="showSlots" :width="frame.width" :height="frame.height" :slots="frame.slots" />
          </div>
        </FitBox>
      </div>
    </div>
  </AppModal>
</template>

<style scoped>
.pv {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: min(92dvh, 1000px);
  padding: 20px 72px 20px 24px;
  border-radius: var(--radius-l);
  background: var(--c-surface);
}

.pv__close {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--c-black);
  border-radius: 50%;
  background: var(--c-white);
}

.pv__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
}

.pv__title-row, .pv__rename {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.pv__title {
  --stroke: 2px;
  overflow: hidden;
  color: var(--c-pink-dark);
  font-size: 28px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pv__input {
  width: min(320px, 60vw);
  height: 44px;
  padding: 0 12px;
  border: 1px solid var(--c-input-border);
  border-radius: var(--radius-s);
  font-size: 18px;
}

.pv__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--c-black);
  border-radius: 50%;
  background: var(--c-white);
}

.pv__error {
  flex-basis: 100%;
  color: var(--c-danger-border);
  font-size: 13px;
}

.pv__slots-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  cursor: pointer;
}

.pv__stage { flex: 1; min-height: 0; }

.pv__art {
  position: absolute;
  inset: 0;
  background:
    repeating-conic-gradient(#ececec 0 25%, #ffffff 0 50%) 0 0 / 20px 20px;
  border: 1px solid var(--c-gray);
}

.pv__art img { width: 100%; height: 100%; }

@media (max-width: 600px) {
  .pv {
    height: 100dvh;
    padding: max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom));
    border-radius: 0;
  }
  .pv__bar { padding-right: 52px; }
  .pv__close { top: max(12px, env(safe-area-inset-top)); right: 12px; }
  .pv__title { font-size: 20px; }
}
</style>
