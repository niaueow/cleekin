<script setup lang="ts">
import { Upload, X, ImageIcon } from 'lucide-vue-next'
import { upload } from '@vercel/blob/client'
import { checkFrameFile, FrameFileError, type FrameCheck } from '~/utils/detectSlots'

const props = defineProps<{ open: boolean, storage: 'blob' | 'local', existingNames: string[] }>()
const emit = defineEmits<{ close: [], created: [frame: AdminFrame] }>()

const name = ref('')
const isActive = ref(false)
const file = ref<File | null>(null)
const preview = ref<string | null>(null)
const check = ref<FrameCheck | null>(null)
const checking = ref(false)
const fileError = ref('')
const nameError = ref('')
const formError = ref('')
const saving = ref(false)
const progress = ref(0)
const dragOver = ref(false)
const input = ref<HTMLInputElement | null>(null)
const nameId = useId()

function reset() {
  name.value = ''
  isActive.value = false
  clearFile()
  nameError.value = ''
  formError.value = ''
  saving.value = false
  progress.value = 0
}

function clearFile() {
  if (preview.value) URL.revokeObjectURL(preview.value)
  file.value = null
  preview.value = null
  check.value = null
  fileError.value = ''
}

watch(() => props.open, (open) => { if (!open) reset() })

async function pick(f: File | undefined) {
  if (!f) return
  clearFile()
  file.value = f
  checking.value = true
  try {
    check.value = await checkFrameFile(f)
    preview.value = URL.createObjectURL(f)
  } catch (err) {
    fileError.value = err instanceof FrameFileError ? err.message : 'This file couldn\'t be checked. Try another PNG.'
  } finally {
    checking.value = false
  }
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  void pick(e.dataTransfer?.files?.[0])
}

function onChange(e: Event) {
  const el = e.target as HTMLInputElement
  void pick(el.files?.[0])
  el.value = ''
}

function validateName(): boolean {
  const result = frameNameSchema.safeParse(name.value)
  if (!result.success) {
    nameError.value = result.error.issues[0]?.message ?? 'Check the name.'
    return false
  }
  if (props.existingNames.includes(nameKey(name.value))) {
    nameError.value = 'A frame with this name already exists.'
    return false
  }
  nameError.value = ''
  return true
}

const canSubmit = computed(() => !!check.value && !checking.value && !saving.value)

async function submit() {
  formError.value = ''
  const nameOk = validateName()
  if (!file.value || !check.value) {
    fileError.value = fileError.value || 'Add a PNG frame file.'
    return
  }
  if (!nameOk) return

  saving.value = true
  progress.value = 0
  try {
    let fileUrl: string
    if (props.storage === 'blob') {
      const blob = await upload(`frames/${file.value.name}`, file.value, {
        access: 'public',
        handleUploadUrl: '/api/admin/upload',
        contentType: 'image/png',
        onUploadProgress: ({ percentage }) => { progress.value = Math.round(percentage) },
      })
      fileUrl = blob.url
    } else {
      const res = await $fetch<{ url: string }>('/api/admin/upload', {
        method: 'POST',
        body: file.value,
        headers: { 'Content-Type': 'image/png' },
      })
      fileUrl = res.url
    }
    progress.value = 100
    const frame = await $fetch<AdminFrame>('/api/admin/frames', {
      method: 'POST',
      body: { name: name.value.trim(), isActive: isActive.value, fileUrl, slots: check.value.slots },
    })
    emit('created', frame)
  } catch (err) {
    const msg = errorMessage(err, 'Couldn\'t add the frame. Try again.')
    if (/name already exists/i.test(msg)) nameError.value = msg
    else formError.value = msg
  } finally {
    saving.value = false
  }
}

const sizeLabel = computed(() => {
  const bytes = file.value?.size ?? 0
  if (!bytes) return ''
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
})
</script>

<template>
  <AppModal :open="open" label="Add frame" width="560px" :dismissible="!saving" @close="emit('close')">
    <form class="add" novalidate @submit.prevent="submit">
      <div class="add__row">
        <div class="add__field">
          <label :for="nameId" class="sr-only">Frame name</label>
          <input
            :id="nameId"
            v-model="name"
            class="input outlined"
            :class="{ 'input--filled': name, 'input--error': nameError }"
            placeholder="Frame name"
            :maxlength="FRAME_RULES.maxNameLength"
            autocomplete="off"
            data-autofocus
            @blur="name && validateName()"
            @input="nameError = ''"
          >
          <p v-if="nameError" class="add__error" role="alert">{{ nameError }}</p>
        </div>
        <div class="add__active">
          <span class="add__active-label outlined" aria-hidden="true">Active?</span>
          <AdminActiveToggle v-model="isActive" label="Show this frame to visitors" />
        </div>
      </div>

      <!-- File picker: empty state matches Figma's dropzone, filled state its file row. -->
      <div v-if="!file" class="drop" :class="{ 'drop--over': dragOver }" @dragover.prevent="dragOver = true" @dragleave="dragOver = false" @drop.prevent="onDrop">
        <Upload :size="24" aria-hidden="true" />
        <p class="drop__text">Drop your frame here, or <button type="button" class="drop__browse" @click="input?.click()">browse</button></p>
        <p class="drop__hint outlined">PNG · max 5 MB · at least 1080px · photo areas fully transparent</p>
      </div>
      <div v-else class="file">
        <div class="file__row">
          <ImageIcon :size="20" aria-hidden="true" />
          <span class="file__name">{{ file.name }}</span>
          <span class="file__size">{{ sizeLabel }}</span>
          <button type="button" class="file__remove" aria-label="Remove file" :disabled="saving" @click="clearFile">
            <X :size="20" aria-hidden="true" />
          </button>
        </div>
        <p v-if="checking" class="file__status">Looking for photo slots…</p>
        <p v-else-if="fileError" class="add__error" role="alert">{{ fileError }}</p>
        <div v-else-if="check && preview" class="file__preview">
          <div class="file__thumb" :style="{ aspectRatio: `${check.width} / ${check.height}` }">
            <img :src="preview" alt="">
            <AdminSlotOverlay :width="check.width" :height="check.height" :slots="check.slots" />
          </div>
          <p class="file__found">
            <strong>{{ check.slots.length }} photo slot{{ check.slots.length === 1 ? '' : 's' }}</strong> found.
            Numbers show the order visitors fill them.
          </p>
        </div>
      </div>
      <input ref="input" type="file" accept="image/png,.png" class="sr-only" tabindex="-1" @change="onChange">

      <p v-if="formError" class="add__error add__error--form" role="alert">{{ formError }}</p>

      <div class="add__actions">
        <AppButton variant="blue" :disabled="saving" @click="emit('close')">Cancel</AppButton>
        <AppButton type="submit" :disabled="!canSubmit" :loading="saving">
          {{ saving ? (progress < 100 ? `Uploading ${progress}%` : 'Saving…') : 'Add Frame' }}
        </AppButton>
      </div>
    </form>
  </AppModal>
</template>

<style scoped>
.add {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.add__row {
  display: flex;
  align-items: flex-start;
  gap: 24px;
}

.add__field { flex: 1; min-width: 0; }

.input {
  --stroke: 2px;
  width: 100%;
  height: 52px;
  padding: 0 16px;
  border: 1px solid var(--c-gray);
  border-radius: var(--radius-m);
  background: var(--c-white);
  color: var(--c-white);
  font-size: 16px;
  letter-spacing: 0.16em;
}

.input::placeholder { color: var(--c-muted); -webkit-text-stroke: 0; }
.input--filled { border-color: var(--c-input-border); }
.input--error { border-color: var(--c-danger-border); }

.add__active {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 52px;
}

.add__active-label {
  --stroke: 2px;
  color: var(--c-pink-dark);
}

.drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 28px 24px;
  border: 1px dashed var(--c-pink-dark);
  border-radius: var(--radius-s);
  background: var(--c-surface);
  text-align: center;
  transition: background 0.15s ease;
}

.drop--over { background: var(--c-light-pink); }

.drop__text { color: #353535; }

.drop__browse {
  padding: 0;
  border: 0;
  background: none;
  color: var(--c-pink-dark);
  text-decoration: underline;
}

.drop__hint {
  --stroke: 1.5px;
  color: var(--c-gray);
  font-size: 13px;
  letter-spacing: 0.1em;
}

.file {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px 24px;
  border: 1px dashed var(--c-pink-dark);
  border-radius: var(--radius-s);
  background: var(--c-light-pink);
}

.file__row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.file__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file__size { opacity: 0.6; font-size: 12px; }

.file__remove {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
}

.file__status { font-size: 13px; opacity: 0.7; }

.file__preview {
  display: flex;
  align-items: center;
  gap: 16px;
}

.file__thumb {
  position: relative;
  flex: none;
  width: 120px;
  max-height: 180px;
  background: var(--c-placeholder-bg);
  border: 1px solid var(--c-black);
  border-radius: 8px;
  overflow: hidden;
}

.file__thumb img { width: 100%; height: 100%; object-fit: contain; }

.file__found {
  font-size: 13px;
  letter-spacing: 0.06em;
}

.file__found strong { color: var(--c-pink-dark); font-weight: 400; }

.add__error {
  margin-top: 6px;
  color: var(--c-danger-border);
  font-size: 13px;
  letter-spacing: 0.04em;
}

.add__error--form {
  margin: 0;
  padding: 10px 14px;
  border-radius: var(--radius-s);
  background: #fff1f1;
}

.add__actions {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

@media (max-width: 600px) {
  .add__row { flex-direction: column; gap: 12px; }
  .add__active { height: auto; }
  .file__preview { flex-direction: column; align-items: flex-start; }
}
</style>
