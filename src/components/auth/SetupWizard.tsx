import { useState, type FormEvent } from 'react'
import { Loader2, ShieldCheck, Wand2, Eye, EyeOff, Copy, CheckCircle2 } from 'lucide-react'
import { runSetup } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'

interface Props { onComplete: () => void }

function generateSecret(len = 64): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  const arr = crypto.getRandomValues(new Uint8Array(len))
  return Array.from(arr).map(b => chars[b % chars.length]).join('')
}

export default function SetupWizard({ onComplete }: Props) {
  const { setAuth } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [showSecret, setShowSecret] = useState(false)

  const [form, setForm] = useState({
    siteName: 'VoxCraft Studio',
    adminEmail: '',
    adminName: '',
    adminPassword: '',
    jwtSecret: generateSecret(),
  })

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.adminEmail || !form.adminPassword || !form.adminName) { setError('All fields are required.'); return }
    if (form.adminPassword.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (form.jwtSecret.length < 32) { setError('JWT secret must be at least 32 characters.'); return }
    setLoading(true); setError('')
    try {
      const res = await runSetup(form)
      setAuth(res.token, res.user)
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed.')
    } finally {
      setLoading(false)
    }
  }

  function copySecret() {
    void navigator.clipboard.writeText(form.jwtSecret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const teal = '#20d2a0'
  const card: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '28px 24px' }
  const inp: React.CSSProperties = { background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 14px', color: '#f0faf7', fontFamily: 'inherit', fontSize: 14, width: '100%', outline: 'none', boxSizing: 'border-box' }
  const label: React.CSSProperties = { display: 'block', fontSize: 11, color: 'rgba(240,250,247,0.45)', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }
  const btn: React.CSSProperties = { background: `linear-gradient(135deg, ${teal} 0%, #0ea882 100%)`, color: '#0a121e', border: 'none', borderRadius: 14, padding: '13px 0', fontSize: 14, fontWeight: 700, width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(160deg, #0a121e 0%, #0d1f2d 60%, #091824 100%)' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'rgba(32,210,160,0.12)', border: '1px solid rgba(32,210,160,0.25)' }}>
            <ShieldCheck size={26} style={{ color: teal }} />
          </div>
          <h1 className="display text-2xl font-bold mb-2" style={{ color: '#f0faf7' }}>First-Time Setup</h1>
          <p className="text-sm" style={{ color: 'rgba(240,250,247,0.45)' }}>
            Configure VoxCraft Studio — takes about 2 minutes.
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2].map(s => (
            <div key={s} className="flex-1 h-1 rounded-full transition-all"
              style={{ background: s <= step ? teal : 'rgba(255,255,255,0.1)' }} />
          ))}
        </div>

        <form onSubmit={(e) => { void handleSubmit(e) }}>
          {step === 1 && (
            <div style={card}>
              <h2 className="text-base font-bold mb-1 display" style={{ color: '#f0faf7' }}>Site Identity</h2>
              <p className="text-xs mb-5" style={{ color: 'rgba(240,250,247,0.4)' }}>Basic info shown to your users.</p>
              <div className="space-y-4">
                <div>
                  <label style={label}>Site Name</label>
                  <input style={inp} value={form.siteName} onChange={e => set('siteName', e.target.value)} placeholder="VoxCraft Studio" required />
                </div>
              </div>
              <button type="button" onClick={() => setStep(2)}
                style={{ ...btn, marginTop: 24 }}>
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div style={card}>
              <h2 className="text-base font-bold mb-1 display" style={{ color: '#f0faf7' }}>Admin Account &amp; Security</h2>
              <p className="text-xs mb-5" style={{ color: 'rgba(240,250,247,0.4)' }}>
                This becomes your superadmin login. Store the JWT secret safely — it signs all user tokens.
              </p>
              <div className="space-y-4">
                <div>
                  <label style={label}>Your Name</label>
                  <input style={inp} value={form.adminName} onChange={e => set('adminName', e.target.value)} placeholder="John Doe" required />
                </div>
                <div>
                  <label style={label}>Admin Email</label>
                  <input style={inp} type="email" value={form.adminEmail} onChange={e => set('adminEmail', e.target.value)} placeholder="admin@example.com" required />
                </div>
                <div>
                  <label style={label}>Admin Password</label>
                  <div className="relative">
                    <input style={{ ...inp, paddingRight: 40 }} type={showPwd ? 'text' : 'password'} value={form.adminPassword} onChange={e => set('adminPassword', e.target.value)} placeholder="Min 8 characters" required />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(240,250,247,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={label}>JWT Secret <span style={{ color: 'rgba(240,250,247,0.3)', fontSize: 10 }}>(auto-generated, keep it)</span></label>
                  <div className="flex gap-2">
                    <input style={{ ...inp, fontFamily: 'monospace', fontSize: 11 }} type={showSecret ? 'text' : 'password'} value={form.jwtSecret} onChange={e => set('jwtSecret', e.target.value)} required />
                    <button type="button" onClick={() => setShowSecret(v => !v)}
                      style={{ flexShrink: 0, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '0 10px', color: 'rgba(240,250,247,0.5)', cursor: 'pointer' }}>
                      {showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button type="button" onClick={copySecret}
                      style={{ flexShrink: 0, background: 'rgba(32,210,160,0.1)', border: '1px solid rgba(32,210,160,0.25)', borderRadius: 10, padding: '0 10px', color: teal, cursor: 'pointer' }}>
                      {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                    </button>
                    <button type="button" onClick={() => set('jwtSecret', generateSecret())}
                      style={{ flexShrink: 0, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '0 10px', color: 'rgba(240,250,247,0.5)', cursor: 'pointer' }}>
                      <Wand2 size={13} />
                    </button>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'rgba(240,250,247,0.3)' }}>
                    Copy and store this secret somewhere safe before continuing.
                  </p>
                </div>
              </div>

              {error && <div className="mt-4 text-xs rounded-xl px-3 py-2" style={{ background: 'rgba(186,43,76,0.12)', color: '#ff6b8a' }}>{error}</div>}

              <div className="flex gap-2 mt-6">
                <button type="button" onClick={() => setStep(1)}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '13px 0', fontSize: 14, fontWeight: 600, color: 'rgba(240,250,247,0.6)', cursor: 'pointer' }}>
                  Back
                </button>
                <button type="submit" disabled={loading} style={{ ...btn, flex: 2, opacity: loading ? 0.6 : 1 }}>
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                  {loading ? 'Setting up…' : 'Complete Setup'}
                </button>
              </div>
            </div>
          )}
        </form>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(240,250,247,0.25)' }}>
          You can configure Google OAuth, Flutterwave, and the voice engine after setup from the Admin panel.
        </p>
      </div>
    </div>
  )
}
