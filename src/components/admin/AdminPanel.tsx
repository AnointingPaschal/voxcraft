import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Globe, Key, Chrome, Banknote, ShieldCheck,
  CreditCard, Users, Save, Loader2, CheckCircle2, Eye, EyeOff,
  ChevronDown, ChevronUp, ArrowLeft, AudioWaveform, Menu,
  TrendingUp, UserCheck, Zap, AlertTriangle, Palette, Settings, Trash2, Upload,
  type LucideIcon,
} from 'lucide-react'
import ThemeToggle from '../ThemeToggle'
import {
  adminGetConfig, adminPatchConfig, adminGetPlans, adminPutPlans,
  adminGetUsers, adminPatchUser, adminGetStats,
  type FullSiteConfig, type Plan, type AuthUser, type AdminStats, type VoiceSample, adminGetVoiceSamples, adminPutVoiceSamples,
} from '../../lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'site' | 'voice' | 'samples' | 'google' | 'payments' | 'security' | 'plans' | 'users'

interface NavItem { id: Tab; label: string; icon: LucideIcon, group: string }

const NAV: NavItem[] = [
  { id: 'overview',  label: 'Overview',   icon: LayoutDashboard, group: 'Dashboard' },
  { id: 'users',     label: 'Users',      icon: Users,           group: 'Dashboard' },
  { id: 'site',      label: 'Site',       icon: Globe,           group: 'Settings' },
  { id: 'voice',     label: 'Voice API',  icon: AudioWaveform,   group: 'Settings' },
  { id: 'samples',   label: 'Voice Library', icon: AudioWaveform, group: 'Settings' },
  { id: 'google',    label: 'Google',     icon: Chrome,          group: 'Settings' },
  { id: 'payments',  label: 'Payments',   icon: Banknote,        group: 'Settings' },
  { id: 'plans',     label: 'Plans',      icon: CreditCard,      group: 'Settings' },
  { id: 'security',  label: 'Security',   icon: ShieldCheck,     group: 'Settings' },
]

const GROUPS = ['Dashboard', 'Settings']

// ── Tokens ────────────────────────────────────────────────────────────────────
const T = {
  bg:       '#080f18',
  sidebar:  '#0b1520',
  surface:  'rgba(255,255,255,0.04)',
  border:   'rgba(255,255,255,0.07)',
  accent:   '#20d2a0',
  accentBg: 'rgba(32,210,160,0.1)',
  accentBorder: 'rgba(32,210,160,0.25)',
  text:     '#e8f4ef',
  muted:    'rgba(232,244,239,0.45)',
  dim:      'rgba(232,244,239,0.25)',
  red:      '#ff6b8a',
  redBg:    'rgba(186,43,76,0.12)',
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function AdminPanel({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const current = NAV.find(n => n.id === tab)!

  return (
    <div className="admin-root min-h-dvh flex" style={{ background: 'var(--page, ' + T.bg + ')', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Sidebar */}
      <>
        {/* Mobile overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 lg:hidden"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Sidebar panel */}
        <motion.aside
          initial={false}
          animate={{ x: sidebarOpen ? 0 : '-100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="fixed top-0 left-0 h-full z-40 w-64 flex flex-col lg:hidden"
          style={{ background: T.sidebar, borderRight: `1px solid ${T.border}` }}
        >
          <SidebarContent tab={tab} setTab={t => { setTab(t); setSidebarOpen(false) }} onBack={onBack} />
        </motion.aside>

        {/* Desktop sidebar — always visible */}
        <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 sticky top-0 h-screen"
          style={{ background: T.sidebar, borderRight: `1px solid ${T.border}` }}>
          <SidebarContent tab={tab} setTab={setTab} onBack={onBack} />
        </aside>
      </>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar */}
        <header className="sticky top-0 z-20 flex items-center gap-3 px-5 py-4"
          style={{ background: `${T.bg}ee`, borderBottom: `1px solid ${T.border}`, backdropFilter: 'blur(12px)' }}>
          <button type="button" onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl" style={{ color: T.muted, background: T.surface }}>
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <current.icon size={16} style={{ color: T.accent, flexShrink: 0 }} />
            <h1 className="text-base font-semibold truncate" style={{ color: T.text }}>{current.label}</h1>
          </div>
          <div className="ml-auto hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
            style={{ background: T.accentBg, color: T.accent, border: `1px solid ${T.accentBorder}` }}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            Admin
          </div>
          <ThemeToggle />
        </header>

        {/* Page body */}
        <main className="flex-1 px-5 py-6 overflow-y-auto" style={{ maxWidth: 720 }}>
          <AnimatePresence mode="wait">
            <motion.div key={tab}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}>
              {tab === 'overview'  && <OverviewTab />}
              {tab === 'site'      && <ConfigTab section="identity" />}
              {tab === 'voice'     && <ConfigTab section="voice" />}
              {tab === 'samples'   && <VoiceSamplesTab />}
              {tab === 'google'    && <ConfigTab section="google" />}
              {tab === 'payments'  && <ConfigTab section="flutterwave" />}
              {tab === 'security'  && <ConfigTab section="security" />}
              {tab === 'plans'     && <PlansTab />}
              {tab === 'users'     && <UsersTab />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

// ── Sidebar content ───────────────────────────────────────────────────────────
function SidebarContent({ tab, setTab, onBack }: { tab: Tab; setTab: (t: Tab) => void; onBack: () => void }) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: `1px solid ${T.border}` }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#20d2a0,#0ea882)' }}>
          <AudioWaveform size={16} style={{ color: '#0a121e' }} />
        </div>
        <div>
          <div className="text-sm font-bold" style={{ color: T.text, letterSpacing: '-0.01em' }}>Voicera</div>
          <div className="text-xs" style={{ color: T.dim }}>Admin Console</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {GROUPS.map(group => (
          <div key={group}>
            <div className="px-2 mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: T.dim }}>
              {group}
            </div>
            <div className="space-y-0.5">
              {NAV.filter(n => n.group === group).map(item => {
                const active = tab === item.id
                return (
                  <button key={item.id} type="button" onClick={() => setTab(item.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
                    style={active
                      ? { background: T.accentBg, color: T.accent, border: `1px solid ${T.accentBorder}` }
                      : { color: T.muted, border: '1px solid transparent' }}>
                    <item.icon size={15} />
                    {item.label}
                    {active && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: T.accent }} />}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Back to studio */}
      <div className="px-3 py-4" style={{ borderTop: `1px solid ${T.border}` }}>
        <button type="button" onClick={onBack}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all"
          style={{ color: T.muted, border: `1px solid ${T.border}`, background: T.surface }}>
          <ArrowLeft size={14} />
          Back to Studio
        </button>
      </div>
    </div>
  )
}

// ── Overview ──────────────────────────────────────────────────────────────────
function OverviewTab() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminGetStats().then(setStats).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  if (!stats) return null

  const metricCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: T.accent },
    ...stats.plans.map(p => ({
      label: `${p.name} Plan`,
      value: stats.planCounts[p.id] ?? 0,
      icon: p.id === 'free' ? UserCheck : p.id === 'pro' ? Zap : TrendingUp,
      color: p.id === 'enterprise' ? '#a78bfa' : p.id === 'pro' ? T.accent : T.muted,
    })),
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" subtitle="Platform metrics and health" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {metricCards.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl p-4 space-y-3"
            style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: T.muted }}>{m.label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: `${m.color}18` }}>
                <m.icon size={13} style={{ color: m.color }} />
              </div>
            </div>
            <div className="text-3xl font-bold tabular-nums" style={{ color: m.color, letterSpacing: '-0.03em' }}>
              {m.value.toLocaleString()}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick links */}
      <div className="rounded-2xl p-5 space-y-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <div className="text-sm font-semibold" style={{ color: T.text }}>Quick Setup Checklist</div>
        {[
          { label: 'Configure Voice API key', tab: 'voice' as Tab },
          { label: 'Set up payment plans', tab: 'plans' as Tab },
          { label: 'Enable Google login', tab: 'google' as Tab },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-3 py-2 border-b last:border-0"
            style={{ borderColor: T.border }}>
            <AlertTriangle size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
            <span className="text-sm flex-1" style={{ color: T.muted }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Config ────────────────────────────────────────────────────────────────────
type ConfigSection = 'identity' | 'voice' | 'google' | 'flutterwave' | 'security'

const CONFIG_TITLES: Record<ConfigSection, { title: string; subtitle: string }> = {
  identity:    { title: 'Site Identity', subtitle: 'Brand name, logo, and appearance' },
  voice:       { title: 'Voice API', subtitle: 'OpenRouter API key and model' },
  google:      { title: 'Google OAuth', subtitle: 'Google login credentials' },
  flutterwave: { title: 'Payments', subtitle: 'Flutterwave keys and webhook' },
  security:    { title: 'Security', subtitle: 'JWT secret and admin email' },
}

function ConfigTab({ section }: { section: ConfigSection }) {
  return <ConfigTabInner key={section} section={section} />
}

function ConfigTabInner({ section }: { section: ConfigSection }) {
  const [cfg, setCfg] = useState<FullSiteConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [show, setShow] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let cancelled = false
    adminGetConfig()
      .then(c => { if (!cancelled) setCfg(c) })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

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

  const sp = { cfg, setCfg, show, toggleShow }
  const { title, subtitle } = CONFIG_TITLES[section]

  return (
    <form onSubmit={e => { void handleSave(e) }} className="space-y-5">
      <PageHeader title={title} subtitle={subtitle} />

      {section === 'identity' && <>
        <Card>
          <CardTitle icon={<Globe size={14} />} title="Brand" />
          <Field label="Site Name"><AInput value={cfg.siteName} onChange={v => setCfg({ ...cfg, siteName: v })} /></Field>
          <Field label="Tagline"><AInput value={cfg.tagline} onChange={v => setCfg({ ...cfg, tagline: v })} /></Field>
          <Field label="Logo file"><input type="file" accept="image/*" onChange={e => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 700_000) { setError('Logo must be under 700 KB.'); return } const reader = new FileReader(); reader.onload = () => setCfg({ ...cfg, logoUrl: (reader.result as string) ?? '' }); reader.readAsDataURL(file) }} className="w-full text-xs" /></Field>
          <Field label="Support Email"><AInput value={cfg.supportEmail} type="email" onChange={v => setCfg({ ...cfg, supportEmail: v })} /></Field>
          {cfg.logoUrl && (
            <div className="pt-2">
              <img src={cfg.logoUrl} alt="logo preview" className="h-10 rounded-xl object-contain"
                style={{ background: 'rgba(255,255,255,0.05)', padding: 6 }} />
            </div>
          )}
        </Card>
        <Card>
          <CardTitle icon={<Palette size={14} />} title="Appearance" />
          <Field label="Brand Color">
            <div className="flex items-center gap-3">
              <div className="flex-1"><AInput value={cfg.primaryColor} onChange={v => setCfg({ ...cfg, primaryColor: v })} placeholder="#20d2a0" /></div>
              <div className="w-9 h-9 rounded-xl flex-shrink-0 mt-1" style={{ background: cfg.primaryColor, border: `1px solid ${T.border}` }} />
            </div>
          </Field>
          <PaletteEditor title="Light mode palette" palette={cfg.lightPalette} onChange={lightPalette => setCfg({ ...cfg, lightPalette })} />
          <PaletteEditor title="Dark mode palette" palette={cfg.darkPalette} onChange={darkPalette => setCfg({ ...cfg, darkPalette })} />
          <button type="button" onClick={() => setCfg({ ...cfg, allowThemeToggle: !cfg.allowThemeToggle })} className="mt-3 flex w-full items-center justify-between"><span className="text-sm" style={{ color: T.muted }}>Show theme switch to visitors</span><Toggle on={cfg.allowThemeToggle} /></button>
        </Card>
        <Card>
          <CardTitle icon={<Settings size={14} />} title="System" />
          <button type="button" onClick={() => setCfg({ ...cfg, maintenanceMode: !cfg.maintenanceMode })}
            className="flex items-center justify-between w-full py-1">
            <span className="text-sm" style={{ color: T.muted }}>Maintenance Mode</span>
            <Toggle on={cfg.maintenanceMode} />
          </button>
          <p className="text-xs" style={{ color: T.dim }}>Locks the studio for non-admin users while you make changes.</p>
        </Card>
      </>}

      {section === 'voice' && <>
        <InfoBanner icon={<Key size={13} />} text="Your OpenRouter API key is stored in Cloudflare KV and never exposed to users." />
        <Card>
          <CardTitle icon={<AudioWaveform size={14} />} title="OpenRouter" />
          <Field label="API Key"><SField field="openrouterApiKey" placeholder="sk-or-v1-..." {...sp} /></Field>
          <Field label="Model ID"><AInput value={cfg.openrouterModel} onChange={v => setCfg({ ...cfg, openrouterModel: v })} placeholder="fish-audio/s2.1-pro-free:free" /></Field>
          <p className="text-xs mt-1" style={{ color: T.dim }}>Find model IDs at <span style={{ color: T.accent }}>openrouter.ai/models</span> — search "fish-audio"</p>
        </Card>
      </>}

      {section === 'google' && <>
        <InfoBanner icon={<Chrome size={13} />} text={`Set Authorised redirect URI in Google Console to: https://voicera.pages.dev/api/auth/google/callback`} />
        <Card>
          <CardTitle icon={<Chrome size={14} />} title="OAuth 2.0 Credentials" />
          <Field label="Client ID"><AInput value={cfg.googleClientId} onChange={v => setCfg({ ...cfg, googleClientId: v })} placeholder="123456789-xxx.apps.googleusercontent.com" /></Field>
          <Field label="Client Secret"><SField field="googleClientSecret" placeholder="GOCSPX-..." {...sp} /></Field>
          <Field label="Redirect URI"><AInput value={cfg.googleRedirectUri} onChange={v => setCfg({ ...cfg, googleRedirectUri: v })} placeholder="https://voicera.pages.dev/api/auth/google/callback" /></Field>
          {cfg.googleRedirectUri && (
            <div className="text-xs font-mono px-3 py-2 rounded-xl break-all" style={{ background: 'rgba(32,210,160,0.06)', color: T.muted }}>
              {cfg.googleRedirectUri}
            </div>
          )}
        </Card>
      </>}

      {section === 'flutterwave' && <>
        <InfoBanner icon={<Banknote size={13} />} text="Webhook URL: https://voicera.pages.dev/api/payment/webhook" />
        <Card>
          <CardTitle icon={<Banknote size={14} />} title="Flutterwave Keys" />
          <Field label="Public Key"><AInput value={cfg.flutterwavePublicKey} onChange={v => setCfg({ ...cfg, flutterwavePublicKey: v })} placeholder="FLWPUBK-..." /></Field>
          <Field label="Secret Key"><SField field="flutterwaveSecretKey" placeholder="FLWSECK-..." {...sp} /></Field>
          <Field label="Encryption Key"><SField field="flutterwaveEncryptionKey" placeholder="..." {...sp} /></Field>
          <Field label="Webhook Hash"><SField field="flutterwaveWebhookHash" placeholder="Your webhook secret hash" {...sp} /></Field>
          <p className="text-xs" style={{ color: T.dim }}>Flutterwave Dashboard → Settings → API Keys &amp; Webhooks</p>
        </Card>
      </>}

      {section === 'security' && <>
        <InfoBanner icon={<AlertTriangle size={13} />} text="Rotating the JWT secret invalidates ALL active sessions — all users will need to log in again." variant="warn" />
        <Card>
          <CardTitle icon={<ShieldCheck size={14} />} title="Authentication" />
          <Field label="JWT Secret"><SField field="jwtSecret" placeholder="Min 32 characters" {...sp} /></Field>
          <Field label="Admin Email"><AInput value={cfg.adminEmail} type="email" onChange={v => setCfg({ ...cfg, adminEmail: v })} /></Field>
          <p className="text-xs" style={{ color: T.dim }}>The admin email gets the admin role automatically on register.</p>
        </Card>
      </>}

      {error && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
          style={{ background: T.redBg, color: T.red, border: `1px solid rgba(255,107,138,0.2)` }}>
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      <SaveButton saving={saving} saved={saved} />
    </form>
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

  const update = useCallback((id: string, patch: Partial<Plan>) =>
    setPlans(ps => ps.map(p => p.id === id ? { ...p, ...patch } : p)), [])

  async function handleSave() {
    setSaving(true); setSaved(false)
    try { await adminPutPlans(plans); setSaved(true); setTimeout(() => setSaved(false), 2500) }
    finally { setSaving(false) }
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-5">
      <PageHeader title="Plans" subtitle="Configure token limits, pricing and features" />

      <div className="space-y-3">
        {plans.map((plan, i) => (
          <motion.div key={plan.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: T.surface, border: `1px solid ${plan.popular ? T.accentBorder : T.border}` }}>

            <button type="button" onClick={() => setExpanded(expanded === plan.id ? null : plan.id)}
              className="w-full flex items-center gap-3 px-5 py-4">
              {/* Plan badge */}
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: plan.popular ? T.accentBg : 'rgba(255,255,255,0.05)' }}>
                <CreditCard size={14} style={{ color: plan.popular ? T.accent : T.muted }} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: T.text }}>{plan.name}</span>
                  {plan.popular && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: T.accentBg, color: T.accent, border: `1px solid ${T.accentBorder}` }}>
                      Popular
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs tabular-nums" style={{ color: T.accent }}>
                    {plan.tokensPerDay.toLocaleString()} chars/day
                  </span>
                  <span className="text-xs" style={{ color: T.dim }}>
                    {plan.price === 0 ? 'Free' : `$${plan.price} / ${plan.priceNgn == null ? 'NGN unset' : `₦${plan.priceNgn}`}`}
                  </span>
                </div>
              </div>
              {expanded === plan.id
                ? <ChevronUp size={14} style={{ color: T.dim }} />
                : <ChevronDown size={14} style={{ color: T.dim }} />}
            </button>

            <AnimatePresence>
              {expanded === plan.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden', borderTop: `1px solid ${T.border}` }}>
                  <div className="px-5 py-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Plan Name"><AInput value={plan.name} onChange={v => update(plan.id, { name: v })} /></Field>
                      <Field label="Price (USD / month)"><AInput value={String(plan.price)} type="number" onChange={v => update(plan.id, { price: Number(v) })} /></Field>
                      <Field label="Price (NGN / month)"><AInput value={String(plan.priceNgn ?? '')} type="number" onChange={v => update(plan.id, { priceNgn: v.trim() ? Number(v) : undefined })} /></Field>
                      <Field label="Tokens / Day"><AInput value={String(plan.tokensPerDay)} type="number" onChange={v => update(plan.id, { tokensPerDay: Number(v) })} /></Field>
                      <Field label="Popular Badge">
                        <button type="button" onClick={() => update(plan.id, { popular: !plan.popular })}
                          className="flex items-center gap-2 text-xs py-2.5 px-3 rounded-xl border w-full mt-1"
                          style={plan.popular
                            ? { background: T.accentBg, borderColor: T.accentBorder, color: T.accent }
                            : { background: 'rgba(0,0,0,0.2)', borderColor: T.border, color: T.muted }}>
                          {plan.popular && <CheckCircle2 size={12} />}
                          {plan.popular ? 'Popular' : 'Mark as Popular'}
                        </button>
                      </Field>
                    </div>
                    <Field label="Features (one per line)">
                      <textarea
                        value={plan.features.join('\n')}
                        onChange={e => update(plan.id, { features: e.target.value.split('\n').filter(Boolean) })}
                        rows={4}
                        className="w-full rounded-xl px-3 py-2.5 text-xs outline-none border resize-none"
                        style={{ background: 'rgba(0,0,0,0.25)', borderColor: T.border, color: T.text, fontFamily: 'inherit' }}
                        onFocus={e => { e.currentTarget.style.borderColor = T.accentBorder }}
                        onBlur={e => { e.currentTarget.style.borderColor = T.border }}
                      />
                    </Field>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      <SaveButton saving={saving} saved={saved} onClick={() => { void handleSave() }} />
    </div>
  )
}



function PaletteEditor({ title, palette, onChange }: { title: string; palette: FullSiteConfig['lightPalette']; onChange: (p: FullSiteConfig['lightPalette']) => void }) {
  const labels: [keyof typeof palette, string][] = [['background','Background'],['surface','Cards'],['text','Text'],['muted','Muted text'],['border','Borders'],['accent','Accent']]
  return <div className="mt-5 rounded-xl p-3" style={{ border: `1px solid ${T.border}` }}><div className="mb-3 text-xs font-semibold" style={{ color: T.text }}>{title}</div><div className="grid grid-cols-2 gap-3">{labels.map(([key,label]) => <label key={key} className="grid gap-1 text-[11px]" style={{color:T.muted}}>{label}<div className="flex gap-2"><input type="color" value={palette[key]} onChange={e => onChange({...palette,[key]:e.target.value})} className="h-8 w-9 rounded"/><AInput value={palette[key]} onChange={v => onChange({...palette,[key]:v})}/></div></label>)}</div></div>
}

function VoiceSamplesTab() {
  const [voices, setVoices] = useState<VoiceSample[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [accent, setAccent] = useState('')
  const [description, setDescription] = useState('')
  const [audioDataUrl, setAudioDataUrl] = useState('')
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => { adminGetVoiceSamples().then(setVoices).catch(e => setError(e instanceof Error ? e.message : 'Could not load voices')).finally(() => setLoading(false)) }, [])

  function readAudio(file?: File) {
    if (!file) return
    if (!file.type.startsWith('audio/')) { setError('Choose an audio file.'); return }
    if (file.size > 1_000_000) { setError('Keep sample files under 1 MB.'); return }
    const reader = new FileReader()
    reader.onload = () => { setAudioDataUrl((reader.result as string) ?? ''); setFileName(file.name); setError('') }
    reader.readAsDataURL(file)
  }

  async function save(next: VoiceSample[]) {
    setSaving(true); setError(''); setSaved(false)
    try { await adminPutVoiceSamples(next); setVoices(next); setSaved(true); setTimeout(() => setSaved(false), 2200); return true }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save voices.'); return false }
    finally { setSaving(false) }
  }

  async function addVoice(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !audioDataUrl) { setError('Add a voice name and audio sample first.'); return }
    if (voices.length >= 12) { setError('The library supports up to 12 voices.'); return }
    const voice: VoiceSample = { id: crypto.randomUUID(), name: name.trim(), accent: accent.trim(), description: description.trim(), audioDataUrl, updatedAt: Date.now() }
    if (await save([...voices, voice])) { setName(''); setAccent(''); setDescription(''); setAudioDataUrl(''); setFileName('') }
  }

  if (loading) return <Spinner />
  return <div className="space-y-5">
    <PageHeader title="Voice Library" subtitle="Upload named samples for customers to preview and use in the studio. Up to 12 clips, 1 MB each." />
    <form onSubmit={e => { void addVoice(e) }} className="rounded-2xl p-5 space-y-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <CardTitle icon={<Upload size={14} />} title="Add a sample voice" />
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Voice name"><AInput value={name} onChange={setName} placeholder="e.g. Amara" /></Field>
        <Field label="Accent or style"><AInput value={accent} onChange={setAccent} placeholder="Lagos English, warm" /></Field>
      </div>
      <Field label="Short description (optional)"><AInput value={description} onChange={setDescription} placeholder="Clear, friendly narration" /></Field>
      <label className="flex items-center justify-center gap-2 rounded-xl px-4 py-4 text-sm cursor-pointer" style={{ color: T.accent, border: `1px dashed ${T.accentBorder}`, background: T.accentBg }}>
        <Upload size={15} /> {fileName || 'Choose audio sample'}
        <input className="hidden" type="file" accept="audio/*" onChange={e => readAudio(e.target.files?.[0])} />
      </label>
      {audioDataUrl && <audio className="w-full" controls src={audioDataUrl} />}
      {error && <p className="text-xs" style={{ color: T.red }}>{error}</p>}
      <button disabled={saving} className="rounded-xl px-4 py-2.5 text-sm font-bold" style={{ background: T.accent, color: '#07110e', opacity: saving ? .6 : 1 }}>
        {saving ? 'Saving…' : 'Add voice to library'}
      </button>
      {saved && <span className="ml-3 text-xs" style={{ color: T.accent }}>Saved</span>}
    </form>
    <div className="space-y-3">
      {voices.map(voice => <div key={voice.id} className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <div className="flex items-start gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ color: T.accent, background: T.accentBg }}><AudioWaveform size={18} /></div><div className="min-w-0 flex-1"><div className="font-semibold text-sm" style={{ color: T.text }}>{voice.name}</div><div className="text-xs mt-1" style={{ color: T.muted }}>{[voice.accent, voice.description].filter(Boolean).join(' · ') || 'Sample voice'}</div></div><button type="button" onClick={() => { void save(voices.filter(v => v.id !== voice.id)) }} className="p-2 rounded-lg" style={{ color: T.red }} aria-label={`Delete ${voice.name}`}><Trash2 size={15} /></button></div>
        <audio className="w-full" controls src={voice.audioDataUrl} />
      </div>)}
      {!voices.length && <div className="rounded-2xl p-8 text-center text-sm" style={{ color: T.muted, border: `1px dashed ${T.border}` }}>Your sample voice library is empty.</div>}
    </div>
  </div>
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
    } finally { setUpdating(null) }
  }

  async function handleRoleChange(user: AuthUser, role: string) {
    setUpdating(user.id)
    try {
      const updated = await adminPatchUser(user.id, { role })
      setUsers(us => us.map(u => u.id === user.id ? updated : u))
    } finally { setUpdating(null) }
  }

  const PLANS = ['free', 'starter', 'pro', 'enterprise']
  const filtered = users.filter(u =>
    u.email.includes(search) || u.name.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <Spinner />

  return (
    <div className="space-y-5">
      <PageHeader title="Users" subtitle={`${users.length} registered accounts`} />

      {/* Search */}
      <div className="relative">
        <input type="text" placeholder="Search by name or email…"
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none border"
          style={{ background: T.surface, borderColor: T.border, color: T.text, fontFamily: 'inherit' }}
          onFocus={e => { e.currentTarget.style.borderColor = T.accentBorder }}
          onBlur={e => { e.currentTarget.style.borderColor = T.border }}
        />
        <Users size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: T.dim }} />
      </div>

      <div className="space-y-2">
        {filtered.map((user, i) => (
          <motion.div key={user.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="rounded-2xl p-4"
            style={{ background: T.surface, border: `1px solid ${T.border}` }}>

            <div className="flex items-center gap-3 mb-3">
              {user.avatar
                ? <img src={user.avatar} alt="" className="w-9 h-9 rounded-full flex-shrink-0 object-cover" />
                : <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                    style={{ background: T.accentBg, color: T.accent }}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: T.text }}>{user.name}</div>
                <div className="text-xs truncate" style={{ color: T.dim }}>{user.email}</div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: user.role === 'admin' ? T.accentBg : 'rgba(255,255,255,0.06)', color: user.role === 'admin' ? T.accent : T.muted }}>
                  {user.role}
                </span>
                <span className="text-xs" style={{ color: T.dim }}>
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs block mb-1" style={{ color: T.dim }}>Plan</label>
                <select value={user.plan} onChange={e => { void handlePlanChange(user, e.target.value) }}
                  disabled={updating === user.id}
                  className="w-full rounded-lg px-2 py-1.5 text-xs outline-none border"
                  style={{ background: 'rgba(0,0,0,0.3)', borderColor: T.border, color: T.text, fontFamily: 'inherit' }}>
                  {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: T.dim }}>Role</label>
                <select value={user.role} onChange={e => { void handleRoleChange(user, e.target.value) }}
                  disabled={updating === user.id}
                  className="w-full rounded-lg px-2 py-1.5 text-xs outline-none border"
                  style={{ background: 'rgba(0,0,0,0.3)', borderColor: T.border, color: T.text, fontFamily: 'inherit' }}>
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            </div>

            {updating === user.id && (
              <div className="text-xs mt-2 flex items-center gap-1.5" style={{ color: T.accent }}>
                <Loader2 size={10} className="animate-spin" /> Saving…
              </div>
            )}
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-sm" style={{ color: T.dim }}>No users match your search.</div>
        )}
      </div>
    </div>
  )
}

// ── Shared primitives ─────────────────────────────────────────────────────────
function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-2">
      <h2 className="text-xl font-bold" style={{ color: T.text, letterSpacing: '-0.02em' }}>{title}</h2>
      <p className="text-sm mt-0.5" style={{ color: T.muted }}>{subtitle}</p>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      {children}
    </div>
  )
}

function CardTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-1" style={{ borderBottom: `1px solid ${T.border}` }}>
      <span style={{ color: T.accent }}>{icon}</span>
      <span className="text-sm font-semibold" style={{ color: T.text }}>{title}</span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: T.muted }}>{label}</label>
      {children}
    </div>
  )
}

function AInput({ value, onChange, type = 'text', placeholder }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none border transition-all"
      style={{ background: 'rgba(0,0,0,0.25)', borderColor: T.border, color: T.text, fontFamily: 'inherit' }}
      onFocus={e => { e.currentTarget.style.borderColor = T.accentBorder }}
      onBlur={e => { e.currentTarget.style.borderColor = T.border }}
    />
  )
}

interface SFieldProps {
  field: keyof FullSiteConfig; placeholder?: string
  cfg: FullSiteConfig; setCfg: (c: FullSiteConfig) => void
  show: Record<string, boolean>; toggleShow: (k: string) => void
}

function SField({ field, placeholder, cfg, setCfg, show, toggleShow }: SFieldProps) {
  return (
    <div className="relative">
      <input
        type={show[field] ? 'text' : 'password'}
        value={(cfg[field] as string | number | boolean | null | undefined)?.toString() ?? ''}
        onChange={e => setCfg({ ...cfg, [field]: e.target.value })}
        placeholder={placeholder}
        className="w-full rounded-xl px-3 py-2.5 pr-10 text-sm outline-none border transition-all"
        style={{ background: 'rgba(0,0,0,0.25)', borderColor: T.border, color: T.text, fontFamily: 'inherit' }}
        onFocus={e => { e.currentTarget.style.borderColor = T.accentBorder }}
        onBlur={e => { e.currentTarget.style.borderColor = T.border }}
      />
      <button type="button" onClick={() => toggleShow(field)}
        className="absolute right-3 top-1/2 -translate-y-1/2"
        style={{ color: T.dim, background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
        {show[field] ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  )
}

function Toggle({ on }: { on: boolean }) {
  return (
    <div className="w-11 h-6 rounded-full relative flex-shrink-0 transition-colors"
      style={{ background: on ? T.accent : 'rgba(255,255,255,0.1)' }}>
      <motion.div animate={{ x: on ? 22 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 rounded-full" style={{ background: '#fff' }} />
    </div>
  )
}

function InfoBanner({ icon, text, variant = 'info' }: { icon: React.ReactNode; text: string; variant?: 'info' | 'warn' }) {
  const c = variant === 'warn' ? { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', color: '#f59e0b' }
    : { bg: T.accentBg, border: T.accentBorder, color: T.accent }
  return (
    <div className="flex items-start gap-3 rounded-xl px-4 py-3"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <span style={{ color: c.color, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <span className="text-xs leading-relaxed" style={{ color: T.muted }}>{text}</span>
    </div>
  )
}

function SaveButton({ saving, saved, onClick }: { saving: boolean; saved: boolean; onClick?: () => void }) {
  return (
    <button type={onClick ? 'button' : 'submit'} onClick={onClick} disabled={saving}
      className="w-full rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all"
      style={saving
        ? { background: T.accentBg, color: 'rgba(32,210,160,0.4)', cursor: 'not-allowed' }
        : saved
          ? { background: 'rgba(32,210,160,0.12)', color: T.accent, border: `1px solid ${T.accentBorder}` }
          : { background: 'linear-gradient(135deg,#20d2a0 0%,#0ea882 100%)', color: '#0a121e' }}>
      {saving ? <Loader2 size={15} className="animate-spin" />
        : saved ? <CheckCircle2 size={15} />
          : <Save size={15} />}
      {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}
    </button>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 size={24} className="animate-spin" style={{ color: T.accent }} />
    </div>
  )
}
