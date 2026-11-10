import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { del } from '@vercel/blob'

/**
 * Frame files live in Vercel Blob. When BLOB_READ_WRITE_TOKEN is missing during
 * `nuxt dev`, files go to .data/uploads instead so the app can run without a Blob store.
 */
export type StorageMode = 'blob' | 'local'

const LOCAL_DIR = join(process.cwd(), '.data', 'uploads')
const LOCAL_PREFIX = '/api/local-files/'

export function storageMode(): StorageMode {
  if (process.env.BLOB_READ_WRITE_TOKEN) return 'blob'
  if (import.meta.dev) return 'local'
  throw createError({ statusCode: 500, statusMessage: 'File storage is not configured (BLOB_READ_WRITE_TOKEN).' })
}

export function isLocalUrl(url: string): boolean {
  return url.startsWith(LOCAL_PREFIX)
}

export function localPath(fileName: string): string | null {
  return /^[0-9a-f-]{36}\.png$/.test(fileName) ? join(LOCAL_DIR, fileName) : null
}

export async function saveLocalPng(bytes: Buffer): Promise<string> {
  await mkdir(LOCAL_DIR, { recursive: true })
  const fileName = `${randomUUID()}.png`
  await writeFile(join(LOCAL_DIR, fileName), bytes)
  return LOCAL_PREFIX + fileName
}

/** Only accept URLs this app could have produced, so a forged request can't point frames elsewhere. */
export function isOwnFileUrl(url: string): boolean {
  if (isLocalUrl(url)) return storageMode() === 'local' && localPath(url.slice(LOCAL_PREFIX.length)) !== null
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && u.hostname.endsWith('.public.blob.vercel-storage.com')
  } catch {
    return false
  }
}

/** Reads the first bytes of a stored file plus its total size. */
export async function readFileHead(url: string): Promise<{ head: Uint8Array, size: number }> {
  if (isLocalUrl(url)) {
    const path = localPath(url.slice(LOCAL_PREFIX.length))
    if (!path) throw new Error('bad local path')
    const buf = await readFile(path)
    return { head: buf.subarray(0, 64), size: buf.length }
  }
  const res = await fetch(url, { headers: { Range: 'bytes=0-63' } })
  if (!res.ok) throw new Error(`fetch ${res.status}`)
  const head = new Uint8Array(await res.arrayBuffer()).subarray(0, 64)
  const range = res.headers.get('content-range') // "bytes 0-63/123456"
  const total = range?.split('/')[1]
  const size = total ? Number(total) : Number(res.headers.get('content-length') ?? 0)
  return { head, size }
}

export async function deleteStoredFile(url: string): Promise<void> {
  try {
    if (isLocalUrl(url)) {
      const path = localPath(url.slice(LOCAL_PREFIX.length))
      if (path) await unlink(path)
      return
    }
    await del(url)
  } catch (err) {
    // A leftover file costs a little storage; it must not block deleting the record.
    console.error('[storage] could not delete', url, err)
  }
}

/** Width and height from a PNG's IHDR chunk, or null if the bytes aren't a PNG. */
export function readPngSize(head: Uint8Array): { width: number, height: number } | null {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (head.length < 24 || sig.some((b, i) => head[i] !== b)) return null
  const view = new DataView(head.buffer, head.byteOffset, head.byteLength)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}
