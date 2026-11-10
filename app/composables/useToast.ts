export interface Toast {
  id: number
  message: string
  tone: 'info' | 'error'
}

let nextId = 1

export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => [])

  function dismiss(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  function show(message: string, tone: Toast['tone'] = 'info', ms = 3500) {
    const id = nextId++
    toasts.value = [...toasts.value.slice(-1), { id, message, tone }]
    if (import.meta.client) setTimeout(() => dismiss(id), ms)
  }

  return {
    toasts,
    info: (message: string) => show(message, 'info'),
    error: (message: string) => show(message, 'error', 5000),
    dismiss,
  }
}

/** Pulls a readable message out of a $fetch error. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Try again.'): string {
  const e = err as { data?: { statusMessage?: string, message?: string }, statusMessage?: string, statusCode?: number }
  if (e?.statusCode === undefined && (err as Error)?.name === 'FetchError') {
    return 'You seem to be offline. Check your connection and try again.'
  }
  return e?.data?.statusMessage || e?.statusMessage || fallback
}
