import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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

const OPEN_MS = 520
const CLOSE_MS = 360

function coverOf(id: string, cover?: string) {
  const fallback = COVERS[Array.from(id).reduce((sum, char) => sum + char.charCodeAt(0), 0) % COVERS.length].id
  return coverFor(cover ?? fallback)
}

/** Abre el cuaderno creciendo desde su tapa en la biblioteca y lo cierra encogiéndolo de vuelta; deja visible la barra lateral */
function NotebookReader({ note, cover, onBack, onDelete }: { note: Parameters<typeof BoardEditor>[0]['note']; cover: string; onBack: () => void; onDelete: () => void }) {
  const reader = useRef<HTMLDivElement>(null)
  const veil = useRef<HTMLDivElement>(null)
  const closing = useRef(false)
  const clipFrom = () => {
    const node = reader.current
    const origin = document.querySelector(`[data-book-id="${CSS.escape(note.id)}"] .kw-book-cover`)?.getBoundingClientRect()
    if (!node || !origin) return null
    const box = node.getBoundingClientRect()
    return `inset(${origin.top - box.top}px ${box.right - origin.right}px ${box.bottom - origin.bottom}px ${origin.left - box.left}px round 10px)`
  }
  const play = (direction: 'open' | 'close') => {
    const node = reader.current, cloth = veil.current
    const from = clipFrom()
    const quiet = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!node || typeof node.animate !== 'function' || quiet) return Promise.resolve()
    const open = direction === 'open'
    const duration = open ? OPEN_MS : CLOSE_MS
    const clip = [from ?? 'inset(8% 8% 8% 8% round 20px)', 'inset(0px 0px 0px 0px round 20px)']
    const shape = node.animate({ clipPath: open ? clip : [...clip].reverse() }, { duration, easing: 'cubic-bezier(.22,.8,.24,1)', fill: 'both' })
    cloth?.animate({ opacity: open ? [1, 1, 0] : [0, 1, 1], offset: open ? [0, .35, 1] : [0, .5, 1] }, { duration, easing: 'ease', fill: 'both' })
    return shape.finished.then(() => undefined, () => undefined)
  }
  useLayoutEffect(() => { void play('open') }, [])
  const close = () => {
    if (closing.current) return
    closing.current = true
    void play('close').then(onBack)
  }
  return <div ref={reader} className="kw-notebook-reader" role="presentation">
    <BoardEditor key={note.id} note={note} onBack={close} onDelete={onDelete} />
    <div ref={veil} className="kw-open-cover" aria-hidden="true"><img src={coverFor(cover).image} alt="" /><i className="kw-book-spine" /></div>
  </div>
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
  return <div className="kw-page kw-notes-library">
    <div className="kw-library-content" style={{ visibility: selected ? 'hidden' : 'visible' }} aria-hidden={selected ? true : undefined}>
    <header className="kw-library-heading"><div><h1>Mis cuadernos</h1></div><button type="button" className="kw-primary" onClick={() => setCreating(true)}><Plus size={17} /> Nuevo cuaderno</button></header>
    {isLoading && <Spinner />}
    {error && <ErrorNote error={error} onRetry={() => void refetch()} />}
    <div className="kw-library-grid">{books.map(({ note, board }) => {
      const cover = coverOf(note.id, board.cover)
      return <article key={note.id} data-book-id={note.id} className="kw-library-book"><button type="button" className="kw-open-book" aria-label={`Abrir cuaderno ${note.title || 'Sin título'}`} onClick={() => select(note.id)}><div className="kw-book-cover"><img src={cover.image} alt="" /><i className="kw-book-spine" /></div><h2>{note.title || 'Sin título'}</h2><span>{board.pages?.length ?? 1} {(board.pages?.length ?? 1) === 1 ? 'página' : 'páginas'}</span></button><button type="button" className="kw-library-delete" aria-label={`Eliminar cuaderno ${note.title || 'Sin título'}`} onClick={() => { void confirm({ title: 'Eliminar cuaderno', message: `¿Eliminar «${note.title || 'Sin título'}» y todas sus páginas? Esta acción no se puede deshacer.` }).then((ok) => { if (ok) deleteBook(note.id) }) }}><Trash2 size={15} /></button></article>
    })}<button type="button" className="kw-add-book-tile" aria-label="Crear otro cuaderno" onClick={() => setCreating(true)}><span><Plus size={32} /></span><strong>Nuevo cuaderno</strong></button></div>
    {!isLoading && books.length === 0 && <div className="kw-library-empty"><BookOpen size={27} /><h2>Tu próxima historia empieza aquí</h2><p>Elige una tapa, ponle un nombre y llena sus páginas de recuerdos.</p></div>}
    </div>
    {selected && <NotebookReader key={selected.note.id} note={selected.note} cover={coverOf(selected.note.id, selected.board.cover).id} onBack={() => select(null)} onDelete={() => deleteBook(selected.note.id)} />}
    {dialog}
    {creating && <NewNotebook pending={create.isPending} onCreate={createBook} onClose={() => setCreating(false)} />}
  </div>
}
