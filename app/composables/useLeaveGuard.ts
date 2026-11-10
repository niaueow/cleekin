/**
 * Warns before leaving while unsaved photos exist.
 * In-app navigation (Back, Home, browser back) opens our dialog; refresh/close uses the browser's own prompt.
 * `allow(path)` lets a specific navigation through without asking.
 */
export function useLeaveGuard(shouldWarn: () => boolean) {
  const open = ref(false)
  let resolver: ((leave: boolean) => void) | null = null
  const allowed = new Set<string>()

  function ask(): Promise<boolean> {
    open.value = true
    return new Promise((resolve) => { resolver = resolve })
  }

  function answer(leave: boolean) {
    open.value = false
    resolver?.(leave)
    resolver = null
  }

  function allow(path: string) {
    allowed.add(path)
  }

  onBeforeRouteLeave(async (to) => {
    if (allowed.has(to.path)) {
      allowed.delete(to.path)
      return true
    }
    if (!shouldWarn()) return true
    return await ask()
  })

  function onBeforeUnload(e: BeforeUnloadEvent) {
    if (!shouldWarn()) return
    e.preventDefault()
    e.returnValue = ''
  }

  onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
  onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))

  return { open, answer, allow }
}
