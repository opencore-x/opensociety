import { z } from 'zod'

export const houseHelpEntrySchema = z.object({
  id: z.string().uuid(),
  houseHelpId: z.string().uuid(),
  apartmentId: z.string().uuid().nullable(),
  checkInAt: z.string(),
  checkInBy: z.string().uuid().nullable(),
  checkOutAt: z.string().nullable(),
  checkOutBy: z.string().uuid().nullable(),
  createdAt: z.string(),
})

export const checkInHouseHelpSchema = z.object({
  apartmentId: z.string().uuid().optional(),
})

// Minutes worked for an attendance row, or null while the help is still inside
// (no check-out yet). Clock skew that yields a negative span floors to 0.
export function houseHelpWorkedMinutes(
  checkInAt: string | Date,
  checkOutAt: string | Date | null,
): number | null {
  if (!checkOutAt) return null
  const ms = new Date(checkOutAt).getTime() - new Date(checkInAt).getTime()
  return Math.max(0, Math.round(ms / 60000))
}

export type HouseHelpEntry = z.infer<typeof houseHelpEntrySchema>
export type CheckInHouseHelp = z.infer<typeof checkInHouseHelpSchema>
