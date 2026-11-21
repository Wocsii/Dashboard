import { describe, expect, it } from 'vitest'
import { emptyBoard, readBoard, screenToBoard, strokeElement, strokePath, zoomAt } from './board'

describe('cuaderno: datos y coordenadas', () => {
  it('convierte las notas anteriores en post-its sin perder su texto', () => {
    expect(readBoard('Mis ideas\nUna foto para mañana').elements[0]).toMatchObject({ kind: 'sticky', text: 'Mis ideas\nUna foto para mañana' })
    expect(readBoard('').elements).toEqual([])
  })
  it('restaura trazos, imágenes y la semana de una agenda', () => {
    const board = { ...emptyBoard(), calendarKey: '2026-11-16', elements: [strokeElement('pencil', 'drawing', [{ x: 10, y: 15 }, { x: 20, y: 25 }], '#554455'), { id: 'photo', kind: 'image', x: 20, y: 40, width: 100, height: 120, rotation: -3, color: '#fff', src: 'data:image/webp;base64,YQ==' }] }
    expect(readBoard(JSON.stringify(board))).toEqual(board)
  })
  it('no interpreta una URL ejecutable como una imagen del cuaderno', () => {
    const content = JSON.stringify({ ...emptyBoard(), elements: [{ id: 'bad', kind: 'image', x: 0, y: 0, width: 1, height: 1, rotation: 0, color: '#fff', src: 'javascript:alert(1)' }] })
    expect(readBoard(content).elements[0].kind).toBe('sticky')
  })
  it('calcula el trazo en coordenadas del papel después de mover y ampliar', () => {
    expect(screenToBoard({ x: 320, y: 240 }, { left: 20, top: 40 }, { x: 100, y: 50, zoom: 2 })).toEqual({ x: 100, y: 75 })
  })
  it('mantiene el punto bajo el cursor al cambiar de zoom y limita la escala', () => {
    const view = { x: 80, y: 20, zoom: 0.5 }, point = { x: 400, y: 300 }
    const before = screenToBoard(point, { left: 0, top: 0 }, view)
    const next = zoomAt(view, 1.5, point)
    expect(screenToBoard(point, { left: 0, top: 0 }, next)).toEqual(before)
    expect(zoomAt(view, 99, point).zoom).toBe(2)
    expect(zoomAt(view, 0.01, point).zoom).toBe(0.15)
  })
  it('conserva la dirección de las flechas y normaliza trazos hacia atrás', () => {
    const stroke = strokeElement('arrow', 'arrow', [{ x: 100, y: 90 }, { x: 40, y: 20 }], '#fff')
    expect(stroke).toMatchObject({ x: 40, y: 20, width: 60, height: 70, points: [{ x: 60, y: 70 }, { x: 0, y: 0 }] })
    expect(strokePath(stroke)).toBe('M 60 70 L 0 0')
  })
  it('los trazos horizontales y verticales siguen teniendo una superficie seleccionable', () => {
    expect(strokeElement('line', 'drawing', [{ x: 5, y: 5 }, { x: 10, y: 5 }], '#fff').height).toBe(1)
  })
})
