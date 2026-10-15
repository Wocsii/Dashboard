import { useEffect, useState } from 'react'
import { addMonths, format, isSameDay, isSameMonth, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock3, MapPin } from 'lucide-react'
import { themeConfig } from '@/config/theme.config'
import type { CalendarEvent, CalendarInfo } from '@/types/domain'
import { viewDates } from './model'

type Props = { date: Date; onSelect: (date: Date) => void; calendars: CalendarInfo[]; visibleIds: string[]; onToggle: (id: string, visible: boolean) => void; events: CalendarEvent[]; onEdit: (event: CalendarEvent) => void; name: string; weekStartsOn: 0 | 1; category: string; onCategory: (category: string) => void; pending: boolean }
export function CalendarSidebar({ date, onSelect, calendars, visibleIds, onToggle, events, onEdit, name, weekStartsOn, category, onCategory, pending }: Props) {
  const [monthOffset, setMonthOffset] = useState(0)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(timer) }, [])
  const month = addMonths(date, monthOffset)
  const dates = viewDates(month, 'month', weekStartsOn)
  const next = [...events].filter((event) => +parseISO(event.end) > +now).sort((a,b) => +parseISO(a.start) - +parseISO(b.start))[0]
  const categories = [{ label: 'Personal', color: '#f4d48b' }, { label: 'Trabajo', color: '#a9d6ef' }, { label: 'Salud', color: '#efb4cf' }]
  const maxCount = Math.max(1, ...categories.map((item) => events.filter((event) => event.category === item.label).length))
  return <aside aria-label="Panel de calendario" className="flex flex-col gap-3 bg-[#202322] p-3 text-white lg:w-[230px] lg:shrink-0">
    <div className="flex items-center gap-2.5 rounded-2xl bg-white/[0.035] p-3">
      <img src={themeConfig.assets.avatar} alt="" className="size-9 rounded-full object-cover ring-1 ring-white/15" />
      <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{name}</p><p className="mt-1 text-[10px] text-white/55">Un espacio para tus planes</p></div>
      <CalendarDays aria-hidden className="size-4 text-white/70" />
    </div>
    <div className="rounded-2xl bg-gradient-to-br from-white/[0.055] to-white/[0.015] p-3">
      <div className="mb-4 flex items-center justify-between"><p className="text-xs font-medium capitalize">{format(month, 'MMMM yyyy', { locale: es })}</p><div className="flex gap-1"><button type="button" aria-label="Mes anterior del mini calendario" onClick={() => setMonthOffset((n) => n - 1)} className="grid size-6 place-items-center rounded-lg bg-black/20 hover:bg-white/10"><ChevronLeft className="size-3" /></button><button type="button" aria-label="Mes siguiente del mini calendario" onClick={() => setMonthOffset((n) => n + 1)} className="grid size-6 place-items-center rounded-lg bg-black/20 hover:bg-white/10"><ChevronRight className="size-3" /></button></div></div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-[10px]">{dates.slice(0,7).map((day) => <span key={day.toISOString()} className="pb-2 text-[9px] text-white/55">{format(day, 'EEEEE', { locale: es }).toUpperCase()}</span>)}{dates.map((day) => <button type="button" key={day.toISOString()} aria-label={`Ir al ${format(day, "d 'de' MMMM yyyy", { locale: es })}`} aria-current={isSameDay(day, date) ? 'date' : undefined} onClick={() => { onSelect(day); setMonthOffset(0) }} className={`mx-auto grid size-6 place-items-center rounded-full transition-colors ${isSameDay(day,date) ? 'bg-[#c5a2f4] font-semibold text-[#202322]' : !isSameMonth(day,month) ? 'text-white/55 hover:bg-white/10' : isSameDay(day, now) ? 'ring-1 ring-white/45' : 'text-white/80 hover:bg-white/10'}`}>{format(day,'d')}</button>)}</div>
    </div>
    <div className="rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-4">
      <p className="mb-3 flex items-center gap-1.5 text-[10px] text-white/55"><Clock3 className="size-3" /> Próximo plan</p>
      {next ? <><p className="text-[10px] text-white/60">{format(parseISO(next.start), 'EEE d MMM', { locale: es })} · {next.allDay ? 'Todo el día' : format(parseISO(next.start), 'HH:mm')}</p><p className="mt-2 line-clamp-2 text-sm leading-snug font-medium">{next.title}</p>{next.location && <p className="mt-2 flex items-center gap-1 text-[10px] text-white/55"><MapPin className="size-3 shrink-0" /><span className="truncate">{next.location}</span></p>}<button type="button" onClick={() => onEdit(next)} className="mt-4 rounded-lg bg-[#c5a2f4] px-3 py-1.5 text-[10px] font-semibold text-[#202322] hover:bg-[#d4baf7]">Ver detalles</button></> : <p className="text-xs leading-relaxed text-white/65">No hay próximos planes en este período. Un poco de espacio para ti.</p>}
    </div>
    <details open className="rounded-2xl bg-white/[0.035] p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-medium">Mis calendarios <ChevronDown className="size-3 text-white/55" /></summary>
      <div className="mt-3 flex flex-col gap-2.5">{calendars.map((calendar) => <label key={calendar.id} className="flex cursor-pointer items-center gap-2 text-[11px] text-white/80"><input type="checkbox" checked={visibleIds.includes(calendar.id)} onChange={(e) => onToggle(calendar.id,e.target.checked)} disabled={pending} className="size-3.5 rounded accent-[#c5a2f4]" /><span className="size-1.5 shrink-0 rounded-full" style={{ background: calendar.color }} aria-hidden /><span className="truncate">{calendar.summary}</span>{!calendar.writable && <span className="ml-auto text-[8px] text-white/55">lectura</span>}</label>)}{calendars.length === 0 && <p className="text-[10px] text-white/55">Conecta Google para ver tus calendarios.</p>}</div>
    </details>
    <details open className="rounded-2xl bg-white/[0.035] p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-medium">Categorías <ChevronDown className="size-3 text-white/55" /></summary>
      <p className="mt-2 text-[9px] text-white/55">Eventos del período visible</p>
      <div className="mt-3 flex flex-col gap-3">{categories.map((item) => { const count = events.filter((event) => event.category === item.label).length; return <button type="button" key={item.label} aria-pressed={category === item.label} onClick={() => onCategory(category === item.label ? '' : item.label)} className={`flex items-center gap-2 rounded text-left text-[10px] ${category === item.label ? 'ring-1 ring-white/40 ring-offset-4 ring-offset-[#242726]' : 'text-white/75'}`}><span className="size-2 rounded-full" style={{ background: item.color }} aria-hidden /><span className="w-12 shrink-0">{item.label}</span><span className="h-0.5 min-w-4 flex-1 rounded bg-white/10"><span className="block h-full rounded" style={{ width: `${count/maxCount*100}%`, background: item.color }} /></span><span className="w-3 text-right text-white/55">{count}</span></button> })}</div>
      {category && <button type="button" onClick={() => onCategory('')} className="mt-4 text-[10px] text-white/60 underline">Ver todas las categorías</button>}
    </details>
  </aside>
}
