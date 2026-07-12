import { eq } from 'drizzle-orm'
import { getDb } from './client'
import { users, societyConfig, apartments, guards, houseHelp, residencies, vehicles } from './schema'

// Stable id for the local dev admin so VITE_DEV_USER_ID stays constant across
// re-seeds. Point apps/web/.env `VITE_DEV_USER_ID` at this to act as admin.
export const DEV_ADMIN_ID = '00000000-0000-0000-0000-000000000001'

// A demo resident that starts PENDING with no residency, so the admin approval
// flow (assign apartment -> create residency) can be exercised end-to-end.
// Act as them by sending this as x-user-id.
export const DEV_RESIDENT_ID = '00000000-0000-0000-0000-000000000002'

// An APPROVED resident with an active residency in tower A / 101, so resident-scoped
// flows (e.g. house-help assignments to one's own flat) are testable via x-user-id.
export const DEV_RESIDENT2_ID = '00000000-0000-0000-0000-000000000003'

// Idempotent local-dev seed: a dev admin, a pending demo resident, the society
// config, a few apartments, and one guard. Safe to run repeatedly — conflicts
// are ignored and singleton rows are only created when absent.
export async function seed(db = getDb()) {
  await db
    .insert(users)
    .values([
      {
        id: DEV_ADMIN_ID,
        clerkId: 'dev_admin',
        email: 'admin@dev.local',
        name: 'Dev Admin',
        role: 'ADMIN',
        status: 'APPROVED',
      },
      {
        id: DEV_RESIDENT_ID,
        clerkId: 'dev_resident',
        email: 'resident@dev.local',
        name: 'Demo Resident',
        role: 'RESIDENT',
        status: 'PENDING',
      },
      {
        id: DEV_RESIDENT2_ID,
        clerkId: 'dev_resident2',
        email: 'resident2@dev.local',
        name: 'Priya Sharma',
        role: 'RESIDENT',
        status: 'APPROVED',
      },
    ])
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

  const [existingHelp] = await db.select({ id: houseHelp.id }).from(houseHelp).limit(1)
  if (!existingHelp) {
    await db
      .insert(houseHelp)
      .values({ name: 'Lakshmi Devi', phone: '8888888888', type: 'MAID', registeredBy: DEV_ADMIN_ID })
  }

  // Give the approved resident an active residency so resident-scoped flows work.
  const [aptA101] = await db
    .select({ id: apartments.id })
    .from(apartments)
    .where(eq(apartments.tower, 'A'))
    .limit(1)
  if (aptA101) {
    const [existingRes] = await db
      .select({ id: residencies.id })
      .from(residencies)
      .where(eq(residencies.userId, DEV_RESIDENT2_ID))
      .limit(1)
    if (!existingRes) {
      await db
        .insert(residencies)
        .values({ userId: DEV_RESIDENT2_ID, apartmentId: aptA101.id, relation: 'OWNER', isPrimary: true })
    }

    await db
      .insert(vehicles)
      .values({
        apartmentId: aptA101.id,
        registrationNumber: 'KA01AB1234',
        type: 'CAR',
        make: 'Honda City',
        color: 'White',
        registeredBy: DEV_RESIDENT2_ID,
      })
      .onConflictDoNothing()
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
