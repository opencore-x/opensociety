import { getDb } from './client'
import { users, societyConfig, apartments, guards } from './schema'

// Stable id for the local dev admin so VITE_DEV_USER_ID stays constant across
// re-seeds. Point apps/web/.env `VITE_DEV_USER_ID` at this to act as admin.
export const DEV_ADMIN_ID = '00000000-0000-0000-0000-000000000001'

// Idempotent local-dev seed: a dev admin, the society config, a few apartments,
// and one guard. Safe to run repeatedly — conflicts are ignored and singleton
// rows are only created when absent.
export async function seed(db = getDb()) {
  await db
    .insert(users)
    .values({
      id: DEV_ADMIN_ID,
      clerkId: 'dev_admin',
      email: 'admin@dev.local',
      name: 'Dev Admin',
      role: 'ADMIN',
      status: 'APPROVED',
    })
    .onConflictDoNothing()

  const [existingSociety] = await db.select({ id: societyConfig.id }).from(societyConfig).limit(1)
  if (!existingSociety) {
    await db.insert(societyConfig).values({
      name: 'Green Valley Heights',
      address: '123 Main Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
    })
  }

  await db
    .insert(apartments)
    .values([
      { tower: 'A', apartmentNo: '101', floor: 1, bhkType: '2BHK' },
      { tower: 'A', apartmentNo: '102', floor: 1, bhkType: '2BHK' },
      { tower: 'B', apartmentNo: '201', floor: 2, bhkType: '3BHK' },
    ])
    .onConflictDoNothing()

  const [existingGuard] = await db.select({ id: guards.id }).from(guards).limit(1)
  if (!existingGuard) {
    await db.insert(guards).values({ name: 'Gate Guard', phone: '9999999999', employeeCode: 'G-001' })
  }

  return { adminId: DEV_ADMIN_ID }
}

// Run directly: `node --env-file=<path-with-DATABASE_URL> src/seed.ts`
if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then((r) => {
      console.log('Seed complete. Dev admin id:', r.adminId)
      process.exit(0)
    })
    .catch((err) => {
      console.error('Seed failed:', err)
      process.exit(1)
    })
}
