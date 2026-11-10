import type { H3Event } from 'h3'

/** Throws 401 unless the request carries the admin session. */
export async function requireAdmin(event: H3Event): Promise<void> {
  const session = await getUserSession(event)
  if (!session.user || session.user.role !== 'admin') {
    throw createError({ statusCode: 401, statusMessage: 'Please log in again.' })
  }
}
