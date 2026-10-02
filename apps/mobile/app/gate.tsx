import { useEffect, useRef, useState } from 'react'
import { Link } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, FlatList, Modal, Platform, View, Linking } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { availableVisitorActions, parsePreApprovalQrValue } from '@opensociety/shared'
import { apiClient } from '../api/client'
import { useSyncStatus } from '../lib/offline/use-sync-status'
import { useT } from '../lib/i18n'
import { OfflineBanner } from '../components/offline-banner'
import { SyncErrorTray } from '../components/sync-error-tray'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Text } from '../components/ui/text'
import { PageIntro, ScreenFrame, ScreenState, EmptyState } from '../components/ui/screen'
import { AdaptiveRow, Feedback, Badge, Section } from '../components/ui/feedback'
import { Icon } from '../components/ui/icon'
import { SafeAreaView } from 'react-native-safe-area-context'

// Guard gate view: the visitors a guard acts on — APPROVED (expected at the
// gate) and ENTERED (currently inside) — with check-in / check-out actions.
export default function Gate() {
  const qc = useQueryClient()
  const { t } = useT()
  const { isOnline } = useSyncStatus()
  const { data, isPending, isError, refetch, isRefetching } = useQuery({
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

  if (isPending) return <ScreenState loading />
  if (isError && !data) return <ScreenState onRetry={() => refetch()} />

  const gate = (data ?? []).filter((v) => v.status === 'APPROVED' || v.status === 'ENTERED')

  return (
    <ScreenFrame>
      <FlatList
        className="bg-background"
        contentContainerStyle={{
          width: '100%',
          maxWidth: 720,
          alignSelf: 'center',
          padding: 20,
          paddingBottom: 24,
          gap: 16,
        }}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        refreshing={isRefetching}
        onRefresh={() => refetch()}
        data={gate}
        keyExtractor={(v) => v.id}
        ListHeaderComponent={
          <View className="gap-4">
            <PageIntro title={t('nav.gate')} description={t('design.gateHint')} />
            <OfflineBanner className="mb-2 rounded-md" />
            <SyncErrorTray className="mb-2" />
            <Section>
              {(checkIn.isError || checkOut.isError) && <Feedback />}
              <AdaptiveRow>
                <Input
                  className="flex-1 tracking-widest"
                  accessibilityLabel={t('gate.codePlaceholder')}
                  placeholder={t('gate.codePlaceholder')}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  value={code}
                  onChangeText={setCode}
                />
                <Button
                  onPress={() => redeem.mutate(code.trim().toUpperCase())}
                  disabled={redeem.isPending || code.trim().length === 0 || !isOnline}
                >
                  <Text>{redeem.isPending ? t('gate.redeeming') : t('gate.redeem')}</Text>
                </Button>
              </AdaptiveRow>
              <Button variant="outline" onPress={() => setScanning(true)} disabled={!isOnline}>
                <Text>{t('gate.scanQr')}</Text>
              </Button>
              {redeem.isError && <Feedback message={t('gate.invalidCode')} />}
              {!isOnline && (
                <Text className="text-sm text-muted-foreground">{t('gate.offlineNote')}</Text>
              )}
              <Link href="/register" asChild>
                <Button>
                  <Icon name="plus" color="#FFFFFF" />
                  <Text>{t('nav.registerVisitor')}</Text>
                </Button>
              </Link>
            </Section>
          </View>
        }
        ListEmptyComponent={<EmptyState icon="shield" title={t('gate.empty')} />}
        renderItem={({ item }) => {
          const actions = availableVisitorActions(item.status)
          return (
            <View className="gap-2.5 rounded-xl border border-border bg-card p-5">
              <AdaptiveRow>
                <View className="flex-auto">
                  <Text className="text-base font-semibold">{item.visitorName}</Text>
                  <Text className="text-sm text-muted-foreground">{t('value.' + item.type)}</Text>
                </View>
                <Badge label={t('value.' + item.status)} />
              </AdaptiveRow>
              <View className="flex-row flex-wrap gap-2">
                {actions.includes('checkin') && (
                  <Button
                    accessibilityLabel={`${t('common.checkIn')} ${item.visitorName}`}
                    onPress={() => checkIn.mutate(item.id)}
                    disabled={busy || !isOnline}
                  >
                    <Text>{t('common.checkIn')}</Text>
                  </Button>
                )}
                {actions.includes('checkout') && (
                  <Button
                    variant="outline"
                    accessibilityLabel={`${t('common.checkOut')} ${item.visitorName}`}
                    onPress={() => checkOut.mutate(item.id)}
                    disabled={busy || !isOnline}
                  >
                    <Text>{t('common.checkOut')}</Text>
                  </Button>
                )}
              </View>
            </View>
          )
        }}
      />
      {/* Mount the camera scanner only while open, so expo-camera isn't loaded /
        the camera isn't held on the gate list until the guard taps Scan. */}
      {scanning && (
        <QrScannerModal
          visible={scanning}
          onClose={() => setScanning(false)}
          onScan={(c) => {
            setScanning(false)
            redeem.mutate(c)
          }}
        />
      )}
    </ScreenFrame>
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
  const { t } = useT()
  const [permission, requestPermission] = useCameraPermissions()
  const handledRef = useRef(false)
  const [settingsError, setSettingsError] = useState(false)

  useEffect(() => {
    if (visible) handledRef.current = false
  }, [visible])

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-primary">
        <View accessibilityViewIsModal className="flex-1 items-center justify-center">
          {Platform.OS === 'web' ? (
            <View className="items-center gap-4 p-6">
              <Text className="text-center text-base leading-6 text-white">
                {t('gate.qrWebHint')}
              </Text>
            </View>
          ) : !permission ? (
            <ActivityIndicator color="#FFFFFF" accessibilityLabel={t('common.loading')} />
          ) : !permission.granted ? (
            <View className="items-center gap-4 p-6">
              <Text className="text-center text-base leading-6 text-white">
                {t(permission.canAskAgain ? 'gate.cameraNeeded' : 'design.cameraSettingsHint')}
              </Text>
              <Icon name="shield" color="#FFFFFF" size={48} />
              <Button
                variant="secondary"
                onPress={() => {
                  setSettingsError(false)
                  ;(permission.canAskAgain ? requestPermission() : Linking.openSettings()).catch(
                    () => setSettingsError(true),
                  )
                }}
              >
                <Text>
                  {t(permission.canAskAgain ? 'gate.grantCamera' : 'design.cameraSettings')}
                </Text>
              </Button>
              {settingsError && (
                <Text accessibilityRole="alert" className="text-white">
                  {t('design.actionFailed')}
                </Text>
              )}
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
                <Text className="overflow-hidden rounded-md bg-black/50 px-3 py-2 text-sm text-white">
                  {t('gate.pointCamera')}
                </Text>
              </View>
            </>
          )}
          <View className="absolute inset-x-6 bottom-6">
            <Button variant="outline" onPress={onClose}>
              <Text>{t('common.cancel')}</Text>
            </Button>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  )
}
