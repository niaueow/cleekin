/**
 * Finds photo slots in a frame PNG: fully transparent areas that the frame encloses.
 * Transparent areas touching the image edge (e.g. rounded outer corners) are not slots.
 */

export interface FrameCheck {
  width: number
  height: number
  slots: Slot[]
}

export class FrameFileError extends Error {}

const ANALYSIS_MAX_SIDE = 1200
const ALPHA_CUTOFF = 8 // out of 255; averaged pixels at hole edges keep a little alpha

async function readPngHeader(file: File): Promise<{ width: number, height: number } | null> {
  const head = new Uint8Array(await file.slice(0, 24).arrayBuffer())
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (head.length < 24 || sig.some((b, i) => head[i] !== b)) return null
  const view = new DataView(head.buffer)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

export async function checkFrameFile(file: File): Promise<FrameCheck> {
  if (file.size > FRAME_RULES.maxFileBytes) {
    throw new FrameFileError(`This file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB.`)
  }
  const header = await readPngHeader(file)
  if (!header) throw new FrameFileError('Only PNG files work as frames.')
  const { width, height } = header
  if (Math.min(width, height) < FRAME_RULES.minShortSide) {
    throw new FrameFileError(`This frame is ${width}×${height}px. The shorter side must be at least ${FRAME_RULES.minShortSide}px.`)
  }

  const url = URL.createObjectURL(file)
  let img: HTMLImageElement
  try {
    img = await loadImage(url)
  } catch {
    throw new FrameFileError('This PNG couldn\'t be opened. Try exporting it again.')
  } finally {
    URL.revokeObjectURL(url)
  }

  const slots = findSlots(img, width, height)
  if (slots.length === 0) {
    throw new FrameFileError('No photo slots found. Make the photo areas fully transparent and surrounded by the frame.')
  }
  if (slots.length > FRAME_RULES.maxSlots) {
    throw new FrameFileError(`Found ${slots.length} photo slots. A frame can have at most ${FRAME_RULES.maxSlots}.`)
  }
  return { width, height, slots }
}

function findSlots(img: HTMLImageElement, W: number, H: number): Slot[] {
  const f = Math.min(1, ANALYSIS_MAX_SIDE / Math.max(W, H))
  const w = Math.max(1, Math.round(W * f))
  const h = Math.max(1, Math.round(H * f))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, w, h)
  const data = ctx.getImageData(0, 0, w, h).data

  const clear = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) clear[i] = data[i * 4 + 3]! < ALPHA_CUTOFF ? 1 : 0

  const seen = new Uint8Array(w * h)
  const queue = new Int32Array(w * h)
  const found: { minX: number, minY: number, maxX: number, maxY: number, area: number }[] = []

  for (let start = 0; start < w * h; start++) {
    if (!clear[start] || seen[start]) continue
    let head = 0
    let tail = 0
    queue[tail++] = start
    seen[start] = 1
    let minX = w, minY = h, maxX = 0, maxY = 0, area = 0
    let touchesEdge = false
    while (head < tail) {
      const p = queue[head++]!
      const x = p % w
      const y = (p - x) / w
      area++
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touchesEdge = true
      if (x > 0 && clear[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; queue[tail++] = p - 1 }
      if (x < w - 1 && clear[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; queue[tail++] = p + 1 }
      if (y > 0 && clear[p - w] && !seen[p - w]) { seen[p - w] = 1; queue[tail++] = p - w }
      if (y < h - 1 && clear[p + w] && !seen[p + w]) { seen[p + w] = 1; queue[tail++] = p + w }
    }
    if (!touchesEdge) found.push({ minX, minY, maxX, maxY, area })
  }

  // Ignore specks: a slot must be at least 5% of the short side wide and tall,
  // and cover at least 0.4% of the frame.
  const minSide = Math.min(w, h) * 0.05
  const minArea = w * h * 0.004
  const slots: Slot[] = found
    .filter(c => c.maxX - c.minX + 1 >= minSide && c.maxY - c.minY + 1 >= minSide && c.area >= minArea)
    .map((c) => {
      // Back to full resolution, grown by one analysis pixel so photos tuck under the frame edge.
      const x = Math.max(0, Math.floor((c.minX - 1) / f))
      const y = Math.max(0, Math.floor((c.minY - 1) / f))
      const x2 = Math.min(W, Math.ceil((c.maxX + 2) / f))
      const y2 = Math.min(H, Math.ceil((c.maxY + 2) / f))
      return { x, y, w: x2 - x, h: y2 - y }
    })

  return readingOrder(slots)
}

/** Top-to-bottom rows, left-to-right inside each row. */
function readingOrder(slots: Slot[]): Slot[] {
  const sorted = [...slots].sort((a, b) => a.y - b.y)
  const rows: Slot[][] = []
  for (const s of sorted) {
    const row = rows[rows.length - 1]
    const anchor = row?.[0]
    if (anchor && s.y < anchor.y + anchor.h / 2) row!.push(s)
    else rows.push([s])
  }
  return rows.flatMap(r => r.sort((a, b) => a.x - b.x))
}
