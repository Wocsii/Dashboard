/**
 * Posiciones fraccionarias para ordenar tarjetas del Kanban sin renumerar toda la columna:
 * al soltar una tarjeta entre A y B su posición es el punto medio.
 */
export const POSITION_STEP = 1024

export function positionBetween(before?: number, after?: number): number {
  if (before === undefined && after === undefined) return POSITION_STEP
  if (before === undefined) return after! - POSITION_STEP
  if (after === undefined) return before + POSITION_STEP
  return (before + after) / 2
}

/** Posición para dejar el elemento en `index` dentro de una lista ya ordenada (sin el propio elemento) */
export function positionAtIndex(sortedPositions: number[], index: number): number {
  return positionBetween(sortedPositions[index - 1], sortedPositions[index])
}
