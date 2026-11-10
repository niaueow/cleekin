import type { Photo } from '~/utils/photo'

/**
 * Photos for the current booth session. Kept in memory only: never uploaded and gone on refresh.
 * Module-level so the result page can read what the booth page captured.
 */
interface BoothSession {
  frameId: string | null
  frame: PublicFrame | null
  frameSrc: string
  photos: (Photo | null)[]
  resultUrl: string | null
  downloaded: boolean
}

const session = reactive<BoothSession>({ frameId: null, frame: null, frameSrc: '', photos: [], resultUrl: null, downloaded: false })

function revoke(url: string | null | undefined) {
  if (url) URL.revokeObjectURL(url)
}

export function useBoothSession() {
  /** Starts fresh unless we're returning to the same frame (e.g. from the result screen). */
  function open(frame: PublicFrame, frameSrc: string) {
    session.frame = frame
    session.frameSrc = frameSrc
    if (session.frameId === frame.id && session.photos.length === frame.slots.length) return
    reset()
    session.frame = frame
    session.frameSrc = frameSrc
    session.frameId = frame.id
    session.photos = Array.from({ length: frame.slots.length }, () => null)
  }

  function setPhoto(index: number, photo: Photo | null) {
    const old = session.photos[index]
    if (old && old.url !== photo?.url) revoke(old.url)
    session.photos[index] = photo
    clearResult()
  }

  function clearResult() {
    revoke(session.resultUrl)
    session.resultUrl = null
    session.downloaded = false
  }

  function reset() {
    session.photos.forEach(p => revoke(p?.url))
    clearResult()
    session.frameId = null
    session.frame = null
    session.frameSrc = ''
    session.photos = []
  }

  const hasPhotos = computed(() => session.photos.some(Boolean))
  const isComplete = computed(() => session.photos.length > 0 && session.photos.every(Boolean))

  return { session, open, setPhoto, clearResult, reset, hasPhotos, isComplete }
}
