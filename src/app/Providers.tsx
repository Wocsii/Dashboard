import { CalendarProvider } from '@/features/calendar/CalendarProvider'
import { Outlet } from 'react-router'
import { Spinner } from '@/components/ui/States'
import { useAuth } from '@/features/auth/AuthProvider'
import { LoginPage } from '@/features/auth/LoginPage'
import { PomodoroProvider } from '@/features/focus/PomodoroProvider'
import { QuickActionsProvider } from '@/features/quick-actions'

/** Proveedores que necesitan el router y una sesión iniciada */
export function Providers() {
  const { status } = useAuth()
  if (status === 'loading') return <Spinner />
  if (status === 'signed_out') return <LoginPage />
  return (
    <CalendarProvider>
      <PomodoroProvider>
        <QuickActionsProvider>
          <Outlet />
        </QuickActionsProvider>
      </PomodoroProvider>
    </CalendarProvider>
  )
}
