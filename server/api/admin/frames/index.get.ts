export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const sql = useDb()
  const rows = await sql<FrameRow[]>`
    select id, name, blob_url, width, height, slots, is_active, created_at
    from frames
    order by created_at desc
  `
  setHeader(event, 'Cache-Control', 'no-store')
  return { frames: rows.map(toAdminFrame), storage: storageMode() }
})
