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

function writeToStorage(keys: ApiKeys) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
  window.dispatchEvent(new Event('cracked_api_keys_change'))
}

function subscribe(listener: () => void) {
  const handler = () => listener()
  window.addEventListener('cracked_api_keys_change', handler)
  return () => {
    window.removeEventListener('cracked_api_keys_change', handler)
  }
}

let cachedRaw: string | null = null
let cachedKeys: ApiKeys = defaultKeys

function getSnapshot(): ApiKeys {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw !== cachedRaw) {
    cachedRaw = raw
    try {
      cachedKeys = raw ? { ...defaultKeys, ...JSON.parse(raw) } : defaultKeys
    } catch {
      cachedKeys = defaultKeys
    }
  }
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
