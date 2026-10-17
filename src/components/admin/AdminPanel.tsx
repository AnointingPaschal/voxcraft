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

type Tab = 'overview' | 'site' | 'voice' | 'samples' | 'google' | 'payments' | 'security' | 'plans' | 'users'
interface NavItem { id: Tab; label: string; icon: LucideIcon; group: string }

const NAV: NavItem[] = [
  { id: 'overview',  label: 'Overview',      icon: LayoutDashboard, group: 'Dashboard' },
  { id: 'users',     label: 'Users',         icon: Users,           group: 'Dashboard' },
  { id: 'site',      label: 'Site',          icon: Globe,           group: 'Settings' },
  { id: 'voice',     label: 'Voice API',     icon: AudioWaveform,   group: 'Settings' },
  { id: 'samples',   label: 'Voice Library', icon: AudioWaveform,   group: 'Settings' },
  { id: 'google',    label: 'Google',        icon: Chrome,          group: 'Settings' },
  { id: 'payments',  label: 'Payments',      icon: Banknote,        group: 'Settings' },
  { id: 'plans',     label: 'Plans',         icon: CreditCard,      group: 'Settings' },
  { id: 'security',  label: 'Security',      icon: ShieldCheck,     group: 'Settings' },
]
const GROUPS = ['Dashboard', 'Settings']

// Standard colour palette presets the admin can pick from
const BRAND_PRESETS = [
  { label: 'Emerald',  value: '#20d2a0' },
  { label: 'Violet',   value: '#8b5cf6' },
  { label: 'Sky',      value: '#0ea5e9' },
  { label: 'Rose',     value: '#f43f5e' },
  { label: 'Amber',    value: '#f59e0b' },
  { label: 'Orange',   value: '#f97316' },
  { label: 'Indigo',   value: '#6366f1' },
  { label: 'Cyan',     value: '#06b6d4' },
  { label: 'Lime',     value: '#84cc16' },
  { label: 'Pink',     value: '#ec4899' },
]

// ── Root ──────────────────────────────────────────────────────────────────────
export default function AdminPanel({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const current = NAV.find(n => n.id === tab)!

  return (
    <div className="adm-root min-h-dvh flex">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 lg:hidden adm-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: sidebarOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="fixed top-0 left-0 h-full z-40 w-64 flex flex-col lg:hidden adm-sidebar"
      >
        <SidebarContent tab={tab} setTab={t => { setTab(t); setSidebarOpen(false) }} onBack={onBack} />
      </motion.aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 sticky top-0 h-screen adm-sidebar">
        <SidebarContent tab={tab} setTab={setTab} onBack={onBack} />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="adm-topbar sticky top-0 z-20 flex items-center gap-3 px-5 py-4">
          <button type="button" onClick={() => setSidebarOpen(true)}
            className="lg:hidden adm-icon-btn p-2 rounded-xl">
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <current.icon size={16} className="adm-accent flex-shrink-0" />
            <h1 className="text-base font-semibold truncate adm-text">{current.label}</h1>
          </div>
          <div className="ml-auto hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full adm-badge">
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            Admin
          </div>
          <ThemeToggle />
        </header>

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

// ── Sidebar ───────────────────────────────────────────────────────────────────
function SidebarContent({ tab, setTab, onBack }: { tab: Tab; setTab: (t: Tab) => void; onBack: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-5 adm-sidebar-header">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 adm-logo-mark">
          <AudioWaveform size={16} className="adm-logo-icon" />
        </div>
        <div>
          <div className="text-sm font-bold adm-text" style={{ letterSpacing: '-0.01em' }}>Voicera</div>
          <div className="text-xs adm-dim">Admin Console</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {GROUPS.map(group => (
          <div key={group}>
            <div className="px-2 mb-2 text-xs font-semibold uppercase tracking-widest adm-dim">{group}</div>
            <div className="space-y-0.5">
              {NAV.filter(n => n.group === group).map(item => {
                const active = tab === item.id
                return (
                  <button key={item.id} type="button" onClick={() => setTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left adm-nav-item${active ? ' active' : ''}`}>
                    <item.icon size={15} />
                    {item.label}
                    {active && <span className="ml-auto w-1.5 h-1.5 rounded-full adm-nav-dot" />}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 py-4 adm-sidebar-footer">
        <button type="button" onClick={onBack}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all adm-back-btn">
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
    { label: 'Total Users', value: stats.totalUsers, icon: Users, accent: true },
    ...stats.plans.map((p, idx) => ({
      label: `${p.name} Plan`,
      value: stats.planCounts[p.id] ?? 0,
      icon: p.id === 'free' ? UserCheck : p.id === 'pro' ? Zap : TrendingUp,
      accent: idx === 0,
    })),
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" subtitle="Platform metrics and health" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {metricCards.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="adm-card rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs adm-muted">{m.label}</span>
              <div className="adm-metric-icon w-7 h-7 rounded-lg flex items-center justify-center">
                <m.icon size={13} className="adm-accent" />
              </div>
            </div>
            <div className="text-3xl font-bold tabular-nums adm-accent" style={{ letterSpacing: '-0.03em' }}>
              {m.value.toLocaleString()}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="adm-card rounded-2xl p-5 space-y-3">
        <div className="text-sm font-semibold adm-text">Quick Setup Checklist</div>
        {[
          { label: 'Configure Voice API key' },
          { label: 'Set up payment plans' },
          { label: 'Enable Google login' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-3 py-2 adm-divider-row">
            <AlertTriangle size={13} className="text-amber-400 flex-shrink-0" />
            <span className="text-sm flex-1 adm-muted">{item.label}</span>
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

  // Live-apply brand colour immediately when the admin changes it
  useEffect(() => {
    if (!cfg?.primaryColor) return
    const r = document.documentElement
    r.style.setProperty('--accent', cfg.primaryColor)
    r.style.setProperty('--accent-hover', cfg.primaryColor)
    r.style.setProperty('--site-accent', cfg.primaryColor)
    r.style.setProperty('--land-accent', cfg.primaryColor)
    r.style.setProperty('--auth-accent', cfg.primaryColor)
    r.style.setProperty('--plans-accent', cfg.primaryColor)
    r.style.setProperty('--admin-accent', cfg.primaryColor)
  }, [cfg?.primaryColor])

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
          <Field label="Logo file">
            <input type="file" accept="image/*" onChange={e => {
              const file = e.target.files?.[0]
              if (!file) return
              if (file.size > 700_000) { setError('Logo must be under 700 KB.'); return }
              const reader = new FileReader()
              reader.onload = () => setCfg({ ...cfg, logoUrl: (reader.result as string) ?? '' })
              reader.readAsDataURL(file)
            }} className="w-full text-xs adm-muted" />
          </Field>
          <Field label="Support Email"><AInput value={cfg.supportEmail} type="email" onChange={v => setCfg({ ...cfg, supportEmail: v })} /></Field>
          {cfg.logoUrl && (
            <div className="pt-2">
              <img src={cfg.logoUrl} alt="logo preview" className="h-10 rounded-xl object-contain adm-logo-preview" />
            </div>
          )}
        </Card>

        <Card>
          <CardTitle icon={<Palette size={14} />} title="Appearance" />

          {/* Brand colour with swatches */}
          <Field label="Brand Colour">
            <div className="flex items-center gap-3">
              <div className="flex-1"><AInput value={cfg.primaryColor} onChange={v => setCfg({ ...cfg, primaryColor: v })} placeholder="#20d2a0" /></div>
              <input
                type="color"
                value={cfg.primaryColor}
                onChange={e => setCfg({ ...cfg, primaryColor: e.target.value })}
                className="adm-color-swatch"
                title="Pick brand colour"
              />
            </div>
            {/* Preset swatches */}
            <div className="flex flex-wrap gap-2 mt-3">
              {BRAND_PRESETS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  title={p.label}
                  onClick={() => setCfg({ ...cfg, primaryColor: p.value })}
                  className={`adm-swatch-btn${cfg.primaryColor === p.value ? ' ring-2 ring-offset-1' : ''}`}
                  style={{ background: p.value }}
                />
              ))}
            </div>
            <p className="text-xs adm-dim mt-1">Changes take effect site-wide immediately after saving.</p>
          </Field>

          <PaletteEditor title="Light mode palette" palette={cfg.lightPalette} onChange={lightPalette => setCfg({ ...cfg, lightPalette })} />
          <PaletteEditor title="Dark mode palette" palette={cfg.darkPalette} onChange={darkPalette => setCfg({ ...cfg, darkPalette })} />

          <button type="button" onClick={() => setCfg({ ...cfg, allowThemeToggle: !cfg.allowThemeToggle })}
            className="mt-3 flex w-full items-center justify-between">
            <span className="text-sm adm-muted">Show theme switch to visitors</span>
            <Toggle on={cfg.allowThemeToggle} />
          </button>
        </Card>

        <Card>
          <CardTitle icon={<Settings size={14} />} title="System" />
          <button type="button" onClick={() => setCfg({ ...cfg, maintenanceMode: !cfg.maintenanceMode })}
            className="flex items-center justify-between w-full py-1">
            <span className="text-sm adm-muted">Maintenance Mode</span>
            <Toggle on={cfg.maintenanceMode} />
          </button>
          <p className="text-xs adm-dim">Locks the studio for non-admin users while you make changes.</p>
        </Card>
      </>}

      {section === 'voice' && <>
        <InfoBanner icon={<Key size={13} />} text="Your OpenRouter API key is stored in Cloudflare KV and never exposed to users." />
        <Card>
          <CardTitle icon={<AudioWaveform size={14} />} title="OpenRouter" />
          <Field label="API Key"><SField field="openrouterApiKey" placeholder="sk-or-v1-..." {...sp} /></Field>
          <Field label="Model ID"><AInput value={cfg.openrouterModel} onChange={v => setCfg({ ...cfg, openrouterModel: v })} placeholder="fish-audio/s2.1-pro-free:free" /></Field>
          <p className="text-xs mt-1 adm-dim">Find model IDs at <span className="adm-accent">openrouter.ai/models</span> — search &quot;fish-audio&quot;</p>
        </Card>
      </>}

      {section === 'google' && <>
        <InfoBanner icon={<Chrome size={13} />} text="Set Authorised redirect URI in Google Console to: https://voicera.pages.dev/api/auth/google/callback" />
        <Card>
          <CardTitle icon={<Chrome size={14} />} title="OAuth 2.0 Credentials" />
          <Field label="Client ID"><AInput value={cfg.googleClientId} onChange={v => setCfg({ ...cfg, googleClientId: v })} placeholder="123456789-xxx.apps.googleusercontent.com" /></Field>
          <Field label="Client Secret"><SField field="googleClientSecret" placeholder="GOCSPX-..." {...sp} /></Field>
          <Field label="Redirect URI"><AInput value={cfg.googleRedirectUri} onChange={v => setCfg({ ...cfg, googleRedirectUri: v })} placeholder="https://voicera.pages.dev/api/auth/google/callback" /></Field>
          {cfg.googleRedirectUri && (
            <div className="text-xs font-mono px-3 py-2 rounded-xl break-all adm-code-block">
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
          <p className="text-xs adm-dim">Flutterwave Dashboard &rarr; Settings &rarr; API Keys &amp; Webhooks</p>
        </Card>
      </>}

      {section === 'security' && <>
        <InfoBanner icon={<AlertTriangle size={13} />} text="Rotating the JWT secret invalidates ALL active sessions — all users will need to log in again." variant="warn" />
        <Card>
          <CardTitle icon={<ShieldCheck size={14} />} title="Authentication" />
          <Field label="JWT Secret"><SField field="jwtSecret" placeholder="Min 32 characters" {...sp} /></Field>
          <Field label="Admin Email"><AInput value={cfg.adminEmail} type="email" onChange={v => setCfg({ ...cfg, adminEmail: v })} /></Field>
          <p className="text-xs adm-dim">The admin email gets the admin role automatically on register.</p>
        </Card>
      </>}

      {error && (
        <div className="adm-error flex items-center gap-2 rounded-xl px-4 py-3 text-sm">
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
      <PageHeader title="Plans" subtitle="Set USD prices — users see their local currency automatically" />
      <div className="adm-info-box rounded-xl px-4 py-3 text-xs">
        <b className="adm-accent">Set prices in USD only.</b>
        <span className="adm-muted"> The plans page auto-converts to the user&apos;s selected currency using live exchange rates — no need to enter each currency manually.</span>
      </div>

      <div className="space-y-3">
        {plans.map((plan, i) => (
          <motion.div key={plan.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`adm-card rounded-2xl overflow-hidden${plan.popular ? ' adm-card-popular' : ''}`}>

            <button type="button" onClick={() => setExpanded(expanded === plan.id ? null : plan.id)}
              className="w-full flex items-center gap-3 px-5 py-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0${plan.popular ? ' adm-metric-icon' : ' adm-surface'}`}>
                <CreditCard size={14} className={plan.popular ? 'adm-accent' : 'adm-muted'} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold adm-text">{plan.name}</span>
                  {plan.popular && <span className="adm-popular-pill text-xs px-2 py-0.5 rounded-full font-medium">Popular</span>}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs tabular-nums adm-accent">{plan.tokensPerDay.toLocaleString()} chars/day</span>
                  <span className="text-xs adm-dim">{plan.price === 0 ? 'Free' : `$${plan.price}/mo`}</span>
                </div>
              </div>
              {expanded === plan.id
                ? <ChevronUp size={14} className="adm-dim" />
                : <ChevronDown size={14} className="adm-dim" />}
            </button>

            <AnimatePresence>
              {expanded === plan.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                  className="adm-plan-body" style={{ overflow: 'hidden' }}>
                  <div className="px-5 py-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Plan Name"><AInput value={plan.name} onChange={v => update(plan.id, { name: v })} /></Field>
                      <Field label="Price (USD/month)"><AInput value={String(plan.price)} type="number" onChange={v => update(plan.id, { price: Number(v) })} /></Field>
                      <Field label="Tokens / Day"><AInput value={String(plan.tokensPerDay)} type="number" onChange={v => update(plan.id, { tokensPerDay: Number(v) })} /></Field>
                      <Field label="Popular Badge">
                        <button type="button" onClick={() => update(plan.id, { popular: !plan.popular })}
                          className={`flex items-center gap-2 text-xs py-2.5 px-3 rounded-xl w-full mt-1 adm-toggle-btn${plan.popular ? ' active' : ''}`}>
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
                        className="adm-textarea w-full rounded-xl px-3 py-2.5 text-xs outline-none resize-none"
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

// ── Palette editor ────────────────────────────────────────────────────────────
function PaletteEditor({ title, palette, onChange }: {
  title: string
  palette: FullSiteConfig['lightPalette']
  onChange: (p: FullSiteConfig['lightPalette']) => void
}) {
  const labels: [keyof typeof palette, string][] = [
    ['background', 'Background'], ['surface', 'Cards'], ['text', 'Text'],
    ['muted', 'Muted text'], ['border', 'Borders'], ['accent', 'Accent'],
  ]
  return (
    <div className="mt-5 adm-palette-box rounded-xl p-3">
      <div className="mb-3 text-xs font-semibold adm-text">{title}</div>
      <div className="grid grid-cols-2 gap-3">
        {labels.map(([key, label]) => (
          <label key={key} className="grid gap-1 text-[11px] adm-muted">
            {label}
            <div className="flex gap-2">
              <input type="color" value={palette[key]} onChange={e => onChange({ ...palette, [key]: e.target.value })}
                className="adm-color-swatch h-8 w-9 rounded flex-shrink-0" />
              <AInput value={palette[key]} onChange={v => onChange({ ...palette, [key]: v })} />
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}

// ── Voice Samples ─────────────────────────────────────────────────────────────
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

  useEffect(() => {
    adminGetVoiceSamples()
      .then(setVoices)
      .catch(e => setError(e instanceof Error ? e.message : 'Could not load voices'))
      .finally(() => setLoading(false))
  }, [])

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
    try {
      await adminPutVoiceSamples(next); setVoices(next); setSaved(true)
      setTimeout(() => setSaved(false), 2200); return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save voices.'); return false
    } finally { setSaving(false) }
  }

  async function addVoice(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !audioDataUrl) { setError('Add a voice name and audio sample first.'); return }
    if (voices.length >= 12) { setError('The library supports up to 12 voices.'); return }
    const voice: VoiceSample = {
      id: crypto.randomUUID(), name: name.trim(), accent: accent.trim(),
      description: description.trim(), audioDataUrl, updatedAt: Date.now(),
    }
    if (await save([...voices, voice])) {
      setName(''); setAccent(''); setDescription(''); setAudioDataUrl(''); setFileName('')
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-5">
      <PageHeader title="Voice Library" subtitle="Upload named samples — up to 12 clips, 1 MB each." />
      <form onSubmit={e => { void addVoice(e) }} className="adm-card rounded-2xl p-5 space-y-3">
        <CardTitle icon={<Upload size={14} />} title="Add a sample voice" />
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Voice name"><AInput value={name} onChange={setName} placeholder="e.g. Amara" /></Field>
          <Field label="Accent or style"><AInput value={accent} onChange={setAccent} placeholder="Lagos English, warm" /></Field>
        </div>
        <Field label="Short description (optional)">
          <AInput value={description} onChange={setDescription} placeholder="Clear, friendly narration" />
        </Field>
        <label className="adm-upload-zone flex items-center justify-center gap-2 rounded-xl px-4 py-4 text-sm cursor-pointer">
          <Upload size={15} /> {fileName || 'Choose audio sample'}
          <input className="hidden" type="file" accept="audio/*" onChange={e => readAudio(e.target.files?.[0])} />
        </label>
        {audioDataUrl && <audio className="w-full" controls src={audioDataUrl} />}
        {error && <p className="text-xs adm-error-text">{error}</p>}
        <button disabled={saving} className="adm-save-btn rounded-xl px-4 py-2.5 text-sm font-bold" style={{ opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving...' : 'Add voice to library'}
        </button>
        {saved && <span className="ml-3 text-xs adm-accent">Saved</span>}
      </form>
      <div className="space-y-3">
        {voices.map(voice => (
          <div key={voice.id} className="adm-card rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center adm-metric-icon">
                <AudioWaveform size={18} className="adm-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm adm-text">{voice.name}</div>
                <div className="text-xs mt-1 adm-muted">
                  {[voice.accent, voice.description].filter(Boolean).join(' · ') || 'Sample voice'}
                </div>
              </div>
              <button type="button"
                onClick={() => { void save(voices.filter(v => v.id !== voice.id)) }}
                className="p-2 rounded-lg adm-danger-btn" aria-label={`Delete ${voice.name}`}>
                <Trash2 size={15} />
              </button>
            </div>
            <audio className="w-full" controls src={voice.audioDataUrl} />
          </div>
        ))}
        {!voices.length && (
          <div className="rounded-2xl p-8 text-center text-sm adm-empty-state">
            Your sample voice library is empty.
          </div>
        )}
      </div>
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
      <div className="relative">
        <input type="text" placeholder="Search by name or email..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="adm-input w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none" />
        <Users size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 adm-dim" />
      </div>
      <div className="space-y-2">
        {filtered.map((user, i) => (
          <motion.div key={user.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="adm-card rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              {user.avatar
                ? <img src={user.avatar} alt="" className="w-9 h-9 rounded-full flex-shrink-0 object-cover" />
                : <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold adm-metric-icon adm-accent">
                    {user.name.charAt(0).toUpperCase()}
                  </div>}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate adm-text">{user.name}</div>
                <div className="text-xs truncate adm-dim">{user.email}</div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full${user.role === 'admin' ? ' adm-popular-pill' : ' adm-muted-pill'}`}>
                  {user.role}
                </span>
                <span className="text-xs adm-dim">{new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs block mb-1 adm-dim">Plan</label>
                <select value={user.plan} onChange={e => { void handlePlanChange(user, e.target.value) }}
                  disabled={updating === user.id}
                  className="adm-select w-full rounded-lg px-2 py-1.5 text-xs outline-none">
                  {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs block mb-1 adm-dim">Role</label>
                <select value={user.role} onChange={e => { void handleRoleChange(user, e.target.value) }}
                  disabled={updating === user.id}
                  className="adm-select w-full rounded-lg px-2 py-1.5 text-xs outline-none">
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            </div>
            {updating === user.id && (
              <div className="text-xs mt-2 flex items-center gap-1.5 adm-accent">
                <Loader2 size={10} className="animate-spin" /> Saving...
              </div>
            )}
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-sm adm-dim">No users match your search.</div>
        )}
      </div>
    </div>
  )
}

// ── Shared primitives ─────────────────────────────────────────────────────────
function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-2">
      <h2 className="text-xl font-bold adm-text" style={{ letterSpacing: '-0.02em' }}>{title}</h2>
      <p className="text-sm mt-0.5 adm-muted">{subtitle}</p>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="adm-card rounded-2xl p-5 space-y-4">{children}</div>
}

function CardTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-1 adm-card-title-border">
      <span className="adm-accent">{icon}</span>
      <span className="text-sm font-semibold adm-text">{title}</span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium adm-muted">{label}</label>
      {children}
    </div>
  )
}

function AInput({ value, onChange, type = 'text', placeholder }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="adm-input w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
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
        className="adm-input w-full rounded-xl px-3 py-2.5 pr-10 text-sm outline-none transition-all"
      />
      <button type="button" onClick={() => toggleShow(field)}
        className="absolute right-3 top-1/2 -translate-y-1/2 adm-dim" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
        {show[field] ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  )
}

function Toggle({ on }: { on: boolean }) {
  return (
    <div className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-colors${on ? ' adm-toggle-on' : ' adm-toggle-off'}`}>
      <motion.div animate={{ x: on ? 22 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white" />
    </div>
  )
}

function InfoBanner({ icon, text, variant = 'info' }: { icon: React.ReactNode; text: string; variant?: 'info' | 'warn' }) {
  return (
    <div className={`flex items-start gap-3 rounded-xl px-4 py-3${variant === 'warn' ? ' adm-warn-banner' : ' adm-info-box'}`}>
      <span className={`flex-shrink-0 mt-0.5${variant === 'warn' ? ' text-amber-400' : ' adm-accent'}`}>{icon}</span>
      <span className="text-xs leading-relaxed adm-muted">{text}</span>
    </div>
  )
}

function SaveButton({ saving, saved, onClick }: { saving: boolean; saved: boolean; onClick?: () => void }) {
  return (
    <button type={onClick ? 'button' : 'submit'} onClick={onClick} disabled={saving}
      className={`w-full rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all${saving ? ' adm-save-disabled' : saved ? ' adm-save-saved' : ' adm-save-btn'}`}>
      {saving ? <Loader2 size={15} className="animate-spin" />
        : saved ? <CheckCircle2 size={15} />
          : <Save size={15} />}
      {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
    </button>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 size={24} className="animate-spin adm-accent" />
    </div>
  )
}
