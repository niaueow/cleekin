<script setup lang="ts">
import { Plus, X } from 'lucide-vue-next'


definePageMeta({ middleware: 'admin' })
useHead({ title: 'Cleekin · Dashboard', meta: [{ name: 'robots', content: 'noindex' }] })

const toast = useToast()
const { clear: clearSession } = useUserSession()

/* ---------- Data ---------- */
const frames = ref<AdminFrame[]>([])
const storage = ref<'blob' | 'local'>('blob')
const loadState = ref<'loading' | 'ready' | 'error'>('loading')

async function handleAuth(err: unknown): Promise<boolean> {
  if ((err as { statusCode?: number })?.statusCode === 401) {
    toast.error('Your session ended. Please log in again.')
    await clearSession()
    await navigateTo('/admin/login')
    return true
  }
  return false
}

async function load() {
  loadState.value = 'loading'
  try {
    const res = await $fetch<{ frames: AdminFrame[], storage: 'blob' | 'local' }>('/api/admin/frames')
    frames.value = res.frames
    storage.value = res.storage
    loadState.value = 'ready'
  } catch (err) {
    if (!(await handleAuth(err))) loadState.value = 'error'
  }
}
onMounted(load)

/* ---------- Search, sort, tabs ---------- */
type Tab = 'all' | 'active' | 'inactive'
const query = ref('')
const sort = ref<SortKey>('newest')
const tab = ref<Tab>('all')

const activeCount = computed(() => frames.value.filter(f => f.isActive).length)
const counts = computed(() => ({
  all: frames.value.length,
  active: activeCount.value,
  inactive: frames.value.length - activeCount.value,
}))
const tabs: { key: Tab, label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
]

const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  const list = frames.value.filter((f) => {
    if (tab.value === 'active' && !f.isActive) return false
    if (tab.value === 'inactive' && f.isActive) return false
    return !q || f.name.toLowerCase().includes(q)
  })
  const byName = (a: AdminFrame, b: AdminFrame) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })
  const byDate = (a: AdminFrame, b: AdminFrame) => a.createdAt.localeCompare(b.createdAt)
  const sorters: Record<SortKey, (a: AdminFrame, b: AdminFrame) => number> = {
    newest: (a, b) => byDate(b, a),
    oldest: byDate,
    az: byName,
    za: (a, b) => byName(b, a),
  }
  return [...list].sort(sorters[sort.value])
})

const existingNames = computed(() => frames.value.map(f => nameKey(f.name)))

function replace(frame: AdminFrame) {
  frames.value = frames.value.map(f => (f.id === frame.id ? frame : f))
}

/* ---------- Add ---------- */
const addOpen = ref(false)
function onCreated(frame: AdminFrame) {
  frames.value = [frame, ...frames.value]
  addOpen.value = false
  toast.info(frame.isActive ? `"${frame.name}" is live for visitors.` : `"${frame.name}" added. It's hidden until you turn on the eye.`)
}

/* ---------- Preview / rename ---------- */
const previewId = ref<string | null>(null)
const previewFrame = computed(() => frames.value.find(f => f.id === previewId.value) ?? null)
function onRenamed(frame: AdminFrame) {
  replace(frame)
  toast.info(`Renamed to "${frame.name}".`)
}

/* ---------- Active toggle ---------- */
const busyId = ref<string | null>(null)
const confirmHide = ref<AdminFrame | null>(null)
const LAST_WARNING = 'This is your only active frame. Visitors won\'t be able to take photos until you activate another.'

function isLastActive(frame: AdminFrame) {
  return frame.isActive && activeCount.value === 1
}

function requestToggle(frame: AdminFrame) {
  if (isLastActive(frame)) confirmHide.value = frame
  else void setActive(frame, !frame.isActive)
}

async function setActive(frame: AdminFrame, isActive: boolean) {
  confirmHide.value = null
  busyId.value = frame.id
  replace({ ...frame, isActive })
  try {
    const updated = await $fetch<AdminFrame>(`/api/admin/frames/${frame.id}`, { method: 'PATCH', body: { isActive } })
    replace(updated)
    toast.info(isActive ? `"${frame.name}" is now visible to visitors.` : `"${frame.name}" is now hidden from visitors.`)
  } catch (err) {
    replace(frame)
    if (!(await handleAuth(err))) toast.error(errorMessage(err, 'Couldn\'t update the frame. Try again.'))
  } finally {
    busyId.value = null
  }
}

/* ---------- Delete ---------- */
const confirmDelete = ref<AdminFrame | null>(null)
const deleting = ref(false)

async function doDelete() {
  const frame = confirmDelete.value
  if (!frame) return
  deleting.value = true
  try {
    await $fetch(`/api/admin/frames/${frame.id}`, { method: 'DELETE' })
    frames.value = frames.value.filter(f => f.id !== frame.id)
    if (previewId.value === frame.id) previewId.value = null
    toast.info(`"${frame.name}" deleted.`)
  } catch (err) {
    if ((err as { statusCode?: number })?.statusCode === 404) {
      frames.value = frames.value.filter(f => f.id !== frame.id)
    } else if (!(await handleAuth(err))) {
      toast.error(errorMessage(err, 'Couldn\'t delete the frame. Try again.'))
    }
  } finally {
    deleting.value = false
    confirmDelete.value = null
  }
}

/* ---------- Logout ---------- */
const confirmLogout = ref(false)
const loggingOut = ref(false)
async function logout() {
  loggingOut.value = true
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
  } finally {
    await clearSession()
    loggingOut.value = false
    confirmLogout.value = false
    await navigateTo('/admin/login')
  }
}
</script>

<template>
  <div class="dash">
    <header class="dash__header">
      <div class="dash__brand">
        <AppLogo />
        <span class="dash__suffix outlined">'s dashboard</span>
      </div>
      <AppButton variant="secondary" class="dash__logout" @click="confirmLogout = true">Logout</AppButton>
    </header>

    <main class="dash__main">
      <section class="stats" aria-label="Frame counts">
        <div class="stat">
          <p class="stat__num outlined">{{ loadState === 'ready' ? counts.all : '–' }}</p>
          <p class="stat__label outlined">Total Frame</p>
        </div>
        <div class="stat">
          <p class="stat__num outlined">{{ loadState === 'ready' ? counts.active : '–' }}</p>
          <p class="stat__label outlined">Active Frame</p>
        </div>
      </section>

      <div class="toolbar">
        <label class="search">
          <span class="sr-only">Search frames</span>
          <input v-model="query" type="search" class="search__input outlined" placeholder="Search frame" autocomplete="off">
          <button v-if="query" type="button" class="search__clear" aria-label="Clear search" @click="query = ''">
            <X :size="18" aria-hidden="true" />
          </button>
        </label>
        <AdminSortMenu v-model="sort" />
        <AppButton class="toolbar__add" :disabled="loadState !== 'ready'" @click="addOpen = true">
          <template #icon><Plus aria-hidden="true" /></template>
          Add Frame
        </AppButton>
      </div>

      <nav class="tabs" aria-label="Filter frames">
        <button
          v-for="t in tabs"
          :key="t.key"
          type="button"
          class="tab"
          :class="{ 'tab--on': tab === t.key }"
          :aria-pressed="tab === t.key"
          @click="tab = t.key"
        >
          <span class="outlined">{{ t.label }}</span>
          <span class="tab__count">{{ counts[t.key] }}</span>
        </button>
      </nav>

      <div v-if="loadState === 'loading'" class="grid" aria-busy="true">
        <div v-for="n in 3" :key="n" class="skeleton" />
      </div>

      <div v-else-if="loadState === 'error'" class="empty">
        <p class="empty__title outlined">Couldn't load your frames.</p>
        <AppButton @click="load">Try again</AppButton>
      </div>

      <div v-else-if="!frames.length" class="empty">
        <EmptyIllustration />
        <p class="empty__title outlined">No frames yet.</p>
        <p>Add your first frame to get started.</p>
        <AppButton @click="addOpen = true">
          <template #icon><Plus aria-hidden="true" /></template>
          Add Frame
        </AppButton>
      </div>

      <div v-else-if="!visible.length" class="empty">
        <template v-if="query.trim()">
          <p class="empty__title outlined">No frames match "{{ query.trim() }}".</p>
          <AppButton variant="secondary" @click="query = ''">Clear search</AppButton>
        </template>
        <p v-else class="empty__title outlined">No {{ tab }} frames.</p>
      </div>

      <div v-else class="grid">
        <AdminFrameTile
          v-for="f in visible"
          :key="f.id"
          :frame="f"
          :busy="busyId === f.id"
          @open="previewId = f.id"
          @toggle="requestToggle(f)"
          @delete="confirmDelete = f"
        />
      </div>
    </main>

    <AppFooter />

    <AdminAddFrameModal
      :open="addOpen"
      :storage="storage"
      :existing-names="existingNames"
      @close="addOpen = false"
      @created="onCreated"
    />

    <AdminFramePreview
      :frame="previewFrame"
      :existing-names="existingNames"
      @close="previewId = null"
      @renamed="onRenamed"
    />

    <ConfirmModal
      :open="!!confirmDelete"
      :title="`Delete &quot;${confirmDelete?.name ?? ''}&quot;?`"
      message="This can't be undone."
      :warning="confirmDelete && isLastActive(confirmDelete) ? LAST_WARNING : undefined"
      confirm-label="Delete"
      :loading="deleting"
      @confirm="doDelete"
      @cancel="confirmDelete = null"
    />

    <ConfirmModal
      :open="!!confirmHide"
      :title="`Hide &quot;${confirmHide?.name ?? ''}&quot;?`"
      :warning="LAST_WARNING"
      confirm-label="Hide"
      @confirm="confirmHide && setActive(confirmHide, false)"
      @cancel="confirmHide = null"
    />

    <ConfirmModal
      :open="confirmLogout"
      title="Log out?"
      message="You'll need your email and password to come back."
      confirm-label="Logout"
      :loading="loggingOut"
      @confirm="logout"
      @cancel="confirmLogout = false"
    />
  </div>
</template>

<style scoped>
.dash {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.dash__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 60px var(--page-gutter) 0;
}

.dash__brand {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 4px 16px;
}

.dash__suffix {
  --stroke: 2px;
  padding-bottom: 14px;
  color: var(--c-pink-dark);
  font-size: 32px;
  letter-spacing: 0.08em;
}

.dash__logout { margin-top: 37px; }

.dash__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 32px var(--page-gutter) 48px;
}

.stats {
  display: flex;
  gap: 24px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 226px;
  padding: 24px;
  border: 1px solid var(--c-black);
  border-radius: var(--radius-l);
  background: var(--c-white);
}

.stat__num {
  --stroke: 3px;
  color: var(--c-pink-dark);
  font-size: 36px;
  line-height: 1.2;
  letter-spacing: 0.08em;
}

.stat__label {
  --stroke: 2px;
  color: var(--c-gray);
  font-size: 16px;
  letter-spacing: 0.16em;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}

.search__input {
  --stroke: 2px;
  width: 100%;
  height: 52px;
  padding: 0 48px 0 16px;
  border: 1px solid var(--c-input-border);
  border-radius: var(--radius-m);
  background: var(--c-white);
  color: var(--c-white);
  font-size: 16px;
  letter-spacing: 0.16em;
  appearance: none;
}

.search__input::placeholder { color: var(--c-gray); }
.search__input::-webkit-search-cancel-button { display: none; }

.search__clear {
  position: absolute;
  right: 8px;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  background: transparent;
}

.tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.tab {
  --stroke: 1.5px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 0;
  border-bottom: 1px solid transparent;
  background: none;
  color: var(--c-black);
  -webkit-text-stroke: 0;
  font-size: 16px;
  letter-spacing: 0.16em;
  white-space: nowrap;
}

.tab .outlined { -webkit-text-stroke: 0; }
.tab--on { border-bottom-color: var(--c-pink-dark); color: var(--c-pink-dark); }
.tab--on .outlined { -webkit-text-stroke: 1.5px var(--c-black); }

.tab__count {
  min-width: 24px;
  padding: 1px 7px;
  border: 1px solid var(--c-black);
  border-radius: 999px;
  background: var(--c-white);
  color: var(--c-black);
  font-size: 12px;
  letter-spacing: 0;
}

.tab--on .tab__count { background: var(--c-light-pink); }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 300px));
  gap: 32px;
}

.skeleton {
  aspect-ratio: 3 / 4;
  border: 1px solid var(--c-gray);
  border-radius: var(--radius-l);
  background: linear-gradient(100deg, #eef4fb 40%, #ffffff 50%, #eef4fb 60%) 0 0 / 300% 100%;
  animation: shimmer 1.4s linear infinite;
}

@keyframes shimmer { to { background-position: -150% 0; } }

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 16px;
  text-align: center;
}

.empty__title {
  --stroke: 2.5px;
  color: var(--c-pink-dark);
  font-size: 26px;
  overflow-wrap: anywhere;
}

@media (max-width: 900px) {
  .dash__logout { margin-top: 20px; }
}

@media (max-width: 600px) {
  .dash__header { padding-top: 20px; }
  .dash__suffix { font-size: 20px; padding-bottom: 6px; }
  .dash__logout { margin-top: 0; min-height: 44px; padding: 10px 12px; font-size: 15px; }
  .dash__main { gap: 16px; padding-top: 20px; }
  .stats { gap: 12px; }
  .stat { flex: 1; width: auto; padding: 16px; gap: 8px; border-radius: var(--radius-m); }
  .stat__num { font-size: 28px; }
  .stat__label { font-size: 12px; letter-spacing: 0.1em; }
  .toolbar { flex-wrap: wrap; }
  .search { flex-basis: calc(100% - 56px); }
  .toolbar__add { flex-basis: 100%; }
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .empty__title { font-size: 20px; }
}
</style>
