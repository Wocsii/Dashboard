/** Variables de entorno del servidor. Nunca llevan prefijo VITE_ (no llegan al navegador). */
export function serverEnv() {
  const e = process.env
  return {
    supabaseUrl: e.SUPABASE_URL ?? e.VITE_SUPABASE_URL,
    supabaseSecretKey: e.SUPABASE_SECRET_KEY ?? e.SUPABASE_SERVICE_ROLE_KEY,
    googleClientId: e.GOOGLE_CLIENT_ID,
    googleClientSecret: e.GOOGLE_CLIENT_SECRET,
    googleRedirectUri: e.GOOGLE_REDIRECT_URI,
    tokenKey: e.TOKEN_ENCRYPTION_KEY,
    stateSecret: e.OAUTH_STATE_SECRET,
    appUrl: (e.APP_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
  }
}

export function isGoogleConfigured(env = serverEnv()): boolean {
  return Boolean(
    env.supabaseUrl &&
      env.supabaseSecretKey &&
      env.googleClientId &&
      env.googleClientSecret &&
      env.googleRedirectUri &&
      env.tokenKey &&
      env.stateSecret,
  )
}
