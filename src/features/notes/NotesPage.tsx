import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { BookOpen, Plus } from 'lucide-react'
import { ErrorNote, Spinner } from '@/components/ui/States'
import { useCreateNote, useDeleteNote, useNotes } from './hooks'
import { emptyBoard, readBoard } from './board'
import { BoardEditor } from './BoardEditor'
import { Sticker } from './stickers'
import './whiteboard.css'

export function NotesPage() {
  const { data: notes, isLoading, error, refetch } = useNotes()
  const create = useCreateNote()
  const remove = useDeleteNote()
  const [params, setParams] = useSearchParams()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const creating = useRef(false)
  const boards = (notes ?? []).filter((n) => !readBoard(n.content).calendarKey)
  const selected = boards.find((n) => n.id === selectedId) ?? boards[0]
  const newBoard = () => create.mutate({ title: 'Mi pequeño cuaderno', content: JSON.stringify(emptyBoard()) }, { onSuccess: (note) => setSelectedId(note.id) })
  useEffect(() => {
    if (params.get('nueva') && !creating.current) {
      creating.current = true
      setParams({}, { replace: true })
      newBoard()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])
  return <div className="kw-page">
    <header className="kw-page-heading"><div><span className="kw-eyebrow">notas · tu rincón creativo</span><h1>Entre páginas e ideas</h1><p>Un cuaderno para escribir, dibujar y guardar tu pequeña colección soft.</p></div><button type="button" className="kw-primary" onClick={newBoard} disabled={create.isPending}><Plus size={17} /> Nuevo cuaderno</button></header>
    {isLoading && <Spinner />}
    {error && <ErrorNote error={error} onRetry={() => void refetch()} />}
    {boards.length > 0 && <nav className="kw-tabs" aria-label="Mis cuadernos">{boards.map((n) => <button type="button" key={n.id} aria-current={selected?.id === n.id} onClick={() => setSelectedId(n.id)}><BookOpen size={15} /><span>{n.title || 'Sin título'}</span></button>)}</nav>}
    {selected ? <BoardEditor key={selected.id} note={selected} onDelete={() => { remove.mutate(selected.id); setSelectedId(null) }} /> : !isLoading && <div className="kw-empty"><div className="kw-empty-sticker"><Sticker id="soft-marfil-0" /></div><h2>Una página en blanco, mil posibilidades</h2><p>Pega tus fotos, escribe con el Apple Pencil y llena tus páginas de conejitos, lacitos y recuerdos.</p><button type="button" className="kw-primary" onClick={newBoard} disabled={create.isPending}><Plus size={17} /> Crear mi primer cuaderno</button></div>}
  </div>
}
