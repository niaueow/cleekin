export type CameraProblem = 'denied' | 'not-found' | 'busy' | 'in-app' | 'unsupported' | 'unknown'

export const CAMERA_MESSAGES: Record<CameraProblem, { title: string, body: string }> = {
  'denied': {
    title: 'We can\'t see you yet!',
    body: 'Allow camera access in your browser settings, then tap Try again. You can still upload photos.',
  },
  'not-found': {
    title: 'No camera found.',
    body: 'Connect a camera and tap Try again, or upload photos instead.',
  },
  'busy': {
    title: 'Your camera is busy.',
    body: 'Close other apps using it (like Zoom or FaceTime), then tap Try again. You can still upload photos.',
  },
  'in-app': {
    title: 'The camera doesn\'t work in this app.',
    body: 'Open this page in Chrome or Safari to use the camera. You can still upload photos here.',
  },
  'unsupported': {
    title: 'This browser can\'t use the camera.',
    body: 'Try the latest Chrome or Safari, or upload photos instead.',
  },
  'unknown': {
    title: 'The camera didn\'t start.',
    body: 'Tap Try again, or upload photos instead.',
  },
}

function isInAppBrowser(): boolean {
  return /Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|Bytedance|Line\/|Snapchat|Twitter|LinkedInApp|Pinterest/i.test(navigator.userAgent)
}

function classify(err: unknown): CameraProblem {
  if (isInAppBrowser()) return 'in-app'
  const name = (err as DOMException)?.name
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') return 'denied'
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError') return 'not-found'
  if (name === 'NotReadableError' || name === 'AbortError' || name === 'TrackStartError') return 'busy'
  if (name === 'NotSupportedError') return 'unsupported'
  return 'unknown'
}

export function useCamera() {
  const stream = shallowRef<MediaStream | null>(null)
  const problem = ref<CameraProblem | null>(null)
  const starting = ref(false)
  const facing = ref<'user' | 'environment'>('user')
  const canSwitch = ref(false)
  /** Front camera preview and photos are mirrored. */
  const mirrored = computed(() => facing.value === 'user')

  function stop() {
    stream.value?.getTracks().forEach(t => t.stop())
    stream.value = null
  }

  async function start() {
    if (starting.value) return
    starting.value = true
    problem.value = null
    stop()
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        problem.value = isInAppBrowser() ? 'in-app' : 'unsupported'
        return
      }
      const s = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: facing.value, width: { ideal: 1920 }, height: { ideal: 1440 } },
      })
      stream.value = s
      // A track can end on its own (camera unplugged, another app takes it).
      s.getVideoTracks().forEach(t => t.addEventListener('ended', () => {
        if (stream.value === s) {
          stream.value = null
          problem.value = 'busy'
        }
      }))
      const devices = await navigator.mediaDevices.enumerateDevices()
      canSwitch.value = devices.filter(d => d.kind === 'videoinput').length > 1
    } catch (err) {
      problem.value = classify(err)
    } finally {
      starting.value = false
    }
  }

  async function switchCamera() {
    facing.value = facing.value === 'user' ? 'environment' : 'user'
    await start()
  }

  onBeforeUnmount(stop)

  return { stream, problem, starting, facing, mirrored, canSwitch, start, stop, switchCamera }
}
