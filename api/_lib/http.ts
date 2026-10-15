import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { serverEnv } from './env.js'

export type ErrorCode = 'not_configured' | 'not_connected' | 'needs_reauth' | 'unauthorized' | 'bad_request' | 'unknown'

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: ErrorCode,
    message: string,
  ) {
    super(message)
  }
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

export function redirect(url: string): Response {
  return new Response(null, { status: 302, headers: { location: url, 'cache-control': 'no-store' } })
}

/** Envuelve un handler: convierte HttpError en JSON {code, message} */
export function handle(fn: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    try {
      return await fn(req)
    } catch (e) {
      if (e instanceof HttpError) return json({ code: e.code, message: e.message }, e.status)
      // Solo el mensaje (ya saneado en _lib/google.ts): nunca el objeto completo,
      // que podría incluir tokens o respuestas de terceros.
      console.error('API request failed:', e instanceof Error ? e.message : 'internal_error')
      return json({ code: 'unknown', message: 'Error inesperado del servidor' }, 500)
    }
  }
}

let admin: SupabaseClient | null = null
/** Cliente con la clave secreta: salta RLS. Solo en el servidor. */
export function supabaseAdmin(): SupabaseClient {
  const env = serverEnv()
  if (!env.supabaseUrl || !env.supabaseSecretKey) throw new HttpError(501, 'not_configured', 'Supabase no está configurado en el servidor')
  admin ??= createClient(env.supabaseUrl, env.supabaseSecretKey, { auth: { persistSession: false, autoRefreshToken: false } })
  return admin
}

/** Valida el JWT de Supabase enviado por la app y devuelve el usuario */
export async function requireUser(req: Request): Promise<{ id: string; email: string | null }> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) throw new HttpError(401, 'unauthorized', 'Falta la sesión')
  const { data, error } = await supabaseAdmin().auth.getUser(token)
  if (error || !data.user) throw new HttpError(401, 'unauthorized', 'Sesión no válida o caducada')
  return { id: data.user.id, email: data.user.email ?? null }
}
