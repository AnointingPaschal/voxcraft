import { useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, User, Eye, EyeOff, Loader2, AlertCircle, Activity } from 'lucide-react'
import { register, login, getGoogleUrl } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'

interface Props { onSuccess: () => void; initialTab?: 'login' | 'register' }

export default function AuthPage({ onSuccess, initialTab = 'login' }: Props) {
  const { setAuth } = useAuth()
  const [tab, setTab] = useState<'login' | 'register'>(initialTab)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const fn = tab === 'register' ? () => register(email, password, name) : () => login(email, password)
      const { token, user } = await fn()
      setAuth(token, user)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    try {
      const { url } = await getGoogleUrl()
      window.location.href = url
    } catch {
      setError('Failed to start Google login.')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(160deg, #0a121e 0%, #0d1f2d 60%, #091824 100%)' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: 'linear-gradient(135deg, #20d2a0 0%, #0ea882 100%)', boxShadow: '0 0 24px rgba(32,210,160,0.3)' }}>
            <Activity size={22} color="#0a121e" strokeWidth={2.5} />
          </div>
          <h1 className="display text-xl font-bold" style={{ color: '#f0faf7' }}>VoxCraft Studio</h1>
          <p className="text-xs mt-1" style={{ color: 'rgba(240,250,247,0.45)' }}>African Voice AI</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Tabs */}
          <div className="flex rounded-xl p-1 mb-6" style={{ background: 'rgba(0,0,0,0.3)' }}>
            {(['login', 'register'] as const).map(t => (
              <button key={t} type="button" onClick={() => { setTab(t); setError('') }}
                className="flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition-all"
                style={tab === t
                  ? { background: 'rgba(32,210,160,0.15)', color: '#20d2a0', border: '1px solid rgba(32,210,160,0.3)' }
                  : { color: 'rgba(240,250,247,0.45)', border: '1px solid transparent' }
                }>
                {t === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Google button */}
          <button type="button" onClick={() => { void handleGoogle() }} disabled={googleLoading}
            className="w-full rounded-xl py-3 flex items-center justify-center gap-3 text-sm font-medium mb-4 transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#f0faf7' }}>
            {googleLoading ? <Loader2 size={16} className="animate-spin" /> : (
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-xs" style={{ color: 'rgba(240,250,247,0.3)' }}>or</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>

          <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-3">
            <AnimatePresence>
              {tab === 'register' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                  <InputField icon={<User size={14} />} type="text" placeholder="Full name" value={name} onChange={setName} />
                </motion.div>
              )}
            </AnimatePresence>
            <InputField icon={<Mail size={14} />} type="email" placeholder="Email address" value={email} onChange={setEmail} />
            <div className="relative">
              <InputField icon={<Lock size={14} />} type={showPw ? 'text' : 'password'} placeholder="Password" value={password} onChange={setPassword} />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'rgba(240,250,247,0.4)' }}>
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                  style={{ background: 'rgba(186,43,76,0.12)', border: '1px solid rgba(186,43,76,0.3)' }}>
                  <AlertCircle size={13} style={{ color: '#ff6b8a', flexShrink: 0 }} />
                  <span className="text-xs" style={{ color: '#ff6b8a' }}>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button type="submit" disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all mt-1"
              style={loading
                ? { background: 'rgba(32,210,160,0.2)', color: 'rgba(32,210,160,0.5)', cursor: 'not-allowed' }
                : { background: 'linear-gradient(135deg, #20d2a0 0%, #0ea882 100%)', color: '#0a121e', cursor: 'pointer' }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {tab === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: 'rgba(240,250,247,0.3)' }}>
          By continuing, you agree to our Terms of Service.
        </p>
      </motion.div>
    </div>
  )
}

function InputField({ icon, type, placeholder, value, onChange }: {
  icon: React.ReactNode; type: string; placeholder: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="relative flex items-center">
      <span className="absolute left-3" style={{ color: 'rgba(240,250,247,0.4)' }}>{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        required
        className="w-full rounded-xl py-3 pl-9 pr-4 text-sm outline-none border transition-colors"
        style={{ background: 'rgba(0,0,0,0.25)', borderColor: 'rgba(255,255,255,0.1)', color: '#f0faf7', fontFamily: 'inherit' }}
        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(32,210,160,0.4)' }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
      />
    </div>
  )
}
