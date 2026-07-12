import { useQuery } from '@tanstack/react-query'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { BillStatus } from '@opensociety/shared'
import { formatPaise } from '@opensociety/shared'
import { apiClient } from '../api/client'

const STATUS_STYLE: Record<BillStatus, { bg: string; fg: string }> = {
  ISSUED: { bg: '#dbeafe', fg: '#1e40af' },
  PARTIALLY_PAID: { bg: '#fef3c7', fg: '#92400e' },
  PAID: { bg: '#dcfce7', fg: '#166534' },
  CANCELLED: { bg: '#e4e4e7', fg: '#52525b' },
}

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Bills() {
  const bills = useQuery({ queryKey: ['bills'], queryFn: () => apiClient.listBills() })
  const payments = useQuery({ queryKey: ['payments'], queryFn: () => apiClient.listPayments() })

  if (bills.isLoading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    )
  if (bills.isError)
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Couldn’t load bills</Text>
        <Text style={styles.dim}>{String((bills.error as Error)?.message ?? 'error')}</Text>
      </View>
    )

  return (
    <ScrollView contentContainerStyle={styles.list}>
      <Text style={styles.heading}>Bills</Text>
      {(bills.data ?? []).length === 0 && <Text style={styles.dim}>No bills yet.</Text>}
      {(bills.data ?? []).map((b) => {
        const outstanding = b.totalAmount - (b.paidAmount ?? 0)
        const s = STATUS_STYLE[b.status]
        return (
          <View key={b.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.title}>{b.title}</Text>
              <Text style={[styles.badge, { backgroundColor: s.bg, color: s.fg }]}>{b.status.replace('_', ' ')}</Text>
            </View>
            <Text style={styles.dim}>
              {b.periodMonth ?? 'One-time'}
              {b.dueDate ? ` · due ${fmtDate(b.dueDate)}` : ''}
            </Text>
            <View style={styles.row}>
              <Text style={styles.amount}>{formatPaise(b.totalAmount)}</Text>
              {outstanding > 0 ? (
                <Text style={styles.outstanding}>{formatPaise(outstanding)} due</Text>
              ) : (
                <Text style={styles.paid}>Paid</Text>
              )}
            </View>
          </View>
        )
      })}

      <Text style={[styles.heading, styles.section]}>Payment history</Text>
      {(payments.data ?? []).length === 0 && <Text style={styles.dim}>No payments yet.</Text>}
      {(payments.data ?? []).map((p) => (
        <View key={p.id} style={styles.payRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.payMethod}>{p.method.replace('_', ' ')}</Text>
            <Text style={styles.dim}>
              {fmtDate(p.paidAt)}
              {p.reference ? ` · ${p.reference}` : ''}
            </Text>
          </View>
          <Text style={styles.amount}>{formatPaise(p.amount)}</Text>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  heading: { fontSize: 18, fontWeight: '700' },
  section: { marginTop: 16 },
  card: { padding: 12, borderRadius: 10, backgroundColor: '#f4f4f5', gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flex: 1, fontSize: 16, fontWeight: '600' },
  amount: { fontSize: 16, fontWeight: '700' },
  outstanding: { color: '#b45309', fontSize: 14, fontWeight: '600' },
  paid: { color: '#166534', fontSize: 14, fontWeight: '600' },
  dim: { color: '#71717a', fontSize: 13 },
  error: { color: '#e11d48', fontSize: 16, fontWeight: '600' },
  badge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    gap: 10,
  },
  payMethod: { fontSize: 15, fontWeight: '600' },
})
