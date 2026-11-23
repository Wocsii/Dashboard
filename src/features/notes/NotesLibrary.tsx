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

function coverOf(id: string, cover?: string) {
  const fallback = COVERS[Array.from(id).reduce((sum, char) => sum + char.charCodeAt(0), 0) % COVERS.length].id
  return coverFor(cover ?? fallback)
}

/** Libro en 3D: la tapa vuela desde la biblioteca, gira sobre el lomo y deja ver las dos páginas. Al cerrar hace lo mismo al revés. */
function NotebookReader({ note, cover, onBack, onDelete }: { note: Parameters<typeof BoardEditor>[0]['note']; cover: string; onBack: () => void; onDelete: () => void }) {
  const reader = useRef<HTMLDivElement>(null)
  const veil = useRef<HTMLDivElement>(null)
  const hinge = useRef<HTMLDivElement>(null)
  const hold = useRef<HTMLDivElement>(null)
  const closing = useRef(false)
  const current = useRef<{ cancel: () => void } | null>(null)
  const leafCount = Math.max(2, Math.min(8, (notebookBoard(readBoard(note.content)).activePage ?? 0) + 2))
  const play = (direction: 'open' | 'close') => {
    const node = reader.current, scene = veil.current, door = hinge.current
    node?.removeAttribute('data-opening')
    if (hold.current) hold.current.style.display = 'none'
    const paper = node?.querySelector('.kw-notebook')?.getBoundingClientRect()
    const surface = node?.querySelector<HTMLElement>('.kw-surface')
    const quiet = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!node || !scene || !door || !paper || !surface || typeof door.animate !== 'function' || quiet) { node?.setAttribute('data-ready', ''); return Promise.resolve() }
    const library = document.querySelector(`[data-book-id="${CSS.escape(note.id)}"] .kw-book-cover`)?.getBoundingClientRect()
    const half = paper.width / 2
    const from = library ?? { left: paper.left + half, top: paper.top + paper.height * .15, width: half * .6, height: paper.height * .7 }
    const tx = from.left - (paper.left + half), ty = from.top + from.height / 2 - (paper.top + paper.height / 2)
    const sx = from.width / half, sy = from.height / paper.height
    Object.assign(scene.style, { display: 'block', left: `${paper.left}px`, top: `${paper.top}px`, width: `${paper.width}px`, height: `${paper.height}px` })

    // Cronología en milisegundos: vuelo de la tapa, giro de la tapa, páginas que pasan una a una y fundido final
    const FLY = 612, QUARTER = 1122, COVER_END = 1700, LEAF_START = 1500, STEP = 120, LEAF_TIME = 560, TAIL = 320
    const total = LEAF_START + (leafCount - 1) * STEP + LEAF_TIME + TAIL
    const opening = direction === 'open'
    const options: KeyframeAnimationOptions = { duration: opening ? total : total * .6, fill: 'both', direction: opening ? 'normal' : 'reverse', easing: 'linear' }
    const o = (ms: number) => Math.max(0, Math.min(1, ms / total))
    const at = (ms: number, extra: Keyframe): Keyframe => ({ offset: o(ms), ...extra })
    const animations: Animation[] = []
    const leaves: HTMLElement[] = []
    const run = (el: Element | null | undefined, frames: Keyframe[]) => { if (el) animations.push(el.animate(frames, options)) }
    const clip = (px: number) => `inset(0px 0px 0px ${px}px)`

    run(door, [
      at(0, { transform: `translate(${tx}px,${ty}px) scale(${sx},${sy}) rotateY(0deg)`, easing: 'cubic-bezier(.3,.7,.25,1)' }),
      at(FLY, { transform: 'translate(0,0) scale(1,1) rotateY(0deg)', easing: 'cubic-bezier(.5,.02,.3,1)' }),
      at(COVER_END, { transform: 'translate(0,0) scale(1,1) rotateY(-180deg)' }),
      at(total, { transform: 'translate(0,0) scale(1,1) rotateY(-180deg)' }),
    ])
    run(door.querySelector('.kw-cover3d-front .kw-dim'), [at(0, { opacity: 0 }), at(FLY, { opacity: 0 }), at(QUARTER, { opacity: .5 }), at(total, { opacity: .5 })])
    run(door.querySelector('.kw-cover3d-back .kw-dim'), [at(0, { opacity: .3 }), at(QUARTER, { opacity: .3 }), at(COVER_END, { opacity: 0 }), at(total, { opacity: 0 })])
    run(scene.querySelector('.kw-book3d-shade-right'), [at(0, { opacity: 0 }), at(FLY, { opacity: 0 }), at(935, { opacity: .8 }), at(1275, { opacity: 0 }), at(total, { opacity: 0 })])
    run(scene.querySelector('.kw-book3d-shade-left'), [at(0, { opacity: 0 }), at(1054, { opacity: 0 }), at(1394, { opacity: .8 }), at(COVER_END, { opacity: 0 }), at(total, { opacity: 0 })])

    // hojas del cuaderno que pasan de derecha a izquierda hasta llegar a la página donde estabas
    const pages = Array.from(node.querySelectorAll<HTMLElement>('.kw-notebook .kw-paper-page'))
    const scale = paper.width / 1400
    const face = (source: HTMLElement | undefined, side: 'front' | 'back') => {
      const wrap = document.createElement('div')
      wrap.className = `kw-leaf-face kw-leaf-${side}`
      if (source) {
        const copy = source.cloneNode(true) as HTMLElement
        copy.removeAttribute('aria-hidden')
        Object.assign(copy.style, { position: 'absolute', left: '0', top: '0', width: '700px', height: '1040px', transformOrigin: '0 0', transform: `scale(${scale})` })
        wrap.appendChild(copy)
      }
      const dim = document.createElement('b')
      dim.className = 'kw-dim'
      wrap.appendChild(dim)
      return wrap
    }
    for (let i = 0; i < leafCount; i++) {
      const start = LEAF_START + i * STEP, end = start + LEAF_TIME, mid = start + LEAF_TIME * .5
      const leaf = document.createElement('div')
      leaf.className = 'kw-leaf3d'
      leaf.append(face(pages[1], 'front'), face(pages[0], 'back'))
      scene.appendChild(leaf)
      leaves.push(leaf)
      run(leaf, [
        at(0, { opacity: 0, transform: 'rotateY(0deg)' }), at(start, { opacity: 0, transform: 'rotateY(0deg)' }),
        at(start, { opacity: 1, transform: 'rotateY(0deg)', easing: 'cubic-bezier(.42,.08,.3,1)' }),
        at(end, { opacity: 1, transform: 'rotateY(-180deg)' }), at(total, { opacity: 1, transform: 'rotateY(-180deg)' }),
      ])
      // cada cara solo se ve en su mitad del giro (sin depender de backface-visibility, que falla con contenido clonado)
      run(leaf.querySelector('.kw-leaf-front'), [at(0, { opacity: 1 }), at(mid, { opacity: 1 }), at(mid, { opacity: 0 }), at(total, { opacity: 0 })])
      run(leaf.querySelector('.kw-leaf-back'), [at(0, { opacity: 0 }), at(mid, { opacity: 0 }), at(mid, { opacity: 1 }), at(total, { opacity: 1 })])
      run(leaf.querySelector('.kw-leaf-front .kw-dim'), [at(0, { opacity: 0 }), at(start, { opacity: 0 }), at(mid, { opacity: .32 }), at(total, { opacity: .32 })])
      run(leaf.querySelector('.kw-leaf-back .kw-dim'), [at(0, { opacity: .32 }), at(mid, { opacity: .32 }), at(end, { opacity: 0 }), at(total, { opacity: 0 })])
    }

    run(scene, [at(0, { opacity: 1 }), at(total - TAIL, { opacity: 1 }), at(total, { opacity: 0 })])
    // el cuaderno real aparece bajo la tapa: primero solo la página derecha y luego las dos
    const reveal = paper.left + half - surface.getBoundingClientRect().left
    run(surface, [at(0, { opacity: 0, clipPath: clip(reveal) }), at(FLY - 17, { opacity: 0, clipPath: clip(reveal) }), at(FLY, { opacity: 1, clipPath: clip(reveal) }), at(total - TAIL, { opacity: 1, clipPath: clip(reveal) }), at(total - TAIL + 16, { opacity: 1, clipPath: clip(0) }), at(total, { opacity: 1, clipPath: clip(0) })])
    for (const control of Array.from(node.querySelectorAll('.kw-editor-heading,.kw-toolbar,.kw-view-tools,.kw-selection-tools'))) run(control, [at(0, { opacity: 0 }), at(total - 520, { opacity: 0 }), at(total - 120, { opacity: 1 }), at(total, { opacity: 1 })])

    let stale = false
    const cleanup = () => { animations.forEach((a) => a.cancel()); leaves.forEach((leaf) => leaf.remove()); scene.style.display = 'none' }
    if (opening) current.current = { cancel: () => { stale = true; cleanup() } }
    return Promise.all(animations.map((a) => a.finished)).then(() => {
      if (!opening || stale) return
      cleanup(); current.current = null; node.setAttribute('data-ready', '')
    }, () => undefined)
  }
  useLayoutEffect(() => {
    reader.current?.setAttribute('data-opening', '')
    // la tapa se queda en su sitio desde el primer fotograma, sin hueco antes de la animación
    const book = document.querySelector(`[data-book-id="${CSS.escape(note.id)}"] .kw-book-cover`)?.getBoundingClientRect()
    if (hold.current && book) Object.assign(hold.current.style, { display: 'block', left: `${book.left}px`, top: `${book.top}px`, width: `${book.width}px`, height: `${book.height}px` })
    let frame = 0, last = '', stable = 0, tries = 0
    // espera a que el editor termine de ajustar el cuaderno al espacio disponible antes de medirlo
    const settle = () => {
      const r = reader.current?.querySelector('.kw-notebook')?.getBoundingClientRect()
      const key = r ? `${Math.round(r.left)}|${Math.round(r.top)}|${Math.round(r.width)}` : ''
      stable = key && key === last ? stable + 1 : 0
      last = key
      if (stable >= 3 || ++tries > 40) void play('open')
      else frame = requestAnimationFrame(settle)
    }
    frame = requestAnimationFrame(settle)
    return () => cancelAnimationFrame(frame)
  }, [])
  const close = () => {
    if (closing.current) return
    closing.current = true
    current.current?.cancel(); current.current = null
    void play('close').then(onBack)
  }
  return <div ref={reader} className="kw-notebook-reader" role="presentation">
    <BoardEditor key={note.id} note={note} onBack={close} onDelete={onDelete} />
    <div ref={hold} className="kw-cover-hold" aria-hidden="true"><img src={coverFor(cover).image} alt="" /><i className="kw-book-spine" /></div>
    <div ref={veil} className="kw-book3d" aria-hidden="true">
      <div className="kw-book3d-shade kw-book3d-shade-right" /><div className="kw-book3d-shade kw-book3d-shade-left" />
      <div ref={hinge} className="kw-cover3d">
        <div className="kw-cover3d-front"><img src={coverFor(cover).image} alt="" /><i className="kw-book-spine" /><b className="kw-dim" /></div>
        <div className="kw-cover3d-back"><b className="kw-dim" /></div>
      </div>
    </div>
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
