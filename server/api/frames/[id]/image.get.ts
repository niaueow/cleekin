import { readFile } from 'node:fs/promises'

/**
 * Same-origin copy of a frame image. The booth falls back to this when the browser
 * can't load the Blob URL with CORS, which the canvas needs for exporting the photo.
 * Admins may load inactive frames through it too (for the preview).
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!isUuid(id)) throw createError({ statusCode: 404, statusMessage: 'Frame not found.' })

  const session = await getUserSession(event)
  const isAdmin = session.user?.role === 'admin'

  const sql = useDb()
  const [row] = await sql<{ blob_url: string, is_active: boolean }[]>`
    select blob_url, is_active from frames where id = ${id}
  `
  if (!row || (!row.is_active && !isAdmin)) throw createError({ statusCode: 404, statusMessage: 'Frame not found.' })

  setHeader(event, 'Content-Type', 'image/png')
  setHeader(event, 'Cache-Control', 'public, max-age=300')

  if (isLocalUrl(row.blob_url)) {
    const path = localPath(row.blob_url.split('/').pop() ?? '')
    if (!path) throw createError({ statusCode: 404 })
    return readFile(path)
  }

  const res = await fetch(row.blob_url)
  if (!res.ok || !res.body) throw createError({ statusCode: 502, statusMessage: 'Could not load the frame image.' })
  return sendStream(event, res.body)
})
