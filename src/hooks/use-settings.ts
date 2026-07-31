import { useCallback, useState } from 'react'
import type { AppSettings } from '../lib/types'

const storageKey = 'netdata-mobile.settings.v1'
const defaults: AppSettings = { apiBase: '/netdata', mode: 'live', refreshSeconds: 10 }

function readSettings(): AppSettings {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(storageKey) ?? '{}') as Partial<AppSettings> }
  } catch {
    return defaults
  }
}

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(readSettings)
  const setSettings = useCallback((next: AppSettings) => {
    localStorage.setItem(storageKey, JSON.stringify(next))
    setSettingsState(next)
  }, [])
  return { settings, setSettings }
}
