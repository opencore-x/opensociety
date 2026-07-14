// Payment reconciliation (#59) — pure FIFO allocation. Direction-agnostic: used
// whether a payment arrives unlinked (gateway/bank feed) or as a lump-sum/advance
// recorded for a flat. Amounts are integer paise.

export type OutstandingBill = {
  billId: string
  outstanding: number // remaining balance in paise (> 0)
}

export type Allocation = {
  billId: string
  amount: number // paise applied to this bill
}

export type PaymentAllocation = {
  allocations: Allocation[]
  applied: number // total paise applied across bills
  leftoverCredit: number // unapplied remainder (advance / overpayment)
}

// Allocate `amount` paise across `bills` oldest-first (the caller orders them,
// e.g. by due date). Each bill is filled up to its outstanding balance; any
// remainder becomes leftoverCredit. Bills with a non-positive balance are
// skipped. `amount` <= 0 or no bills yields an empty allocation.
export function allocatePayment(amount: number, bills: OutstandingBill[]): PaymentAllocation {
  const allocations: Allocation[] = []
  let remaining = Math.max(0, Math.trunc(amount))
  for (const bill of bills) {
    if (remaining <= 0) break
    if (bill.outstanding <= 0) continue
    const take = Math.min(remaining, bill.outstanding)
    allocations.push({ billId: bill.billId, amount: take })
    remaining -= take
  }
  return { allocations, applied: Math.max(0, Math.trunc(amount)) - remaining, leftoverCredit: remaining }
}
