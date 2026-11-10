import { z } from 'zod'

const bodySchema = z.union([
  z.object({ name: frameNameSchema }).strict(),
  z.object({ isActive: z.boolean() }).strict(),
])

/** Rename a frame, or switch it active/inactive. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!isUuid(id)) throw createError({ statusCode: 404, statusMessage: 'Frame not found.' })

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message ?? 'Nothing to update.' })
  }

  const sql = useDb()
  try {
    const rows = 'name' in parsed.data
      ? await sql<FrameRow[]>`
          update frames set name = ${parsed.data.name}, name_key = ${nameKey(parsed.data.name)}, updated_at = now()
          where id = ${id}
          returning id, name, blob_url, width, height, slots, is_active, created_at`
      : await sql<FrameRow[]>`
          update frames set is_active = ${parsed.data.isActive}, updated_at = now()
          where id = ${id}
          returning id, name, blob_url, width, height, slots, is_active, created_at`
    if (!rows[0]) throw createError({ statusCode: 404, statusMessage: 'This frame was already deleted.' })
    return toAdminFrame(rows[0])
  } catch (err) {
    if ((err as { code?: string }).code === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'A frame with this name already exists.' })
    }
    throw err
  }
})
