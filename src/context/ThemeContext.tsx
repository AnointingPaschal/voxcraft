import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

type Theme = 'light' | 'dark'
interface ThemeCtx { theme: Theme; toggle: () => void; isDark: boolean }

const Ctx = createContext<ThemeCtx>({ theme: 'light', toggle: () => {}, isDark: false })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('vc_theme') : null
    if (saved === 'dark' || saved === 'light') return saved
    return 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('vc_theme', theme)
  }, [theme])

  const toggle = useCallback(() => setTheme(t => t === 'light' ? 'dark' : 'light'), [])

  return <Ctx.Provider value={{ theme, toggle, isDark: theme === 'dark' }}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)
