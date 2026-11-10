import { z } from 'zod'

export const FRAME_RULES = {
  maxFileBytes: 5 * 1024 * 1024,
  minShortSide: 1080,
  maxSlots: 6,
  maxNameLength: 40,
} as const

export const PHOTO_RULES = {
  maxFileBytes: 15 * 1024 * 1024,
  accept: 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif',
} as const

export interface Slot {
  x: number
  y: number
  w: number
  h: number
}

/** Frame as the visitor side sees it. */
export interface PublicFrame {
  id: string
  name: string
  imageUrl: string
  width: number
  height: number
  slots: Slot[]
  createdAt: string
}

/** Frame as the admin dashboard sees it. */
export interface AdminFrame extends PublicFrame {
  isActive: boolean
}

export const frameNameSchema = z
  .string()
  .trim()
  .min(1, 'Give your frame a name.')
  .max(FRAME_RULES.maxNameLength, `Keep the name under ${FRAME_RULES.maxNameLength + 1} characters.`)

export const slotSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(16),
  h: z.number().int().min(16),
})

export const slotsSchema = z
  .array(slotSchema)
  .min(1, 'No photo slots found in this frame.')
  .max(FRAME_RULES.maxSlots, `A frame can have at most ${FRAME_RULES.maxSlots} photo slots.`)

export function nameKey(name: string): string {
  return name.trim().toLowerCase()
}

export type SortKey = 'newest' | 'oldest' | 'az' | 'za'
