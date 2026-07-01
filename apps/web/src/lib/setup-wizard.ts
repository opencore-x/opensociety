import { updateSocietyConfigSchema, type UpdateSocietyConfig } from '@opensociety/shared'

// Ordered steps of the first-run society setup wizard.
export const SETUP_STEPS = [
  { key: 'society', label: 'Society' },
  { key: 'apartments', label: 'Apartments' },
  { key: 'review', label: 'Review' },
] as const

export type SetupStepKey = (typeof SETUP_STEPS)[number]['key']
export type SocietyField = keyof UpdateSocietyConfig

export const EMPTY_SOCIETY: UpdateSocietyConfig = {
  name: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
}

// Field-level validation for the society step, derived from the shared Zod
// contract so the wizard and the API agree on what's valid. Returns the first
// message per field (empty object = valid).
export function societyErrors(input: UpdateSocietyConfig): Partial<Record<SocietyField, string>> {
  const result = updateSocietyConfigSchema.safeParse(input)
  if (result.success) return {}
  const errors: Partial<Record<SocietyField, string>> = {}
  for (const issue of result.error.issues) {
    const key = issue.path[0] as SocietyField
    if (key && !errors[key]) errors[key] = issue.message
  }
  return errors
}

export function isSocietyComplete(input: UpdateSocietyConfig): boolean {
  return updateSocietyConfigSchema.safeParse(input).success
}
