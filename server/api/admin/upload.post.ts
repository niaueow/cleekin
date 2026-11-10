import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'

/**
 * Blob mode: issues a short-lived client upload token, so the PNG goes straight from the
 * browser to Vercel Blob (Vercel functions reject bodies over 4.5 MB).
 * Local mode (dev without a Blob token): accepts the raw PNG body and saves it to disk.
 */
export default defineEventHandler(async (event) => {
  if (storageMode() === 'local') {
    await requireAdmin(event)
    const bytes = await readRawBody(event, false)
    if (!bytes || bytes.length === 0) throw createError({ statusCode: 400, statusMessage: 'The file is empty.' })
    if (bytes.length > FRAME_RULES.maxFileBytes) throw createError({ statusCode: 413, statusMessage: 'This file is over 5 MB.' })
    if (!readPngSize(bytes.subarray(0, 64))) throw createError({ statusCode: 415, statusMessage: 'Only PNG files work as frames.' })
    return { url: await saveLocalPng(bytes) }
  }

  const body = (await readBody(event)) as HandleUploadBody
  try {
    return await handleUpload({
      body,
      request: toWebRequest(event),
      onBeforeGenerateToken: async () => {
        // Token requests come from the admin's browser; completion callbacks come from
        // Vercel and are verified by handleUpload's signature check instead.
        await requireAdmin(event)
        return {
          allowedContentTypes: ['image/png'],
          maximumSizeInBytes: FRAME_RULES.maxFileBytes,
          addRandomSuffix: true,
        }
      },
      onUploadCompleted: async () => {},
    })
  } catch (err) {
    if (isError(err)) throw err
    throw createError({ statusCode: 400, statusMessage: 'Upload could not start. Try again.' })
  }
})
