# Setting up Cleekin

You need Node.js 22.22 or newer, a Neon account, and a Vercel account. Everything below works on Windows on ARM (no native modules).

## 1. Run it on your laptop

```bash
npm install
```

Create a Neon project at neon.tech, open **Connection Details**, tick **Pooled connection**, and copy the connection string.

Copy `.env.example` to `.env` and fill it in:

- `NUXT_DATABASE_URL`: the pooled Neon string.
- `NUXT_ADMIN_EMAIL`: the email you'll log in with.
- `NUXT_ADMIN_PASSWORD_HASH`: run the command below and paste what it prints. Use at least 12 characters.
- `NUXT_APP_SECRET`: any random string of 32+ characters. `openssl rand -base64 32` makes one; on Windows you can use a password manager's generator instead.
- `BLOB_READ_WRITE_TOKEN`: leave empty for now. Frames are saved to `.data/uploads` while it's empty.

```bash
npm run hash-password -- "your password here"
```

Create the tables, then start the app:

```bash
npm run db:migrate
```

```bash
npm run dev
```

Open http://localhost:3000 for the visitor side and http://localhost:3000/admin for the dashboard. Camera access works on `localhost`; on other hosts browsers require HTTPS.

## 2. Deploy to Vercel

1. Push the repo to GitHub and import it in Vercel. The Nuxt preset is detected automatically.
2. In the Vercel project, open **Storage → Create → Blob**, create a store, and connect it to the project. Vercel adds `BLOB_READ_WRITE_TOKEN` for you.
3. In **Settings → Environment Variables**, add `NUXT_DATABASE_URL`, `NUXT_ADMIN_EMAIL`, `NUXT_ADMIN_PASSWORD_HASH`, and `NUXT_APP_SECRET` (use a new secret, not the local one).
4. Run `npm run db:migrate` once against the production database (put its URL in `.env` temporarily, or use Neon's SQL editor and paste `db/schema.sql`).
5. Redeploy.

Changing `NUXT_APP_SECRET` logs you out. Changing the password means generating a new hash and redeploying.

## 3. Before going public

- Check that your Porky's font license allows embedding on a website. The font file marks itself as "restricted license embedding". It's self-hosted at `public/fonts/porkys.woff2`.
- Frame PNGs are public files on Vercel Blob. Anyone with a file's URL can open it, inactive frames included.

## Frame file rules

- PNG only, max 5 MB, shorter side at least 1080px.
- Photo areas must be fully transparent and fully surrounded by the frame. Transparent areas touching the image edge (like rounded outer corners) are not treated as slots.
- 1 to 6 slots. Tiny transparent specks are ignored.
- Visitors fill slots top-to-bottom, then left-to-right. The add-frame preview shows the order.
