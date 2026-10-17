import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, Upload, FileText, Wand2, Play, Download, Loader2, MessageSquareText,
  ChevronDown, X, AlertCircle, CheckCircle2, Sparkles, AudioWaveform,
  Globe, Zap, LogOut, Crown, ShieldCheck, User as UserIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from './hooks/useAuth'
import { synthesize, getUsage, getVoiceSamples, type UsageData, type VoiceSample } from './lib/api'
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

type Page = 'home' | 'studio' | 'auth' | 'plans' | 'admin'

function pathToPage(pathname: string): Page | null {
  if (pathname === '/studio') return 'studio'
  if (pathname === '/auth' || pathname === '/auth/callback') return 'auth'
  if (pathname === '/plans') return 'plans'
  if (pathname === '/admin') return 'admin'
  return null
}

function navigate(path: string) {
  window.history.pushState({}, '', path)
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App(): JSX.Element {
  const { user, loading: authLoading, refresh, logout } = useAuth()
  const [page, setPageState] = useState<Page>(() => pathToPage(window.location.pathname) ?? 'home')
  const [setupChecked, setSetupChecked] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [workerDown, setWorkerDown] = useState(false)
  const [kvMissing, setKvMissing] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('vc_theme') as 'light' | 'dark') || 'light')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('vc_theme', theme)
    window.dispatchEvent(new Event('vc-theme-changed'))
    const syncTheme = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
    window.addEventListener('vc-theme-changed', syncTheme)
    return () => window.removeEventListener('vc-theme-changed', syncTheme)
  }, [theme])

  const setPage = (p: Page) => {
    setPageState(p)
    navigate(p === 'home' ? '/' : `/${p}`)
  }

  // Sync page state when browser back/forward is used
  useEffect(() => {
    const onPop = () => setPageState(pathToPage(window.location.pathname) ?? 'home')
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

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
    <div className="min-h-dvh flex items-center justify-center" style={{ background: '#0a121e' }}>
      <Loader2 size={28} className="animate-spin" style={{ color: '#20d2a0' }} />
    </div>
  )

  if (kvMissing || workerDown) return (
    <div className="min-h-dvh flex items-center justify-center px-6" style={{ background: '#0a121e' }}>
      <div className="max-w-md w-full rounded-2xl p-8 text-center space-y-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: 'rgba(32,210,160,0.12)' }}>
          <AudioWaveform size={26} style={{ color: '#20d2a0' }} />
        </div>
        {kvMissing ? (<>
          <h2 className="text-xl font-bold" style={{ color: '#f0faf7' }}>KV Database Not Bound</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(240,250,247,0.55)' }}>
            The backend is running but the KV database is not attached. Do this in your Cloudflare dashboard:
          </p>
          <div className="text-xs rounded-xl px-4 py-4 text-left space-y-2" style={{ background: 'rgba(0,0,0,0.3)', color: 'rgba(240,250,247,0.7)' }}>
            <div className="flex gap-2"><span style={{ color: '#20d2a0' }}>1.</span><span>Create a KV namespace named <strong>voicera-kv</strong></span></div>
            <div className="flex gap-2"><span style={{ color: '#20d2a0' }}>2.</span><span>voicera Pages → Settings → Functions → KV namespace bindings → Add</span></div>
            <div className="flex gap-2"><span style={{ color: '#20d2a0' }}>3.</span><span>Variable name: <code style={{ color: '#20d2a0' }}>KV</code>, select voicera-kv → Save</span></div>
            <div className="flex gap-2"><span style={{ color: '#20d2a0' }}>4.</span><span>Deployments tab → Retry deployment</span></div>
          </div>
        </>) : (<>
          <h2 className="text-xl font-bold" style={{ color: '#f0faf7' }}>Cannot Reach Backend</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(240,250,247,0.55)' }}>
            The API functions are not responding. Check that your Pages deployment completed successfully and the Functions tab shows compiled functions.
          </p>
        </>)}
        <button onClick={() => window.location.reload()} className="w-full py-3 rounded-xl text-sm font-semibold" style={{ background: 'linear-gradient(135deg,#20d2a0,#17a882)', color: '#fff' }}>
          Retry
        </button>
      </div>
    </div>
  )

  if (needsSetup) return (
    <SetupWizard onComplete={() => { setNeedsSetup(false); void refresh() }} />
  )

  // Guard /admin — redirect to auth if not logged in, redirect to home if not admin
  if (page === 'admin') {
    if (!user) { setPage('auth'); return <></> }
    if (user.role !== 'admin') { setPage('home'); return <></> }
    return <PageShell><AdminPanel onBack={() => setPage('studio')} /></PageShell>
  }

  if (page === 'auth') return <AuthPage onSuccess={() => setPage('studio')} />
  if (page === 'plans') return (
    <PageShell>
      <PlansPage onBack={() => setPage('studio')} />
    </PageShell>
  )
  if (page === 'studio') return (
    <PageShell>
      <StudioHeader user={user} onLogout={() => { logout(); setPage('home') }} onPlans={() => setPage('plans')} onAdmin={() => setPage('admin')} />
      <StudioBody user={user} onSignIn={() => setPage('auth')} onPlans={() => setPage('plans')} />
    </PageShell>
  )
  return <HomePage onEnter={() => setPage(user ? 'studio' : 'auth')} onSignIn={() => setPage('auth')} user={user} onStudio={() => setPage('studio')} />
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh" style={{ background: 'linear-gradient(160deg, #0a121e 0%, #0d1f2d 60%, #091824 100%)' }}>
      {children}
    </div>
  )
}

// ── Home Page ─────────────────────────────────────────────────────────────────
function HomePage({ onEnter, onSignIn, user, onStudio }: { onEnter: () => void; onSignIn: () => void; user: ReturnType<typeof useAuth>['user']; onStudio: () => void }) {
  const features = [
    { icon: Globe, title: 'Made for African voices', desc: 'Choose the cadence, accent, and character that fits your story.' },
    { icon: Mic, title: 'Bring a voice to life', desc: 'Preview curated voices or upload a short reference sample.' },
    { icon: Wand2, title: 'Direct every moment', desc: 'Add pauses, whispers, laughter, and feeling to your script.' },
    { icon: Zap, title: 'Ready for production', desc: 'Download crisp MP3 or lossless WAV right from your workspace.' },
  ]
  return (
    <div className="landing min-h-dvh">
      <nav className="landing-nav">
        <a href="/" className="brand-lockup" aria-label="VoxCraft home"><span className="brand-mark"><AudioWaveform size={18} /></span><span>voxcraft</span><span className="brand-dot">STUDIO</span></a>
        <div className="landing-links"><a href="#studio">Studio</a><a href="#voices">Voices</a><a href="#workflow">How it works</a><a href="/plans">Plans</a></div>
        <div className="landing-actions"><ThemeToggle />{user ? <button className="button button-primary" onClick={onStudio}>Open studio <ArrowRightIcon /></button> : <button className="button button-quiet" onClick={onSignIn}>Sign in</button>}</div>
      </nav>

      <main>
        <section className="hero-section" id="studio">
          <div className="hero-copy">
            <div className="eyebrow"><span className="live-dot" /> VOICE, WITH A POINT OF VIEW</div>
            <h1>Give your words<br />a <em>voice of their own.</em></h1>
            <p className="hero-lede">A thoughtful voice studio for stories, conversations, and ideas shaped by the sounds of Africa and beyond.</p>
            <div className="hero-ctas"><button className="button button-primary button-large" onClick={onEnter}>Open the studio <ArrowRightIcon /></button><a className="text-link" href="#voices">Explore the voices <span>↓</span></a></div>
            <div className="hero-proof"><div className="avatar-stack"><span>AM</span><span>KO</span><span>ZE</span></div><span>Made for the way we speak.</span><span className="proof-sep">·</span><span>Built for the world.</span></div>
          </div>
          <div className="hero-art" aria-label="VoxCraft audio studio preview">
            <div className="art-glow" />
            <div className="studio-preview"><div className="preview-top"><span className="preview-window-dots"><i/><i/><i/></span><span>VOXCRAFT · SESSION 01</span><span className="preview-status"><i/> READY</span></div>
              <div className="preview-content"><div className="preview-label">YOUR NEXT STORY, IN SOUND</div><div className="preview-title">The morning<br />comes alive.</div><div className="waveform">{Array.from({length: 46}, (_, i) => <i key={i} style={{ height: `${18 + ((i * 37 + 13) % 62)}%` }} />)}</div><div className="preview-player"><button className="play-orb" onClick={onEnter} aria-label="Open studio"><Play size={15} fill="currentColor" /></button><div className="preview-track"><b>Amara · Lagos Executive</b><span>Warm, clear · 0:18</span></div><span className="track-time">00:18</span></div></div>
              <div className="preview-footer"><span><AudioWaveform size={13}/> FISH AUDIO ENGINE</span><span>MP3 · 44.1 KHZ</span></div>
            </div>
            <div className="floating-note"><span className="note-icon"><Sparkles size={14}/></span><span><b>Every accent, intentional.</b><small>Find the right sound.</small></span></div>
          </div>
        </section>

        <section className="signal-strip"><span>VOICE FOR</span><b>Films & stories</b><i/><b>Learning</b><i/><b>Creators</b><i/><b>Brands</b><i/><b>Everyday ideas</b></section>

        <section className="features-section" id="voices"><div className="section-heading"><div><div className="eyebrow">A STUDIO THAT GETS IT</div><h2>More than words.<br /><em>All the feeling between them.</em></h2></div><p>From the first line to the final listen, shape the sound until it feels like yours.</p></div><div className="feature-grid">{features.map((f, i) => <motion.article key={f.title} className="feature-card" initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * .07 }}><span className="feature-number">0{i + 1}</span><span className="feature-icon"><f.icon size={18}/></span><h3>{f.title}</h3><p>{f.desc}</p></motion.article>)}</div></section>

        <section className="workflow-section" id="workflow"><div className="workflow-copy"><div className="eyebrow">FROM PAGE TO PLAY</div><h2>Your next idea<br />sounds <em>closer.</em></h2><p>Choose a voice, bring your script, and direct the delivery. VoxCraft takes care of the rest, with controls that stay out of your way.</p><button className="button button-primary" onClick={onEnter}>Start creating <ArrowRightIcon /></button></div><div className="workflow-steps"><div><span>01</span><b>Choose your voice</b><small>Preview samples and find a natural fit.</small></div><div><span>02</span><b>Shape the delivery</b><small>Set the pace, mood, and vocal cues.</small></div><div><span>03</span><b>Make it yours</b><small>Synthesize and take your audio anywhere.</small></div></div></section>

        <section className="closing-cta"><div><div className="eyebrow">SOUND LIKE YOURSELF</div><h2>There’s a voice for that.</h2><p>Make something people want to listen to.</p></div><button className="button button-dark" onClick={onEnter}>Step into the studio <ArrowRightIcon /></button></section>
      </main>
      <footer className="landing-footer"><a href="/" className="brand-lockup"><span className="brand-mark"><AudioWaveform size={16}/></span><span>voxcraft</span></a><span>Voice, with a point of view.</span><button onClick={onSignIn}>Your workspace <ArrowRightIcon /></button></footer>
    </div>
  )
}

function ArrowRightIcon() { return <span aria-hidden="true">↗</span> }

// ── Studio Header ─────────────────────────────────────────────────────────────
function StudioHeader({ user, onLogout, onPlans, onAdmin }: {
  user: ReturnType<typeof useAuth>['user']
  onLogout: () => void
  onPlans: () => void
  onAdmin: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3"
      style={{ background: 'rgba(10,18,30,0.92)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)' }}>
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #20d2a0 0%, #0ea882 100%)' }}>
          <AudioWaveform size={16} color="#0a121e" strokeWidth={2.5} />
        </div>
        <span className="display font-bold text-sm" style={{ color: '#f0faf7' }}>VoxCraft</span>
        <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(32,210,160,0.12)', color: '#20d2a0', border: '1px solid rgba(32,210,160,0.25)' }}>Studio Pro</span>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <div className="hidden sm:flex items-center gap-1.5 text-xs" style={{ color: 'rgba(240,250,247,0.5)' }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#20d2a0', boxShadow: '0 0 6px #20d2a0' }} />
          Acoustic Engine Ready
        </div>

        {user ? (
          <div className="relative">
            <button type="button" onClick={() => setMenuOpen(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#f0faf7' }}>
              {user.avatar
                ? <img src={user.avatar} alt="" className="w-5 h-5 rounded-full" />
                : <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'rgba(32,210,160,0.2)', color: '#20d2a0' }}>
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
                  className="absolute right-0 top-full mt-2 w-48 rounded-2xl overflow-hidden py-1 z-50"
                  style={{ background: '#0d1f2d', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                  <div className="px-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <div className="text-xs font-medium truncate" style={{ color: '#f0faf7' }}>{user.name}</div>
                    <div className="text-xs truncate mt-0.5" style={{ color: 'rgba(240,250,247,0.4)' }}>{user.email}</div>
                    <div className="text-xs mt-1 capitalize inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                      style={{ background: 'rgba(32,210,160,0.1)', color: '#20d2a0' }}>
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
      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-white/5"
      style={{ color: danger ? '#ff6b8a' : 'rgba(240,250,247,0.7)' }}>
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

  // Load usage on mount / user change
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
        text: scriptMode === 'conversation' ? `[Two-person conversation. Perform each speaker's lines distinctly and do not read speaker labels aloud.]\n${text.trim()}` : text.trim(),
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
      {/* Usage bar */}
      {user && usage && (
        <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: 'rgba(240,250,247,0.6)' }}>Daily Usage</span>
            <div className="flex items-center gap-2">
              <span className="text-xs tabular-nums" style={{ color: '#f0faf7' }}>{usage.tokensUsed.toLocaleString()} / {usage.limit.toLocaleString()} chars</span>
              <button type="button" onClick={onPlans} className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{ background: 'rgba(32,210,160,0.12)', color: '#20d2a0' }}>
                <Crown size={9} /> Upgrade
              </button>
            </div>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${limitPct}%`, background: limitPct > 85 ? '#ff6b8a' : 'linear-gradient(90deg, #20d2a0, #0ea882)' }} />
          </div>
        </div>
      )}

      {/* Vocal Profile */}
      <Section title="Vocal Profile & Regional Accent" className="profile-section" icon={<UserIcon size={14} style={{ color: '#20d2a0' }} />}>
        <FieldLabel>Dialect & Accent</FieldLabel>
        <SelectField value={accent.label} onChange={v => setAccent(ACCENT_OPTIONS.find(a => a.label === v) ?? ACCENT_OPTIONS[0])}
          options={ACCENT_OPTIONS.map(a => ({ label: a.label, value: a.label }))} />

        <FieldLabel>Vocal Timbre</FieldLabel>
        <div className="flex gap-2">
          {TIMBRE_OPTIONS.map(t => (
            <button key={t} type="button" onClick={() => setTimbre(t)}
              className="flex-1 rounded-xl py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              style={timbre === t
                ? { background: 'rgba(32,210,160,0.15)', border: '1px solid rgba(32,210,160,0.4)', color: '#20d2a0' }
                : { background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(240,250,247,0.5)' }}>
              <UserIcon size={11} />{t}
            </button>
          ))}
        </div>

        <FieldLabel>Performance Style</FieldLabel>
        <SelectField value={perfStyle} onChange={setPerfStyle} options={PERF_STYLES.map(s => ({ label: s, value: s }))} />

        <div className="flex items-end gap-4">
          <div className="flex-1">
            <FieldLabel>Pacing <span className="tabular-nums" style={{ color: '#20d2a0' }}>{pacing.toFixed(2)}x</span></FieldLabel>
            <input type="range" min={0.5} max={2.0} step={0.05} value={pacing} onChange={e => setPacing(Number(e.target.value))}
              className="w-full accent-teal-400 h-1 rounded-full" style={{ accentColor: '#20d2a0' }} />
          </div>
          <div className="w-40">
            <FieldLabel>Master Format</FieldLabel>
            <SelectField value={format} onChange={setFormat} options={FORMAT_OPTIONS} />
          </div>
        </div>
      </Section>

      {voices.length > 0 && <Section title="Sample voices" className="voices-section" icon={<AudioWaveform size={14} style={{ color: '#20d2a0' }} />}><p className="text-xs" style={{ color: 'rgba(240,250,247,0.45)' }}>Preview a studio voice, then use it for your script.</p><div className="voice-grid">{voices.map(voice => <div key={voice.id} className={`voice-card ${selectedVoiceId === voice.id ? 'selected' : ''}`}><button type="button" onClick={() => { setSelectedVoiceId(voice.id); setReferenceDataUrl(voice.audioDataUrl); setReferenceTranscript(''); setReferenceFile(null) }} className="voice-select"><span className="voice-avatar">{voice.name.slice(0,1).toUpperCase()}</span><span className="min-w-0 flex-1 text-left"><span className="block text-sm font-semibold">{voice.name}</span><span className="block text-xs opacity-70 truncate">{[voice.accent, voice.description].filter(Boolean).join(' · ') || 'VoxCraft voice'}</span></span>{selectedVoiceId === voice.id && <CheckCircle2 size={15} />}</button><audio controls preload="none" src={voice.audioDataUrl} aria-label={`Preview ${voice.name}`} /></div>)}</div></Section>}

      {/* Voice Cloning */}
      <Section title="Voice Print Cloning" className="clone-section" icon={<Mic size={14} style={{ color: '#20d2a0' }} />}>
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(240,250,247,0.45)' }}>
          Capture 5 to 15 seconds of clear speech or import an existing audio sample to replicate any speaker's vocal identity and native inflection.
        </p>

        {referenceFile && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs"
            style={{ background: 'rgba(32,210,160,0.08)', border: '1px solid rgba(32,210,160,0.2)', color: '#20d2a0' }}>
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
              className="w-full rounded-xl px-3 py-2.5 text-xs outline-none border"
              style={{ background: 'rgba(0,0,0,0.25)', borderColor: 'rgba(255,255,255,0.1)', color: '#f0faf7', fontFamily: 'inherit' }} />
          </div>
        )}

        <div className="flex gap-2">
          <button type="button"
            onClick={() => { if (isRecording) stopRecording(); else void startRecording() }}
            className="flex-1 rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all"
            style={isRecording
              ? { background: 'rgba(255,107,138,0.15)', border: '1px solid rgba(255,107,138,0.35)', color: '#ff6b8a' }
              : { background: 'rgba(186,43,76,0.15)', border: '1px solid rgba(186,43,76,0.3)', color: '#ff6b8a' }}>
            <Mic size={15} />
            {isRecording ? 'Stop Recording' : 'Record Microphone'}
          </button>
          <label className="flex-1 rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(240,250,247,0.7)' }}>
            <Upload size={15} />
            Import Audio Clip
            <input type="file" accept="audio/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]) }} />
          </label>
        </div>
      </Section>

      {/* Script Editor */}
      <Section title="Studio Script Editor" className="script-section" icon={<FileText size={14} style={{ color: '#20d2a0' }} />}>
        <div className="mode-switch"><button type="button" className={scriptMode === 'narration' ? 'active' : ''} onClick={() => setScriptMode('narration')}><FileText size={13} /> Narration</button><button type="button" className={scriptMode === 'conversation' ? 'active' : ''} onClick={() => setScriptMode('conversation')}><MessageSquareText size={13} /> Conversation</button></div>
        {scriptMode === 'conversation' && <div className="dialogue-hint">Write one turn per line. Example: <b>Speaker A:</b> Hello there!<br /><b>Speaker B:</b> Good to see you.</div>}
        <div className="flex flex-wrap gap-2">
          {SCRIPT_TEMPLATES.map(t => (
            <button key={t.label} type="button" onClick={() => loadTemplate(t)}
              className="rounded-full px-3 py-1 text-xs font-medium flex items-center gap-1.5 transition-all"
              style={{ background: 'rgba(32,210,160,0.1)', border: '1px solid rgba(32,210,160,0.2)', color: '#20d2a0' }}>
              <Sparkles size={10} /> {t.label}
            </button>
          ))}
        </div>

        <div className="h-px my-1" style={{ background: 'rgba(255,255,255,0.06)' }} />

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs flex items-center gap-1" style={{ color: 'rgba(240,250,247,0.4)' }}>
            <Wand2 size={11} /> Insert Vocal Cue:
          </span>
          {VOCAL_CUES.map(cue => (
            <button key={cue} type="button" onClick={() => insertCue(cue)}
              className="rounded-lg px-2 py-1 text-xs transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(240,250,247,0.6)' }}>
              {cue}
            </button>
          ))}
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={3000}
          placeholder={scriptMode === 'conversation' ? 'Speaker A: How are you today?\nSpeaker B: I am doing well, thank you.' : 'Type or paste your script here… Try inserting a vocal cue above.'}
          rows={8}
          className="w-full rounded-2xl px-4 py-3 text-sm outline-none border resize-y leading-relaxed"
          style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.08)', color: '#f0faf7', fontFamily: 'inherit', minHeight: 160 }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(32,210,160,0.35)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
        />

        <div className="flex items-center justify-between -mt-1">
          <span className="text-xs tabular-nums" style={{ color: 'rgba(240,250,247,0.35)' }}>{charsUsed} / 3,000 characters</span>
          <button type="button" onClick={() => setText('')} className="text-xs flex items-center gap-1 transition-colors"
            style={{ color: 'rgba(240,250,247,0.35)' }}>
            <X size={11} /> Clear Script
          </button>
        </div>

        {/* Error */}
        <AnimatePresence>
          {status === 'error' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="rounded-xl px-3 py-2.5 flex items-start gap-2 text-xs"
              style={{ background: 'rgba(255,107,138,0.1)', border: '1px solid rgba(255,107,138,0.25)', color: '#ff6b8a' }}>
              <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Synthesize CTA */}
        <button type="button" disabled={!text.trim() || status === 'loading'}
          onClick={() => { void handleSynthesize() }}
          className="w-full rounded-2xl py-4 text-base font-bold flex items-center justify-center gap-2 transition-all"
          style={!text.trim() || status === 'loading'
            ? { background: 'rgba(32,210,160,0.15)', color: 'rgba(32,210,160,0.4)', cursor: 'not-allowed' }
            : { background: 'linear-gradient(135deg, #20d2a0 0%, #0ea882 100%)', color: '#0a121e', boxShadow: '0 0 24px rgba(32,210,160,0.2)' }}>
          {status === 'loading' ? <Loader2 size={18} className="animate-spin" /> : <AudioWaveform size={18} />}
          {status === 'loading' ? 'Synthesizing Master Audio…' : 'Synthesize Studio Audio'}
        </button>

        {/* Progress card */}
        <AnimatePresence>
          {status === 'loading' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(240,250,247,0.7)' }}>
                  <Loader2 size={12} className="animate-spin" style={{ color: '#20d2a0' }} />
                  {SYNTHESIS_STAGES[stageIndex]?.desc}
                </div>
                <div className="text-xs tabular-nums" style={{ color: 'rgba(240,250,247,0.5)' }}>
                  {(elapsedMs / 1000).toFixed(1)}s{' '}
                  <span style={{ color: '#20d2a0' }}>{stageProgress}%</span>
                </div>
              </div>
              <div className="h-1 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${(stageIndex / SYNTHESIS_STAGES.length) * 100 + stageProgress / SYNTHESIS_STAGES.length}%`, background: 'linear-gradient(90deg, #20d2a0, #0ea882)' }} />
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {SYNTHESIS_STAGES.map((s, i) => (
                  <div key={s.label} className="flex items-center gap-1 text-xs"
                    style={{ color: i < stageIndex ? '#20d2a0' : i === stageIndex ? '#f0faf7' : 'rgba(240,250,247,0.3)' }}>
                    {i < stageIndex
                      ? <CheckCircle2 size={10} style={{ color: '#20d2a0' }} />
                      : <div className={`w-2.5 h-2.5 rounded-full border ${i === stageIndex ? 'border-teal-400' : 'border-white/20'}`}
                          style={i === stageIndex ? { borderColor: '#20d2a0' } : {}} />}
                    {s.label}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Audio player */}
        <AnimatePresence>
          {status === 'success' && audioUrl && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-2xl p-4" style={{ background: 'rgba(32,210,160,0.06)', border: '1px solid rgba(32,210,160,0.2)' }}>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={14} style={{ color: '#20d2a0' }} />
                <span className="text-sm font-semibold" style={{ color: '#f0faf7' }}>Audio Ready</span>
              </div>
              <audio ref={audioRef} src={audioUrl} controls className="w-full mb-3"
                style={{ borderRadius: 8, height: 36 }} />
              <div className="flex gap-2">
                <button type="button" onClick={() => { void audioRef.current?.play() }}
                  className="flex-1 rounded-xl py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  style={{ background: 'rgba(32,210,160,0.1)', border: '1px solid rgba(32,210,160,0.25)', color: '#20d2a0' }}>
                  <Play size={12} /> Play
                </button>
                <button type="button" onClick={handleDownload}
                  className="flex-1 rounded-xl py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  style={{ background: 'linear-gradient(135deg, #20d2a0 0%, #0ea882 100%)', color: '#0a121e' }}>
                  <Download size={12} /> Download {format.toUpperCase()}
                </button>
                <button type="button" onClick={() => { setStatus('idle'); setAudioUrl(null); setAudioBlob(null) }}
                  className="rounded-xl px-3 py-2.5 text-xs transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(240,250,247,0.5)' }}>
                  <X size={13} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Guest CTA */}
        {!user && (
          <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(32,210,160,0.05)', border: '1px solid rgba(32,210,160,0.15)' }}>
            <p className="text-xs mb-3" style={{ color: 'rgba(240,250,247,0.55)' }}>Sign in to synthesize audio and track your usage.</p>
            <button type="button" onClick={onSignIn}
              className="px-6 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, #20d2a0 0%, #0ea882 100%)', color: '#0a121e' }}>
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
    <div className={`rounded-2xl p-5 space-y-3 ${className}`} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-sm font-bold display" style={{ color: '#f0faf7' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-xs flex items-center gap-1 mt-1" style={{ color: 'rgba(240,250,247,0.5)' }}>{children}</div>
}

function SelectField({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl px-4 py-3 text-sm outline-none border pr-9 transition-colors"
        style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(32,210,160,0.3)', color: '#f0faf7', fontFamily: 'inherit' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(240,250,247,0.4)' }} />
    </div>
  )
}
