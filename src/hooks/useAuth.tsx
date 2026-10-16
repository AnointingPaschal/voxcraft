import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { getMe, type AuthUser } from '../lib/api'

interface AuthCtx {
  user: AuthUser | null
  token: string | null
  loading: boolean
  setAuth: (token: string, user: AuthUser) => void
  logout: () => void
  refresh: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const setAuth = useCallback((t: string, u: AuthUser) => {
    localStorage.setItem('vc_token', t)
    setToken(t)
    setUser(u)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('vc_token')
    setToken(null)
    setUser(null)
  }, [])

  const refresh = useCallback(async () => {
    const stored = localStorage.getItem('vc_token')
    if (!stored) { setLoading(false); return }
    try {
      const { user: u } = await getMe()
      setUser(u)
      setToken(stored)
    } catch {
      localStorage.removeItem('vc_token')
      setUser(null)
      setToken(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Bootstrap session once on mount — run outside render by deferring with queueMicrotask
  useState(() => { queueMicrotask(() => { void refresh() }) })

  return <Ctx.Provider value={{ user, token, loading, setAuth, logout, refresh }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
