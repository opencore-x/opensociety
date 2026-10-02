import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AppState, Platform } from 'react-native'
import { useAuth } from '@clerk/clerk-expo'
import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import { pushScreenSchema } from '@opensociety/shared'
import { apiClient } from '../api/client'
import AsyncStorage from '@react-native-async-storage/async-storage'

type PushStatus = 'unavailable' | 'off' | 'ready' | 'error' | 'busy'
const PushContext = createContext({ status: 'unavailable' as PushStatus, enable: async () => {}, disconnect: async () => {} })
export const usePushNotifications = () => useContext(PushContext)

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
  })
}

export function PushProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, userId, getToken } = useAuth()
  const [status, setStatus] = useState<PushStatus>('off')
  const getter = useRef(getToken)
  const registration = useRef<{ token: string; bearer: string } | null>(null)
  const generation = useRef(0)
  const disconnecting = useRef(false)
  const queue = useRef<Promise<void>>(Promise.resolve())
  const supported = Platform.OS !== 'web' && Constants.executionEnvironment !== 'storeClient'
  useEffect(() => { getter.current = getToken }, [getToken])
  const invalidate = useCallback(() => { generation.current++ }, [])

  const serialize = useCallback((action: () => Promise<void>) => {
    const work = queue.current.then(action, action)
    queue.current = work.catch(() => {})
    return work
  }, [])

  const register = useCallback((prompt: boolean) => {
    const current = generation.current
    return serialize(async () => {
      if (!supported || !isSignedIn || !userId || disconnecting.current || current !== generation.current) return
      setStatus('busy')
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', { name: 'OpenSociety', importance: Notifications.AndroidImportance.HIGH })
        }
        let permission = await Notifications.getPermissionsAsync()
        if (!permission.granted && prompt && permission.canAskAgain) permission = await Notifications.requestPermissionsAsync()
        if (!permission.granted) { setStatus('off'); return }
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
        if (!projectId) throw new Error('missing project')
        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })
        const bearer = await getter.current()
        if (!bearer || disconnecting.current || current !== generation.current) return
        const previousToken = await AsyncStorage.getItem(`push-token:${userId}`)
        if (previousToken && previousToken !== token) await apiClient.unregisterPushToken(previousToken, bearer)
        await apiClient.registerPushToken({ token, platform: Platform.OS === 'ios' ? 'ios' : 'android' }, bearer)
        registration.current = { token, bearer }
        await AsyncStorage.setItem(`push-token:${userId}`, token)
        if (current !== generation.current) {
          await apiClient.unregisterPushToken(token, bearer)
          registration.current = null
          await AsyncStorage.removeItem(`push-token:${userId}`)
          return
        }
        setStatus('ready')
      } catch {
        if (current === generation.current) setStatus('error')
      }
    })
  }, [isSignedIn, userId, serialize, supported])

  const disconnect = useCallback(async () => {
    disconnecting.current = true
    generation.current++
    await serialize(async () => {
      const previous = registration.current
      const token = previous?.token ?? (userId ? await AsyncStorage.getItem(`push-token:${userId}`) : null)
      if (token) {
        const bearer = await getter.current() ?? previous?.bearer
        if (!bearer) throw new Error('Sign in again to disconnect notifications')
        await apiClient.unregisterPushToken(token, bearer)
        registration.current = null
        if (userId) await AsyncStorage.removeItem(`push-token:${userId}`)
      }
      setStatus('off')
    })
  }, [serialize, userId])

  useEffect(() => {
    generation.current++
    disconnecting.current = false
    if (!isSignedIn || !supported) return
    void register(false)
    const state = AppState.addEventListener('change', (next) => { if (next === 'active') void register(false) })
    const token = Notifications.addPushTokenListener(() => { void register(false) })
    return () => { invalidate(); state.remove(); token.remove() }
  }, [isSignedIn, userId, supported, register, invalidate])

  useEffect(() => {
    if (!isSignedIn || !supported) return
    const open = (response: Notifications.NotificationResponse | null) => {
      if (!response) return
      const screen = pushScreenSchema.safeParse(response.notification.request.content.data?.screen)
      if (screen.success) router.push(`/${screen.data}`)
      void Notifications.clearLastNotificationResponseAsync()
    }
    // The native response can outlive a process restart.
    const last = Notifications.getLastNotificationResponse()
    if (last && Date.now() - last.notification.date < 3600_000) open(last)
    const subscription = Notifications.addNotificationResponseReceivedListener(open)
    return () => subscription.remove()
  }, [isSignedIn, supported])

  return <PushContext.Provider value={{ status: supported ? status : 'unavailable', enable: () => register(true), disconnect }}>{children}</PushContext.Provider>
}
