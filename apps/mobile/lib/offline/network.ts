import { onlineManager } from '@tanstack/react-query'
import * as Network from 'expo-network'

// Treat a network state as "online" only when the internet is actually
// reachable; fall back to raw connectivity, then to optimistic-online when the
// platform can't tell us (so we never wedge the app into a permanent offline
// state on a device that simply doesn't report reachability).
function isOnline(state: Network.NetworkState): boolean {
  return state.isInternetReachable ?? state.isConnected ?? true
}

// Wire TanStack Query's onlineManager to the device network state. When this
// flips to offline, mutations with networkMode 'offlineFirst' pause (queue up)
// instead of failing; when it flips back, paused mutations auto-resume. Call
// once at app startup.
export function setupOnlineManager() {
  onlineManager.setEventListener((setOnline) => {
    Network.getNetworkStateAsync()
      .then((state) => setOnline(isOnline(state)))
      .catch(() => setOnline(true))
    const subscription = Network.addNetworkStateListener((state) => {
      setOnline(isOnline(state))
    })
    return () => subscription.remove()
  })
}
