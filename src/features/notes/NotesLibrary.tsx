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
  const leafCount = Math.max(5, Math.min(9, (notebookBoard(readBoard(note.content)).activePage ?? 0) + 4))
  const play = (direction: 'open' | 'close'): Promise<void> => {
    try { return animate(direction) } catch (error) {
      // si la animación falla, el cuaderno debe quedar usable igualmente
      console.error(error)
      current.current?.cancel(); current.current = null
      if (veil.current) veil.current.style.display = 'none'
      reader.current?.removeAttribute('data-opening'); reader.current?.setAttribute('data-ready', '')
      return Promise.resolve()
    }
  }
  const animate = (direction: 'open' | 'close'): Promise<void> => {
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
    const FLY = 612, QUARTER = 1122, COVER_END = 1700, LEAF_START = 1140, STEP = 130, LEAF_TIME = 660, TAIL = 340
    const total = LEAF_START + (leafCount - 1) * STEP + LEAF_TIME + TAIL
    const opening = direction === 'open'
    const options: KeyframeAnimationOptions = { duration: opening ? total : total * .6, fill: 'both', direction: opening ? 'normal' : 'reverse', easing: 'linear' }
    const o = (ms: number) => Math.max(0, Math.min(1, ms / total))
    const at = (ms: number, extra: Keyframe): Keyframe => ({ offset: o(ms), ...extra })
    const animations: Animation[] = []
    const leaves: HTMLElement[] = []
    const run = (el: Element | null | undefined, frames: Keyframe[]) => {
      let last = 0
      for (const frame of frames) { last = Math.max(last, Number(frame.offset ?? 0)); frame.offset = last }
      if (el) animations.push(el.animate(frames, options))
    }
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

    // Hojas que se curvan al pasar de derecha a izquierda. Empiezan en cuanto la tapa se abre y terminan en la página donde estabas.
    const pages = Array.from(node.querySelectorAll<HTMLElement>('.kw-notebook .kw-paper-page'))
    const scale = paper.width / 1400
    const STRIPS = 12, SAMPLES = 16, CURL = 4.2
    const stripWidth = half / STRIPS
    const ease = (u: number) => u < .5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u)
    const makeFace = (source: HTMLElement | undefined, side: 'front' | 'back', offset: number) => {
      const wrap = document.createElement('div')
      wrap.className = `kw-leaf-face kw-leaf-${side}`
      if (source) {
        const copy = source.cloneNode(true) as HTMLElement
        copy.removeAttribute('aria-hidden')
        copy.classList.add('kw-blank-page')
        Object.assign(copy.style, { position: 'absolute', left: `${-offset}px`, top: '0', width: '700px', height: '1040px', transformOrigin: '0 0', transform: `scale(${scale})` })
        wrap.appendChild(copy)
      }
      return wrap
    }
    const sample = (from: number, to: number, value: (progress: number) => Keyframe): Keyframe[] => {
      const frames: Keyframe[] = [at(0, value(0)), at(from, value(0))]
      for (let n = 1; n < SAMPLES; n++) frames.push(at(from + (to - from) * n / SAMPLES, value(ease(n / SAMPLES))))
      frames.push(at(to, value(1)), at(total, value(1)))
      return frames
    }
    // el bloque de hojas que queda debajo: páginas en blanco con el borde del cuaderno, y el grosor de las pilas a ambos lados
    const underlay = document.createElement('div')
    underlay.className = 'kw-underlay'
    for (const side of [0, 1]) {
      const page = document.createElement('div')
      page.className = 'kw-underlay-page'
      page.style.left = `${side * half}px`
      page.style.width = `${half}px`
      const copy = pages[side]?.cloneNode(true) as HTMLElement | undefined
      if (copy) {
        copy.removeAttribute('aria-hidden'); copy.classList.add('kw-blank-page')
        Object.assign(copy.style, { position: 'absolute', left: '0', top: '0', width: '700px', height: '1040px', transformOrigin: '0 0', transform: `scale(${scale})` })
        page.appendChild(copy)
      }
      underlay.appendChild(page)
    }
    const edgeRight = document.createElement('div'), edgeLeft = document.createElement('div')
    edgeRight.className = 'kw-stack-edge kw-stack-edge-right'; edgeLeft.className = 'kw-stack-edge kw-stack-edge-left'
    scene.prepend(edgeLeft, edgeRight, underlay)
    leaves.push(underlay, edgeLeft, edgeRight)
    // con el libro cerrado solo hay página derecha; la izquierda aparece cuando la tapa pasa de la vertical
    const rightOnly = 'inset(-24px -24px -48px 50%)', whole = 'inset(-24px -24px -48px -24px)'
    run(underlay, [at(0, { opacity: 0, clipPath: rightOnly }), at(FLY, { opacity: 0, clipPath: rightOnly }), at(FLY + 140, { opacity: 1, clipPath: rightOnly }), at(QUARTER - 80, { opacity: 1, clipPath: rightOnly }), at(QUARTER + 60, { opacity: 1, clipPath: whole }), at(total, { opacity: 1, clipPath: whole })])
    run(edgeRight, [at(0, { opacity: 0, transform: 'scaleX(1)' }), at(FLY, { opacity: 0, transform: 'scaleX(1)' }), at(FLY + 140, { opacity: 1, transform: 'scaleX(1)' }), at(LEAF_START, { opacity: 1, transform: 'scaleX(1)' }), at(LEAF_START + (leafCount - 1) * STEP + LEAF_TIME, { opacity: 1, transform: 'scaleX(.2)' }), at(total, { opacity: 1, transform: 'scaleX(.2)' })])
    run(edgeLeft, [at(0, { opacity: 0, transform: 'scaleX(.2)' }), at(QUARTER, { opacity: 0, transform: 'scaleX(.2)' }), at(QUARTER + 120, { opacity: 1, transform: 'scaleX(.2)' }), at(LEAF_START + (leafCount - 1) * STEP + LEAF_TIME, { opacity: 1, transform: 'scaleX(1)' }), at(total, { opacity: 1, transform: 'scaleX(1)' })])
    for (let i = 0; i < leafCount; i++) {
      const start = LEAF_START + i * STEP, end = start + LEAF_TIME
      const shadowRight = document.createElement('div'), shadowLeft = document.createElement('div')
      shadowRight.className = 'kw-leaf-shadow kw-leaf-shadow-right'; shadowLeft.className = 'kw-leaf-shadow kw-leaf-shadow-left'
      scene.append(shadowRight, shadowLeft)
      const strips: HTMLElement[] = []
      let parent: HTMLElement = scene
      for (let k = 0; k < STRIPS; k++) {
        const strip = document.createElement('div')
        strip.className = k === 0 ? 'kw-leaf3d' : 'kw-strip'
        Object.assign(strip.style, { width: `${stripWidth + 1}px`, left: k === 0 ? '50%' : `${stripWidth}px` })
        // cara delantera: página derecha; cara trasera: página izquierda vista desde atrás
        const dim = document.createElement('b'); dim.className = 'kw-dim kw-strip-dim'
        strip.append(makeFace(pages[1], 'front', k * stripWidth), makeFace(pages[0], 'back', (STRIPS - 1 - k) * stripWidth), dim)
        parent.appendChild(strip)
        strips.push(strip); parent = strip
      }
      leaves.push(shadowRight, shadowLeft, strips[0])
      run(strips[0], [at(0, { visibility: 'hidden' }), at(start, { visibility: 'hidden' }), at(start, { visibility: 'visible' }), at(total, { visibility: 'visible' })])
      strips.forEach((strip, k) => {
        const bend = (progress: number) => CURL * Math.sin(Math.PI * progress)
        // la primera tira gira sobre el lomo; cada tira siguiente se dobla un poco hacia atrás, como un papel que se arrastra por el aire
        // en reposo las hojas se hunden en el lomo y se levantan hacia fuera, como en un cuaderno abierto de verdad
        const valley = (progress: number) => (1 - 2 * progress) * (k === 0 ? 3 : -.55)
        const relative = (progress: number) => (k === 0 ? -180 * progress : bend(progress)) + valley(progress)
        const absolute = (progress: number) => Math.abs(-180 * progress + k * bend(progress) + (1 - 2 * progress) * (3 - .55 * k))
        run(strip, sample(start, end, (progress) => ({ transform: `rotateY(${relative(progress)}deg)` })))
        run(strip.querySelector(':scope>.kw-leaf-front'), sample(start, end, (progress) => ({ opacity: absolute(progress) < 90 ? 1 : 0 })))
        run(strip.querySelector(':scope>.kw-leaf-back'), sample(start, end, (progress) => ({ opacity: absolute(progress) < 90 ? 0 : 1 })))
        run(strip.querySelector(':scope>.kw-strip-dim'), sample(start, end, (progress) => ({ opacity: .22 * Math.sin(Math.min(180, absolute(progress)) * Math.PI / 180) })))
      })
      run(shadowRight, sample(start, end, (progress) => ({ opacity: .55 * Math.sin(Math.PI * Math.min(1, progress * 2)) * (progress < .5 ? 1 : 0) })))
      run(shadowLeft, sample(start, end, (progress) => ({ opacity: .55 * Math.sin(Math.PI * Math.max(0, progress * 2 - 1)) * (progress > .5 ? 1 : 0) })))
    }

    run(scene, [at(0, { opacity: 1 }), at(total - TAIL, { opacity: 1 }), at(total, { opacity: 0 })])
    // el cuaderno real aparece bajo la tapa: primero solo la página derecha y luego las dos
    const reveal = paper.left + half - surface.getBoundingClientRect().left
    // la página real aparece cuando la última hoja ya se ha levantado; la izquierda, al final
    const lastLift = LEAF_START + (leafCount - 1) * STEP + LEAF_TIME * .5
    run(surface, [at(0, { opacity: 0, clipPath: clip(reveal) }), at(lastLift, { opacity: 0, clipPath: clip(reveal) }), at(lastLift + 140, { opacity: 1, clipPath: clip(reveal) }), at(total - TAIL, { opacity: 1, clipPath: clip(reveal) }), at(total - TAIL + 16, { opacity: 1, clipPath: clip(0) }), at(total, { opacity: 1, clipPath: clip(0) })])
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
