# Cleekin MVP spec

Cleekin is an online photobooth. Visitors pick a frame, take or upload photos into the frame's slots, and download the result. Photos never leave the visitor's device. One admin manages frames through a dashboard.

This file records every decision made during planning. Anything not written here is undecided.

## Stack and hosting

- Nuxt (Vue) with TypeScript, one project for pages and API routes.
- Hosted on Vercel.
- Neon Postgres stores frame records and login attempts.
- Vercel Blob stores frame PNG files. Neon stores only the Blob URL.
- Admin auth through `nuxt-auth-utils` (sealed session cookie, secret in `NUXT_APP_SECRET`).
- Icons: Lucide (`lucide-vue-next`).
- Setup is done by the owner following `SETUP.md`. Secrets go into Vercel env vars and never into the repo or chat.

## Data model

`frames`

| column | type | notes |
|---|---|---|
| id | uuid | primary key |
| name | text | trimmed, 1 to 40 chars |
| name_key | text | lowercased name, unique index |
| blob_url | text | Vercel Blob public URL |
| width, height | int | pixel size of the PNG |
| slots | jsonb | array of `{x, y, w, h}` in frame pixels, 1 to 6 items, ordered top-to-bottom then left-to-right |
| is_active | boolean | default false |
| created_at, updated_at | timestamptz | |

`login_attempts`: `ip`, `attempted_at`. Used for rate limiting failed logins.

## Admin

### Login

- One admin. `NUXT_ADMIN_EMAIL` and `NUXT_ADMIN_PASSWORD_HASH` live in Vercel env vars. No users table, no sign-up.
- Password hash: scrypt (pure JavaScript, works on Windows on ARM), base64-encoded so `$` signs survive env files. `npm run hash-password` prints it.
- Max 5 failed attempts per IP per 15 minutes. Error text never says which field was wrong: "Email or password is wrong."
- Session lasts 7 days. Log out clears it.
- `/admin/**` pages and all write APIs require the session.

### Dashboard

- Stat cards: Total Frame and Active Frame. Always overall counts, unaffected by search, sort, or tabs.
- Tabs: All (n) / Active (n) / Inactive (n), styled like the Figma tabs.
- Search by name, client-side.
- Sort: Newest (default), Oldest, A-Z, Z-A. Opened from the pink icon button next to search, which uses an up/down arrows icon instead of Figma's funnel. A dot on the button shows a non-default sort.
- No pagination. All frames load at once.
- Search, sort, and tabs combine.

### Add frame

- Fields: name, PNG file, Active toggle (default off).
- PNG only (`image/png`). SVG is not supported.
- Max 5 MB. Short side at least 1080 px.
- On file pick, the browser scans the PNG for fully transparent regions. Each region becomes a slot. Regions below a minimum size are ignored as specks.
- Reject with an error if 0 slots or more than 6 slots are detected.
- The file uploads straight from the browser to Vercel Blob using a token from an authenticated API route. This is required because Vercel functions reject request bodies over 4.5 MB.
- The server re-checks name rules, file size, dimensions, and slot JSON shape before saving the record.

### Name rules

Required, trimmed, max 40 characters, unique ignoring case. Duplicate error: "A frame with this name already exists."

### Frame card

- Clicking the card opens the full-frame view.
- Trash button (top left) deletes.
- Eye button (top right) is the active toggle. Open eye with orange border means active; crossed eye with gray border means inactive. Tooltip and screen-reader label say "Visible to visitors" or "Hidden from visitors". A toast confirms each switch.
- Inactive cards show the frame image dimmed.

### Edit

Rename only, from a pencil icon next to the name in the full-frame view. Enter saves, Esc cancels. Replacing a file means delete and re-add.

### Active toggle

The eye button toggles without a confirm, except when turning off the last active frame (see below).

### Delete

- Confirm dialog: `Delete "<name>"? This can't be undone.`
- On confirm, delete the DB row and the Blob file.
- A visitor already on the photo screen with that frame can finish, because the frame is already loaded in their browser.

### Last active frame

Deactivating or deleting the only active frame adds a warning to the confirm: "This is your only active frame. Visitors won't be able to take photos until you activate another." The admin can still proceed.

### See frame

- Desktop: frame shown large over a dimmed background overlay. Mobile: full screen.
- X close button top right. Esc and backdrop click also close it on desktop.
- "Show slots" toggle draws numbered dashed outlines over each detected slot.

## Visitor flow

### Home

- Grid of active frames, newest first.
- "Select frame" button is disabled until a frame is chosen.
- No active frames: illustration plus "No frames yet. Check back soon!" and the Select frame button hidden.
- Privacy line: "Your photos stay on your device. We never save them."

### Photo screen (`/booth/:id`)

- Refresh keeps the same frame. The link can be shared.
- Inactive or deleted frame: "This frame isn't available anymore" with a "Pick another frame" button to home.
- Frame scales to the largest size that fits while the control bar stays visible: below the frame in portrait, beside it in landscape. No rotation prompt.
- Privacy line, same text as home.

Capture:

- Each Capture press fills the next empty slot, top-to-bottom then left-to-right.
- 3-second countdown in large Porkys numbers over the slot. Cancel button and Esc stop it. Other buttons are disabled during the countdown.
- At capture: soft white flash and a shutter sound.
- Mute toggle (speaker icon). The choice is saved in the browser.

Camera:

- Front camera preview and saved photo are both mirrored. Back camera is not mirrored.
- Switch-camera button appears only on devices with 2 or more cameras.
- Live preview uses the same center crop as the final slot, so what the visitor sees is what they get.

Camera unavailable:

- Red alert with a message per cause: permission denied, no camera found, camera busy in another app, in-app browser (Instagram, TikTok, etc.).
- Example for denied: "We can't see you yet! Allow camera access in your browser settings, then tap Try again."
- Example for in-app browser: "Open this page in Chrome or Safari to use the camera."
- Capture is disabled. Upload stays usable. "Try again" re-requests the camera.
- Alert colors come from the error color in Figma.

Upload:

- Accepts JPG, PNG, WebP, and HEIC (converted in the browser). Max 15 MB per image.
- Multi-select. N images fill the next N empty slots. If a slot is selected, one image replaces that slot.
- Photos are center-cropped to the slot. Uploaded photos can be dragged and zoomed inside their slot. Camera photos cannot.

Retake:

- Tap a filled slot to select it. Retake redoes only that slot.
- "Retake all" clears every slot.

All slots filled:

- The Capture button becomes "Finish", which goes to the result screen.
- Retake still works until Finish is pressed.

Leaving:

- Back or Home with unsaved photos shows: "Leave? Your photos will disappear since we don't save them." [Stay] [Leave]
- Refresh or closing the tab triggers the browser's native "Leave site?" warning.

### Result screen

- Download (primary), Back to edit (secondary, returns to the photo screen with photos intact), Home.
- Download on mobile opens the native share sheet so visitors can save to Photos or share. On desktop it downloads a file.
- Format: JPG at 92% quality, full frame resolution, named `cleekin-YYYYMMDD-HHMM.jpg`.
- Home skips the leave confirm once the visitor has downloaded.

## Design

- Layout, spacing, and components come from the Figma file. Screens and states missing from Figma (admin login, mobile layouts, full-frame view, selected frame, countdown, empty states, leave confirm, rename, error states) are designed in the same style.
- Error colors from Figma: `#EF4444` fill, `#D93E3E` border.
- Typography: Porky's for all text, self-hosted as WOFF2, with Figma's black text outline. The owner checks that the font license allows web use.
- Palette:

| name | hex |
|---|---|
| light blue | #DCECFB |
| light pink | #FFEDF3 |
| blue | #A2D2FF |
| pink | #FFAFCC |
| dark pink | #F675A4 |
| white | #FFFFFF |
| gray | #D4D4D4 |
| black | #1A1A1A |
| purple | #CDB4DB |

- Contrast: built to Figma as designed. See "Contrast review" below for the pairs to decide on.
- Responsive on desktop and mobile for every screen.
- UI copy in English. Figma copy that read awkwardly was rewritten (see "Copy changes").

## Browser support

Chrome, Edge, Firefox, and Safari on desktop; Safari iOS 16+; Chrome Android. Older browsers get a "please update your browser" message.

## Copy changes from Figma

| Figma | Built |
|---|---|
| are you sure want to log out? | Log out? / You'll need your email and password to come back. |
| are you sure want to delete this frame? | Delete "Frame name"? / This can't be undone. |
| are you sure want to inactive this frame? | Hide "Frame name"? (only shown for the last active frame) |
| Inactive (confirm button) | Hide |
| gaada akses kamera cuy | A message per cause, e.g. "We can't see you yet!" plus how to fix it |
| frame name (placeholder) | Frame name |
| Drop your file here, or browse / Format: PNG | Drop your frame here, or browse / PNG · max 5 MB · at least 1080px · photo areas fully transparent |
| Back (result screen) | Back to edit |
| Upload Image (when a filled slot is selected) | Replace |

Added helper text: "Tap a frame you like" and "Pick a frame first" on home, a progress line on the photo screen ("Photo 2 of 4"), and toasts after admin actions.

## Contrast review

Ratios use the text fill color only. Every item marked * has Figma's black outline, which keeps the letter edges dark against the background; WCAG's formula doesn't count that outline.

| Text | Ratio | Needed |
|---|---|---|
| White on dark pink button* | 2.56:1 | 4.5:1 |
| White on purple button* | 1.84:1 | 4.5:1 |
| White on blue Cancel button* | 1.55:1 | 4.5:1 |
| White on red confirm button* | 3.67:1 | 4.5:1 |
| Logo blue / pink on light blue background* | 1.32 / 1.42:1 | 3:1 |
| Footer purple on light blue* | 1.56:1 | 4.5:1 |
| Gray stat labels and search placeholder on white* | 1.48:1 | 4.5:1 |
| Dark pink stat numbers, card names, modal titles on white* | 2.6:1 | 3:1 |
| Blue card date on white* | 1.59:1 | 4.5:1 |
| Dark pink "Active?" label and active tab* | 2.2 to 2.6:1 | 4.5:1 |
| Gray "PNG · max 5 MB" hint on white* | 1.46:1 | 4.5:1 |
| Gray #919191 placeholder in the add-frame name field | 3.15:1 | 4.5:1 |
| White on red camera alert title | 3.76:1 | 3:1 (large text, passes) |

## Open items

- Porky's font license check before going public.
- Decide on each row of the contrast review.
