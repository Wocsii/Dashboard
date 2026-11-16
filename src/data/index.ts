import { isDemo } from '@/lib/env'
import { guestMode } from '@/lib/guest'
import { createGuestRepository } from './guestRepository'
import { createDemoRepository } from './demoRepository'
import type { Repository } from './repository'
import { createSupabaseRepository } from './supabaseRepository'

let instance: Repository | null = null
let guestInstance: Repository | null = null

export function repo(): Repository {
  if (guestMode.get()) return (guestInstance ??= createGuestRepository())
  instance ??= isDemo ? createDemoRepository() : createSupabaseRepository()
  return instance
}

/** Solo para tests */
export function setRepository(r: Repository | null) {
  instance = r
}

/** Entra o sale del modo invitado; al entrar se crean datos de ejemplo nuevos. */
export function setGuestRepository(on: boolean) {
  guestMode.set(on)
  guestInstance = null
}

export type { Repository }
