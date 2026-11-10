// Prints the value for NUXT_ADMIN_PASSWORD_HASH.
// Usage: npm run hash-password -- "your password"
// The hash is base64-encoded so the $ signs inside it survive .env files and the Vercel dashboard.
import { Hash } from '@adonisjs/hash'
import { Scrypt } from '@adonisjs/hash/drivers/scrypt'

const password = process.argv[2]
if (!password || password.length < 12) {
  console.error('Pass a password of at least 12 characters: npm run hash-password -- "your password"')
  process.exit(1)
}

const hash = await new Hash(new Scrypt({})).make(password)
console.log(Buffer.from(hash, 'utf8').toString('base64'))
