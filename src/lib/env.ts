export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  supabaseKey: (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as
    | string
    | undefined,
}

/** Sin Supabase configurado la app funciona en modo demo (datos en localStorage). */
export const isDemo = !env.supabaseUrl || !env.supabaseKey

/** true cuando la app está cargada dentro del iframe de la extensión de Chrome */
export const isEmbedded = typeof window !== 'undefined' && window.self !== window.top
