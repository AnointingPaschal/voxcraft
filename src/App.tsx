import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, Upload, FileText, Wand2, Play, Download, Loader2,
  ChevronDown, X, AlertCircle, CheckCircle2, Sparkles, AudioWaveform,
  Globe, Zap, LogOut, Crown, ShieldCheck, User as UserIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from './hooks/useAuth'
import { synthesize, getUsage, getSetupStatus, type UsageData } from './lib/api'
import AuthPage from './components/auth/AuthPage'
import AdminPanel from './components/admin/AdminPanel'
import PlansPage from './components/dashboard/PlansPage'
import SetupWizard from './components/auth/SetupWizard'

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

// ── App ───────────────────────────────────────────────────────────────────────
export default function App(): JSX.Element {
  const { user, loading: authLoading, refresh } = useAuth()
  const [page, setPage] = useState<Page>('home')
  const [setupChecked, setSetupChecked] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const { logout } = useAuth()

  // Check setup status once on mount
  useEffect(() => {
    getSetupStatus()
      .then(s => { if (!s.setupComplete) setNeedsSetup(true) })
      .catch(() => { /* worker not reachable — skip */ })
      .finally(() => setSetupChecked(true))
  }, [])

  // Handle Google OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const cbToken = params.get('token')
    if (window.location.pathname === '/auth/callback' && cbToken) {
      localStorage.setItem('vc_token', cbToken)
      window.history.replaceState({}, '', '/')
      window.location.reload()
    }
  }, [])

  if (!setupChecked || authLoading) return (
    <div className="min-h-dvh flex items-center justify-center" style={{ background: '#0a121e' }}>
      <Loader2 size={28} className="animate-spin" style={{ color: '#20d2a0' }} />
    </div>
  )

  if (needsSetup) return (
    <SetupWizard onComplete={() => { setNeedsSetup(false); void refresh() }} />
  )

  if (page === 'auth') return <AuthPage onSuccess={() => setPage('studio')} />
  if (page === 'plans') return (
    <PageShell>
      <PlansPage onBack={() => setPage('studio')} />
    </PageShell>
  )
  if (page === 'admin' && user?.role === 'admin') return (
    <PageShell>
      <AdminPanel onBack={() => setPage('studio')} />
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
    { icon: Globe, title: '10+ African Accents', desc: 'Naija Pidgin, Lagos Executive, Ghanaian, Kenyan, South African and more.' },
    { icon: Mic, title: 'Voice Print Cloning', desc: "Upload 5\u201315 seconds of audio to clone any speaker's vocal identity." },
    { icon: Wand2, title: 'Vocal Cue System', desc: 'Insert [laughing], [whispering], [pause] and other emotional markers.' },
    { icon: Zap, title: 'Studio Quality', desc: 'MP3 44.1kHz and lossless WAV output powered by Fish Audio S2.1 Pro.' },
  ]

  return (
    <div className="min-h-dvh" style={{ background: 'linear-gradient(160deg, #0a121e 0%, #0d1f2d 60%, #091824 100%)' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-5 py-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #20d2a0 0%, #0ea882 100%)' }}>
            <AudioWaveform size={16} color="#0a121e" strokeWidth={2.5} />
          </div>
          <span className="display font-bold text-base" style={{ color: '#f0faf7' }}>VoxCraft</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(32,210,160,0.12)', color: '#20d2a0', border: '1px solid rgba(32,210,160,0.25)' }}>Studio Pro</span>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <button type="button" onClick={onStudio}
              className="text-sm font-semibold px-4 py-2 rounded-xl transition-all"
              style={{ background: 'linear-gradient(135deg, #20d2a0 0%, #0ea882 100%)', color: '#0a121e' }}>
              Open Studio
            </button>
          ) : (
            <button type="button" onClick={onSignIn}
              className="text-sm font-semibold px-4 py-2 rounded-xl transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#f0faf7', border: '1px solid rgba(255,255,255,0.1)' }}>
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-2xl mx-auto px-5 pt-12 pb-8 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-xs font-medium"
            style={{ background: 'rgba(32,210,160,0.08)', border: '1px solid rgba(32,210,160,0.2)', color: '#20d2a0' }}>
            <Sparkles size={11} />
            Powered by Fish Audio S2.1 Pro
          </div>
          <h1 className="display text-4xl font-bold leading-tight mb-4" style={{ color: '#f0faf7', letterSpacing: '-0.03em' }}>
            African Voice AI<br />
            <span style={{ color: '#20d2a0' }}>Studio</span>
          </h1>
          <p className="text-base mb-8 max-w-md mx-auto" style={{ color: 'rgba(240,250,247,0.55)', lineHeight: 1.6 }}>
            Generate studio-quality African-accented speech with voice cloning, vocal cues, and professional mastering.
          </p>
          <button type="button" onClick={onEnter}
            className="px-8 py-4 rounded-2xl font-bold text-base flex items-center gap-2.5 mx-auto"
            style={{ background: 'linear-gradient(135deg, #20d2a0 0%, #0ea882 100%)', color: '#0a121e', boxShadow: '0 0 32px rgba(32,210,160,0.25)' }}>
            <AudioWaveform size={18} />
            Launch Studio
          </button>
        </motion.div>
      </div>

      {/* Features */}
      <div className="max-w-2xl mx-auto px-5 pb-16">
        <div className="grid grid-cols-2 gap-3">
          {features.map((f, i) => (
            <motion.div key={f.title}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }}
              className="rounded-2xl p-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
                style={{ background: 'rgba(32,210,160,0.1)' }}>
                <f.icon size={15} style={{ color: '#20d2a0' }} />
              </div>
              <div className="text-sm font-semibold mb-1" style={{ color: '#f0faf7' }}>{f.title}</div>
              <div className="text-xs leading-relaxed" style={{ color: 'rgba(240,250,247,0.45)' }}>{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

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
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(240,250,247,0.5)' }}>
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
        text: text.trim(),
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
  }, [user, text, format, accent, timbre, perfStyle, pacing, referenceDataUrl, referenceTranscript, startProgressTimer, stopProgressTimer, onSignIn, onPlans])

  const handleDownload = useCallback(() => {
    if (!audioBlob) return
    const url = audioUrl ?? URL.createObjectURL(audioBlob)
    const a = document.createElement('a')
    a.href = url; a.download = `voxcraft-output.${format}`; a.click()
  }, [audioBlob, audioUrl, format])

  const charsUsed = text.length
  const limitPct = usage ? Math.min((usage.tokensUsed / usage.limit) * 100, 100) : 0

  return (
    <div className="max-w-lg mx-auto px-4 pb-16 pt-4 space-y-4">
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
      <Section title="Vocal Profile & Regional Accent" icon={<UserIcon size={14} style={{ color: '#20d2a0' }} />}>
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

      {/* Voice Cloning */}
      <Section title="Voice Print Cloning" icon={<Mic size={14} style={{ color: '#20d2a0' }} />}>
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(240,250,247,0.45)' }}>
          Capture 5 to 15 seconds of clear speech or import an existing audio sample to replicate any speaker's vocal identity and native inflection.
        </p>

        {referenceFile && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs"
            style={{ background: 'rgba(32,210,160,0.08)', border: '1px solid rgba(32,210,160,0.2)', color: '#20d2a0' }}>
            <CheckCircle2 size={13} />
            <span className="truncate flex-1">{referenceFile.name}</span>
            <button type="button" onClick={() => { setReferenceFile(null); setReferenceDataUrl(null) }}>
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
      <Section title="Studio Script Editor" icon={<FileText size={14} style={{ color: '#20d2a0' }} />}>
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
          placeholder="Type or paste your script here… Try inserting a vocal cue above."
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
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
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
