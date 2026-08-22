import { useSyncExternalStore } from 'react'
import { getSnapshot, subscribe } from './progress'
import type { Profile } from './progress'

/** Subscribes a component to the local learner profile. */
export function useProfile(): Profile {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
