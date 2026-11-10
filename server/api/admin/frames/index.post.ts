import { z } from 'zod'
import type postgres from 'postgres'

const bodySchema = z.object({
  name: frameNameSchema,
  isActive: z.boolean(),
  fileUrl: z.string().min(1).max(2048),
  slots: slotsSchema,
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message ?? 'Check the form and try again.' })
  }
  const { name, isActive, fileUrl, slots } = parsed.data

  if (!isOwnFileUrl(fileUrl)) {
    throw createError({ statusCode: 400, statusMessage: 'That file didn\'t come from this app. Upload it again.' })
  }

  // From here on, a rejected request must also remove the uploaded file.
  const reject = async (statusCode: number, statusMessage: string) => {
    await deleteStoredFile(fileUrl)
    return createError({ statusCode, statusMessage })
  }

  let head: Uint8Array
  let size: number
  try {
    ({ head, size } = await readFileHead(fileUrl))
  } catch {
    throw await reject(400, 'The uploaded file couldn\'t be read. Upload it again.')
  }

  const dims = readPngSize(head)
  if (!dims) throw await reject(415, 'Only PNG files work as frames.')
  if (size > FRAME_RULES.maxFileBytes) throw await reject(413, 'This file is over 5 MB.')
  if (Math.min(dims.width, dims.height) < FRAME_RULES.minShortSide) {
    throw await reject(400, `The frame's shorter side must be at least ${FRAME_RULES.minShortSide}px.`)
  }
  const outOfBounds = slots.some(s => s.x + s.w > dims.width || s.y + s.h > dims.height)
  if (outOfBounds) throw await reject(400, 'Slot positions don\'t match this image. Upload it again.')

  const sql = useDb()
  try {
    const [row] = await sql<FrameRow[]>`
      insert into frames (name, name_key, blob_url, width, height, slots, is_active)
      values (${name}, ${nameKey(name)}, ${fileUrl}, ${dims.width}, ${dims.height}, ${sql.json(slots as unknown as postgres.JSONValue)}, ${isActive})
      returning id, name, blob_url, width, height, slots, is_active, created_at
    `
    setResponseStatus(event, 201)
    return toAdminFrame(row!)
  } catch (err) {
    if ((err as { code?: string }).code === '23505') {
      throw await reject(409, 'A frame with this name already exists.')
    }
    await deleteStoredFile(fileUrl)
    throw err
  }
})
