# Cleekin

An online photobooth. Visitors pick a frame, take or upload photos into its slots, and download the result. Photos never leave the visitor's device. One admin manages frames from a dashboard.

Built with Nuxt (Vue + TypeScript), Neon Postgres, and Vercel Blob.

- Product decisions: [SPEC.md](SPEC.md)
- Install, configure, deploy: [SETUP.md](SETUP.md)

## Project layout

| Path | What's there |
|---|---|
| `app/pages/index.vue` | Home: pick a frame |
| `app/pages/booth/[id]/index.vue` | Photo screen: camera, countdown, upload, retake |
| `app/pages/booth/[id]/result.vue` | Result: download, back to edit, home |
| `app/pages/admin/` | Login and dashboard |
| `app/utils/detectSlots.ts` | Finds transparent photo slots in a frame PNG |
| `app/utils/photo.ts` | Photo placement, capture, HEIC handling, final JPEG |
| `server/api/` | Public frame API, auth, admin frame API |
| `db/schema.sql` | Tables |
