import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Hand, MousePointer2, Pencil, Type, StickyNote, ImagePlus, Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, Minimize2, Smile, Trash2, Copy, ArrowUpRight, RotateCw, Download, Check, Grid2X2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { repo } from '@/data'
import { useDebouncedCallback } from '@/lib/useDebouncedCallback'
import type { Note } from '@/types/domain'
import { notesKey } from './hooks'
import { COLORS, readBoard, resizedElement, screenToBoard, strokeElement, strokePath, zoomAt, type Board, type BoardElement, type Point, type Tool } from './board'
import { STICKERS, STICKER_SOURCE, Sticker } from './stickers'
import './whiteboard.css'

type Snapshot = { title: string; content: string }
type Gesture = { pointerId: number; kind: 'move' | 'pan' | 'draw'; start: Point; original: Board; element?: BoardElement; view: Point & { zoom: number }; points: Point[] }
const uid = () => crypto.randomUUID()
const PAPER = { width: 1400, height: 1040 }

export function NotebookPaper() {
  return <div className="kw-notebook" aria-hidden="true">
    {[0, 1].map((page) => <div className="kw-paper-page" key={page}><div className="kw-paper-date">date <span>{new Intl.DateTimeFormat('es', { dateStyle: 'long' }).format(new Date())}</span><span className="kw-paper-days">L M X J V S D</span></div><div className="kw-paper-topic">topic <span>un pequeño lugar para tus ideas ♡</span></div><div className="kw-paper-lines" /></div>)}
    <div className="kw-spine" /><i className="kw-ring kw-ring-top" /><i className="kw-ring kw-ring-middle" /><i className="kw-ring kw-ring-bottom" />
  </div>
}

export function BoardEditor({ note, onDelete, backdrop, planner = false }: { note: Note; onDelete?: () => void; backdrop?: ReactNode | ((board: Board, change: (next: Board) => void) => ReactNode); planner?: boolean }) {
  const qc = useQueryClient()
  const repository = useRef(repo()).current
  const [board, setBoard] = useState<Board>(() => readBoard(note.content))
  const current = useRef(board)
  const [title, setTitle] = useState(note.title)
  const titleRef = useRef(note.title)
  const [status, setStatus] = useState<'saved' | 'dirty' | 'saving' | 'error'>('saved')
  const [message, setMessage] = useState('')
  const [tool, setTool] = useState<Tool>('select')
  const [ink, setInk] = useState('#6d5872')
  const [color, setColor] = useState(COLORS[1])
  const [selected, setSelected] = useState<string | null>(null)
  const [view, setView] = useState({ x: 24, y: 24, zoom: 0.6 })
  const [full, setFull] = useState(false)
  const [pencilOnly, setPencilOnly] = useState(true)
  const [stickersOpen, setStickersOpen] = useState(false)
  const [category, setCategory] = useState('Todos')
  const [search, setSearch] = useState('')
  const [historyCount, setHistoryCount] = useState({ past: 0, future: 0 })
  const history = useRef<{ past: Board[]; future: Board[] }>({ past: [], future: [] })
  const gesture = useRef<Gesture | null>(null)
  const surface = useRef<HTMLDivElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const clipboard = useRef<BoardElement | null>(null)
  const queued = useRef<Snapshot | null>(null)
  const latest = useRef<Snapshot>({ title: note.title, content: note.content })
  const running = useRef(false)
  const alive = useRef(true)

  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  async function drain() {
    if (running.current) return
    running.current = true
    while (queued.current) {
      const snapshot = queued.current
      queued.current = null
      if (alive.current) setStatus('saving')
      try {
        const saved = await repository.updateNote(note.id, snapshot)
        qc.setQueryData<Note[]>(notesKey, (list = []) => list.map((n) => n.id === note.id ? saved : n))
        if (alive.current && latest.current === snapshot && !queued.current) setStatus('saved')
      } catch {
        if (alive.current) setStatus('error')
        break
      }
    }
    running.current = false
  }
  const [schedule, flush] = useDebouncedCallback((snapshot: Snapshot) => { queued.current = snapshot; void drain() }, 600)
  function persist(next: Board, nextTitle = titleRef.current) {
    const snapshot = { title: nextTitle, content: JSON.stringify(next) }
    if (snapshot.content.length > 4_000_000) { setMessage('Esta página está llena. Usa otra pizarra para añadir más fotos.'); return false }
    latest.current = snapshot
    setStatus('dirty')
    schedule(snapshot)
    return true
  }
  function show(next: Board) { current.current = next; setBoard(next) }
  function remember(previous: Board) {
    history.current.past = [...history.current.past.slice(-24), previous]
    history.current.future = []
    setHistoryCount({ past: history.current.past.length, future: 0 })
  }
  function commit(next: Board) {
    if (!persist(next)) return
    remember(current.current)
    show(next)
  }
  function patch(id: string, changes: Partial<BoardElement>) {
    commit({ ...current.current, elements: current.current.elements.map((e) => e.id === id ? { ...e, ...changes } : e) })
  }
  function undo(redo = false) {
    const from = redo ? history.current.future : history.current.past
    const to = redo ? history.current.past : history.current.future
    const next = from.pop()
    if (!next) return
    to.push(current.current)
    show(next); persist(next)
    setHistoryCount({ past: history.current.past.length, future: history.current.future.length })
  }
  function center(): Point {
    const rect = surface.current?.getBoundingClientRect()
    return rect ? { x: Math.max(40, Math.min(1100, (rect.width / 2 - view.x) / view.zoom - 100)), y: Math.max(130, Math.min(850, (rect.height / 2 - view.y) / view.zoom - 80)) } : { x: 200, y: 200 }
  }
  function add(kind: BoardElement['kind'], extra: Partial<BoardElement> = {}) {
    const element: BoardElement = { id: uid(), kind, ...center(), width: kind === 'sticker' ? 120 : 240, height: kind === 'sticker' ? 120 : kind === 'text' ? 110 : 210, rotation: kind === 'sticky' ? -2 : 0, color, text: '', ...extra }
    commit({ ...current.current, elements: [...current.current.elements, element] })
    setSelected(element.id); setTool('select')
    surface.current?.focus({ preventScroll: true })
  }
  function removeSelected() {
    commit({ ...current.current, elements: current.current.elements.filter((e) => e.id !== selected) })
    setSelected(null)
  }
  function fit() {
    const rect = surface.current?.getBoundingClientRect()
    if (!rect) return
    const elements = current.current.elements
    const width = Math.max(PAPER.width, ...elements.map((e) => e.x + e.width + 60))
    const height = Math.max(PAPER.height, ...elements.map((e) => e.y + e.height + 60))
    const zoom = Math.max(0.15, Math.min((rect.width - 48) / width, (rect.height - 48) / height, 1))
    setView({ x: (rect.width - width * zoom) / 2, y: 24, zoom })
  }
  useEffect(() => {
    const node = surface.current
    if (!node) return
    const observer = new ResizeObserver(() => {
      const rect = node.getBoundingClientRect()
      const zoom = Math.max(0.15, Math.min((rect.width - 40) / PAPER.width, (rect.height - 40) / PAPER.height, 1))
      setView({ x: (rect.width - PAPER.width * zoom) / 2, y: 20, zoom })
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [full])
  useEffect(() => {
    if (!full) return
    const scroll = { x: window.scrollX, y: window.scrollY }
    const body = document.body.style
    const old = { overflow: body.overflow, position: body.position, top: body.top, left: body.left, width: body.width }
    const html = document.documentElement.style
    const oldOverscroll = html.overscrollBehavior
    document.body.style.overflow = 'hidden'
    body.position = 'fixed'; body.top = `${-scroll.y}px`; body.left = `${-scroll.x}px`; body.width = '100%'
    html.overscrollBehavior = 'none'
    return () => { Object.assign(body, old); html.overscrollBehavior = oldOverscroll; window.scrollTo(scroll.x, scroll.y) }
  }, [full])
  useEffect(() => {
    const node = surface.current
    if (!node) return
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      if (tool === 'pen' || tool === 'arrow') return
      if (e.ctrlKey || e.metaKey) {
        const rect = node.getBoundingClientRect()
        setView((v) => zoomAt(v, v.zoom * Math.exp(-e.deltaY * 0.005), { x: e.clientX - rect.left, y: e.clientY - rect.top }))
      } else setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }))
    }
    node.addEventListener('wheel', wheel, { passive: false })
    return () => node.removeEventListener('wheel', wheel)
  }, [tool, full])
  function pointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || gesture.current) return
    if ((tool === 'pen' || tool === 'arrow') && pencilOnly && e.pointerType === 'touch') return
    const target = e.target as HTMLElement
    if (target.closest('textarea,input,a,button')) return
    const rect = e.currentTarget.getBoundingClientRect()
    const point = screenToBoard({ x: e.clientX, y: e.clientY }, rect, view)
    const id = target.closest<HTMLElement>('[data-element]')?.dataset.element
    const element = current.current.elements.find((item) => item.id === id)
    const kind = tool === 'hand' ? 'pan' : tool === 'pen' || tool === 'arrow' ? 'draw' : element ? 'move' : null
    if (!kind) { setSelected(null); return }
    e.preventDefault()
    e.currentTarget.focus({ preventScroll: true })
    e.currentTarget.setPointerCapture(e.pointerId)
    gesture.current = { pointerId: e.pointerId, kind, start: kind === 'pan' ? { x: e.clientX, y: e.clientY } : point, original: current.current, element, view, points: [point] }
    if (element && kind === 'move') setSelected(element.id)
    if (kind === 'draw') {
      const stroke = strokeElement(uid(), tool === 'arrow' ? 'arrow' : 'drawing', [point, { x: point.x + 0.1, y: point.y + 0.1 }], ink)
      gesture.current.element = stroke
      show({ ...current.current, elements: [...current.current.elements, stroke] })
    }
  }
  function pointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current
    if (!g || g.pointerId !== e.pointerId) return
    e.preventDefault()
    if (g.kind === 'pan') { setView({ ...g.view, x: g.view.x + e.clientX - g.start.x, y: g.view.y + e.clientY - g.start.y }); return }
    const point = screenToBoard({ x: e.clientX, y: e.clientY }, e.currentTarget.getBoundingClientRect(), g.view)
    if (g.kind === 'move' && g.element) {
      const x = Math.max(0, Math.min(5800, g.element.x + point.x - g.start.x)), y = Math.max(0, Math.min(5800, g.element.y + point.y - g.start.y))
      show({ ...g.original, elements: g.original.elements.map((item) => item.id === g.element?.id ? { ...item, x, y } : item) })
    }
    if (g.kind === 'draw' && g.element) {
      const samples = e.nativeEvent.getCoalescedEvents?.() ?? []
      const rect = e.currentTarget.getBoundingClientRect()
      const points = samples.length ? samples.map((sample) => screenToBoard({ x: sample.clientX, y: sample.clientY }, rect, g.view)) : [point]
      g.points = g.element.kind === 'arrow' ? [g.points[0], point] : [...g.points, ...points].slice(0, 12000)
      const stroke = strokeElement(g.element.id, g.element.kind as 'arrow' | 'drawing', g.points, ink)
      show({ ...g.original, elements: [...g.original.elements, stroke] })
    }
  }
  function pointerEnd(e: ReactPointerEvent<HTMLDivElement>, cancelled = false) {
    const g = gesture.current
    if (!g || g.pointerId !== e.pointerId) return
    // A fast release may arrive without a final pointermove. Use its coordinates.
    if (!cancelled) pointerMove(e)
    gesture.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    // Losing capture must not snap a moved object back to its starting position.
    if (cancelled && g.kind === 'draw') { show(g.original); return }
    if (g.kind !== 'pan' && current.current !== g.original) {
      if (persist(current.current)) remember(g.original)
      else show(g.original)
    }
  }
  async function insertImages(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      if (file.size > 20_000_000) { setMessage('Elige una imagen de menos de 20 MB.'); continue }
      const url = URL.createObjectURL(file)
      try {
        const image = new Image()
        image.src = url
        await image.decode()
        const ratio = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(image.naturalWidth * ratio); canvas.height = Math.round(image.naturalHeight * ratio)
        const context = canvas.getContext('2d')
        if (!context) throw new Error('No canvas')
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        const src = canvas.toDataURL('image/webp', 0.82)
        const width = 280, height = Math.min(600, width * canvas.height / canvas.width)
        add('image', { src, width, height, text: file.name, rotation: -2 })
      } catch { setMessage('No se pudo abrir la imagen. Prueba con una foto JPG, PNG o WebP.') }
      finally { URL.revokeObjectURL(url) }
    }
  }
  const selectedElement = board.elements.find((e) => e.id === selected)
  const drawing = tool === 'pen' || tool === 'arrow'
  const toolButton = (value: Tool, label: string, icon: ReactNode) => <button type="button" className={tool === value ? 'kw-active' : ''} aria-label={label} title={label} aria-pressed={tool === value} onClick={() => { setTool(value); setSelected(null) }}>{icon}</button>

  const editor = <section className={`kw-editor ${full ? 'kw-fullscreen' : ''}`} aria-label={planner ? 'Agenda creativa' : 'Pizarra de cuaderno'} onKeyDown={(e) => {
    if (e.defaultPrevented || e.nativeEvent.isComposing || e.metaKey || e.ctrlKey || e.altKey || drawing || !selected) return
    if ((e.target as Element).closest('textarea,input,select,[contenteditable="true"],[role="textbox"]')) return
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault(); e.stopPropagation(); removeSelected(); surface.current?.focus({ preventScroll: true })
    }
  }}>
    <div className="kw-editor-heading">
      {!planner && <input className="kw-title" aria-label="Título de la pizarra" placeholder="Mi pequeño cuaderno" value={title} onChange={(e) => { setTitle(e.target.value); titleRef.current = e.target.value; persist(current.current, e.target.value) }} />}
      {planner && <span className="kw-journal-label">mi agenda, a mi manera ♡</span>}
      <span className="kw-save" role="status">{status === 'saved' ? <><Check size={14} /> Guardado</> : status === 'error' ? <button type="button" onClick={() => { queued.current = latest.current; void drain() }}>Error al guardar · Reintentar</button> : 'Guardando…'}</span>
      <button type="button" className="kw-text-button" onClick={() => setFull(!full)}>{full ? <Minimize2 size={16} /> : <Maximize2 size={16} />}{full ? 'Salir' : 'Modo iPad'}</button>
      {!planner && onDelete && <button type="button" className="kw-icon-button" aria-label="Eliminar pizarra" onClick={() => { if (window.confirm('¿Eliminar esta pizarra y su contenido?')) { flush(); onDelete() } }}><Trash2 size={16} /></button>}
    </div>
    <div className="kw-toolbar" aria-label="Herramientas de la pizarra">
      <div className="kw-tool-group">{toolButton('select', 'Seleccionar y mover', <MousePointer2 size={19} />)}{toolButton('hand', 'Mover el cuaderno', <Hand size={19} />)}</div>
      <div className="kw-tool-group"><button type="button" aria-label="Añadir post-it" title="Post-it" onClick={() => add('sticky')}><StickyNote size={19} /></button><button type="button" aria-label="Añadir texto manuscrito" title="Texto manuscrito" onClick={() => add('text', { color: ink })}><Type size={19} /></button>{toolButton('pen', 'Escribir a mano', <Pencil size={19} />)}{toolButton('arrow', 'Dibujar flecha', <ArrowUpRight size={19} />)}</div>
      <div className="kw-tool-group"><button type="button" aria-label="Abrir stickers" title="Stickers soft" aria-expanded={stickersOpen} className={stickersOpen ? 'kw-active' : ''} onClick={() => setStickersOpen(!stickersOpen)}><Smile size={19} /></button><button type="button" aria-label="Insertar imágenes" title="Insertar imágenes" onClick={() => fileInput.current?.click()}><ImagePlus size={19} /></button><input ref={fileInput} type="file" accept="image/*" multiple className="kw-file" aria-label="Seleccionar imágenes" onChange={(e) => { if (e.target.files) void insertImages(e.target.files); e.target.value = '' }} /></div>
      <div className="kw-tool-group"><button type="button" aria-label="Deshacer" title="Deshacer" disabled={!historyCount.past} onClick={() => undo()}><Undo2 size={19} /></button><button type="button" aria-label="Rehacer" title="Rehacer" disabled={!historyCount.future} onClick={() => undo(true)}><Redo2 size={19} /></button></div>
      <div className="kw-palette" aria-label="Color de post-it">{COLORS.map((value) => <button type="button" key={value} aria-label={`Post-it ${value}`} aria-pressed={color === value} style={{ background: value }} onClick={() => { setColor(value); if (selectedElement?.kind === 'sticky') patch(selectedElement.id, { color: value }) }} />)}</div>
      <label className="kw-ink"><input type="color" aria-label="Color del lápiz" value={ink} onChange={(e) => { setInk(e.target.value); if (selectedElement?.kind === 'text' || selectedElement?.kind === 'drawing' || selectedElement?.kind === 'arrow') patch(selectedElement.id, { color: e.target.value }) }} /> tinta</label>
    </div>
    {drawing && <div className="kw-pencil-hint"><Pencil size={15} /><span>Escribe sobre el papel. La página queda quieta mientras trazas.</span><label><input type="checkbox" checked={pencilOnly} onChange={(e) => setPencilOnly(e.target.checked)} /> Solo Pencil o ratón · ignorar dedos</label></div>}
    {message && <div className="kw-message" role="alert">{message}<button type="button" onClick={() => setMessage('')}>Cerrar</button></div>}
    <div className="kw-stage">
      <div ref={surface} className={`kw-surface kw-tool-${tool}`} tabIndex={0} role="region" aria-label="Superficie del cuaderno" style={{ touchAction: drawing || full || tool === 'hand' ? 'none' : 'pan-y' }}
        onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={(e) => pointerEnd(e)} onPointerCancel={(e) => pointerEnd(e, true)} onLostPointerCapture={(e) => pointerEnd(e, true)}
        onDragStart={(e) => { if ((e.target as Element).closest('[data-element]')) e.preventDefault() }}
        onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) e.preventDefault() }} onDrop={(e) => { e.preventDefault(); void insertImages(e.dataTransfer.files) }}
        onPaste={(e) => { if (e.clipboardData.files.length) { e.preventDefault(); void insertImages(e.clipboardData.files) } }}
        onKeyDown={(e) => {
          if ((e.target as HTMLElement).closest('textarea,input')) return
          if (e.key === 'Escape') { setTool('select'); setSelected(null); setFull(false) }
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(e.shiftKey) }
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && selectedElement) clipboard.current = selectedElement
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && clipboard.current) { e.preventDefault(); add(clipboard.current.kind, { ...clipboard.current, id: uid(), x: clipboard.current.x + 25, y: clipboard.current.y + 25 }) }
          if (selectedElement && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) { e.preventDefault(); const step = e.shiftKey ? 20 : 5; patch(selectedElement.id, { x: Math.max(0, selectedElement.x + (e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0)), y: Math.max(0, selectedElement.y + (e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0)) }) }
        }}>
        <div className="kw-world" style={{ width: 6000, height: 6000, transform: `translate(${view.x}px,${view.y}px) scale(${view.zoom})` }}>
          <div style={{ pointerEvents: drawing || tool === 'hand' ? 'none' : 'auto' }}>{typeof backdrop === 'function' ? backdrop(board, commit) : backdrop ?? <NotebookPaper />}</div>
          {board.elements.map((element, index) => <div key={element.id} data-element={element.id} tabIndex={drawing ? -1 : 0} role="group" aria-label={`${element.kind === 'sticky' ? 'Post-it' : element.kind === 'sticker' ? 'Sticker' : element.kind === 'image' ? 'Imagen' : element.kind === 'text' ? 'Texto' : 'Trazo'} ${index + 1}`} onFocus={() => { if (!drawing) setSelected(element.id) }} className={`kw-element kw-element-${element.kind} ${selected === element.id && !drawing ? 'kw-selected' : ''}`} style={{ left: element.x, top: element.y, width: element.width, height: element.height, transform: `rotate(${element.rotation}deg)`, zIndex: index + 1, pointerEvents: tool === 'hand' || drawing ? 'none' : 'auto', background: element.kind === 'sticky' ? element.color : undefined, color: element.kind === 'text' ? element.color : '#493f4e' }}>
            {(element.kind === 'sticky' || element.kind === 'text') && <><span className="kw-element-handle" aria-hidden="true">···</span><textarea aria-label={element.kind === 'sticky' ? 'Texto del post-it' : 'Texto manuscrito'} value={element.text ?? ''} placeholder={element.kind === 'sticky' ? 'una pequeña idea…' : 'escribe algo bonito…'} spellCheck={false} onChange={(e) => patch(element.id, { text: e.target.value })} style={{ fontSize: element.kind === 'text' ? 28 : 26 }} /></>}
            {element.kind === 'sticker' && <Sticker id={element.sticker ?? ''} />}
            {element.kind === 'image' && <img src={element.src} alt={element.text || 'Foto del cuaderno'} draggable={false} />}
            {(element.kind === 'drawing' || element.kind === 'arrow') && <svg width="100%" height="100%" viewBox={`0 0 ${element.width} ${element.height}`} className="kw-stroke"><defs><marker id={`arrow-${element.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill={element.color} /></marker></defs><path d={strokePath(element)} fill="none" stroke={element.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" markerEnd={element.kind === 'arrow' ? `url(#arrow-${element.id})` : undefined} /></svg>}
          </div>)}
        </div>
      </div>
      {stickersOpen && <aside className="kw-sticker-drawer" aria-label="Biblioteca de stickers"><div className="kw-drawer-heading"><div><span className="kw-eyebrow">tu pequeña colección soft</span><h3>250 stickers soft</h3></div><button type="button" aria-label="Cerrar stickers" onClick={() => setStickersOpen(false)}>×</button></div><input className="kw-search" aria-label="Buscar stickers" placeholder="osito, lacito, flor, matcha…" value={search} onChange={(e) => setSearch(e.target.value)} /><div className="kw-sticker-categories">{['Todos', 'Rosa', 'Azul', 'Lila', 'Verde', 'Crema', 'Café', 'Mantequilla'].map((item) => <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div><div className="kw-sticker-grid">{STICKERS.filter((s) => (category === 'Todos' || s.category === category) && s.name.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))).map((s) => <button type="button" key={s.id} title={s.name} aria-label={`Añadir ${s.name}`} onClick={() => add('sticker', { sticker: s.id })}><Sticker id={s.id} label={false} /></button>)}</div><a className="kw-sticker-source" href={STICKER_SOURCE} target="_blank" rel="noreferrer">Colección encontrada en Pinterest</a></aside>}
      {selectedElement && !drawing && <div className="kw-selection-tools" aria-label="Editar elemento"><button type="button" title="Duplicar" aria-label="Duplicar elemento" onClick={() => add(selectedElement.kind, { ...selectedElement, id: uid(), x: selectedElement.x + 30, y: selectedElement.y + 30 })}><Copy size={16} /></button><button type="button" title="Girar" aria-label="Girar elemento" onClick={() => patch(selectedElement.id, { rotation: (selectedElement.rotation + 10) % 360 })}><RotateCw size={16} /></button><label>Tamaño<input aria-label="Tamaño del elemento" type="range" min="40" max="700" value={selectedElement.width} onChange={(e) => { patch(selectedElement.id, resizedElement(selectedElement, Number(e.target.value))) }} /></label><button type="button" title="Traer al frente" aria-label="Traer al frente" onClick={() => commit({ ...current.current, elements: [...current.current.elements.filter((item) => item.id !== selectedElement.id), selectedElement] })}><ArrowUpRight size={16} /></button><button type="button" title="Eliminar" aria-label="Eliminar elemento" onClick={removeSelected}><Trash2 size={16} /></button></div>}
      <div className="kw-view-tools"><button type="button" aria-label="Alejar" onClick={() => { const rect = surface.current?.getBoundingClientRect(); setView(zoomAt(view, view.zoom / 1.2, { x: (rect?.width ?? 800) / 2, y: (rect?.height ?? 600) / 2 })) }}><ZoomOut size={16} /></button><span>{Math.round(view.zoom * 100)}%</span><button type="button" aria-label="Acercar" onClick={() => { const rect = surface.current?.getBoundingClientRect(); setView(zoomAt(view, view.zoom * 1.2, { x: (rect?.width ?? 800) / 2, y: (rect?.height ?? 600) / 2 })) }}><ZoomIn size={16} /></button><button type="button" aria-label="Ver cuaderno completo" title="Ver cuaderno completo" onClick={fit}><Grid2X2 size={16} /></button><button type="button" aria-label="Descargar copia del cuaderno" title="Descargar copia" onClick={() => { const url = URL.createObjectURL(new Blob([JSON.stringify({ title, ...current.current }, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = `${title || 'cuaderno'}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 5000) }}><Download size={16} /></button></div>
    </div>
    <div className="kw-editor-footer"><span>{drawing ? '✎ modo escritura · página bloqueada' : 'arrastra tus recuerdos, pega fotos y deja volar tus ideas'}</span><span>{board.elements.length} pequeños recuerdos</span></div>
  </section>
  return full ? createPortal(editor, document.body) : editor
}
