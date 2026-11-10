/**
 * Photo placement and compositing. Every photo is drawn the same way in the live preview
 * and in the final JPEG, so what visitors see is what they download.
 */

export interface Photo {
  /** Object URL of the image (camera capture or uploaded file). */
  url: string
  width: number
  height: number
  source: 'camera' | 'upload'
  /** 1 = just covers the slot. Only uploads can change zoom/pan. */
  zoom: number
  /** Offset of the image center from the slot center, in frame pixels. */
  panX: number
  panY: number
}

export const MAX_ZOOM = 4

/** Rectangle (in frame pixels) where the photo is drawn so it covers the slot. */
export function photoRect(slot: Slot, photo: Pick<Photo, 'width' | 'height' | 'zoom' | 'panX' | 'panY'>) {
  const base = Math.max(slot.w / photo.width, slot.h / photo.height)
  const w = photo.width * base * photo.zoom
  const h = photo.height * base * photo.zoom
  const { panX, panY } = clampPan(slot, w, h, photo.panX, photo.panY)
  return {
    x: slot.x + (slot.w - w) / 2 + panX,
    y: slot.y + (slot.h - h) / 2 + panY,
    w,
    h,
  }
}

/** Keeps the image covering the whole slot. */
export function clampPan(slot: Slot, w: number, h: number, panX: number, panY: number) {
  const maxX = Math.max(0, (w - slot.w) / 2)
  const maxY = Math.max(0, (h - slot.h) / 2)
  return {
    panX: Math.min(maxX, Math.max(-maxX, panX)),
    panY: Math.min(maxY, Math.max(-maxY, panY)),
  }
}

export function clampPhoto(slot: Slot, photo: Photo): Photo {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, photo.zoom))
  const base = Math.max(slot.w / photo.width, slot.h / photo.height)
  const { panX, panY } = clampPan(slot, photo.width * base * zoom, photo.height * base * zoom, photo.panX, photo.panY)
  return { ...photo, zoom, panX, panY }
}

export function loadImage(src: string, crossOrigin = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (crossOrigin) img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Could not load ${src}`))
    img.src = src
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Canvas export failed'))), type, quality)
  })
}

/**
 * Grabs the current video frame, center-cropped to the slot's shape.
 * Front camera shots are mirrored to match the preview.
 */
export async function captureFromVideo(video: HTMLVideoElement, slot: Slot, mirror: boolean): Promise<Photo> {
  const vw = video.videoWidth
  const vh = video.videoHeight
  const slotRatio = slot.w / slot.h
  let sw = vw
  let sh = vw / slotRatio
  if (sh > vh) {
    sh = vh
    sw = vh * slotRatio
  }
  const sx = (vw - sw) / 2
  const sy = (vh - sh) / 2

  // Keep the camera's full detail but never more than twice the slot size.
  const scale = Math.min(1, (slot.w * 2) / sw)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(sw * scale)
  canvas.height = Math.round(sh * scale)
  const ctx = canvas.getContext('2d')!
  if (mirror) {
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.95)
  return {
    url: URL.createObjectURL(blob),
    width: canvas.width,
    height: canvas.height,
    source: 'camera',
    zoom: 1,
    panX: 0,
    panY: 0,
  }
}

export class PhotoFileError extends Error {}

function isHeic(file: File) {
  return /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)
}

/** Turns a picked file into a Photo. Converts HEIC in the browser when needed. */
export async function photoFromFile(file: File): Promise<Photo> {
  const okType = /^image\/(jpeg|png|webp|hei[cf])$/i.test(file.type) || /\.(jpe?g|png|webp|hei[cf])$/i.test(file.name)
  if (!okType) throw new PhotoFileError(`"${file.name}" isn't a supported photo. Use JPG, PNG, WebP, or HEIC.`)
  if (file.size > PHOTO_RULES.maxFileBytes) throw new PhotoFileError(`"${file.name}" is over 15 MB. Try a smaller photo.`)

  let blob: Blob = file
  let url = URL.createObjectURL(blob)
  try {
    const img = await loadImage(url)
    return { url, width: img.naturalWidth, height: img.naturalHeight, source: 'upload', zoom: 1, panX: 0, panY: 0 }
  } catch {
    URL.revokeObjectURL(url)
    if (!isHeic(file)) throw new PhotoFileError(`"${file.name}" couldn't be opened. Try another photo.`)
  }

  // Safari opens HEIC natively; other browsers need converting.
  try {
    const { default: heic2any } = await import('heic2any')
    const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 })
    blob = Array.isArray(out) ? out[0]! : out
    url = URL.createObjectURL(blob)
    const img = await loadImage(url)
    return { url, width: img.naturalWidth, height: img.naturalHeight, source: 'upload', zoom: 1, panX: 0, panY: 0 }
  } catch {
    throw new PhotoFileError(`"${file.name}" couldn't be converted. Try a JPG or PNG instead.`)
  }
}

/** iOS Safari refuses canvases above ~16.7M pixels, so very large frames are scaled down. */
const MAX_CANVAS_PIXELS = 16_000_000

/** Draws every photo under the frame and returns the finished JPEG. */
export async function composite(frame: HTMLImageElement, width: number, height: number, slots: Slot[], photos: (Photo | null)[]): Promise<Blob> {
  const scale = Math.min(1, Math.sqrt(MAX_CANVAS_PIXELS / (width * height)))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.imageSmoothingQuality = 'high'

  // JPEG has no transparency; transparent areas outside the frame become white.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  const images = await Promise.all(photos.map(p => (p ? loadImage(p.url) : null)))
  slots.forEach((slot, i) => {
    const photo = photos[i]
    const img = images[i]
    if (!photo || !img) return
    const r = photoRect(slot, photo)
    ctx.save()
    ctx.beginPath()
    ctx.rect(slot.x, slot.y, slot.w, slot.h)
    ctx.clip()
    ctx.drawImage(img, r.x, r.y, r.w, r.h)
    ctx.restore()
  })

  ctx.drawImage(frame, 0, 0, width, height)
  return canvasToBlob(canvas, 'image/jpeg', 0.92)
}

export function downloadName(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `cleekin-${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}.jpg`
}
