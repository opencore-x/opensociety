import { useEffect, useRef, useState } from 'react'
import { Link } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, FlatList, Modal, Platform, StyleSheet, Text, TextInput, View } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { availableVisitorActions, parsePreApprovalQrValue } from '@opensociety/shared'
import { apiClient } from '../api/client'
import { Button } from '../components/Button'

// Guard gate view: the visitors a guard acts on — APPROVED (expected at the
// gate) and ENTERED (currently inside) — with check-in / check-out actions.
export default function Gate() {
  const qc = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['visitors'],
    queryFn: () => apiClient.listVisitors(),
  })

  const [code, setCode] = useState('')
  const [scanning, setScanning] = useState(false)
  const invalidate = () => qc.invalidateQueries({ queryKey: ['visitors'] })
  const checkIn = useMutation({
    mutationFn: (id: string) => apiClient.checkInVisitor(id),
    onSuccess: invalidate,
  })
  const checkOut = useMutation({
    mutationFn: (id: string) => apiClient.checkOutVisitor(id),
    onSuccess: invalidate,
  })
  const redeem = useMutation({
    mutationFn: (c: string) => apiClient.redeemPreApproval(c),
    onSuccess: () => {
      setCode('')
      invalidate()
    },
  })
  const busy = checkIn.isPending || checkOut.isPending

  if (isLoading)
    return (
      <Centered>
        <ActivityIndicator />
      </Centered>
    )
  if (isError)
    return (
      <Centered>
        <Text style={styles.error}>API unreachable</Text>
        <Text style={styles.dim}>{String((error as Error)?.message ?? 'error')}</Text>
      </Centered>
    )

  const gate = (data ?? []).filter((v) => v.status === 'APPROVED' || v.status === 'ENTERED')

  return (
    <>
    <FlatList
      contentContainerStyle={styles.list}
      data={gate}
      keyExtractor={(v) => v.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.redeemRow}>
            <TextInput
              style={styles.codeInput}
              placeholder="Pre-approval code"
              autoCapitalize="characters"
              autoCorrect={false}
              value={code}
              onChangeText={setCode}
            />
            <Button
              label={redeem.isPending ? 'Redeeming…' : 'Redeem'}
              onPress={() => redeem.mutate(code.trim().toUpperCase())}
              disabled={redeem.isPending || code.trim().length === 0}
            />
          </View>
          <Button label="Scan QR code" variant="outline" onPress={() => setScanning(true)} />
          {redeem.isError && (
            <Text style={styles.redeemError}>{String((redeem.error as Error)?.message ?? 'Invalid code')}</Text>
          )}
          <Link href="/register" style={styles.register}>
            + Register visitor
          </Link>
        </View>
      }
      ListEmptyComponent={<Text style={styles.dim}>No visitors at the gate.</Text>}
      renderItem={({ item }) => {
        const actions = availableVisitorActions(item.status)
        return (
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.visitorName}</Text>
                <Text style={styles.dim}>{item.type}</Text>
              </View>
              <Text style={styles.badge}>{item.status}</Text>
            </View>
            <View style={styles.actions}>
              {actions.includes('checkin') && (
                <Button label="Check in" onPress={() => checkIn.mutate(item.id)} disabled={busy} />
              )}
              {actions.includes('checkout') && (
                <Button
                  label="Check out"
                  variant="outline"
                  onPress={() => checkOut.mutate(item.id)}
                  disabled={busy}
                />
              )}
            </View>
          </View>
        )
      }}
    />
    <QrScannerModal
      visible={scanning}
      onClose={() => setScanning(false)}
      onScan={(c) => {
        setScanning(false)
        redeem.mutate(c)
      }}
    />
    </>
  )
}

// Full-screen camera scanner for pre-approval QRs. On the device it opens the
// camera and redeems the first valid QR; on web (no camera scanning) it points
// the guard back to the manual code field.
function QrScannerModal({
  visible,
  onClose,
  onScan,
}: {
  visible: boolean
  onClose: () => void
  onScan: (code: string) => void
}) {
  const [permission, requestPermission] = useCameraPermissions()
  const handledRef = useRef(false)

  useEffect(() => {
    if (visible) handledRef.current = false
  }, [visible])

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.scanner}>
        {Platform.OS === 'web' ? (
          <View style={styles.scannerMsg}>
            <Text style={styles.scannerMsgText}>
              QR scanning uses the device camera. Open the app on a phone, or enter the code manually.
            </Text>
          </View>
        ) : !permission ? (
          <ActivityIndicator />
        ) : !permission.granted ? (
          <View style={styles.scannerMsg}>
            <Text style={styles.scannerMsgText}>Camera access is needed to scan pre-approval QR codes.</Text>
            <Button label="Grant camera access" onPress={requestPermission} />
          </View>
        ) : (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }) => {
                if (handledRef.current) return
                const code = parsePreApprovalQrValue(data)
                if (!code) return
                handledRef.current = true
                onScan(code)
              }}
            />
            <View style={styles.scannerHint} pointerEvents="none">
              <Text style={styles.scannerHintText}>Point the camera at the pre-approval QR code</Text>
            </View>
          </>
        )}
        <View style={styles.scannerCancel}>
          <Button label="Cancel" variant="outline" onPress={onClose} />
        </View>
      </View>
    </Modal>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.centered}>{children}</View>
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  card: { padding: 12, borderRadius: 10, backgroundColor: '#f4f4f5', gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '600' },
  dim: { color: '#71717a', fontSize: 13 },
  error: { color: '#e11d48', fontSize: 16, fontWeight: '600' },
  badge: {
    fontSize: 12,
    color: '#0e7490',
    backgroundColor: '#cffafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  actions: { flexDirection: 'row', gap: 8 },
  header: { gap: 8, marginBottom: 4 },
  redeemRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  codeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
    letterSpacing: 2,
  },
  redeemError: { color: '#e11d48', fontSize: 13 },
  register: { color: '#0e7490', fontWeight: '600', fontSize: 15, paddingVertical: 4 },
  scanner: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  scannerMsg: { padding: 24, gap: 16, alignItems: 'center' },
  scannerMsgText: { color: '#fff', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  scannerHint: { position: 'absolute', bottom: 120, left: 0, right: 0, alignItems: 'center' },
  scannerHintText: {
    color: '#fff',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  scannerCancel: { position: 'absolute', bottom: 40, left: 24, right: 24 },
})
