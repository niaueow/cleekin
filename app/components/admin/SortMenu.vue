<script setup lang="ts">
import { ArrowDownUp, Check } from 'lucide-vue-next'



const model = defineModel<SortKey>({ required: true })
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const menuId = useId()

const options: { key: SortKey, label: string }[] = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'az', label: 'Name A-Z' },
  { key: 'za', label: 'Name Z-A' },
]

function choose(key: SortKey) {
  model.value = key
  open.value = false
}

function onDocClick(e: MouseEvent) {
  if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) {
    open.value = false
    root.value?.querySelector<HTMLElement>('.sort__btn')?.focus()
  }
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div ref="root" class="sort">
    <AppButton
      icon-only
      class="sort__btn"
      :aria-label="`Sort: ${options.find(o => o.key === model)?.label}`"
      :aria-expanded="open"
      :aria-controls="menuId"
      title="Sort"
      @click="open = !open"
    >
      <template #icon><ArrowDownUp aria-hidden="true" /></template>
    </AppButton>
    <span v-if="model !== 'newest'" class="sort__dot" aria-hidden="true" />
    <ul v-if="open" :id="menuId" class="sort__menu" role="menu">
      <li v-for="o in options" :key="o.key" role="none">
        <button type="button" role="menuitemradio" :aria-checked="model === o.key" class="sort__item" @click="choose(o.key)">
          <span>{{ o.label }}</span>
          <Check v-if="model === o.key" :size="18" aria-hidden="true" />
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.sort { position: relative; }

.sort__dot {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 12px;
  height: 12px;
  border: 1px solid var(--c-black);
  border-radius: 50%;
  background: var(--c-blue);
}

.sort__menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 20;
  min-width: 200px;
  margin: 0;
  padding: 6px;
  border: 1px solid var(--c-black);
  border-radius: var(--radius-m);
  background: var(--c-white);
  list-style: none;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
}

.sort__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: 0;
  border-radius: var(--radius-s);
  background: transparent;
  font-size: 14px;
  text-align: left;
}

.sort__item:hover, .sort__item:focus-visible { background: var(--c-light-pink); box-shadow: none; }
.sort__item[aria-checked='true'] { color: var(--c-pink-dark); }
</style>
