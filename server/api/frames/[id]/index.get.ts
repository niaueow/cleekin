/** One active frame for the booth screen. Inactive and deleted frames both return 404. */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!isUuid(id)) throw createError({ statusCode: 404, statusMessage: 'Frame not found.' })

  const sql = useDb()
  const [row] = await sql<FrameRow[]>`
    select id, name, blob_url, width, height, slots, is_active, created_at
    from frames
    where id = ${id} and is_active
  `
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Frame not found.' })
  setHeader(event, 'Cache-Control', 'no-store')
  return toPublicFrame(row)
})
