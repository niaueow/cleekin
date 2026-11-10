/** Active frames for the visitor home screen, newest first. */
export default defineEventHandler(async (event) => {
  const sql = useDb()
  const rows = await sql<FrameRow[]>`
    select id, name, blob_url, width, height, slots, is_active, created_at
    from frames
    where is_active
    order by created_at desc
  `
  setHeader(event, 'Cache-Control', 'no-store')
  return rows.map(toPublicFrame)
})
