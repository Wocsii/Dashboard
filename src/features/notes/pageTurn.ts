/**
 * Pasar de página como en un cuaderno de verdad.
 *
 * La hoja se divide en una rejilla de piezas planas (columnas x filas). Cada pieza es un elemento
 * independiente con su propia transformación 3D, calculada a mano:
 *  - las columnas se encadenan a partir del lomo y la hoja gira sobre él (de 0 a 180 grados) curvándose;
 *  - las filas de abajo se retrasan un poco (la esquina inferior exterior va rezagada);
 *  - la parte baja de la hoja se enrolla hacia el lector y deja ver el reverso del papel, como en la referencia.
 *
 * Todo el movimiento es una función pura del progreso `p` (0 = hoja a la derecha, 1 = hoja a la izquierda),
 * por lo que se puede animar hacia delante o hacia atrás y comprobar fotograma a fotograma.
 */

export const SPREAD_WIDTH = 1400
export const SPREAD_HEIGHT = 1040
const PAGE_WIDTH = SPREAD_WIDTH / 2

const COLUMNS = 5
// Filas finas abajo, donde la hoja se enrolla (cada una abarca menos de 10 grados del rizo), para que sea redondo y no facetado
const ROW_EDGES = [0, .2, .4, .6, .8, ...Array.from({ length: 19 }, (_, i) => .82 + i * .01)]
const ROWS = ROW_EDGES.length - 1

export type TurnParams = {
  /** ángulo máximo de retraso de la fila inferior, en grados */
  lag: number
  /** doblez extra por columna, en grados */
  curl: number
  /** fracción de la altura que se enrolla abajo */
  roll: number
  /** radio del rizo como fracción de la altura */
  radius: number
  /** cuánto se levanta la hoja hacia el lector, como fracción del ancho de página */
  lift: number
}

export const DEFAULT_TURN: TurnParams = { lag: 2, curl: 1.5, roll: .18, radius: .07, lift: .14 }

const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const rad = Math.PI / 180

export type TilePose = {
  transform: string
  /** qué cara se ve: la delantera de la hoja, su reverso, o el reverso del papel enrollado */
  face: 'front' | 'back' | 'curl'
  /** oscurecimiento de 0 a 1 */
  shade: number
}

export type TurnPoses = {
  tiles: TilePose[][]
  shadowRight: number
  shadowLeft: number
}

/**
 * Cuánto papel se enrolla abajo en cada instante, con signo: primero el borde inferior se enrolla hacia el lector
 * (+) y se desenrolla antes de cruzar el lomo; ya al otro lado, con el reverso hacia el lector, se vuelve a enrollar
 * hacia el lector (-) hasta aterrizar plano. En p = 0, 0.5 y 1 vale cero, así que no hay saltos.
 */
export function rollAmount(p: number) {
  const first = smooth(0, .14, p) * (1 - smooth(.3, .5, p))
  const second = smooth(.5, .66, p) * (1 - smooth(.86, 1, p))
  return p < .5 ? first : -second
}

/** Poses de todas las piezas para un progreso dado. `width` es el ancho de una página en píxeles de pantalla. */
export function turnPoses(p: number, width: number, params: TurnParams = DEFAULT_TURN): TurnPoses {
  const scale = width / PAGE_WIDTH
  const height = SPREAD_HEIGHT
  const stripWidth = width / COLUMNS
  const bell = Math.sin(Math.PI * Math.max(0, Math.min(1, p)))
  const rolling = rollAmount(p)
  const sign = rolling >= 0 ? 1 : -1
  const fold = height * (1 - params.roll * Math.abs(rolling))
  // el giro empieza un poco después de que el borde se enrolle y termina antes del aterrizaje
  const q = smooth(.08, .95, p)
  const radius = params.radius * height
  const lift = params.lift * width * bell
  const raise = .03 * height * scale * bell
  const tiles: TilePose[][] = []
  for (let row = 0; row < ROWS; row++) {
    const top = ROW_EDGES[row] * height
    const g = top / height
    const lag = params.lag * bell * g * g
    // ángulo de cada columna respecto de la anterior (la primera gira sobre el lomo; las demás se doblan hacia atrás)
    let angle = 0, x = 0, z = 0
    // enrollado de la parte baja: la fila se curva alrededor de un cilindro horizontal
    const s = Math.max(0, top - fold)
    const alpha = Math.min(Math.PI * 1.15, s / radius)
    const dy = (radius * Math.sin(alpha) - s) * scale
    const dz = sign * radius * (1 - Math.cos(alpha)) * scale
    const rolled = s > 0
    const rowTiles: TilePose[] = []
    for (let col = 0; col < COLUMNS; col++) {
      angle += col === 0 ? -(180 * q - lag) : params.curl * bell
      const cosA = Math.cos(angle * rad), cosAlpha = Math.cos(alpha)
      const face: TilePose['face'] = rolled && cosAlpha < 0 ? 'curl' : cosA > 0 ? 'front' : 'back'
      const side = Math.sin(Math.min(Math.PI, Math.abs(angle) * rad))
      const shade = .2 * side + (rolled ? .28 * Math.abs(Math.sin(alpha)) : 0)
      const roll = rolled ? ` translate3d(0,${dy.toFixed(2)}px,${dz.toFixed(2)}px) rotateX(${(sign * alpha / rad).toFixed(2)}deg)` : ''
      rowTiles.push({
        transform: `translate3d(${x.toFixed(2)}px,${(-raise).toFixed(2)}px,${(z + lift).toFixed(2)}px) rotateY(${angle.toFixed(2)}deg)${roll}`,
        face,
        shade: Math.min(.7, shade),
      })
      x += stripWidth * Math.cos(angle * rad)
      z -= stripWidth * Math.sin(angle * rad)
    }
    tiles.push(rowTiles)
  }
  return {
    tiles,
    shadowRight: p < .5 ? .5 * Math.sin(Math.PI * Math.min(1, p * 2)) : 0,
    shadowLeft: p > .5 ? .5 * Math.sin(Math.PI * Math.max(0, p * 2 - 1)) : 0,
  }
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

/**
 * Prepara el pasar de página de `from` a `to` (pliegos de 1400 x 1040) sobre `rect`.
 * Con `base` la escena incluye las dos mitades fijas; sin ella solo se dibuja la hoja y su sombra.
 */
export function createPageTurn(options: { rect: DOMRect; from: HTMLElement; to: HTMLElement; base?: boolean; params?: Partial<TurnParams>; zIndex?: number }): PageTurn {
  const { rect, from, to, base = true } = options
  const params = { ...DEFAULT_TURN, ...options.params }
  const scale = rect.width / SPREAD_WIDTH
  const width = PAGE_WIDTH * scale
  const stripWidth = width / COLUMNS
  const root = div('kw-turn', { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, perspective: `${rect.width * 1.9}px`, zIndex: String(options.zIndex ?? 45) })
  if (base) {
    const left = piece(from, scale, 0, 0, PAGE_WIDTH, SPREAD_HEIGHT), right = piece(to, scale, PAGE_WIDTH, 0, PAGE_WIDTH, SPREAD_HEIGHT)
    left.style.left = '0'; right.style.left = `${width}px`
    root.append(left, right)
  }
  root.setAttribute('aria-hidden', 'true')
  root.setAttribute('inert', '')
  const shadowRight = div('kw-turn-shadow kw-turn-shadow-right'), shadowLeft = div('kw-turn-shadow kw-turn-shadow-left')
  root.append(shadowRight, shadowLeft)

  const elements: { tile: HTMLElement; front: HTMLElement; back: HTMLElement; curl: HTMLElement; dim: HTMLElement }[][] = []
  for (let row = 0; row < ROWS; row++) {
    const y = ROW_EDGES[row] * SPREAD_HEIGHT, h = (ROW_EDGES[row + 1] - ROW_EDGES[row]) * SPREAD_HEIGHT
    const line: (typeof elements)[number] = []
    for (let col = 0; col < COLUMNS; col++) {
      const tile = div('kw-turn-tile', { left: `${width}px`, top: `${y * scale}px`, width: `${stripWidth + .9}px`, height: `${h * scale + .9}px` })
      // cara delantera: derecha de `from`; reverso: izquierda de `to`, volteada para que al girar se lea bien
      const front = piece(from, scale, PAGE_WIDTH + col * (PAGE_WIDTH / COLUMNS), y, PAGE_WIDTH / COLUMNS + 1, h + 1)
      const back = piece(to, scale, (COLUMNS - 1 - col) * (PAGE_WIDTH / COLUMNS), y, PAGE_WIDTH / COLUMNS + 1, h + 1)
      back.style.transform = 'scaleX(-1)'
      const curl = div('kw-turn-curl')
      const dim = div('kw-turn-dim')
      for (const face of [front, back, curl]) face.classList.add('kw-turn-face')
      tile.append(front, back, curl, dim)
      root.appendChild(tile)
      line.push({ tile, front, back, curl, dim })
    }
    elements.push(line)
  }

  const render = (p: number) => {
    const poses = turnPoses(p, width, params)
    poses.tiles.forEach((line, row) => line.forEach((pose, col) => {
      const el = elements[row][col]
      el.tile.style.transform = pose.transform
      el.front.style.opacity = pose.face === 'front' ? '1' : '0'
      el.back.style.opacity = pose.face === 'back' ? '1' : '0'
      el.curl.style.opacity = pose.face === 'curl' ? '1' : '0'
      el.dim.style.opacity = pose.shade.toFixed(3)
    }))
    shadowRight.style.opacity = poses.shadowRight.toFixed(3)
    shadowLeft.style.opacity = poses.shadowLeft.toFixed(3)
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
