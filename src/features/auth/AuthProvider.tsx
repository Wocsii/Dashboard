import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { isDemo, isEmbedded } from '@/lib/env'
import { supabase } from '@/lib/supabase'

type AuthState = {
  status: 'loading' | 'signed_in' | 'signed_out'
  session: Session | null
  email: string | null
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  /** Token de acceso para llamar a las funciones /api */
  getAccessToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<AuthState['status']>(isDemo ? 'signed_in' : 'loading')

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setStatus(data.session ? 'signed_in' : 'signed_out')
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setStatus(s ? 'signed_in' : 'signed_out')
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const value: AuthState = {
    status,
    session,
    email: isDemo ? 'demo@local' : (session?.user.email ?? null),
    async signInWithGoogle() {
      if (!supabase) return
      // Google no permite iniciar sesión dentro de un iframe (extensión de nueva pestaña):
      // abrimos el login en una pestaña normal.
      if (isEmbedded) {
        window.open(`${window.location.origin}/?login=google`, '_blank', 'noopener')
        return
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin, queryParams: { prompt: 'select_account' } },
      })
      if (error) throw error
    },
    async signOut() {
      if (!supabase) return
      await supabase.auth.signOut()
      qc.clear()
    },
    async getAccessToken() {
      if (!supabase) return null
      const { data } = await supabase.auth.getSession()
      return data.session?.access_token ?? null
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fuera de AuthProvider')
  return ctx
}
