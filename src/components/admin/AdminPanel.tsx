import { useState, useEffect, useCallback, type FormEvent } from 'react'
import {
  Settings, Users, CreditCard, BarChart2, Save, Loader2,
  CheckCircle2, Key, Globe, Palette, Eye, EyeOff, ChevronDown, ChevronUp,
  ShieldCheck, Banknote,
} from 'lucide-react'
import {
  adminGetConfig, adminPatchConfig, adminGetPlans, adminPutPlans,
  adminGetUsers, adminPatchUser, adminGetStats,
  type FullSiteConfig, type Plan, type AuthUser, type AdminStats,
} from '../../lib/api'

type Tab = 'stats' | 'config' | 'voice' | 'google' | 'flutterwave' | 'security' | 'plans' | 'users'

export default function AdminPanel({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('stats')

  const tabs: { id: Tab; label: string; icon: typeof Settings }[] = [
    { id: 'stats', label: 'Overview', icon: BarChart2 },
    { id: 'config', label: 'Site', icon: Globe },
    { id: 'voice', label: 'Voice API', icon: Key },
    { id: 'google', label: 'Google', icon: Settings },
    { id: 'flutterwave', label: 'Payments', icon: Banknote },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'plans', label: 'Plans', icon: CreditCard },
    { id: 'users', label: 'Users', icon: Users },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="display text-xl font-bold" style={{ color: '#f0faf7' }}>Admin Panel</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(240,250,247,0.4)' }}>Manage VoxCraft Studio</p>
        </div>
        <button type="button" onClick={onBack} className="text-xs px-3 py-1.5 rounded-lg"
          style={{ color: 'rgba(240,250,247,0.5)', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
          Back to Studio
        </button>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 rounded-xl p-1 mb-6" style={{ background: 'rgba(0,0,0,0.3)' }}>
        {tabs.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all"
            style={tab === t.id
              ? { background: 'rgba(32,210,160,0.15)', color: '#20d2a0', border: '1px solid rgba(32,210,160,0.3)' }
              : { color: 'rgba(240,250,247,0.45)', border: '1px solid transparent' }}>
            <t.icon size={12} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'stats' && <StatsTab />}
      {tab === 'config' && <ConfigTab section="identity" />}
      {tab === 'voice' && <ConfigTab section="voice" />}
      {tab === 'google' && <ConfigTab section="google" />}
      {tab === 'flutterwave' && <ConfigTab section="flutterwave" />}
      {tab === 'security' && <ConfigTab section="security" />}
      {tab === 'plans' && <PlansTab />}
      {tab === 'users' && <UsersTab />}
    </div>
  )
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function StatsTab() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminGetStats().then(setStats).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  if (!stats) return null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Users" value={stats.totalUsers} />
        {stats.plans.map(p => (
          <StatCard key={p.id} label={`${p.name} Users`} value={stats.planCounts[p.id] ?? 0} />
        ))}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="text-2xl font-bold tabular-nums display mb-1" style={{ color: '#20d2a0' }}>{value.toLocaleString()}</div>
      <div className="text-xs" style={{ color: 'rgba(240,250,247,0.5)' }}>{label}</div>
    </div>
  )
}

// ── Config (multi-section) ────────────────────────────────────────────────────
type ConfigSection = 'identity' | 'voice' | 'google' | 'flutterwave' | 'security'

function ConfigTab({ section }: { section: ConfigSection }) {
  const [cfg, setCfg] = useState<FullSiteConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [show, setShow] = useState<Record<string, boolean>>({})

  useEffect(() => {
    adminGetConfig().then(setCfg).catch(console.error).finally(() => setLoading(false))
  }, [section])

  const toggleShow = (k: string) => setShow(s => ({ ...s, [k]: !s[k] }))

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!cfg) return
    setSaving(true); setError(''); setSaved(false)
    try {
      const updated = await adminPatchConfig(cfg)
      setCfg(updated); setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
    } finally { setSaving(false) }
  }

  if (loading || !cfg) return <Spinner />

  const secretInputProps = { cfg, setCfg, show, toggleShow }

  return (
    <form onSubmit={e => { void handleSave(e) }} className="space-y-4">

      {section === 'identity' && <>
        <SectionCard title="Site Identity" icon={<Globe size={14} />}>
          <AdminInput label="Site Name" value={cfg.siteName} onChange={v => setCfg({ ...cfg, siteName: v })} />
          <AdminInput label="Tagline" value={cfg.tagline} onChange={v => setCfg({ ...cfg, tagline: v })} />
          <AdminInput label="Logo URL" value={cfg.logoUrl} onChange={v => setCfg({ ...cfg, logoUrl: v })} placeholder="https://..." />
          <AdminInput label="Support Email" value={cfg.supportEmail} type="email" onChange={v => setCfg({ ...cfg, supportEmail: v })} />
          {cfg.logoUrl && <img src={cfg.logoUrl} alt="logo preview" className="h-12 mt-2 rounded-lg object-contain" style={{ background: 'rgba(255,255,255,0.05)', padding: 4 }} />}
        </SectionCard>
        <SectionCard title="Appearance" icon={<Palette size={14} />}>
          <div className="flex items-center gap-3">
            <AdminInput label="Brand Color (hex)" value={cfg.primaryColor} onChange={v => setCfg({ ...cfg, primaryColor: v })} />
            <div className="w-8 h-8 rounded-lg mt-5 flex-shrink-0" style={{ background: cfg.primaryColor, border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
        </SectionCard>
        <SectionCard title="System" icon={<Settings size={14} />}>
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => setCfg({ ...cfg, maintenanceMode: !cfg.maintenanceMode })}
              className="w-10 h-5 rounded-full relative transition-colors flex-shrink-0"
              style={{ background: cfg.maintenanceMode ? '#20d2a0' : 'rgba(255,255,255,0.1)' }}>
              <div className="w-4 h-4 rounded-full absolute top-0.5 transition-transform"
                style={{ background: '#fff', left: cfg.maintenanceMode ? '22px' : '2px' }} />
            </div>
            <span className="text-sm" style={{ color: 'rgba(240,250,247,0.7)' }}>Maintenance Mode (locks non-admin access)</span>
          </label>
        </SectionCard>
      </>}

      {section === 'voice' && <>
        <InfoBanner icon={<Key size={13} />} text="Your OpenRouter API key is stored encrypted in Cloudflare KV — never exposed to users." />
        <SectionCard title="Voice Engine — OpenRouter" icon={<Key size={14} />}>
          <SecretField label="OpenRouter API Key" field="openrouterApiKey" placeholder="sk-or-v1-..." {...secretInputProps} />
          <AdminInput label="Model ID" value={cfg.openrouterModel} onChange={v => setCfg({ ...cfg, openrouterModel: v })} placeholder="fish-audio/s2.1-pro-free:free" />
          <div className="text-xs px-1 pt-1" style={{ color: 'rgba(240,250,247,0.35)' }}>
            Find model IDs at <span style={{ color: '#20d2a0' }}>openrouter.ai/models</span> — search "fish-audio" or "tts"
          </div>
        </SectionCard>
      </>}

      {section === 'google' && <>
        <InfoBanner icon={<Settings size={13} />} text="Set Authorised redirect URI in Google Console to the value shown below." />
        <SectionCard title="Google OAuth" icon={<Settings size={14} />}>
          <AdminInput label="Google Client ID" value={cfg.googleClientId} onChange={v => setCfg({ ...cfg, googleClientId: v })} placeholder="123456789-xxx.apps.googleusercontent.com" />
          <SecretField label="Google Client Secret" field="googleClientSecret" placeholder="GOCSPX-..." {...secretInputProps} />
          <AdminInput label="Redirect URI" value={cfg.googleRedirectUri} onChange={v => setCfg({ ...cfg, googleRedirectUri: v })} placeholder="https://your-worker.workers.dev/api/auth/google/callback" />
          <div className="text-xs rounded-xl px-3 py-2 font-mono" style={{ background: 'rgba(32,210,160,0.06)', color: 'rgba(240,250,247,0.5)', wordBreak: 'break-all' }}>
            {cfg.googleRedirectUri || 'Set Redirect URI above, then paste it in Google Console → Authorised redirect URIs'}
          </div>
        </SectionCard>
      </>}

      {section === 'flutterwave' && <>
        <InfoBanner icon={<Banknote size={13} />} text="Set your Flutterwave webhook URL to: https://your-worker.workers.dev/api/payment/webhook" />
        <SectionCard title="Flutterwave Payments" icon={<Banknote size={14} />}>
          <AdminInput label="Public Key" value={cfg.flutterwavePublicKey} onChange={v => setCfg({ ...cfg, flutterwavePublicKey: v })} placeholder="FLWPUBK-..." />
          <SecretField label="Secret Key" field="flutterwaveSecretKey" placeholder="FLWSECK-..." {...secretInputProps} />
          <SecretField label="Encryption Key" field="flutterwaveEncryptionKey" placeholder="..." {...secretInputProps} />
          <SecretField label="Webhook Hash / Secret" field="flutterwaveWebhookHash" placeholder="Your webhook secret hash" {...secretInputProps} />
          <div className="text-xs px-1" style={{ color: 'rgba(240,250,247,0.35)' }}>
            Find these in Flutterwave Dashboard → Settings → API Keys &amp; Webhooks
          </div>
        </SectionCard>
      </>}

      {section === 'security' && <>
        <InfoBanner icon={<ShieldCheck size={13} />} text="Rotating the JWT secret invalidates ALL active sessions — users will need to log in again." />
        <SectionCard title="JWT Secret" icon={<ShieldCheck size={14} />}>
          <SecretField label="JWT Secret (signs all tokens)" field="jwtSecret" placeholder="Min 32 characters" {...secretInputProps} />
          <AdminInput label="Admin Email (gets admin role on register)" value={cfg.adminEmail} type="email" onChange={v => setCfg({ ...cfg, adminEmail: v })} />
        </SectionCard>
      </>}

      {error && <div className="text-xs rounded-xl px-3 py-2" style={{ background: 'rgba(186,43,76,0.12)', color: '#ff6b8a' }}>{error}</div>}

      <button type="submit" disabled={saving}
        className="w-full rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2"
        style={saving
          ? { background: 'rgba(32,210,160,0.1)', color: 'rgba(32,210,160,0.4)', cursor: 'not-allowed' }
          : { background: 'linear-gradient(135deg, #20d2a0 0%, #0ea882 100%)', color: '#0a121e' }}>
        {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <CheckCircle2 size={15} /> : <Save size={15} />}
        {saved ? 'Saved!' : saving ? 'Saving…' : 'Save'}
      </button>
    </form>
  )
}

interface SecretFieldProps {
  label: string
  field: keyof FullSiteConfig
  placeholder?: string
  cfg: FullSiteConfig
  setCfg: (c: FullSiteConfig) => void
  show: Record<string, boolean>
  toggleShow: (k: string) => void
}

function SecretField({ label, field, placeholder, cfg, setCfg, show, toggleShow }: SecretFieldProps) {
  return (
    <div className="relative">
      <AdminInput
        label={label}
        value={String(cfg[field] ?? '')}
        type={show[field] ? 'text' : 'password'}
        onChange={v => setCfg({ ...cfg, [field]: v })}
        placeholder={placeholder}
      />
      <button type="button" onClick={() => toggleShow(field)}
        className="absolute right-3 bottom-3"
        style={{ color: 'rgba(240,250,247,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        {show[field] ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  )
}

function InfoBanner({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl px-4 py-3" style={{ background: 'rgba(32,210,160,0.07)', border: '1px solid rgba(32,210,160,0.18)' }}>
      <span style={{ color: '#20d2a0', flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <span className="text-xs" style={{ color: 'rgba(240,250,247,0.55)' }}>{text}</span>
    </div>
  )
}

// ── Plans ─────────────────────────────────────────────────────────────────────
function PlansTab() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    adminGetPlans().then(setPlans).catch(console.error).finally(() => setLoading(false))
  }, [])

  const updatePlan = useCallback((id: string, patch: Partial<Plan>) => {
    setPlans(ps => ps.map(p => p.id === id ? { ...p, ...patch } : p))
  }, [])

  async function handleSave() {
    setSaving(true); setSaved(false)
    try {
      await adminPutPlans(plans)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-3">
      {plans.map(plan => (
        <div key={plan.id} className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <button type="button" onClick={() => setExpanded(expanded === plan.id ? null : plan.id)}
            className="w-full flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="text-sm font-bold" style={{ color: '#f0faf7' }}>{plan.name}</div>
              <div className="text-xs tabular-nums px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(32,210,160,0.1)', color: '#20d2a0' }}>
                {plan.tokensPerDay.toLocaleString()} chars/day
              </div>
              <div className="text-xs tabular-nums" style={{ color: 'rgba(240,250,247,0.5)' }}>
                {plan.price === 0 ? 'Free' : `$${plan.price}/mo`}
              </div>
            </div>
            {expanded === plan.id ? <ChevronUp size={14} style={{ color: 'rgba(240,250,247,0.4)' }} /> : <ChevronDown size={14} style={{ color: 'rgba(240,250,247,0.4)' }} />}
          </button>

          {expanded === plan.id && (
            <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="grid grid-cols-2 gap-3 pt-3">
                <AdminInput label="Plan Name" value={plan.name} onChange={v => updatePlan(plan.id, { name: v })} />
                <AdminInput label="Price (USD/mo)" value={String(plan.price)} type="number" onChange={v => updatePlan(plan.id, { price: Number(v) })} />
                <AdminInput label="Tokens / Day (chars)" value={String(plan.tokensPerDay)} type="number" onChange={v => updatePlan(plan.id, { tokensPerDay: Number(v) })} />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs" style={{ color: 'rgba(240,250,247,0.45)' }}>Popular Badge</label>
                  <button type="button" onClick={() => updatePlan(plan.id, { popular: !plan.popular })}
                    className="flex items-center gap-2 text-xs py-2.5 px-3 rounded-xl border"
                    style={plan.popular
                      ? { background: 'rgba(32,210,160,0.12)', borderColor: 'rgba(32,210,160,0.35)', color: '#20d2a0' }
                      : { background: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(240,250,247,0.4)' }}>
                    {plan.popular ? <CheckCircle2 size={12} /> : null} {plan.popular ? 'Popular' : 'Not Popular'}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'rgba(240,250,247,0.45)' }}>Features (one per line)</label>
                <textarea
                  value={plan.features.join('\n')}
                  onChange={e => updatePlan(plan.id, { features: e.target.value.split('\n').filter(Boolean) })}
                  rows={4}
                  className="w-full rounded-xl px-3 py-2.5 text-xs outline-none border resize-none"
                  style={{ background: 'rgba(0,0,0,0.25)', borderColor: 'rgba(255,255,255,0.1)', color: '#f0faf7', fontFamily: 'inherit' }}
                />
              </div>
            </div>
          )}
        </div>
      ))}

      <button type="button" onClick={() => { void handleSave() }} disabled={saving}
        className="w-full rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2"
        style={saving ? { background: 'rgba(32,210,160,0.1)', color: 'rgba(32,210,160,0.4)', cursor: 'not-allowed' }
          : { background: 'linear-gradient(135deg, #20d2a0 0%, #0ea882 100%)', color: '#0a121e' }}>
        {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <CheckCircle2 size={15} /> : <Save size={15} />}
        {saved ? 'Saved!' : 'Save Plans'}
      </button>
    </div>
  )
}

// ── Users ─────────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState<AuthUser[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    adminGetUsers().then(setUsers).catch(console.error).finally(() => setLoading(false))
  }, [])

  async function handlePlanChange(user: AuthUser, plan: string) {
    setUpdating(user.id)
    try {
      const updated = await adminPatchUser(user.id, { plan })
      setUsers(us => us.map(u => u.id === user.id ? updated : u))
    } finally {
      setUpdating(null)
    }
  }

  async function handleRoleChange(user: AuthUser, role: string) {
    setUpdating(user.id)
    try {
      const updated = await adminPatchUser(user.id, { role })
      setUsers(us => us.map(u => u.id === user.id ? updated : u))
    } finally {
      setUpdating(null)
    }
  }

  const PLANS = ['free', 'starter', 'pro', 'enterprise']
  const filtered = users.filter(u => u.email.includes(search) || u.name.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <Spinner />

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Search by name or email…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border"
        style={{ background: 'rgba(0,0,0,0.25)', borderColor: 'rgba(255,255,255,0.1)', color: '#f0faf7', fontFamily: 'inherit' }}
      />
      <div className="text-xs px-1" style={{ color: 'rgba(240,250,247,0.35)' }}>{filtered.length} users</div>

      {filtered.map(user => (
        <div key={user.id} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              {user.avatar
                ? <img src={user.avatar} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                : <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{ background: 'rgba(32,210,160,0.15)', color: '#20d2a0' }}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>}
              <div className="min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: '#f0faf7' }}>{user.name}</div>
                <div className="text-xs truncate" style={{ color: 'rgba(240,250,247,0.4)' }}>{user.email}</div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: user.role === 'admin' ? 'rgba(32,210,160,0.15)' : 'rgba(255,255,255,0.06)', color: user.role === 'admin' ? '#20d2a0' : 'rgba(240,250,247,0.5)' }}>
                {user.role}
              </span>
              <span className="text-xs" style={{ color: 'rgba(240,250,247,0.35)' }}>
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs block mb-1" style={{ color: 'rgba(240,250,247,0.4)' }}>Plan</label>
              <select value={user.plan} onChange={e => { void handlePlanChange(user, e.target.value) }}
                disabled={updating === user.id}
                className="w-full rounded-lg px-2 py-1.5 text-xs outline-none border"
                style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.1)', color: '#f0faf7', fontFamily: 'inherit' }}>
                {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'rgba(240,250,247,0.4)' }}>Role</label>
              <select value={user.role} onChange={e => { void handleRoleChange(user, e.target.value) }}
                disabled={updating === user.id}
                className="w-full rounded-lg px-2 py-1.5 text-xs outline-none border"
                style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.1)', color: '#f0faf7', fontFamily: 'inherit' }}>
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </div>
          </div>
          {updating === user.id && <div className="text-xs mt-2 flex items-center gap-1" style={{ color: '#20d2a0' }}><Loader2 size={10} className="animate-spin" /> Saving…</div>}
        </div>
      ))}
    </div>
  )
}

// ── Shared primitives ─────────────────────────────────────────────────────────
function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-2 mb-4">
        <span style={{ color: '#20d2a0' }}>{icon}</span>
        <span className="text-sm font-semibold display" style={{ color: '#f0faf7' }}>{title}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function AdminInput({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs" style={{ color: 'rgba(240,250,247,0.45)' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none border transition-colors"
        style={{ background: 'rgba(0,0,0,0.25)', borderColor: 'rgba(255,255,255,0.1)', color: '#f0faf7', fontFamily: 'inherit' }}
        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(32,210,160,0.4)' }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
      />
    </div>
  )
}

function Spinner() {
  return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin" style={{ color: '#20d2a0' }} /></div>
}
