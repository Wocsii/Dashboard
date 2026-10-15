import { CalendarX2, Link2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import type { CalendarStatus } from '@/types/domain'
import { calendarApi } from './api'

/** Estados no conectados del calendario: sin configurar, desconectado, reconectar */
export function CalendarStatusPanel({ status, compact }: { status: CalendarStatus; compact?: boolean }) {
  const toast = useToast()
  const connect = () => calendarApi.connect().catch((e: Error) => toast(e.message, 'error'))

  if (status.state === 'not_configured')
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-ink-soft">
        <CalendarX2 className="size-6 text-muted" aria-hidden />
        <p className="font-medium text-ink">Google Calendar aún no está configurado</p>
        {!compact && (
          <p className="max-w-sm text-xs text-muted">
            Faltan las credenciales de Google en el servidor. Sigue la guía <code>docs/GOOGLE_CALENDAR.md</code> y añade las variables en Vercel.
          </p>
        )}
      </div>
    )

  if (status.state === 'needs_reauth')
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center text-sm text-ink-soft">
        <p>El acceso a Google Calendar ha caducado o se ha revocado.</p>
        <Button size="sm" onClick={connect}><RefreshCw className="size-3.5" /> Reconectar</Button>
      </div>
    )

  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center text-sm text-ink-soft">
      <p>Conecta tu Google Calendar para ver aquí tus eventos.</p>
      <Button size="sm" onClick={connect}><Link2 className="size-3.5" /> Conectar Google Calendar</Button>
      {!compact && <p className="text-[11px] text-muted">Podrás consultar y editar tus eventos. Puedes desconectarlo en Ajustes.</p>}
    </div>
  )
}
