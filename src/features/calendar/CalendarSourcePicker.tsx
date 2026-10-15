import { Segmented } from '@/components/ui/Field'
import { useCalendarProvider } from './CalendarProvider'
import type { CalendarProvider } from '@/types/domain'
export function CalendarSourcePicker({ onChange }: { onChange?:() => void }) {
  const { provider,setProvider } = useCalendarProvider()
  return <div className="[&_[aria-checked=true]]:bg-sky-200 [&_[aria-checked=true]]:text-ink"><Segmented<CalendarProvider> label="Origen del calendario" value={provider} onChange={(next) => { onChange?.(); setProvider(next) }} size="sm" options={[{ value:'google',label:'Google' },{ value:'apple',label:'Apple' }]} /></div>
}
