import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router'
import { BookOpen, Plus, Trash2, Check } from 'lucide-react'
import { useConfirm } from '@/components/ui/useConfirm'
import { ErrorNote, Spinner } from '@/components/ui/States'
import { useCreateNote, useDeleteNote, useNotes } from './hooks'
import { emptyBoard, notebookBoard, readBoard } from './board'
import { BoardEditor } from './BoardEditor'
import { COVERS, coverFor } from './covers'
import './whiteboard.css'
import './notebooks.css'

function NewNotebook({ pending, onCreate, onClose }: { pending: boolean; onCreate: (name: string, cover: string) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [name, setName] = useState('')
  const [cover, setCover] = useState(COVERS[0].id)
  useEffect(() => { dialog.current?.showModal() }, [])
  return createPortal(<dialog ref={dialog} className="kw-create-dialog" aria-label="Crear cuaderno" onClose={onClose} onCancel={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); if (name.trim() && !pending) onCreate(name.trim(), cover) }}>
      <header><div><span className="kw-eyebrow">un lugar para tus ideas</span><h2>Tu nuevo cuaderno</h2></div><button type="button" aria-label="Cerrar creación de cuaderno" onClick={() => dialog.current?.close()}>×</button></header>
      <label className="kw-name-label" htmlFor="notebook-name">¿Qué nombre quieres ponerle?</label>
      <input id="notebook-name" autoFocus required maxLength={120} placeholder="Mi cuaderno de ideas…" value={name} onChange={(event) => setName(event.target.value)} />
      <fieldset><legend>Elige la tapa de tu cuaderno</legend><div className="kw-cover-options">{COVERS.map((item) => <label key={item.id} className={cover === item.id ? 'kw-chosen-cover' : ''}><input type="radio" name="cover" value={item.id} aria-label={item.name} checked={cover === item.id} onChange={() => setCover(item.id)} /><img src={item.image} alt="" loading="lazy" /><span>{item.name}</span>{cover === item.id && <Check size={16} className="kw-cover-check" />}</label>)}</div></fieldset>
      <footer><a href={coverFor(cover).source} target="_blank" rel="noreferrer">Ver portada en Pinterest</a><button type="button" className="kw-soft-button" onClick={() => dialog.current?.close()}>Cancelar</button><button type="submit" className="kw-primary" disabled={!name.trim() || pending}><Plus size={17} /> {pending ? 'Creando…' : 'Crear cuaderno'}</button></footer>
    </form>
  </dialog>, document.body)
}

export function NotesPage() {
  const { data: notes, isLoading, error, refetch } = useNotes()
  const create = useCreateNote()
  const remove = useDeleteNote()
  const { confirm, dialog } = useConfirm()
  const [params, setParams] = useSearchParams()
  const [creating, setCreating] = useState(false)
  const quickAction = useRef(false)
  const selectedId = params.get('cuaderno')
  const select = (id: string | null) => setParams(id ? { cuaderno: id } : {}, { replace: true })
  const books = (notes ?? []).map((note) => ({ note, board: readBoard(note.content) })).filter(({ board }) => !board.calendarKey)
  const selected = books.find(({ note }) => note.id === selectedId)
  useEffect(() => {
    if (params.get('nueva') && !quickAction.current) {
      quickAction.current = true; setParams({}, { replace: true }); setCreating(true)
    }
  }, [params, setParams])
  useEffect(() => {
    if (!selected) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [selected?.note.id])
  const createBook = (name: string, cover: string) => create.mutate({ title: name, content: JSON.stringify(notebookBoard({ ...emptyBoard(), cover })) }, { onSuccess: (note) => { setCreating(false); select(note.id) } })
  const deleteBook = (id: string) => { remove.mutate(id); if (selectedId === id) select(null) }
  if (selected) return createPortal(<div className="kw-notebook-reader"><BoardEditor key={selected.note.id} note={selected.note} onBack={() => select(null)} onDelete={() => deleteBook(selected.note.id)} /></div>, document.body)
  return <div className="kw-page kw-notes-library">
    <header className="kw-library-heading"><div><h1>Mis cuadernos</h1></div><button type="button" className="kw-primary" onClick={() => setCreating(true)}><Plus size={17} /> Nuevo cuaderno</button></header>
    {isLoading && <Spinner />}
    {error && <ErrorNote error={error} onRetry={() => void refetch()} />}
    <div className="kw-library-grid">{books.map(({ note, board }) => {
      const fallback = COVERS[Array.from(note.id).reduce((sum, char) => sum + char.charCodeAt(0), 0) % COVERS.length].id
      const cover = coverFor(board.cover ?? fallback)
      return <article key={note.id} className="kw-library-book"><button type="button" className="kw-open-book" aria-label={`Abrir cuaderno ${note.title || 'Sin título'}`} onClick={() => select(note.id)}><div className="kw-book-cover"><img src={cover.image} alt="" /><i className="kw-book-spine" /></div><h2>{note.title || 'Sin título'}</h2><span>{board.pages?.length ?? 1} {(board.pages?.length ?? 1) === 1 ? 'página' : 'páginas'}</span></button><button type="button" className="kw-library-delete" aria-label={`Eliminar cuaderno ${note.title || 'Sin título'}`} onClick={() => { void confirm({ title: 'Eliminar cuaderno', message: `¿Eliminar «${note.title || 'Sin título'}» y todas sus páginas? Esta acción no se puede deshacer.` }).then((ok) => { if (ok) deleteBook(note.id) }) }}><Trash2 size={15} /></button></article>
    })}<button type="button" className="kw-add-book-tile" aria-label="Crear otro cuaderno" onClick={() => setCreating(true)}><span><Plus size={32} /></span><strong>Nuevo cuaderno</strong></button></div>
    {!isLoading && books.length === 0 && <div className="kw-library-empty"><BookOpen size={27} /><h2>Tu próxima historia empieza aquí</h2><p>Elige una tapa, ponle un nombre y llena sus páginas de recuerdos.</p></div>}
    {dialog}
    {creating && <NewNotebook pending={create.isPending} onCreate={createBook} onClose={() => setCreating(false)} />}
  </div>
}
