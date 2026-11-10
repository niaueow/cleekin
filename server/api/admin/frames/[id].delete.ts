export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!isUuid(id)) throw createError({ statusCode: 404, statusMessage: 'Frame not found.' })

  const sql = useDb()
  const [row] = await sql<{ blob_url: string }[]>`delete from frames where id = ${id} returning blob_url`
  if (!row) throw createError({ statusCode: 404, statusMessage: 'This frame was already deleted.' })

  await deleteStoredFile(row.blob_url)
  return { ok: true }
})
