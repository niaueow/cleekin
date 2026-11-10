import postgres from 'postgres'

let client: postgres.Sql | undefined

/**
 * Shared Postgres client. Works with Neon's pooled connection string in production
 * and with a local Postgres in development. `prepare: false` is required for Neon's pooler.
 */
export function useDb(): postgres.Sql {
  if (client) return client
  const url = useRuntimeConfig().databaseUrl
  if (!url) {
    throw createError({ statusCode: 500, statusMessage: 'Database is not configured (NUXT_DATABASE_URL).' })
  }
  client = postgres(url, {
    prepare: false,
    max: import.meta.dev ? 5 : 1,
    idle_timeout: 20,
    onnotice: () => {},
  })
  return client
}

export interface FrameRow {
  id: string
  name: string
  blob_url: string
  width: number
  height: number
  slots: Slot[]
  is_active: boolean
  created_at: Date
}

export function toPublicFrame(row: FrameRow): PublicFrame {
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.blob_url,
    width: row.width,
    height: row.height,
    slots: row.slots,
    createdAt: row.created_at.toISOString(),
  }
}

export function toAdminFrame(row: FrameRow): AdminFrame {
  return { ...toPublicFrame(row), isActive: row.is_active }
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}
