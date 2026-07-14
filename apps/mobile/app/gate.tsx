import { useEffect, useRef, useState } from 'react'
import { Link } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, FlatList, Modal, Platform, View } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { availableVisitorActions, parsePreApprovalQrValue } from '@opensociety/shared'
import { apiClient } from '../api/client'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Text } from '../components/ui/text'

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
        <Text className="text-base font-semibold text-destructive">API unreachable</Text>
        <Text className="text-sm text-muted-foreground">{String((error as Error)?.message ?? 'error')}</Text>
      </Centered>
    )

  const gate = (data ?? []).filter((v) => v.status === 'APPROVED' || v.status === 'ENTERED')

  return (
    <>
    <FlatList
      contentContainerClassName="gap-2 p-4"
      data={gate}
      keyExtractor={(v) => v.id}
      ListHeaderComponent={
        <View className="mb-1 gap-2">
          <View className="flex-row items-center gap-2">
            <Input
              className="flex-1 tracking-widest"
              placeholder="Pre-approval code"
              autoCapitalize="characters"
              autoCorrect={false}
              value={code}
              onChangeText={setCode}
            />
            <Button
              onPress={() => redeem.mutate(code.trim().toUpperCase())}
              disabled={redeem.isPending || code.trim().length === 0}
            >
              <Text>{redeem.isPending ? 'Redeeming…' : 'Redeem'}</Text>
            </Button>
          </View>
          <Button variant="outline" onPress={() => setScanning(true)}>
            <Text>Scan QR code</Text>
          </Button>
          {redeem.isError && (
            <Text className="text-sm text-destructive">{String((redeem.error as Error)?.message ?? 'Invalid code')}</Text>
          )}
          <Link href="/register" className="py-1 text-base font-semibold text-primary">
            + Register visitor
          </Link>
        </View>
      }
      ListEmptyComponent={<Text className="text-sm text-muted-foreground">No visitors at the gate.</Text>}
      renderItem={({ item }) => {
        const actions = availableVisitorActions(item.status)
        return (
          <View className="gap-2.5 rounded-xl bg-muted p-3">
            <View className="flex-row items-center">
              <View className="flex-1">
                <Text className="text-base font-semibold">{item.visitorName}</Text>
                <Text className="text-sm text-muted-foreground">{item.type}</Text>
              </View>
              <Text className="overflow-hidden rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">
                {item.status}
              </Text>
            </View>
            <View className="flex-row gap-2">
              {actions.includes('checkin') && (
                <Button onPress={() => checkIn.mutate(item.id)} disabled={busy}>
                  <Text>Check in</Text>
                </Button>
              )}
              {actions.includes('checkout') && (
                <Button variant="outline" onPress={() => checkOut.mutate(item.id)} disabled={busy}>
                  <Text>Check out</Text>
                </Button>
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
      <View className="flex-1 items-center justify-center bg-black">
        {Platform.OS === 'web' ? (
          <View className="items-center gap-4 p-6">
            <Text className="text-center text-base leading-6 text-white">
              QR scanning uses the device camera. Open the app on a phone, or enter the code manually.
            </Text>
          </View>
        ) : !permission ? (
          <ActivityIndicator />
        ) : !permission.granted ? (
          <View className="items-center gap-4 p-6">
            <Text className="text-center text-base leading-6 text-white">Camera access is needed to scan pre-approval QR codes.</Text>
            <Button onPress={requestPermission}>
              <Text>Grant camera access</Text>
            </Button>
          </View>
        ) : (
          <>
            <CameraView
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }) => {
                if (handledRef.current) return
                const code = parsePreApprovalQrValue(data)
                if (!code) return
                handledRef.current = true
                onScan(code)
              }}
            />
            <View className="absolute inset-x-0 bottom-[120px] items-center" pointerEvents="none">
              <Text className="overflow-hidden rounded-md bg-black/50 px-3 py-2 text-sm text-white">Point the camera at the pre-approval QR code</Text>
            </View>
          </>
        )}
        <View className="absolute inset-x-6 bottom-10">
          <Button variant="outline" onPress={onClose}>
            <Text>Cancel</Text>
          </Button>
        </View>
      </View>
    </Modal>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View className="flex-1 items-center justify-center gap-1">{children}</View>
}
