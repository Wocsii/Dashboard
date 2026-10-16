import { useEffect, useState } from 'react'
import { projectColors, type ProjectColor } from '@/config/theme.config'

function readColors(key: string): Record<string, ProjectColor> {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? '{}')
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
    return Object.fromEntries(Object.entries(raw).filter(([, color]) => projectColors.includes(color as ProjectColor))) as Record<string, ProjectColor>
  } catch { return {} }
}
export function useGoogleColumnColors(userId?: string) {
  const key = `mi-espacio:google-column-colors:${userId ?? 'loading'}`
  const [stored, setStored] = useState(() => ({ key, colors: readColors(key) }))
  if (stored.key !== key) setStored({ key, colors: readColors(key) })
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === key || event.key === null) setStored({ key, colors: readColors(key) }) }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [key])
  const setColor = (id: string, color: ProjectColor) => {
    if (!userId) return
    const colors = { ...readColors(key), [id]: color }
    try { localStorage.setItem(key, JSON.stringify(colors)) } catch { /* Keep the choice in this tab if storage is unavailable. */ }
    setStored({ key, colors })
  }
  return { colors: stored.key === key ? stored.colors : readColors(key), setColor }
}
