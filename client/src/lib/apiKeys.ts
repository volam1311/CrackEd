import { useCallback, useSyncExternalStore } from 'react'

export type AiProvider = 'openai' | 'anthropic' | 'gemini'

export type ApiKeys = {
  youtubeDataKey: string
  aiProvider: AiProvider
  aiApiKey: string
  groqApiKey: string
}

const STORAGE_KEY = 'cracked_api_keys'

const defaultKeys: ApiKeys = {
  youtubeDataKey: '',
  aiProvider: 'openai',
  aiApiKey: '',
  groqApiKey: '',
}

/*
 * localStorage *throws* rather than returning null when it is unavailable —
 * a private window, blocked site data, or an embedded webview. `getSnapshot`
 * runs during render, so an unguarded read takes the whole React tree down
 * instead of degrading to "no keys saved".
 */

/** Null until first read. Memory is authoritative once populated. */
let cachedKeys: ApiKeys | null = null

function readFromStorage(): ApiKeys {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...defaultKeys, ...(JSON.parse(raw) as Partial<ApiKeys>) } : defaultKeys
  } catch {
    // Unavailable or corrupt: behave as though nothing was saved.
    return defaultKeys
  }
}

function writeToStorage(keys: ApiKeys) {
  // Update memory first: if persistence fails the keys must still work for this
  // session, and a later read must not resurrect the previous values.
  cachedKeys = keys
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
  } catch {
    // Storage blocked or full — the keys simply will not survive a reload.
  }
  window.dispatchEvent(new Event('cracked_api_keys_change'))
}

function subscribe(listener: () => void) {
  const handler = () => listener()
  // Another tab saving keys fires `storage`, not our custom event; drop the
  // cache so the next snapshot re-reads what that tab wrote.
  const storageHandler = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      cachedKeys = null
      listener()
    }
  }
  window.addEventListener('cracked_api_keys_change', handler)
  window.addEventListener('storage', storageHandler)
  return () => {
    window.removeEventListener('cracked_api_keys_change', handler)
    window.removeEventListener('storage', storageHandler)
  }
}

function getSnapshot(): ApiKeys {
  // Must never throw: this runs during render, and an exception here would
  // unmount the whole tree rather than degrading to "no keys saved".
  cachedKeys ??= readFromStorage()
  return cachedKeys
}

export function useApiKeys() {
  const keys = useSyncExternalStore(subscribe, getSnapshot)

  const setKeys = useCallback((next: ApiKeys) => {
    writeToStorage(next)
  }, [])

  return {
    keys,
    setKeys,
    hasAiKey: Boolean(keys.aiApiKey.trim()),
    hasGroqKey: Boolean(keys.groqApiKey.trim()),
    hasYoutubeKey: Boolean(keys.youtubeDataKey.trim()),
  }
}
