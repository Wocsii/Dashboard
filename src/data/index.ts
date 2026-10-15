import { isDemo } from '@/lib/env'
import { createDemoRepository } from './demoRepository'
import type { Repository } from './repository'
import { createSupabaseRepository } from './supabaseRepository'

let instance: Repository | null = null

export function repo(): Repository {
  instance ??= isDemo ? createDemoRepository() : createSupabaseRepository()
  return instance
}

/** Solo para tests */
export function setRepository(r: Repository | null) {
  instance = r
}

export type { Repository }
