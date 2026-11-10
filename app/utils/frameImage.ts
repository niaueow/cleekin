/**
 * Loads a frame image so it can be drawn on a canvas and exported.
 * Tries the Blob URL with CORS first; falls back to the same-origin proxy route.
 */
export async function loadFrameImage(frame: PublicFrame): Promise<HTMLImageElement> {
  const sameOrigin = frame.imageUrl.startsWith('/')
  try {
    return await loadImage(frame.imageUrl, !sameOrigin)
  } catch {
    return await loadImage(`/api/frames/${frame.id}/image`)
  }
}
