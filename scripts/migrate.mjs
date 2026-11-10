// Creates the Cleekin tables. Usage: npm run db:migrate
// Reads NUXT_DATABASE_URL from the environment or from .env.
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

if (existsSync('.env')) process.loadEnvFile('.env')

const url = process.env.NUXT_DATABASE_URL
if (!url) {
  console.error('NUXT_DATABASE_URL is not set. Add it to .env first.')
  process.exit(1)
}

const sql = postgres(url, { prepare: false, max: 1, onnotice: () => {} })
const schema = readFileSync(fileURLToPath(new URL('../db/schema.sql', import.meta.url)), 'utf8')

try {
  await sql.unsafe(schema)
  console.log('Database is ready.')
} catch (err) {
  console.error('Migration failed:', err.message)
  process.exitCode = 1
} finally {
  await sql.end()
}
