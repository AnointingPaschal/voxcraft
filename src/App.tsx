import { useState, useRef, useCallback, useEffect, type JSX } from 'react'
import type React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, Upload, FileText, Wand2, Play, Download, Loader2, MessageSquareText,
  ChevronDown, X, AlertCircle, CheckCircle2, Sparkles, AudioWaveform,
  Globe, Zap, LogOut, Crown, ShieldCheck, User as UserIcon, Menu,
  Phone, MapPin, Twitter, Instagram, Linkedin, MessageCircle, Mail,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from './hooks/useAuth'
import { synthesize, getUsage, getVoiceSamples, getPublicConfig, type UsageData, type VoiceSample, type SiteConfig } from './lib/api'
import AuthPage from './components/auth/AuthPage'
import AdminPanel from './components/admin/AdminPanel'
import PlansPage from './components/dashboard/PlansPage'
import SetupWizard from './components/auth/SetupWizard'
import ThemeToggle from './components/ThemeToggle'

// ── Constants ─────────────────────────────────────────────────────────────────
const ACCENT_OPTIONS = [
  { label: 'Nigerian Pidgin', value: 'Nigerian Pidgin English accent, Naija street style' },
  { label: 'Nigerian (Standard)', value: 'Nigerian Standard English accent, educated and clear' },
  { label: 'Lagos Executive', value: 'Lagos professional English, polished Nigerian accent' },
  { label: 'Ghanaian English', value: 'Ghanaian English accent, West African intonation' },
  { label: 'Kenyan English', value: 'Kenyan English accent, East African intonation' },
  { label: 'South African', value: 'South African English accent' },
  { label: 'Jamaican Patois', value: 'Jamaican Patois accent and cadence' },
  { label: 'British RP', value: 'British Received Pronunciation, crisp and clear' },
  { label: 'American Midwest', value: 'American Midwest neutral accent' },
  { label: 'Middle Eastern / Arabic', value: 'Middle Eastern English accent with Arabic inflection' },
  { label: 'No accent hint', value: '' },
]

const TIMBRE_OPTIONS = ['Male', 'Female', 'Auto / Match'] as const
type Timbre = typeof TIMBRE_OPTIONS[number]

const PERF_STYLES = [
  'Natural & Conversational',
  'Broadcast & Authoritative',
  'Storytelling & Narrative',
  'Energetic & Excited',
  'Calm & Soothing',
  'Documentary',
  'Corporate & Professional',
]

const FORMAT_OPTIONS = [
  { label: 'MP3 (Studio 44.1kHz)', value: 'mp3' },
  { label: 'WAV (Lossless)', value: 'wav' },
]

const VOCAL_CUES = ['[laughing]', '[sigh]', '[excited]', '[whispering]', '[pause]', '[nervous]', '[crying]']

const SCRIPT_TEMPLATES = [
  { label: 'Pidgin Broadcast', text: 'How far my people! [laughing] Make una gather here sharp sharp. Dis new studio voice engine sabi speak better Naija Pidgin well well, everything clean without stress!' },
  { label: 'Lagos Executive', text: 'Good morning, esteemed colleagues. Today, we present an innovative solution that will transform the African technology landscape and deliver measurable value to our stakeholders.' },
  { label: 'Documentary', text: 'Across the vast savannahs of East Africa, ancient traditions meet the pulse of modern innovation. This is a story of resilience, culture, and the unbreakable human spirit.' },
]

const SYNTHESIS_STAGES = [
  { label: 'Phonetics', desc: 'Parsing phonemes and stress patterns…' },
  { label: 'Inflection', desc: 'Applying regional accent and tonal inflection…' },
  { label: 'Synthesis', desc: 'Synthesizing neural voice output…' },
  { label: 'Mastering', desc: 'Mastering audio for studio quality…' },
]

type Page = 'home' | 'studio' | 'auth' | 'plans' | 'admin' | 'contact'

function pathToPage(pathname: string): Page | null {
  if (pathname === '/studio') return 'studio'
  if (pathname === '/auth' || pathname === '/auth/callback') return 'auth'
  if (pathname === '/plans' || pathname === '/pricing') return 'plans'
  if (pathname === '/contact') return 'contact'
  if (pathname === '/admin') return 'admin'
  return null
}

function navigate(path: string) {
  window.history.pushState({}, '', path)
}

// ── Apply siteConfig palette to ALL CSS custom properties across the site ──────
function applyPalette(palette: SiteConfig['lightPalette'] | undefined, primaryColor?: string, darkPalette?: SiteConfig['darkPalette'], theme?: 'light' | 'dark') {
  if (!palette) return
  const r = document.documentElement
  const bg   = palette.background
  const surf = palette.surface
  const txt  = palette.text
  const mut  = palette.muted
  const bdr  = palette.border
  const acc  = primaryColor || palette.accent  // brand colour overrides palette accent

  // Derive a semi-transparent surface for hover/card states
  const map: [string, string][] = [
    // ── canonical site tokens ──
    ['--site-bg',      bg],
    ['--site-surface', surf],
    ['--site-text',    txt],
    ['--site-muted',   mut],
    ['--site-border',  bdr],
    ['--site-accent',  acc],
    // ── generic token aliases used everywhere ──
    ['--bg',           bg],
    ['--page',         bg],
    ['--paper',        surf],
    ['--paper-2',      surf],
    ['--surface',      surf],
    ['--ink',          txt],
    ['--ink-soft',     txt],
    ['--ink-2',        txt],
    ['--muted-ink',    mut],
    ['--subtle',       mut],
    ['--line',         bdr],
    ['--border',       bdr],
    ['--accent',       acc],
    ['--accent-deep',  acc],
    ['--accent-hover', acc],
    // ── landing page tokens ──
    ['--land-bg',      bg],
    ['--land-panel',   surf],
    ['--land-ink',     txt],
    ['--land-muted',   mut],
    ['--land-line',    bdr],
    ['--land-accent',  acc],
    // ── auth page tokens ──
    ['--auth-bg',      bg],
    ['--auth-surface', surf],
    ['--auth-text',    txt],
    ['--auth-muted',   mut],
    ['--auth-border',  bdr],
    ['--auth-accent',  acc],
    // ── plans page tokens ──
    ['--plans-bg',     bg],
    ['--plans-surface',surf],
    ['--plans-text',   txt],
    ['--plans-muted',  mut],
    ['--plans-border', bdr],
    ['--plans-accent', acc],
    // ── admin tokens ──
    ['--admin-bg',     bg],
    ['--admin-surface',surf],
    ['--admin-text',   txt],
    ['--admin-muted',  mut],
    ['--admin-border', bdr],
    ['--admin-accent', acc],
  ]
  map.forEach(([k, v]) => r.style.setProperty(k, v))
  // Cache palette so main.tsx can restore it synchronously on next load
  try {
    if (darkPalette && theme) {
      const stored = JSON.parse(localStorage.getItem('vc_palette') ?? '{}') as Record<string, unknown>
      if (theme === 'light') stored.light = palette
      else stored.dark = palette
      if (darkPalette) stored.dark = darkPalette
      if (primaryColor) stored.brand = primaryColor
      localStorage.setItem('vc_palette', JSON.stringify(stored))
    }
  } catch { /* ignore */ }
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App(): JSX.Element {
  const { user, loading: authLoading, refresh, logout } = useAuth()
  const [page, setPageState] = useState<Page>(() => pathToPage(window.location.pathname) ?? 'home')
  const [setupChecked, setSetupChecked] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [workerDown, setWorkerDown] = useState(false)
  const [kvMissing, setKvMissing] = useState(false)
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('vc_theme') as 'light' | 'dark') || 'light')

  // Sync theme attribute + fire event
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('vc_theme', theme)
    window.dispatchEvent(new Event('vc-theme-changed'))
    const syncTheme = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
    window.addEventListener('vc-theme-changed', syncTheme)
    return () => window.removeEventListener('vc-theme-changed', syncTheme)
  }, [theme])

  // Apply admin-configured palette and enforce allowThemeToggle whenever config or theme changes
  useEffect(() => {
    if (!siteConfig) return
    // If theme toggle is disabled and current theme is dark, switch to light via the same
    // mechanism the ThemeToggle uses so the vc-theme-changed event fires correctly.
    if (!siteConfig.allowThemeToggle && theme !== 'light') {
      document.documentElement.dataset.theme = 'light'
      localStorage.setItem('vc_theme', 'light')
      window.dispatchEvent(new Event('vc-theme-changed'))
      return
    }
    const palette = theme === 'dark' ? siteConfig.darkPalette : siteConfig.lightPalette
    applyPalette(palette, siteConfig.primaryColor, siteConfig.darkPalette, theme)
    // Always cache both palettes so next load restores correctly
    try {
      localStorage.setItem('vc_palette', JSON.stringify({
        light: siteConfig.lightPalette,
        dark: siteConfig.darkPalette,
        brand: siteConfig.primaryColor ?? palette.accent,
      }))
    } catch { /* ignore */ }
  }, [siteConfig, theme])

  const setPage = (p: Page) => {
    setPageState(p)
    navigate(p === 'home' ? '/' : `/${p}`)
  }

  useEffect(() => {
    const onPop = () => setPageState(pathToPage(window.location.pathname) ?? 'home')
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => { getPublicConfig().then(setSiteConfig).catch(() => undefined) }, [])

  // Check setup status once on mount
  useEffect(() => {
    fetch('/api/setup/status')
      .then(async r => {
        if (r.status === 500 || r.status === 503) { setKvMissing(true); return }
        if (!r.ok) { setWorkerDown(true); return }
        const s = await r.json() as { setupComplete: boolean }
        if (!s.setupComplete) setNeedsSetup(true)
      })
      .catch(() => setWorkerDown(true))
      .finally(() => setSetupChecked(true))
  }, [])

  // Handle Google OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const cbToken = params.get('token')
    if (window.location.pathname === '/auth/callback' && cbToken) {
      localStorage.setItem('vc_token', cbToken)
      window.history.replaceState({}, '', '/studio')
      window.location.reload()
    }
  }, [])

  if (!setupChecked || authLoading) return (
    <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--page, #0a121e)' }}>
      <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent, #20d2a0)' }} />
    </div>
  )

  if (kvMissing || workerDown) return (
    <div className="min-h-dvh flex items-center justify-center px-6" style={{ background: 'var(--page, #0a121e)' }}>
      <div className="max-w-md w-full rounded-2xl p-8 text-center space-y-5" style={{ background: 'var(--surface, rgba(255,255,255,0.04))', border: '1px solid var(--border, rgba(255,255,255,0.08))' }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: 'rgba(32,210,160,0.12)' }}>
          <AudioWaveform size={26} style={{ color: 'var(--accent, #20d2a0)' }} />
        </div>
        {kvMissing ? (<>
          <h2 className="text-xl font-bold" style={{ color: 'var(--ink, #f0faf7)' }}>KV Database Not Bound</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-ink, rgba(240,250,247,0.55))' }}>
            The backend is running but the KV database is not attached. Do this in your Cloudflare dashboard:
          </p>
          <div className="text-xs rounded-xl px-4 py-4 text-left space-y-2" style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--muted-ink, rgba(240,250,247,0.7))' }}>
            <div className="flex gap-2"><span style={{ color: 'var(--accent, #20d2a0)' }}>1.</span><span>Create a KV namespace named <strong>voicera-kv</strong></span></div>
            <div className="flex gap-2"><span style={{ color: 'var(--accent, #20d2a0)' }}>2.</span><span>voicera Pages → Settings → Functions → KV namespace bindings → Add</span></div>
            <div className="flex gap-2"><span style={{ color: 'var(--accent, #20d2a0)' }}>3.</span><span>Variable name: <code style={{ color: 'var(--accent, #20d2a0)' }}>KV</code>, select voicera-kv → Save</span></div>
            <div className="flex gap-2"><span style={{ color: 'var(--accent, #20d2a0)' }}>4.</span><span>Deployments tab → Retry deployment</span></div>
          </div>
        </>) : (<>
          <h2 className="text-xl font-bold" style={{ color: 'var(--ink, #f0faf7)' }}>Cannot Reach Backend</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-ink, rgba(240,250,247,0.55))' }}>
            The API functions are not responding. Check that your Pages deployment completed successfully and the Functions tab shows compiled functions.
          </p>
        </>)}
        <button onClick={() => window.location.reload()} className="w-full py-3 rounded-xl text-sm font-semibold" style={{ background: 'linear-gradient(135deg,var(--site-accent,#20d2a0),var(--site-accent,#17a882))', color: 'var(--site-bg,#fff)' }}>
          Retry
        </button>
      </div>
    </div>
  )

  if (needsSetup) return (
    <SetupWizard onComplete={() => { setNeedsSetup(false); void refresh() }} />
  )

  if (page === 'admin') {
    if (!user) { setPage('auth'); return <></> }
    if (user.role !== 'admin') { setPage('home'); return <></> }
    return <PageShell><AdminPanel onBack={() => setPage('studio')} /></PageShell>
  }

  if (page === 'auth') return <AuthPage onSuccess={() => setPage('studio')} allowThemeToggle={siteConfig?.allowThemeToggle ?? true} />
  if (page === 'plans') return (
    <PageShell>
      <PlansPage onBack={() => setPage('studio')} allowThemeToggle={siteConfig?.allowThemeToggle ?? true} siteConfig={siteConfig} onNavigate={setPage} user={user} onSignIn={() => setPage('auth')} onStudio={() => setPage('studio')} />
    </PageShell>
  )
  if (page === 'studio') return (
    <PageShell>
      <StudioHeader allowThemeToggle={siteConfig?.allowThemeToggle ?? true} user={user} onLogout={() => { logout(); setPage('home') }} onPlans={() => setPage('plans')} onAdmin={() => setPage('admin')} />
      <StudioBody user={user} onSignIn={() => setPage('auth')} onPlans={() => setPage('plans')} />
    </PageShell>
  )
  return <HomePage allowThemeToggle={siteConfig?.allowThemeToggle ?? true} siteConfig={siteConfig} page={page} onNavigate={setPage} onEnter={() => setPage(user ? 'studio' : 'auth')} onSignIn={() => setPage('auth')} user={user} onStudio={() => setPage('studio')} />
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh page-shell">
      {children}
    </div>
  )
}

// ── Home Page ─────────────────────────────────────────────────────────────────
function HomePage({ onEnter, onSignIn, user, onStudio, allowThemeToggle = true, siteConfig, page, onNavigate }: {
  allowThemeToggle?: boolean
  siteConfig: SiteConfig | null
  page: Page
  onNavigate: (p: Page) => void
  onEnter: () => void
  onSignIn: () => void
  user: ReturnType<typeof useAuth>['user']
  onStudio: () => void
}) {
  const [samples, setSamples] = useState<VoiceSample[]>([])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => { getVoiceSamples().then(setSamples).catch(() => setSamples([])) }, [])

  // Close mobile menu on outside click
  useEffect(() => {
    if (!mobileMenuOpen) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.mobile-menu-root')) setMobileMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [mobileMenuOpen])

  const features = [
    { icon: Globe, title: 'Made for African voices', desc: 'Choose the cadence, accent, and character that fits your story.' },
    { icon: Mic, title: 'Bring a voice to life', desc: 'Preview curated voices or upload a short reference sample.' },
    { icon: Wand2, title: 'Direct every moment', desc: 'Add pauses, whispers, laughter, and feeling to your script.' },
    { icon: Zap, title: 'Ready for production', desc: 'Download crisp MP3 or lossless WAV right from your workspace.' },
  ]

  return (
    <div className="landing min-h-dvh">
      {/* ── Navigation ── */}
      <nav className="landing-nav mobile-menu-root">
        <a href="/" className="brand-lockup" aria-label="VoxCraft home">
          {siteConfig?.logoUrl
            ? <img className="uploaded-brand-logo" src={siteConfig.logoUrl} alt="" />
            : <span className="brand-mark"><AudioWaveform size={18} /></span>}
          <span>{siteConfig?.siteName || 'voxcraft'}</span>
          <span className="brand-dot">STUDIO</span>
        </a>

        {/* Desktop links */}
        <div className="landing-links">
          <a href="#studio">Studio</a>
          <a href="#voice-samples">Voices</a>
          <a href="/contact" onClick={e => { e.preventDefault(); onNavigate('contact') }}>Contact</a>
          <a href="/plans" onClick={e => { e.preventDefault(); onNavigate('plans') }}>Pricing</a>
        </div>

        {/* Desktop actions */}
        <div className="landing-actions">
          <ThemeToggle enabled={allowThemeToggle} />
          {user
            ? <button className="button button-primary" onClick={onStudio}>Open studio <ArrowRightIcon /></button>
            : <>
                <button className="button button-quiet" onClick={onSignIn}>Sign in</button>
                <button className="button button-primary" onClick={onEnter}>Get Started <ArrowRightIcon /></button>
              </>
          }
        </div>

        {/* Mobile hamburger */}
        <div className="mobile-nav-actions">
          <ThemeToggle enabled={allowThemeToggle} />
          <button
            type="button"
            className="hamburger-btn"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileMenuOpen(v => !v)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              className="mobile-menu"
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              transition={{ duration: 0.2 }}
            >
              <a href="#studio" onClick={() => setMobileMenuOpen(false)}>Studio</a>
              <a href="#voice-samples" onClick={() => setMobileMenuOpen(false)}>Voices</a>
              <a href="/contact" onClick={e => { e.preventDefault(); setMobileMenuOpen(false); onNavigate('contact') }}>Contact</a>
              <a href="/plans" onClick={e => { e.preventDefault(); setMobileMenuOpen(false); onNavigate('plans') }}>Pricing</a>
              <div className="mobile-menu-divider" />
              {user
                ? <button className="button button-primary mobile-menu-cta" onClick={() => { setMobileMenuOpen(false); onStudio() }}>Open studio <ArrowRightIcon /></button>
                : <>
                    <button className="button button-quiet mobile-menu-cta" onClick={() => { setMobileMenuOpen(false); onSignIn() }}>Sign in</button>
                    <button className="button button-primary mobile-menu-cta" onClick={() => { setMobileMenuOpen(false); onEnter() }}>Get Started <ArrowRightIcon /></button>
                  </>
              }
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main>
        {page === 'contact' ? (
          <ContactPage siteConfig={siteConfig} onNavigate={onNavigate} />
        ) : <>
          {/* ── Hero ── */}
          <section className="hero-section" id="studio">
            <motion.div
              className="hero-copy"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="eyebrow"><span className="live-dot" /> VOICE, WITH A POINT OF VIEW</div>
              <h1>Give your words<br />a <em>voice of their own.</em></h1>
              <p className="hero-lede">A thoughtful voice studio for stories, conversations, and ideas shaped by the sounds of Africa and beyond.</p>
              <div className="hero-ctas">
                <button className="button button-primary button-large" onClick={onEnter}>
                  Get Started Free <ArrowRightIcon />
                </button>
                <a className="text-link" href="#voices">Explore the voices <span>↓</span></a>
              </div>
              <div className="hero-proof">
                <div className="avatar-stack"><span>AM</span><span>KO</span><span>ZE</span></div>
                <span>Made for the way we speak.</span>
                <span className="proof-sep">·</span>
                <span>Built for the world.</span>
              </div>
            </motion.div>

            <motion.div
              className="hero-art"
              aria-label="VoxCraft audio studio preview"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="art-glow" />
              <div className="studio-preview">
                <div className="preview-top">
                  <span className="preview-window-dots"><i/><i/><i/></span>
                  <span>VOXCRAFT · SESSION 01</span>
                  <span className="preview-status"><i/> READY</span>
                </div>
                <div className="preview-content">
                  <div className="preview-label">YOUR NEXT STORY, IN SOUND</div>
                  <div className="preview-title">The morning<br />comes alive.</div>
                  <div className="waveform">
                    {Array.from({ length: 46 }, (_, i) => (
                      <i key={i} style={{ height: `${18 + ((i * 37 + 13) % 62)}%` }} />
                    ))}
                  </div>
                  <div className="preview-player">
                    <button className="play-orb" onClick={onEnter} aria-label="Open studio">
                      <Play size={15} fill="currentColor" />
                    </button>
                    <div className="preview-track">
                      <b>Amara · Lagos Executive</b>
                      <span>Warm, clear · 0:18</span>
                    </div>
                    <span className="track-time">00:18</span>
                  </div>
                </div>
                <div className="preview-footer">
                  <span><AudioWaveform size={13}/> FISH AUDIO ENGINE</span>
                  <span>MP3 · 44.1 KHZ</span>
                </div>
              </div>
              <div className="floating-note">
                <span className="note-icon"><Sparkles size={14}/></span>
                <span><b>Every accent, intentional.</b><small>Find the right sound.</small></span>
              </div>
            </motion.div>
          </section>

          {/* ── Ticker strip ── */}
          <section className="signal-strip">
            <span>VOICE FOR</span>
            <b>Films &amp; stories</b><i/>
            <b>Learning</b><i/>
            <b>Creators</b><i/>
            <b>Brands</b><i/>
            <b>Everyday ideas</b>
          </section>

          {/* ── Voice samples ── */}
          {samples.length > 0 && (
            <section className="samples-section" id="voice-samples">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">MEET THE VOICES</div>
                  <h2>Hear the voice<br/><em>before the story.</em></h2>
                </div>
                <p>Preview voices from the VoxCraft library and take your favorite into the studio.</p>
              </div>
              <div className="sample-grid">
                {samples.map(sample => (
                  <motion.article
                    className="sample-card"
                    key={sample.id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45 }}
                  >
                    <div className="sample-card-head">
                      <span className="sample-avatar">{sample.name.slice(0,1).toUpperCase()}</span>
                      <div>
                        <b>{sample.name}</b>
                        <small>{sample.accent}</small>
                      </div>
                      <span className="sample-wave">〰</span>
                    </div>
                    <p>{sample.description || 'A voice ready for your next idea.'}</p>
                    <audio controls preload="none" src={sample.audioDataUrl}/>
                    <button className="sample-use" onClick={onStudio}>Use this voice <ArrowRightIcon/></button>
                  </motion.article>
                ))}
              </div>
            </section>
          )}

          {/* ── Features ── */}
          <section className="features-section" id="voices">
            <div className="section-heading">
              <div>
                <div className="eyebrow">A STUDIO THAT GETS IT</div>
                <h2>More than words.<br /><em>All the feeling between them.</em></h2>
              </div>
              <p>From the first line to the final listen, shape the sound until it feels like yours.</p>
            </div>
            <div className="feature-grid">
              {features.map((f, i) => (
                <motion.article
                  key={f.title}
                  className="feature-card"
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                >
                  <span className="feature-number">0{i + 1}</span>
                  <span className="feature-icon"><f.icon size={18}/></span>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </motion.article>
              ))}
            </div>
          </section>

          {/* ── Workflow ── */}
          <section className="workflow-section" id="workflow">
            <div className="workflow-copy">
              <div className="eyebrow">FROM PAGE TO PLAY</div>
              <h2>Your next idea<br />sounds <em>closer.</em></h2>
              <p>Choose a voice, bring your script, and direct the delivery. VoxCraft takes care of the rest, with controls that stay out of your way.</p>
              <button className="button button-primary" onClick={onEnter}>Start creating <ArrowRightIcon /></button>
            </div>
            <div className="workflow-steps">
              <div><span>01</span><b>Choose your voice</b><small>Preview samples and find a natural fit.</small></div>
              <div><span>02</span><b>Shape the delivery</b><small>Set the pace, mood, and vocal cues.</small></div>
              <div><span>03</span><b>Make it yours</b><small>Synthesize and take your audio anywhere.</small></div>
            </div>
          </section>

          {/* ── CTA band ── */}
          <section className="closing-cta">
            <div>
              <div className="eyebrow">SOUND LIKE YOURSELF</div>
              <h2>There's a voice for that.</h2>
              <p>Make something people want to listen to.</p>
            </div>
            <div className="cta-band-actions">
              <button className="button button-primary button-large" onClick={onEnter}>
                Get Started Free <ArrowRightIcon />
              </button>
              <button className="button button-dark" onClick={onEnter}>
                Step into the studio <ArrowRightIcon />
              </button>
            </div>
          </section>
        </>}
      </main>

      <footer className="landing-footer">
        <a href="/" className="brand-lockup">
          {siteConfig?.logoUrl
            ? <img className="uploaded-brand-logo" src={siteConfig.logoUrl} alt="" />
            : <span className="brand-mark"><AudioWaveform size={16}/></span>}
          <span>{siteConfig?.siteName || 'voxcraft'}</span>
        </a>
        <span>Voice, with a point of view.</span>
        <div className="footer-links">
          <button onClick={() => onNavigate('contact')}>Contact</button>
          <button onClick={() => onNavigate('plans')}>Pricing</button>
          <button onClick={onSignIn}>Your workspace <ArrowRightIcon /></button>
        </div>
      </footer>
    </div>
  )
}

function ArrowRightIcon() { return <span aria-hidden="true">↗</span> }

// ── Contact Page ──────────────────────────────────────────────────────────────
function ContactPage({ siteConfig, onNavigate }: { siteConfig: SiteConfig | null; onNavigate: (p: Page) => void }) {
  const email = siteConfig?.supportEmail || 'support@voxcraft.ai'
  const phone = siteConfig?.contactPhone
  const address = siteConfig?.contactAddress
  const city = siteConfig?.contactCity
  const twitter = siteConfig?.contactTwitter
  const instagram = siteConfig?.contactInstagram
  const linkedin = siteConfig?.contactLinkedin
  const whatsapp = siteConfig?.contactWhatsapp

  const socialLinks = [
    twitter && { icon: Twitter, label: 'Twitter / X', href: twitter.startsWith('http') ? twitter : `https://twitter.com/${twitter}` },
    instagram && { icon: Instagram, label: 'Instagram', href: instagram.startsWith('http') ? instagram : `https://instagram.com/${instagram}` },
    linkedin && { icon: Linkedin, label: 'LinkedIn', href: linkedin.startsWith('http') ? linkedin : `https://linkedin.com/company/${linkedin}` },
    whatsapp && { icon: MessageCircle, label: 'WhatsApp', href: `https://wa.me/${whatsapp.replace(/\D/g, '')}` },
  ].filter(Boolean) as { icon: React.ComponentType<{ size?: number }>; label: string; href: string }[]

  return (
    <section className="contact-page">
      <div className="contact-hero">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22,1,0.36,1] }}>
          <div className="eyebrow"><span className="live-dot" /> GET IN TOUCH</div>
          <h1>{"Let's make something"}<br /><em>worth hearing.</em></h1>
          <p className="hero-lede">Questions about plans, your workspace, or the voice library? We would love to hear from you.</p>
        </motion.div>
      </div>

      <div className="contact-grid">
        {/* Contact cards */}
        <motion.div className="contact-cards" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15, duration: 0.55 }}>
          {email && (
            <a href={`mailto:${email}`} className="contact-card">
              <span className="contact-card-icon"><Mail size={20} /></span>
              <div>
                <div className="contact-card-label">Email us</div>
                <div className="contact-card-value">{email}</div>
              </div>
            </a>
          )}
          {phone && (
            <a href={`tel:${phone}`} className="contact-card">
              <span className="contact-card-icon"><Phone size={20} /></span>
              <div>
                <div className="contact-card-label">Phone</div>
                <div className="contact-card-value">{phone}</div>
              </div>
            </a>
          )}
          {(address || city) && (
            <div className="contact-card">
              <span className="contact-card-icon"><MapPin size={20} /></span>
              <div>
                <div className="contact-card-label">Location</div>
                <div className="contact-card-value">{[address, city].filter(Boolean).join(', ')}</div>
              </div>
            </div>
          )}
          {socialLinks.length > 0 && (
            <div className="contact-social">
              <div className="contact-card-label" style={{ marginBottom: 10 }}>Follow us</div>
              <div className="contact-social-links">
                {socialLinks.map(s => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="contact-social-btn" aria-label={s.label}>
                    <s.icon size={18} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Quick links */}
        <motion.div className="contact-quick" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25, duration: 0.55 }}>
          <div className="contact-quick-title">Quick links</div>
          <a href={`mailto:${email}`} className="contact-quick-link">
            <span>Send an email</span><ArrowRightIcon />
          </a>
          <button className="contact-quick-link" onClick={() => onNavigate('plans')}>
            <span>View pricing plans</span><ArrowRightIcon />
          </button>
          <button className="contact-quick-link" onClick={() => onNavigate('studio')}>
            <span>Open the studio</span><ArrowRightIcon />
          </button>
          <div className="contact-quick-note">
            Response time is typically within one business day.
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ── Studio Header ─────────────────────────────────────────────────────────────
function StudioHeader({ user, onLogout, onPlans, onAdmin, allowThemeToggle = true }: {
  allowThemeToggle?: boolean
  user: ReturnType<typeof useAuth>['user']
  onLogout: () => void
  onPlans: () => void
  onAdmin: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <header className="studio-topbar">
      <div className="flex items-center gap-2.5">
        <div className="studio-logo-mark">
          <AudioWaveform size={16} strokeWidth={2.5} />
        </div>
        <span className="display font-bold text-sm studio-topbar-brand">VoxCraft</span>
        <span className="studio-badge">Studio Pro</span>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle enabled={allowThemeToggle} />
        <div className="hidden sm:flex items-center gap-1.5 text-xs studio-engine-status">
          <div className="studio-engine-dot" />
          Acoustic Engine Ready
        </div>

        {user ? (
          <div className="relative">
            <button type="button" onClick={() => setMenuOpen(v => !v)}
              className="studio-user-btn flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs">
              {user.avatar
                ? <img src={user.avatar} alt="" className="w-5 h-5 rounded-full" />
                : <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold studio-user-avatar">
                    {user.name.charAt(0)}
                  </div>}
              {user.name.split(' ')[0]}
              <ChevronDown size={11} />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-48 rounded-2xl overflow-hidden py-1 z-50 studio-dropdown">
                  <div className="px-3 py-2 studio-dropdown-header">
                    <div className="text-xs font-medium truncate studio-dropdown-name">{user.name}</div>
                    <div className="text-xs truncate mt-0.5 studio-dropdown-email">{user.email}</div>
                    <div className="text-xs mt-1 capitalize inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md studio-plan-badge">
                      <Crown size={9} /> {user.plan}
                    </div>
                  </div>
                  <MenuItem icon={<Crown size={13} />} label="Upgrade Plan" onClick={() => { setMenuOpen(false); onPlans() }} />
                  {user.role === 'admin' && (
                    <MenuItem icon={<ShieldCheck size={13} />} label="Admin Panel" onClick={() => { setMenuOpen(false); onAdmin() }} />
                  )}
                  <MenuItem icon={<LogOut size={13} />} label="Sign Out" onClick={() => { setMenuOpen(false); onLogout() }} danger />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : null}
      </div>
    </header>
  )
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-white/5 studio-menu-item"
      data-danger={danger ? 'true' : undefined}>
      {icon}
      {label}
    </button>
  )
}

// ── Studio Body ───────────────────────────────────────────────────────────────
function StudioBody({ user, onSignIn, onPlans }: {
  user: ReturnType<typeof useAuth>['user']
  onSignIn: () => void
  onPlans: () => void
}) {
  const [accent, setAccent] = useState(ACCENT_OPTIONS[0])
  const [voices, setVoices] = useState<VoiceSample[]>([])
  const [selectedVoiceId, setSelectedVoiceId] = useState('')
  const [scriptMode, setScriptMode] = useState<'narration' | 'conversation'>('narration')
  const [timbre, setTimbre] = useState<Timbre>('Male')
  const [perfStyle, setPerfStyle] = useState(PERF_STYLES[0])
  const [pacing, setPacing] = useState(1.0)
  const [format, setFormat] = useState('mp3')
  const [text, setText] = useState('')
  const [referenceFile, setReferenceFile] = useState<File | null>(null)
  const [referenceDataUrl, setReferenceDataUrl] = useState<string | null>(null)
  const [referenceTranscript, setReferenceTranscript] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [stageIndex, setStageIndex] = useState(0)
  const [stageProgress, setStageProgress] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [usage, setUsage] = useState<UsageData | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    getVoiceSamples().then(setVoices).catch(() => null)
  }, [])

  useEffect(() => {
    if (!user) return
    getUsage().then(setUsage).catch(() => null)
  }, [user])

  const startProgressTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      setElapsedMs(elapsed)
      const totalFake = 8000
      const pct = Math.min((elapsed / totalFake) * 100, 95)
      const stage = Math.min(Math.floor((pct / 100) * SYNTHESIS_STAGES.length), SYNTHESIS_STAGES.length - 1)
      const stagePct = Math.min(((pct % (100 / SYNTHESIS_STAGES.length)) / (100 / SYNTHESIS_STAGES.length)) * 100, 99)
      setStageIndex(stage)
      setStageProgress(Math.round(stagePct))
    }, 100)
  }, [])

  const stopProgressTimer = useCallback((success: boolean) => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (success) { setStageIndex(SYNTHESIS_STAGES.length - 1); setStageProgress(100) }
  }, [])

  const insertCue = useCallback((cue: string) => {
    setText(prev => prev + cue + ' ')
  }, [])

  const loadTemplate = useCallback((t: typeof SCRIPT_TEMPLATES[number]) => {
    setAccent(ACCENT_OPTIONS.find(a => a.label === t.label) ?? ACCENT_OPTIONS[0])
    setText(t.text)
  }, [])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      const chunks: BlobPart[] = []
      mr.ondataavailable = e => chunks.push(e.data)
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        const file = new File([blob], 'recording.webm', { type: 'audio/webm' })
        setSelectedVoiceId('')
        setReferenceFile(file)
        const reader = new FileReader()
        reader.onload = () => setReferenceDataUrl(reader.result as string)
        reader.readAsDataURL(blob)
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start()
      setMediaRecorder(mr)
      setIsRecording(true)
    } catch {
      toast.error('Microphone access denied.')
    }
  }

  function stopRecording() {
    mediaRecorder?.stop()
    setIsRecording(false)
    setMediaRecorder(null)
  }

  function handleFileUpload(file: File) {
    if (file.size > 15 * 1024 * 1024) { toast.error('File must be under 15MB.'); return }
    setSelectedVoiceId('')
    setReferenceFile(file)
    const reader = new FileReader()
    reader.onload = () => setReferenceDataUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSynthesize = useCallback(async () => {
    if (!user) { onSignIn(); return }
    if (!text.trim()) return
    setStageIndex(0); setStageProgress(0); setElapsedMs(0)
    startTimeRef.current = Date.now()
    setStatus('loading'); setErrorMsg(''); setAudioUrl(null); setAudioBlob(null)
    startProgressTimer()

    try {
      const accentInstruction = [
        accent.value,
        timbre !== 'Auto / Match' ? `${timbre} voice.` : '',
        perfStyle,
        pacing !== 1.0 ? `Speaking pace: ${pacing}x.` : '',
      ].filter(Boolean).join(' ')

      const { blob, remaining } = await synthesize({
        text: scriptMode === 'conversation'
          ? `[Two-person conversation. Perform each speaker's lines distinctly and do not read speaker labels aloud.]\n${text.trim()}`
          : text.trim(),
        format,
        accentInstruction,
        ...(referenceDataUrl ? { referenceAudioDataUrl: referenceDataUrl, referenceTranscript } : {}),
      })

      const url = URL.createObjectURL(blob)
      setAudioUrl(url)
      setAudioBlob(blob)
      stopProgressTimer(true)
      setStatus('success')
      setUsage(prev => prev ? { ...prev, tokensUsed: prev.tokensUsed + text.trim().length, remaining } : prev)
      toast.success('Audio synthesized!')
    } catch (err) {
      stopProgressTimer(false)
      setStatus('error')
      const msg = err instanceof Error ? err.message : 'Synthesis failed.'
      setErrorMsg(msg)
      if (msg.includes('limit') || msg.includes('quota')) onPlans()
    }
  }, [user, text, scriptMode, format, accent, timbre, perfStyle, pacing, referenceDataUrl, referenceTranscript, startProgressTimer, stopProgressTimer, onSignIn, onPlans])

  const handleDownload = useCallback(() => {
    if (!audioBlob) return
    const url = audioUrl ?? URL.createObjectURL(audioBlob)
    const a = document.createElement('a')
    a.href = url; a.download = `voxcraft-output.${format}`; a.click()
  }, [audioBlob, audioUrl, format])

  const charsUsed = text.length
  const limitPct = usage ? Math.min((usage.tokensUsed / usage.limit) * 100, 100) : 0

  return (
    <div className="studio-layout mx-auto px-4 pb-16 pt-4 space-y-4">
      {user && usage && (
        <div className="rounded-2xl px-4 py-3 studio-usage-bar">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium studio-usage-label">Daily Usage</span>
            <div className="flex items-center gap-2">
              <span className="text-xs tabular-nums studio-usage-count">{usage.tokensUsed.toLocaleString()} / {usage.limit.toLocaleString()} chars</span>
              <button type="button" onClick={onPlans} className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1 studio-upgrade-btn">
                <Crown size={9} /> Upgrade
              </button>
            </div>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden studio-usage-track">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${limitPct}%`, background: limitPct > 85 ? '#ff6b8a' : 'linear-gradient(90deg, var(--site-accent, #20d2a0), var(--site-accent, #0ea882))' }} />
          </div>
        </div>
      )}

      <Section title="Vocal Profile & Regional Accent" className="profile-section" icon={<UserIcon size={14} className="section-icon" />}>
        <FieldLabel>Dialect &amp; Accent</FieldLabel>
        <SelectField value={accent.label} onChange={v => setAccent(ACCENT_OPTIONS.find(a => a.label === v) ?? ACCENT_OPTIONS[0])}
          options={ACCENT_OPTIONS.map(a => ({ label: a.label, value: a.label }))} />

        <FieldLabel>Vocal Timbre</FieldLabel>
        <div className="flex gap-2">
          {TIMBRE_OPTIONS.map(t => (
            <button key={t} type="button" onClick={() => setTimbre(t)}
              className={`timbre-btn flex-1 rounded-xl py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all${timbre === t ? ' active' : ''}`}>
              <UserIcon size={11} />{t}
            </button>
          ))}
        </div>

        <FieldLabel>Performance Style</FieldLabel>
        <SelectField value={perfStyle} onChange={setPerfStyle} options={PERF_STYLES.map(s => ({ label: s, value: s }))} />

        <div className="flex items-end gap-4">
          <div className="flex-1">
            <FieldLabel>Pacing <span className="tabular-nums pacing-val">{pacing.toFixed(2)}x</span></FieldLabel>
            <input type="range" min={0.5} max={2.0} step={0.05} value={pacing} onChange={e => setPacing(Number(e.target.value))}
              className="w-full h-1 rounded-full studio-range" />
          </div>
          <div className="w-40">
            <FieldLabel>Master Format</FieldLabel>
            <SelectField value={format} onChange={setFormat} options={FORMAT_OPTIONS} />
          </div>
        </div>
      </Section>

      {voices.length > 0 && (
        <Section title="Sample voices" className="voices-section" icon={<AudioWaveform size={14} className="section-icon" />}>
          <p className="text-xs studio-section-hint">Preview a studio voice, then use it for your script.</p>
          <div className="voice-grid">
            {voices.map(voice => (
              <div key={voice.id} className={`voice-card${selectedVoiceId === voice.id ? ' selected' : ''}`}>
                <button type="button"
                  onClick={() => { setSelectedVoiceId(voice.id); setReferenceDataUrl(voice.audioDataUrl); setReferenceTranscript(''); setReferenceFile(null) }}
                  className="voice-select">
                  <span className="voice-avatar">{voice.name.slice(0,1).toUpperCase()}</span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-sm font-semibold">{voice.name}</span>
                    <span className="block text-xs opacity-70 truncate">{[voice.accent, voice.description].filter(Boolean).join(' · ') || 'VoxCraft voice'}</span>
                  </span>
                  {selectedVoiceId === voice.id && <CheckCircle2 size={15} />}
                </button>
                <audio controls preload="none" src={voice.audioDataUrl} aria-label={`Preview ${voice.name}`} />
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Voice Print Cloning" className="clone-section" icon={<Mic size={14} className="section-icon" />}>
        <p className="text-xs leading-relaxed studio-section-hint">
          Capture 5 to 15 seconds of clear speech or import an existing audio sample to replicate any speaker's vocal identity.
        </p>

        {referenceFile && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs studio-ref-file">
            <CheckCircle2 size={13} />
            <span className="truncate flex-1">{referenceFile.name}</span>
            <button type="button" onClick={() => { setReferenceFile(null); setReferenceDataUrl(null); setSelectedVoiceId('') }}>
              <X size={12} />
            </button>
          </div>
        )}

        {referenceFile && (
          <div>
            <FieldLabel>Reference Transcript (optional)</FieldLabel>
            <input type="text" value={referenceTranscript} onChange={e => setReferenceTranscript(e.target.value)}
              placeholder="What the speaker says in the recording…"
              className="w-full rounded-xl px-3 py-2.5 text-xs outline-none studio-text-input" />
          </div>
        )}

        <div className="flex gap-2">
          <button type="button"
            onClick={() => { if (isRecording) stopRecording(); else void startRecording() }}
            className={`flex-1 rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all studio-record-btn${isRecording ? ' recording' : ''}`}>
            <Mic size={15} />
            {isRecording ? 'Stop Recording' : 'Record Microphone'}
          </button>
          <label className="flex-1 rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all studio-upload-btn">
            <Upload size={15} />
            Import Audio Clip
            <input type="file" accept="audio/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]) }} />
          </label>
        </div>
      </Section>

      <Section title="Studio Script Editor" className="script-section" icon={<FileText size={14} className="section-icon" />}>
        <div className="mode-switch">
          <button type="button" className={scriptMode === 'narration' ? 'active' : ''} onClick={() => setScriptMode('narration')}><FileText size={13} /> Narration</button>
          <button type="button" className={scriptMode === 'conversation' ? 'active' : ''} onClick={() => setScriptMode('conversation')}><MessageSquareText size={13} /> Conversation</button>
        </div>
        {scriptMode === 'conversation' && (
          <div className="dialogue-hint">
            Write one turn per line. Example: <b>Speaker A:</b> Hello there!<br /><b>Speaker B:</b> Good to see you.
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {SCRIPT_TEMPLATES.map(t => (
            <button key={t.label} type="button" onClick={() => loadTemplate(t)}
              className="rounded-full px-3 py-1 text-xs font-medium flex items-center gap-1.5 transition-all studio-template-btn">
              <Sparkles size={10} /> {t.label}
            </button>
          ))}
        </div>

        <div className="studio-divider" />

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs flex items-center gap-1 studio-cue-label">
            <Wand2 size={11} /> Insert Vocal Cue:
          </span>
          {VOCAL_CUES.map(cue => (
            <button key={cue} type="button" onClick={() => insertCue(cue)}
              className="rounded-lg px-2 py-1 text-xs transition-all studio-cue-btn">
              {cue}
            </button>
          ))}
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={3000}
          placeholder={scriptMode === 'conversation'
            ? 'Speaker A: How are you today?\nSpeaker B: I am doing well, thank you.'
            : 'Type or paste your script here… Try inserting a vocal cue above.'}
          rows={8}
          className="w-full rounded-2xl px-4 py-3 text-sm outline-none studio-textarea"
          onFocus={e => e.currentTarget.classList.add('focused')}
          onBlur={e => e.currentTarget.classList.remove('focused')}
        />

        <div className="flex items-center justify-between -mt-1">
          <span className="text-xs tabular-nums studio-char-count">{charsUsed} / 3,000 characters</span>
          <button type="button" onClick={() => setText('')} className="text-xs flex items-center gap-1 transition-colors studio-clear-btn">
            <X size={11} /> Clear Script
          </button>
        </div>

        <AnimatePresence>
          {status === 'error' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="rounded-xl px-3 py-2.5 flex items-start gap-2 text-xs studio-error-msg">
              <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <button type="button" disabled={!text.trim() || status === 'loading'}
          onClick={() => { void handleSynthesize() }}
          className={`w-full rounded-2xl py-4 text-base font-bold flex items-center justify-center gap-2 transition-all studio-synth-btn${!text.trim() || status === 'loading' ? ' disabled' : ''}`}>
          {status === 'loading' ? <Loader2 size={18} className="animate-spin" /> : <AudioWaveform size={18} />}
          {status === 'loading' ? 'Synthesizing Master Audio…' : 'Synthesize Studio Audio'}
        </button>

        <AnimatePresence>
          {status === 'loading' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className="rounded-2xl p-4 studio-progress-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs studio-progress-desc">
                  <Loader2 size={12} className="animate-spin studio-spinner" />
                  {SYNTHESIS_STAGES[stageIndex]?.desc}
                </div>
                <div className="text-xs tabular-nums studio-progress-time">
                  {(elapsedMs / 1000).toFixed(1)}s{' '}
                  <span className="studio-progress-pct">{stageProgress}%</span>
                </div>
              </div>
              <div className="h-1 rounded-full overflow-hidden mb-3 studio-progress-track">
                <div className="h-full rounded-full transition-all studio-progress-fill"
                  style={{ width: `${(stageIndex / SYNTHESIS_STAGES.length) * 100 + stageProgress / SYNTHESIS_STAGES.length}%` }} />
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {SYNTHESIS_STAGES.map((s, i) => (
                  <div key={s.label} className={`flex items-center gap-1 text-xs studio-stage${i < stageIndex ? ' done' : i === stageIndex ? ' active' : ' pending'}`}>
                    {i < stageIndex
                      ? <CheckCircle2 size={10} />
                      : <div className={`w-2.5 h-2.5 rounded-full border studio-stage-dot${i === stageIndex ? ' active' : ''}`} />}
                    {s.label}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {status === 'success' && audioUrl && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-2xl p-4 studio-audio-card">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={14} className="studio-check-icon" />
                <span className="text-sm font-semibold studio-audio-ready">Audio Ready</span>
              </div>
              <audio ref={audioRef} src={audioUrl} controls className="w-full mb-3" style={{ borderRadius: 8, height: 36 }} />
              <div className="flex gap-2">
                <button type="button" onClick={() => { void audioRef.current?.play() }}
                  className="flex-1 rounded-xl py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all studio-play-btn">
                  <Play size={12} /> Play
                </button>
                <button type="button" onClick={handleDownload}
                  className="flex-1 rounded-xl py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all studio-download-btn">
                  <Download size={12} /> Download {format.toUpperCase()}
                </button>
                <button type="button" onClick={() => { setStatus('idle'); setAudioUrl(null); setAudioBlob(null) }}
                  className="rounded-xl px-3 py-2.5 text-xs transition-all studio-close-btn">
                  <X size={13} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!user && (
          <div className="rounded-2xl p-4 text-center studio-guest-cta">
            <p className="text-xs mb-3 studio-guest-text">Sign in to synthesize audio and track your usage.</p>
            <button type="button" onClick={onSignIn}
              className="px-6 py-2.5 rounded-xl text-sm font-bold studio-signin-btn">
              Sign In / Create Account
            </button>
          </div>
        )}
      </Section>
    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function Section({ title, icon, children, className = '' }: { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl p-5 space-y-3 studio-section ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-sm font-bold display studio-section-title">{title}</span>
      </div>
      {children}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-xs flex items-center gap-1 mt-1 studio-field-label">{children}</div>
}

function SelectField({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl px-4 py-3 text-sm outline-none pr-9 transition-colors studio-select">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none studio-select-arrow" />
    </div>
  )
}
