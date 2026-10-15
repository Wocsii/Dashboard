import { createContext, useContext, useState, type ReactNode } from 'react'
import type { CalendarProvider as Provider } from '@/types/domain'
import { useAuth } from '@/features/auth/AuthProvider'
const Context = createContext<{ provider:Provider; setProvider:(provider:Provider) => void }>({ provider:'google',setProvider:() => {} })
export function CalendarProvider({ children }: { children:ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id ?? 'demo'
  return <UserCalendarProvider key={userId} userId={userId}>{children}</UserCalendarProvider>
}
function UserCalendarProvider({ userId,children }: { userId:string; children:ReactNode }) {
  const key = `mi-espacio.calendar.provider.${userId}`
  const [provider,setCurrent] = useState<Provider>(() => { try { return localStorage.getItem(key) === 'apple' ? 'apple' : 'google' } catch { return 'google' } })
  const setProvider = (next:Provider) => { setCurrent(next); try { localStorage.setItem(key,next) } catch { /* Usable for this tab. */ } }
  return <Context.Provider value={{ provider,setProvider }}>{children}</Context.Provider>
}
// eslint-disable-next-line react-refresh/only-export-components
export function useCalendarProvider() { return useContext(Context) }
