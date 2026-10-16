import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { defaultAppearance, isNight, parseAppearance, type Appearance } from './schedule'
const Context = createContext({ appearance: defaultAppearance, night: false, update: (_patch: Partial<Appearance>) => {} })
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id ?? 'demo'
  return <UserAppearance key={userId} userId={userId}>{children}</UserAppearance>
}
function UserAppearance({ userId, children }: { userId: string; children: ReactNode }) {
  const key = `mi-espacio:appearance:${userId}`
  const [appearance, setAppearance] = useState(() => { try { return parseAppearance(localStorage.getItem(key)) } catch { return defaultAppearance } })
  const [now, setNow] = useState(() => new Date())
  const night = isNight(appearance, now)
  const update = (patch: Partial<Appearance>) => {
    setNow(new Date())
    setAppearance((previous) => {
      const next = { ...previous, ...patch }
      try { localStorage.setItem(key, JSON.stringify(next)) } catch { /* Works for this tab when storage is unavailable. */ }
      return next
    })
  }
  useEffect(() => {
    const tick = () => setNow(new Date())
    const timer = window.setInterval(tick, 1000)
    const storage = (event: StorageEvent) => { if (event.key === key || event.key === null) { try { setAppearance(parseAppearance(localStorage.getItem(key))) } catch { /* Keep current preference. */ } tick() } }
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('storage', storage)
    return () => { clearInterval(timer); window.removeEventListener('focus', tick); document.removeEventListener('visibilitychange', tick); window.removeEventListener('storage', storage) }
  }, [key])
  useEffect(() => {
    document.documentElement.dataset.theme = night ? 'night' : 'day'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', night ? '#10192c' : '#97a6b4')
  }, [night])
  return <Context.Provider value={{ appearance, night, update }}>{children}</Context.Provider>
}
// eslint-disable-next-line react-refresh/only-export-components
export function useAppearance() { return useContext(Context) }
