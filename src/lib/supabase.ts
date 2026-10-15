import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { env, isDemo } from './env'

export const supabase: SupabaseClient<Database> | null = isDemo
  ? null
  : createClient<Database>(env.supabaseUrl!, env.supabaseKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })

export function requireSupabase(): SupabaseClient<Database> {
  if (!supabase) throw new Error('Supabase no está configurado')
  return supabase
}
