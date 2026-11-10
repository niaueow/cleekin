import { z } from 'zod'

const MAX_FAILS = 5
const WINDOW_MINUTES = 15

const bodySchema = z.object({
  email: z.string().trim().max(254),
  password: z.string().max(200),
})

export default defineEventHandler(async (event) => {
  const { adminEmail, adminPasswordHash } = useRuntimeConfig(event)
  if (!adminEmail || !adminPasswordHash) {
    throw createError({ statusCode: 500, statusMessage: 'Admin login isn\'t set up yet. Check SETUP.md.' })
  }

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Enter your email and password.' })
  }

  const sql = useDb()
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'

  await sql`delete from login_attempts where attempted_at < now() - interval '1 day'`
  const [recent] = await sql<{ count: number, oldest: Date | null }[]>`
    select count(*)::int as count, min(attempted_at) as oldest
    from login_attempts
    where ip = ${ip} and attempted_at > now() - make_interval(mins => ${WINDOW_MINUTES})
  `
  if (recent && recent.count >= MAX_FAILS && recent.oldest) {
    const unlockAt = recent.oldest.getTime() + WINDOW_MINUTES * 60_000
    const minutes = Math.max(1, Math.ceil((unlockAt - Date.now()) / 60_000))
    throw createError({
      statusCode: 429,
      statusMessage: `Too many tries. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
    })
  }

  const storedHash = Buffer.from(adminPasswordHash, 'base64').toString('utf8')
  const { email, password } = parsed.data
  // Always verify the password, even for a wrong email, so both failures take the same time.
  const passwordOk = await verifyPassword(storedHash, password).catch(() => false)
  const emailOk = email.toLowerCase() === adminEmail.trim().toLowerCase()

  if (!passwordOk || !emailOk) {
    await sql`insert into login_attempts (ip) values (${ip})`
    throw createError({ statusCode: 401, statusMessage: 'Email or password is wrong.' })
  }

  await sql`delete from login_attempts where ip = ${ip}`
  await setUserSession(event, { user: { email: adminEmail, role: 'admin' } })
  return { ok: true }
})
