import { readFile } from 'node:fs/promises'

/** Serves frame files saved to .data/uploads during local development (no Blob token). */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) throw createError({ statusCode: 404 })
  const path = localPath(getRouterParam(event, 'name') ?? '')
  if (!path) throw createError({ statusCode: 404 })
  try {
    const file = await readFile(path)
    setHeader(event, 'Content-Type', 'image/png')
    return file
  } catch {
    throw createError({ statusCode: 404 })
  }
})
