import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Link2, Link2Off } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { ErrorNote, Spinner } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { isDemo } from '@/lib/env'
import { calendarApi } from './api'
import { useCalendarStatus, useDisconnectCalendar } from './hooks'
import { useCalendarProvider } from './CalendarProvider'
export function AppleConnectionPanel() {
  const status = useCalendarStatus('apple')
  const disconnect = useDisconnectCalendar('apple')
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const qc = useQueryClient(), toast = useToast()
  const { setProvider } = useCalendarProvider()
  const connect = useMutation({ mutationFn: () => calendarApi.connectApple(email.trim(),password.trim()), onSuccess: async () => { setPassword(''); setProvider('apple'); await qc.invalidateQueries({ queryKey:['calendar'] }); toast('Apple Calendar conectado') }, onSettled: () => setPassword('') })
  function submit(event:FormEvent) { event.preventDefault(); if (!connect.isPending) connect.mutate() }
  if (status.isPending) return <Spinner label="Comprobando iCloud…" />
  if (status.error) return <ErrorNote error={status.error} onRetry={() => void status.refetch()} />
  if (status.data?.state === 'connected') return <div className="flex flex-col gap-3">
    <p className="text-sm text-ink-soft">Conectado como <strong>{status.data.email}</strong></p>
    <p className="text-xs leading-relaxed text-muted">Tus calendarios de iCloud están disponibles en las vistas de lista y calendario visual. Los cambios se guardan en Apple.</p>
    {disconnect.error && <ErrorNote error={disconnect.error} />}
    <div><Button variant="danger" size="sm" disabled={disconnect.isPending} onClick={() => disconnect.mutate()}><Link2Off className="size-3.5" /> Desconectar Apple Calendar</Button></div>
  </div>
  return <div className="flex flex-col gap-4">
    <div><h3 className="text-sm font-semibold">Conecta tu Calendario de Apple</h3><p className="mt-2 text-xs leading-relaxed text-ink-soft">Consulta y organiza los calendarios que tienes guardados en iCloud, también desde este dashboard.</p></div>
    {status.data?.state === 'not_configured' ? <p className="rounded-xl bg-sky-50 p-3 text-xs text-ink-soft">La conexión de Apple todavía no está activada en el servidor.</p> : <>
      {isDemo ? <p className="rounded-xl bg-sky-50 p-3 text-xs text-ink-soft">En modo demo no se conectan cuentas reales. Inicia sesión en tu dashboard para vincular iCloud.</p> : <form onSubmit={submit} className="flex max-w-md flex-col gap-3">
        {status.data?.state === 'needs_reauth' && <p className="text-xs text-coral-accessible">Apple ha caducado o revocado el acceso. Genera otra contraseña específica y vuelve a conectar.</p>}
        <Field label="Correo de tu cuenta de Apple">{(id) => <Input id={id} type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={connect.isPending} />}</Field>
        <Field label="Contraseña específica para esta app" hint="Genera una en tu cuenta de Apple. No uses la contraseña principal.">{(id) => <Input id={id} type="password" autoComplete="new-password" placeholder="xxxx-xxxx-xxxx-xxxx" pattern="[a-z]{4}(-[a-z]{4}){3}" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={connect.isPending} />}</Field>
        {connect.error && <ErrorNote error={connect.error} />}
        <Button type="submit" variant="sun" disabled={connect.isPending} className="self-start"><Link2 className="size-3.5" />{connect.isPending ? 'Conectando…' : 'Conectar Apple Calendar'}</Button>
      </form>}
    </>}
    <a href="https://account.apple.com/account/manage" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-ink-soft hover:underline">Crear contraseña específica en Apple <ExternalLink className="size-3" /></a>
    <p className="max-w-md text-[11px] leading-relaxed text-muted">Apple requiere autenticación de doble factor. Cada persona conecta su propia cuenta. Los calendarios locales del dispositivo deben estar en iCloud para aparecer aquí.</p>
  </div>
}
