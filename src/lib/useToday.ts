import { useEffect, useState } from 'react'
import { todayISO } from './dates'

/** Cambia al llegar la medianoche local y al volver a una pestaña suspendida. */
export function useToday() {
  const [today, setToday] = useState(() => todayISO())
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const refresh = () => {
      clearTimeout(timer)
      setToday(todayISO())
      const midnight = new Date()
      midnight.setHours(24, 0, 0, 0)
      timer = setTimeout(refresh, Math.max(1, midnight.getTime() - Date.now()))
    }
    refresh()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])
  return today
}
