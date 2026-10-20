import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AudioWaveform, Moon, Sun, Menu, X, ChevronDown, LogOut, User, LayoutDashboard, CreditCard } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import type { AuthUser } from '@/lib/api'

interface NavbarProps {
  page: string
  setPage: (p: string) => void
  user: AuthUser | null
  onSignOut: () => void
}

const NAV_LINKS = [
  { label: 'Home', page: 'home' },
  { label: 'Features', page: 'features' },
  { label: 'Voices', page: 'voices' },
  { label: 'Pricing', page: 'plans' },
  { label: 'About', page: 'about' },
]

export function Navbar({ page, setPage, user, onSignOut }: NavbarProps) {
  const { toggle, isDark } = useTheme()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const go = (p: string) => { setPage(p); setMobileOpen(false); setUserMenuOpen(false) }

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled
            ? isDark ? 'rgba(11,22,34,0.92)' : 'rgba(255,255,255,0.92)'
            : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? `1px solid var(--border)` : '1px solid transparent',
          boxShadow: scrolled ? 'var(--shadow-sm)' : 'none',
        }}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <button onClick={() => go('home')} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent)' }}>
              <AudioWaveform size={18} color="white" />
            </div>
            <span className="font-bold text-lg display" style={{ color: 'var(--ink)' }}>Voicera</span>
          </button>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(l => (
              <button key={l.page} onClick={() => go(l.page)}
                className="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  color: page === l.page ? 'var(--accent)' : 'var(--muted)',
                  background: page === l.page ? 'var(--accent-light)' : 'transparent',
                }}>
                {l.label}
              </button>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
              style={{ background: 'var(--surface-muted)', color: 'var(--muted)' }}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {user ? (
              <div className="relative">
                <button onClick={() => setUserMenuOpen(o => !o)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
                  style={{ background: 'var(--surface-muted)', color: 'var(--ink)', border: '1px solid var(--border)' }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'var(--accent)', color: 'white' }}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block max-w-[100px] truncate">{user.name.split(' ')[0]}</span>
                  <ChevronDown size={14} style={{ color: 'var(--muted)' }} />
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-52 rounded-2xl overflow-hidden"
                      style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
                      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                        <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{user.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{user.email}</p>
                        <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
                          style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                          {user.plan}
                        </span>
                      </div>
                      {[
                        { icon: User, label: 'Dashboard', page: 'dashboard' },
                        { icon: CreditCard, label: 'Billing', page: 'plans' },
                        ...(user.role === 'admin' ? [{ icon: LayoutDashboard, label: 'Admin Panel', page: 'admin' }] : []),
                      ].map(item => (
                        <button key={item.page} onClick={() => go(item.page)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all hover:bg-black/5 dark:hover:bg-white/5"
                          style={{ color: 'var(--ink-2)' }}>
                          <item.icon size={15} style={{ color: 'var(--muted)' }} />
                          {item.label}
                        </button>
                      ))}
                      <div className="border-t" style={{ borderColor: 'var(--border)' }}>
                        <button onClick={() => { onSignOut(); setUserMenuOpen(false) }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all hover:bg-black/5"
                          style={{ color: 'var(--danger)' }}>
                          <LogOut size={15} />
                          Sign out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => go('auth')} className="px-4 py-2 rounded-xl text-sm font-medium transition-all hidden sm:block"
                  style={{ color: 'var(--ink-2)' }}>Sign in</button>
                <button onClick={() => go('studio')} className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: 'var(--cta)', color: 'var(--cta-text)' }}>
                  Try Free
                </button>
              </div>
            )}

            {/* Mobile menu btn */}
            <button onClick={() => setMobileOpen(o => !o)} className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--surface-muted)', color: 'var(--ink)' }}>
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-16 z-40 md:hidden"
            style={{ background: isDark ? 'rgba(11,22,34,0.98)' : 'rgba(255,255,255,0.98)', backdropFilter: 'blur(20px)', borderBottom: `1px solid var(--border)` }}>
            <div className="px-4 py-4 space-y-1">
              {NAV_LINKS.map(l => (
                <button key={l.page} onClick={() => go(l.page)}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{ color: page === l.page ? 'var(--accent)' : 'var(--ink)', background: page === l.page ? 'var(--accent-light)' : 'transparent' }}>
                  {l.label}
                </button>
              ))}
              <div className="pt-2 flex flex-col gap-2">
                {!user && <button onClick={() => go('auth')} className="w-full py-3 rounded-xl text-sm font-medium border"
                  style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}>Sign in</button>}
                <button onClick={() => go('studio')} className="w-full py-3 rounded-xl text-sm font-semibold"
                  style={{ background: 'var(--cta)', color: 'var(--cta-text)' }}>
                  {user ? 'Open Studio' : 'Try Free'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
