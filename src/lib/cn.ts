import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Une clases y resuelve conflictos de Tailwind (la última gana: w-full + w-auto → w-auto) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
