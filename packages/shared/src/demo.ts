import * as s from './index'

type HouseHelpRow = s.HouseHelp & {
  ratingAvg: number | null
  reviewCount: number
  trustScore: number
  idVerified: boolean
  backgroundCheck: s.BackgroundCheckStatus
  incidentCount: number
  verificationLevel: s.VerificationLevel
}
type ParkingSlotRow = s.ParkingSlot & { apartment: string | null }

export const demoId = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
export const DEMO_ADMIN = demoId(100)

export function createDemoData(now = new Date()) {
  const at = (days = 0, hours = 0) => new Date(now.getTime() + days * 86400000 + hours * 3600000).toISOString()
  const stamp = { createdAt: at(-60), updatedAt: at() }
  const apartments: s.Apartment[] = Array.from({ length: 12 }, (_, i) => ({
    id: demoId(i + 1), tower: i < 6 ? 'A' : 'B', apartmentNo: `${Math.floor(i % 6 / 2) + 1}0${i % 2 + 1}`,
    floor: Math.floor(i % 6 / 2) + 1, bhkType: i < 6 ? '2BHK' : '3BHK', isActive: true, ...stamp,
  }))
  const names = ['Demo Admin', 'Priya Sharma', 'Arjun Rao', 'Meera Shah', 'Kabir Das', 'Nisha Patel', 'Ravi Kumar', 'Asha Iyer']
  const users: s.User[] = names.map((name, i) => ({
    id: demoId(100 + i), clerkId: `demo_${i}`, name, email: `resident${i}@example.com`, phone: null,
    role: i === 0 ? 'ADMIN' : i === 7 ? 'STAFF' : 'RESIDENT', status: i === 5 || i === 6 ? 'PENDING' : 'APPROVED', isActive: true, ...stamp,
  }))
  const guards: s.Guard[] = ['Ramesh Singh', 'Suresh Kumar', 'Anita Devi'].map((name, i) => ({
    id: demoId(200 + i), name, userId: null, phone: null, employeeCode: `G-00${i + 1}`, isActive: true, ...stamp,
  }))
  const duty: s.GuardDutySession[] = Array.from({ length: 9 }, (_, i) => ({
    id: demoId(220 + i), guardId: guards[i % 3].id, guardName: guards[i % 3].name,
    clockInAt: at(-Math.floor(i / 3), -4), clockOutAt: i < 2 ? null : at(-Math.floor(i / 3), -1),
    clockInLat: null, clockInLng: null, clockOutLat: null, clockOutLng: null, createdAt: at(-Math.floor(i / 3), -4),
  }))
  const devices: s.GuardDevice[] = guards.map((g, i) => ({
    id: demoId(240 + i), guardId: g.id, deviceId: `demo-gate-${i}`, model: 'Demo gate phone', boundAt: at(-10), lastActiveAt: at(0, -1), revokedAt: null,
  }))
  const visitors: s.VisitorEntry[] = Array.from({ length: 24 }, (_, i) => ({
    id: demoId(300 + i), clientId: null, apartmentId: apartments[i % 12].id, preApprovalId: null,
    visitorName: ['Aarav Mehta', 'Grocery delivery', 'Diya Kapoor', 'Lift technician'][i % 4], visitorPhone: null,
    type: (['GUEST', 'DELIVERY', 'GUEST', 'SERVICE'] as const)[i % 4],
    status: i === 0 ? 'PENDING' : i === 1 ? 'APPROVED' : i === 2 ? 'ENTERED' : 'EXITED',
    purpose: ['Family visit', 'Weekly groceries', 'Evening visit', 'Scheduled service'][i % 4],
    vehicleNumber: i % 2 ? null : `DEMO${1000 + i}`, photoUrl: null, approvedBy: i ? DEMO_ADMIN : null, deniedReason: null,
    checkInBy: i > 1 ? guards[i % 3].id : null, checkOutBy: i > 2 ? guards[i % 3].id : null,
    checkInAt: i > 1 ? at(-Math.floor(i / 3), -2) : null, checkOutAt: i > 2 ? at(-Math.floor(i / 3), -1) : null,
    createdAt: at(-Math.floor(i / 3), -3), updatedAt: at(-Math.floor(i / 3), -1),
  }))
  const preApprovals: s.VisitorPreApproval[] = ['Weekend guest', 'Morning newspaper', 'Appliance service'].map((visitorName, i) => ({
    id: demoId(350 + i), apartmentId: apartments[i].id, createdBy: users[i + 1].id, visitorName, visitorPhone: null,
    approvalType: i === 1 ? 'ALWAYS' : 'ONE_TIME', code: `DEMO0${i + 1}`, validFrom: at(-1), validUntil: at(7), maxUses: i === 1 ? null : 1, useCount: 0, isActive: true, createdAt: at(-1),
  }))
  const notices: s.Notice[] = [
    ['Water tank cleaning', 'Water supply will pause tomorrow from 10 AM to noon. Please store enough water beforehand.', 'MAINTENANCE', 'HIGH'],
    ['Community potluck this weekend', 'Meet your neighbours in the clubhouse at 6 PM. Bring a favourite dish and join the games.', 'EVENT', 'NORMAL'],
    ['Monthly maintenance bills are ready', 'You can view your maintenance bill and payment history in the app.', 'BILLING', 'NORMAL'],
    ['Gate entry reminder', 'Please pre-approve your guests to help the gate team welcome them quickly.', 'SECURITY', 'NORMAL'],
  ].map(([title, body, category, priority], i) => s.noticeSchema.parse({
    id: demoId(400 + i), title, body, category, priority, attachmentUrl: null, attachmentName: null,
    publishedBy: DEMO_ADMIN, publishedAt: at(-i), expiresAt: at(14), readCount: 3, read: true, ...stamp,
  }))
  const tickets: s.Ticket[] = ['Kitchen tap leaking', 'Lobby light flickering', 'Garden bench repair', 'Staircase cleaning'].map((title, i) => ({
    id: demoId(450 + i), apartmentId: apartments[i].id, raisedBy: users[i + 1].id, title,
    description: `${title}. Please arrange a visit from the maintenance team.`, category: (['PLUMBING', 'ELECTRICAL', 'CARPENTRY', 'HOUSEKEEPING'] as const)[i],
    priority: i === 0 ? 'HIGH' : 'NORMAL', status: (['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const)[i],
    assignedTo: i ? users[7].id : null, resolutionNote: i > 1 ? 'Work completed and checked with the resident.' : null,
    resolvedAt: i > 1 ? at(-1) : null, createdAt: at(-5), updatedAt: at(-1),
  }))
  const houseHelp: HouseHelpRow[] = ['Lakshmi Devi', 'Sunita Rao', 'Mohan Kumar'].map((name, i) => ({
    id: demoId(500 + i), name, type: (['MAID', 'COOK', 'DRIVER'] as const)[i], phone: null, photoUrl: null,
    idProofType: null, idProofNumber: null, idProofUrl: null, isActive: true, registeredBy: DEMO_ADMIN,
    ratingAvg: 4.5, reviewCount: 2, trustScore: 75, idVerified: i !== 2, backgroundCheck: i === 2 ? 'PENDING' : 'CLEARED',
    incidentCount: 0, verificationLevel: i === 2 ? 'UNVERIFIED' : 'VERIFIED', ...stamp,
  }))
  const reviews: s.HouseHelpReview[] = houseHelp.flatMap((h, i) => [4, 5].map((rating, j) => ({
    id: demoId(520 + i * 2 + j), houseHelpId: h.id, rating, comment: j ? 'Reliable and punctual.' : 'Helpful and thorough.', createdAt: at(-j - 1),
  })))
  const assignments: s.HouseHelpAssignment[] = houseHelp.map((h, i) => ({ id: demoId(540 + i), houseHelpId: h.id, apartmentId: apartments[i].id, assignedBy: DEMO_ADMIN, createdAt: at(-30) }))
  const attendance: (s.HouseHelpAttendanceRow & { id: string })[] = Array.from({ length: 21 }, (_, i) => ({
    id: demoId(550 + i), houseHelpId: houseHelp[i % 3].id, helpName: houseHelp[i % 3].name, type: houseHelp[i % 3].type,
    apartment: `${apartments[i % 3].tower}-${apartments[i % 3].apartmentNo}`, checkInAt: at(-Math.floor(i / 3), -3), checkOutAt: i === 0 ? null : at(-Math.floor(i / 3), -1),
  }))
  const vehicles: s.Vehicle[] = apartments.slice(0, 6).map((a, i) => ({
    id: demoId(600 + i), apartmentId: a.id, registeredBy: DEMO_ADMIN, registrationNumber: `DEMO${2000 + i}`,
    type: i % 2 ? 'SCOOTER' : 'CAR', make: i % 2 ? 'City scooter' : 'Family car', color: i % 2 ? 'Blue' : 'White', isActive: true, ...stamp,
  }))
  const parking: ParkingSlotRow[] = Array.from({ length: 10 }, (_, i) => ({
    id: demoId(650 + i), slotNumber: i > 6 ? `V-${i - 6}` : `P-${i + 1}`, type: i > 6 ? 'OPEN' : 'COVERED',
    apartmentId: i < 6 ? apartments[i].id : null, apartment: i < 6 ? `${apartments[i].tower}-${apartments[i].apartmentNo}` : null,
    isTemporary: false, assignedUntil: null, assignedBy: i < 6 ? DEMO_ADMIN : null, assignedAt: i < 6 ? at(-30) : null,
    isVisitor: i > 6, occupiedByEntryId: i === 7 ? visitors[2].id : null, occupiedAt: i === 7 ? visitors[2].checkInAt : null,
    notes: null, isActive: true, ...stamp,
  }))
  const accounts: s.Account[] = s.DEFAULT_CHART_OF_ACCOUNTS.map((a, i, all) => ({
    id: demoId(700 + i), code: a.code, name: a.name, type: a.type, parentId: a.parentCode ? demoId(700 + all.findIndex(p => p.code === a.parentCode)) : null,
    isGroup: a.isGroup ?? false, isMutual: a.isMutual ?? null, isActive: true, createdAt: at(-90),
  }))
  const bills: s.MaintenanceBill[] = []
  const payments: s.Payment[] = []
  for (let month = 0; month < 3; month++) {
    const issued = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - month, 1)).toISOString()
    const period = issued.slice(0, 7)
    apartments.forEach((a, i) => {
      const id = demoId(800 + month * 12 + i)
      const paid = (month === 0 && i % 3 === 0) || (month === 1 && i === 0) ? 0 : month === 0 && i % 3 === 1 ? 200000 : 450000
      bills.push({
        id, apartmentId: a.id, apartment: `${a.tower}-${a.apartmentNo}`, type: 'MONTHLY', title: `Maintenance ${period}`,
        periodMonth: period, subtotal: 450000, taxAmount: 0, totalAmount: 450000, paidAmount: paid, status: s.billStatusFor(450000, paid),
        dueDate: s.dueDateForPeriod(period, 10), issuedAt: issued, createdBy: DEMO_ADMIN, createdAt: issued, updatedAt: issued,
        lineItems: [{ id: demoId(900 + month * 12 + i), billId: id, description: 'Monthly maintenance', amount: 450000, taxRatePct: 0, taxAmount: 0, createdAt: issued }],
      })
      if (paid) payments.push({ id: demoId(1000 + month * 12 + i), billId: id, apartmentId: a.id, amount: paid,
        method: i % 2 ? 'UPI' : 'BANK_TRANSFER', reference: `DEMO-PAY-${month}-${i}`, notes: null, paidAt: issued,
        recordedBy: DEMO_ADMIN, createdAt: issued })
    })
  }
  const vendors: s.Vendor[] = ['Green Garden Services', 'Bright Lift Care', 'Community Security'].map((name, i) => ({
    id: demoId(1100 + i), name, category: ['Gardening', 'Repairs', 'Security'][i], pan: null, gstin: null, contact: null, bankAccount: null, isActive: true, createdAt: at(-40),
  }))
  const expenses: (s.Expense & { tdsSection?: s.TdsSection })[] = vendors.map((v, i) => ({
    id: demoId(1150 + i), vendorId: v.id, vendor: v.name, accountId: accounts.find(a => a.code === ['5000', '5040', '5010'][i])!.id,
    account: ['Housekeeping', 'Repairs & Maintenance', 'Security'][i], amount: [800000, 1200000, 1800000][i], taxAmount: 0,
    status: i === 1 ? 'PAYABLE' : 'PAID', description: ['Garden upkeep', 'Lift maintenance', 'Gate staffing'][i], billRef: `DEMO-INV-${i + 1}`,
    method: i === 1 ? null : 'BANK_TRANSFER', paidAt: i === 1 ? null : at(-3), attachmentUrl: null, recordedBy: DEMO_ADMIN,
    createdAt: at(-5), tdsAmount: [16000, 24000, 36000][i], tdsSection: 'SEC_194C',
  }))
  return {
    society: { id: demoId(1200), name: 'Green Valley Demo Society', address: '12 Sample Garden Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', gstin: null, ...stamp } satisfies s.SocietyConfig,
    billConfig: { id: demoId(1201), dueDayOfMonth: 10, lineItems: [{ description: 'Monthly maintenance', amount: 450000, taxRatePct: 0 }], interestEnabled: true, interestRatePct: 18, gracePeriodDays: 15, updatedBy: DEMO_ADMIN, updatedAt: at() } satisfies s.BillConfig,
    apartments, users, guards, duty, devices, visitors, preApprovals, notices, tickets, houseHelp, reviews, assignments, attendance, vehicles, parking, accounts, bills, payments, vendors, expenses,
  }
}

export type DemoData = ReturnType<typeof createDemoData>
