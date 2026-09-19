import { useSyncExternalStore } from 'react'
import { forestStore } from './forestStore'

export function useForestState() {
  return useSyncExternalStore(
    forestStore.subscribe,
    forestStore.getSnapshot,
    forestStore.getSnapshot,
  )
}
