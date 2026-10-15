import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Pin, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState, ErrorNote, Spinner } from '@/components/ui/States'
import { copy } from '@/config/copy.es'
import { cn } from '@/lib/cn'
import { relativeDay, toISODate } from '@/lib/dates'
import { useCreateNote, useNotes } from './hooks'
import { NoteEditor } from './NoteEditor'

export function NotesPage() {
  const { data: notes, isLoading, error, refetch } = useNotes()
  const create = useCreateNote()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const creating = useRef(false)

  const newNote = () =>
    create.mutate(undefined, {
      onSuccess: (n) => setSelectedId(n.id),
    })

  // /notas?nueva=1 (acción rápida) → crea una nota y la abre
  useEffect(() => {
    if (params.get('nueva') && !creating.current) {
      creating.current = true
      setParams({}, { replace: true })
      newNote()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = [...(notes ?? [])].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at))
    return q ? list.filter((n) => `${n.title} ${n.content}`.toLowerCase().includes(q)) : list
  }, [notes, search])

  const selected = notes?.find((n) => n.id === selectedId) ?? (selectedId === null ? filtered[0] : undefined)

  return (
    <>
      <PageHeader
        title="Notas"
        subtitle={`${notes?.length ?? 0} notas`}
        actions={
          <Button onClick={newNote}>
            <Plus className="size-4" /> Nueva nota
          </Button>
        }
      />
      {isLoading && <Spinner />}
      {error && <ErrorNote error={error} onRetry={() => void refetch()} />}
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Card tone="glass" className="flex h-fit flex-col gap-3 p-3">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted" aria-hidden />
            <Input aria-label="Buscar notas" className="rounded-full pl-8" placeholder="Buscar en notas…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <ul className="flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto soft-scroll">
            {filtered.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(n.id)}
                  aria-current={selected?.id === n.id}
                  className={cn(
                    'w-full rounded-tile px-3.5 py-3 text-left transition-colors',
                    selected?.id === n.id ? 'bg-card shadow-soft' : 'hover:bg-white/60',
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    {n.pinned && <Pin className="size-3 shrink-0 fill-sun text-ink" aria-label="Fijada" />}
                    <span className="truncate text-sm font-semibold">{n.title || 'Sin título'}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted">{n.content || 'Vacía'}</p>
                  <p className="mt-1 text-[10px] text-muted">{relativeDay(toISODate(new Date(n.updated_at)))}</p>
                </button>
              </li>
            ))}
            {notes && filtered.length === 0 && <EmptyState className="py-4">{search ? 'Sin resultados' : copy.empty.notes}</EmptyState>}
          </ul>
        </Card>
        <Card tone="ivory" className="min-h-[60vh] p-6">
          {selected ? (
            <NoteEditor key={selected.id} note={selected} onDeleted={() => setSelectedId(null)} />
          ) : (
            <EmptyState action={<Button size="sm" onClick={newNote}><Plus className="size-3.5" /> Crear nota</Button>}>Elige o crea una nota</EmptyState>
          )}
        </Card>
      </div>
    </>
  )
}
