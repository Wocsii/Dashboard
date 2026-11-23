/**
 * Pasar de página al estilo de la referencia (animación de un libro en pixel art).
 *
 * Mirando la referencia fotograma a fotograma, la hoja NO gira como una puerta: es una hoja alta y plana que
 *  1. levanta su esquina superior junto al lomo (sobresale por encima del libro) y se enrolla por abajo,
 *     dejando ver el reverso del papel en una forma redondeada;
 *  2. se desliza hacia la izquierda casi sin deformarse, con el rizo agarrado a su esquina inferior izquierda;
 *  3. estrecha su ancho hasta que su borde derecho llega al lomo;
 *  4. se abre hacia la izquierda hasta quedar plana sobre la página izquierda.
 *
 * La hoja es una malla de piezas planas. Arriba cada fila es una sola pieza (la hoja es rígida); abajo hay muchas
 * columnas y filas finas para poder enrollar el papel en una zona que se mueve. Todo es una función pura del
 * progreso `p` (0 = hoja a la derecha, 1 = hoja a la izquierda), así que se anima hacia delante o hacia atrás.
 */

export const SPREAD_WIDTH = 1400
export const SPREAD_HEIGHT = 1040
const PAGE_WIDTH = SPREAD_WIDTH / 2

/** La hoja es rígida: cinco piezas anchas, una por fila. El rizo inferior se dibuja aparte como una forma redondeada. */
const ROW_EDGES = [0, .2, .4, .6, .8, 1]
const ROWS = ROW_EDGES.slice(0, -1).map((top, i) => ({ top, bottom: ROW_EDGES[i + 1] }))

export type TurnParams = {
  /** cuánto sobresale la hoja por arriba, como fracción de la altura */
  raise: number
  /** altura del rizo inferior, como fracción de la altura */
  curlHeight: number
}
export const DEFAULT_TURN: TurnParams = { raise: .05, curlHeight: .09 }

const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

/** Interpolación monótona (Fritsch-Carlson): pasa por los puntos medidos en la referencia sin ondulaciones */
function monotone(xs: number[], ys: number[]) {
  const n = xs.length
  const delta = xs.slice(1).map((x, i) => (ys[i + 1] - ys[i]) / (x - xs[i]))
  const m = ys.map((_, i) => i === 0 ? delta[0] : i === n - 1 ? delta[n - 2] : delta[i - 1] * delta[i] <= 0 ? 0 : (delta[i - 1] + delta[i]) / 2)
  for (let i = 0; i < n - 1; i++) {
    if (delta[i] === 0) { m[i] = 0; m[i + 1] = 0; continue }
    const a = m[i] / delta[i], b = m[i + 1] / delta[i], h = Math.hypot(a, b)
    if (h > 3) { m[i] = 3 * a * delta[i] / h; m[i + 1] = 3 * b * delta[i] / h }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0]
    if (x >= xs[n - 1]) return ys[n - 1]
    let i = 0
    while (x > xs[i + 1]) i++
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1]
  }
}

// Posición de los bordes de la hoja medida en la referencia (en anchos de página; 0 = lomo, 1 = borde exterior derecho)
const KNOTS = [0, .12, .22, .34, .45, .52, .62, .70, .76, 1]
const leftEdge = monotone(KNOTS, [0, 0, 0, -.12, -.23, -.23, -.37, -.39, -.52, -1])
const rightEdge = monotone(KNOTS, [1, 1, .97, .85, .66, .59, .11, .13, 0, 0])
/** En este punto la hoja muestra su reverso (la página que llega) en lugar de la que se va */
const SWAP = .57

export type TilePose = { transform: string; front: number; back: number }
export type CurlPose = { left: number; width: number; height: number; opacity: number }
export type SheetPose = { left: number; width: number; shadow: number }
export type TurnPoses = { rows: TilePose[]; sheet: SheetPose; curl: CurlPose }

/** Poses de todas las piezas para un progreso dado. `width` es el ancho de una página en píxeles de pantalla. */
export function turnPoses(progress: number, width: number, params: TurnParams = DEFAULT_TURN): TurnPoses {
  const p = Math.max(0, Math.min(1, progress))
  const scale = width / PAGE_WIDTH
  const height = SPREAD_HEIGHT
  const xL = leftEdge(p) * width, xR = rightEdge(p) * width
  const sheetWidth = Math.max(1, xR - xL)
  const raise = params.raise * height * smooth(0, .18, p) * (1 - smooth(.8, 1, p))
  // La esquina junto al lomo (la del borde izquierdo de la hoja) sube más que la opuesta
  const rise = (u: number) => raise * (1 - .65 * u) / height
  const front = 1 - smooth(SWAP - .03, SWAP + .02, p)
  const rows = ROWS.map((row) => {
    const top = row.top * height
    const lifted = (u: number) => (top - (height - top) * rise(u)) * scale
    const left0 = lifted(0), left1 = lifted(1)
    const stretch = 1 + rise(.5)
    const b = (left1 - left0) / width
    return {
      transform: `matrix(${(sheetWidth / width).toFixed(4)},${b.toFixed(4)},0,${stretch.toFixed(4)},${xL.toFixed(2)},${left0.toFixed(2)})`,
      front,
      back: 1 - front,
    }
  })
  // Rizo inferior: nace a lo ancho de la hoja y enseguida se queda en su esquina inferior izquierda
  const amount = smooth(0, .12, p) * (1 - smooth(.78, .98, p))
  const settle = smooth(.12, .32, p)
  const center = .5 - .3 * settle, half = .35 - .13 * settle
  const from = Math.max(0, center - half), to = Math.min(1, center + half)
  const curl: CurlPose = { left: xL + from * sheetWidth, width: (to - from) * sheetWidth, height: params.curlHeight * height * scale * amount, opacity: amount > .01 ? 1 : 0 }
  return { rows, sheet: { left: xL, width: sheetWidth, shadow: .85 * smooth(0, .1, p) * (1 - smooth(.9, 1, p)) }, curl }
}

const div = (className: string, style?: Partial<CSSStyleDeclaration>) => {
  const node = document.createElement('div')
  node.className = className
  if (style) Object.assign(node.style, style)
  return node
}

/** Copia una zona de un pliego (1400 x 1040) como una caja recortada */
function piece(source: HTMLElement, scale: number, x: number, y: number, w: number, h: number) {
  const box = div('kw-turn-piece', { width: `${w * scale}px`, height: `${h * scale}px` })
  const copy = source.cloneNode(true) as HTMLElement
  // clonar no conserva el texto escrito en los textarea
  const from = source.querySelectorAll('textarea'), to = copy.querySelectorAll('textarea')
  from.forEach((area, i) => { if (to[i]) to[i].value = area.value })
  // las copias son solo imagen: sin etiquetas accesibles, sin foco y sin identificar como elementos del tablero
  copy.querySelectorAll('[aria-label],[data-element],[tabindex]').forEach((el) => { el.removeAttribute('aria-label'); el.removeAttribute('data-element'); el.removeAttribute('tabindex') })
  copy.querySelectorAll('textarea,input,button').forEach((el) => { el.setAttribute('tabindex', '-1'); el.setAttribute('aria-hidden', 'true') })
  Object.assign(copy.style, { position: 'absolute', left: `${-x * scale}px`, top: `${-y * scale}px`, width: `${SPREAD_WIDTH}px`, height: `${SPREAD_HEIGHT}px`, transformOrigin: '0 0', transform: `scale(${scale})` })
  box.appendChild(copy)
  return box
}

export type PageTurn = {
  root: HTMLElement
  render: (p: number) => void
  destroy: () => void
}

type TileElements = { tile: HTMLElement; front: HTMLElement; back: HTMLElement }

/**
 * Prepara el pasar de página de `from` a `to` (pliegos de 1400 x 1040) sobre `rect`.
 * Con `base` la escena incluye las dos mitades fijas; sin ella solo se dibuja la hoja y su sombra.
 */
export function createPageTurn(options: { rect: DOMRect; from: HTMLElement; to: HTMLElement; base?: boolean; params?: Partial<TurnParams>; zIndex?: number }): PageTurn {
  const { rect, from, to, base = true } = options
  const params = { ...DEFAULT_TURN, ...options.params }
  const scale = rect.width / SPREAD_WIDTH
  const width = PAGE_WIDTH * scale
  const root = div('kw-turn', { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, perspective: `${rect.width * 1.9}px`, zIndex: String(options.zIndex ?? 45) })
  root.setAttribute('aria-hidden', 'true')
  root.setAttribute('inert', '')
  if (base) {
    const left = piece(from, scale, 0, 0, PAGE_WIDTH, SPREAD_HEIGHT), right = piece(to, scale, PAGE_WIDTH, 0, PAGE_WIDTH, SPREAD_HEIGHT)
    left.style.left = '0'; right.style.left = `${width}px`
    root.append(left, right)
  }
  const sheetShadow = div('kw-turn-sheet-shadow', { top: '0', height: `${rect.height}px` })
  root.appendChild(sheetShadow)

  const grid: TileElements[] = ROWS.map((row, rowIndex) => {
    const y = row.top * SPREAD_HEIGHT, h = (row.bottom - row.top) * SPREAD_HEIGHT
    // cada pieza mide lo que mide en reposo; su transformación la coloca, la estira y la lleva a su sitio
    const tile = div('kw-turn-tile', { left: '0px', top: '0px', width: `${width}px`, height: `${h * scale + 1.2}px` })
    const front = piece(from, scale, PAGE_WIDTH, y, PAGE_WIDTH, h + 1)
    const back = piece(to, scale, 0, y, PAGE_WIDTH, h + 1)
    for (const face of [front, back]) face.classList.add('kw-turn-face')
    // contorno fino en los bordes de la hoja
    const edge = div('kw-turn-edge')
    edge.style.boxShadow = [rowIndex === 0 ? 'inset 0 1px 0 #5d4a57' : '', 'inset 1px 0 0 #5d4a57', 'inset -1px 0 0 #5d4a57'].filter(Boolean).join(',')
    tile.append(front, back, edge)
    root.appendChild(tile)
    return { tile, front, back }
  })
  // forma del rizo inferior: el reverso del papel, redondeado, con el borde superior ondulado como en la referencia
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('class', 'kw-turn-curl')
  svg.setAttribute('viewBox', '0 0 100 40')
  svg.setAttribute('preserveAspectRatio', 'none')
  svg.innerHTML = '<defs><linearGradient id="kw-curl-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ead8c0"/><stop offset="1" stop-color="#d8b693"/></linearGradient></defs><path d="M0 40 C0 18 6 6 22 6 C42 6 52 14 74 18 C88 21 96 30 100 40 Z" fill="url(#kw-curl-fill)" stroke="#5d4a57" stroke-width="1.2" vector-effect="non-scaling-stroke"/>'
  root.appendChild(svg)

  const render = (p: number) => {
    const poses = turnPoses(p, width, params)
    poses.rows.forEach((pose, r) => {
      const el = grid[r]
      // la posición de la hoja se mide desde el lomo (centro del pliego)
      el.tile.style.transform = `translateX(${width}px) ${pose.transform}`
      el.front.style.opacity = pose.front.toFixed(3)
      el.back.style.opacity = pose.back.toFixed(3)
    })
    sheetShadow.style.left = `${width + poses.sheet.left}px`
    sheetShadow.style.width = `${poses.sheet.width}px`
    sheetShadow.style.opacity = poses.sheet.shadow.toFixed(3)
    const { curl } = poses
    svg.style.opacity = String(curl.opacity)
    svg.style.left = `${width + curl.left}px`
    svg.style.width = `${curl.width}px`
    svg.style.height = `${curl.height}px`
    svg.style.top = `${rect.height - curl.height}px`
  }
  render(0)
  document.body.appendChild(root)
  return { root, render, destroy: () => root.remove() }
}

export const easeInOut = (t: number) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

/** Anima el progreso de `from` a `to` en `ms` milisegundos; devuelve una promesa y permite cancelar */
export function animateTurn(turn: PageTurn, from: number, to: number, ms: number): { done: Promise<void>; cancel: () => void } {
  let frame = 0, stopped = false
  const done = new Promise<void>((resolve) => {
    const start = performance.now()
    const tick = (now: number) => {
      if (stopped) return resolve()
      const t = Math.min(1, (now - start) / ms)
      turn.render(from + (to - from) * easeInOut(t))
      if (t < 1) frame = requestAnimationFrame(tick)
      else resolve()
    }
    frame = requestAnimationFrame(tick)
  })
  return { done, cancel: () => { stopped = true; cancelAnimationFrame(frame) } }
}
