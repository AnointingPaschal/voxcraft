import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic,
  Upload,
  Play,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  ChevronDown,
} from 'lucide-react'
import { clsx } from 'clsx'

// ─── Types ───────────────────────────────────────────────────────────────────

type Format = 'mp3' | 'wav'
type Status = 'idle' | 'loading' | 'success' | 'error'

interface AccentOption {
  label: string
  value: string
  description: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ACCENT_OPTIONS: AccentOption[] = [
  { label: 'None', value: '', description: 'Default neutral voice' },
  { label: 'Nigerian English', value: 'Speak with a warm Nigerian English accent', description: 'West African cadence' },
  { label: 'Nigerian Pidgin', value: 'Speak in Nigerian Pidgin English, casual and expressive', description: 'Street-flavoured creole' },
  { label: 'Ghanaian English', value: 'Speak with a Ghanaian English accent', description: 'Smooth Ghanaian lilt' },
  { label: 'South African English', value: 'Speak with a South African English accent', description: 'SA vocal character' },
  { label: 'Kenyan English', value: 'Speak with a Kenyan English accent', description: 'East African cadence' },
  { label: 'Jamaican Patois', value: 'Speak in Jamaican Patois, rhythmic and vibrant', description: 'Caribbean rhythm' },
  { label: 'British RP', value: 'Speak with a polished British Received Pronunciation accent', description: 'Classic British RP' },
  { label: 'American Midwest', value: 'Speak with a clear American Midwest accent', description: 'Neutral US standard' },
]

const FORMAT_OPTIONS: { label: string; value: Format }[] = [
  { label: 'MP3', value: 'mp3' },
  { label: 'WAV', value: 'wav' },
]

const MAX_CHARS = 3000

// ─── Main Component ──────────────────────────────────────────────────────────

export default function App() {
  const [text, setText] = useState('')
  const [accent, setAccent] = useState<AccentOption>(ACCENT_OPTIONS[0])
  const [accentOpen, setAccentOpen] = useState(false)
  const [format, setFormat] = useState<Format>('mp3')
  const [referenceDataUrl, setReferenceDataUrl] = useState<string | null>(null)
  const [referenceFilename, setReferenceFilename] = useState<string | null>(null)
  const [referenceTranscript, setReferenceTranscript] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Reference audio upload ─────────────────────────────────────────────────
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('Reference audio must be under 15 MB.')
      return
    }
    setReferenceFilename(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      setReferenceDataUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const clearReference = useCallback(() => {
    setReferenceDataUrl(null)
    setReferenceFilename(null)
    setReferenceTranscript('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  // ── Synthesize ─────────────────────────────────────────────────────────────
  const handleSynthesize = useCallback(async () => {
    if (!text.trim()) return
    setStatus('loading')
    setErrorMsg('')
    setAudioUrl(null)
    setAudioBlob(null)

    try {
      const body: Record<string, unknown> = {
        text: text.trim(),
        format,
      }
      if (accent.value) body.accentInstruction = accent.value
      if (referenceDataUrl) {
        body.referenceAudioDataUrl = referenceDataUrl
        if (referenceTranscript.trim()) body.referenceTranscript = referenceTranscript.trim()
      }

      const res = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data: unknown = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(
          (typeof data === 'object' && data !== null && 'error' in data
            ? (data as { error?: string }).error
            : undefined) ?? `HTTP ${res.status}`,
        )
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)
      setAudioBlob(blob)
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }, [text, format, accent, referenceDataUrl, referenceTranscript])

  // ── Download ───────────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    if (!audioBlob || !audioUrl) return
    const a = document.createElement('a')
    a.href = audioUrl
    a.download = `voxcraft-output.${format}`
    a.click()
  }, [audioBlob, audioUrl, format])

  const charsLeft = MAX_CHARS - text.length

  return (
    <div
      className="min-h-dvh w-full"
      style={{ background: 'var(--bg-gradient)' }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="w-full border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent)' }}
          >
            <Mic size={16} color="#fff" />
          </div>
          <div>
            <h1 className="display text-base font-semibold leading-tight" style={{ color: 'var(--ink)' }}>
              VoxCraft Studio
            </h1>
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>
              AI voice synthesis
            </p>
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-5">

        {/* Script card */}
        <section
          className="rounded-2xl p-5 border backdrop-blur-sm"
          style={{
            background: 'var(--surface-strong)',
            borderColor: 'var(--border)',
          }}
        >
          <label
            className="block text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: 'var(--muted)', letterSpacing: '0.08em' }}
          >
            Script
          </label>
          <textarea
            className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none border transition-colors"
            style={{
              background: 'var(--surface-muted)',
              borderColor: 'var(--border)',
              color: 'var(--ink)',
              minHeight: '140px',
              fontFamily: 'inherit',
            }}
            placeholder="Type or paste the text you want to synthesize…"
            maxLength={MAX_CHARS}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--focus)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
            }}
          />
          <div
            className="mt-1.5 text-xs text-right tabular-nums"
            style={{ color: charsLeft < 200 ? 'var(--danger)' : 'var(--subtle)' }}
          >
            {charsLeft.toLocaleString()} characters remaining
          </div>
        </section>

        {/* Controls row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Accent picker */}
          <section
            className="rounded-2xl p-4 border backdrop-blur-sm"
            style={{ background: 'var(--surface-strong)', borderColor: 'var(--border)' }}
          >
            <label
              className="block text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: 'var(--muted)', letterSpacing: '0.08em' }}
            >
              Accent / Style
            </label>
            <div className="relative">
              <button
                type="button"
                className="w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm border transition-colors"
                style={{
                  background: 'var(--surface-muted)',
                  borderColor: 'var(--border)',
                  color: 'var(--ink)',
                }}
                onClick={() => setAccentOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={accentOpen}
              >
                <span className="truncate">{accent.label}</span>
                <ChevronDown
                  size={14}
                  style={{
                    color: 'var(--subtle)',
                    transform: accentOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.15s',
                    flexShrink: 0,
                  }}
                />
              </button>

              <AnimatePresence>
                {accentOpen && (
                  <motion.ul
                    role="listbox"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute z-20 left-0 right-0 mt-1 rounded-xl border overflow-auto shadow-lg"
                    style={{
                      background: 'var(--surface-strong)',
                      borderColor: 'var(--border)',
                      maxHeight: '220px',
                      backdropFilter: 'blur(12px)',
                    }}
                  >
                    {ACCENT_OPTIONS.map((opt) => (
                      <li
                        key={opt.value}
                        role="option"
                        aria-selected={accent.value === opt.value}
                        className="px-3 py-2.5 cursor-pointer text-sm transition-colors"
                        style={{
                          background:
                            accent.value === opt.value ? 'var(--surface-muted)' : 'transparent',
                          color: 'var(--ink)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--surface-muted)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background =
                            accent.value === opt.value ? 'var(--surface-muted)' : 'transparent'
                        }}
                        onClick={() => {
                          setAccent(opt)
                          setAccentOpen(false)
                        }}
                      >
                        <span className="font-medium">{opt.label}</span>
                        {opt.description && (
                          <span className="ml-1.5 text-xs" style={{ color: 'var(--subtle)' }}>
                            {opt.description}
                          </span>
                        )}
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* Format picker */}
          <section
            className="rounded-2xl p-4 border backdrop-blur-sm"
            style={{ background: 'var(--surface-strong)', borderColor: 'var(--border)' }}
          >
            <label
              className="block text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: 'var(--muted)', letterSpacing: '0.08em' }}
            >
              Output Format
            </label>
            <div className="flex gap-2">
              {FORMAT_OPTIONS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  className={clsx(
                    'flex-1 rounded-xl py-2.5 text-sm font-medium border transition-colors',
                  )}
                  style={
                    format === f.value
                      ? {
                          background: 'var(--accent)',
                          borderColor: 'var(--accent)',
                          color: '#fff',
                        }
                      : {
                          background: 'var(--surface-muted)',
                          borderColor: 'var(--border)',
                          color: 'var(--ink-2)',
                        }
                  }
                  onClick={() => setFormat(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Voice Clone card */}
        <section
          className="rounded-2xl p-5 border backdrop-blur-sm"
          style={{ background: 'var(--surface-strong)', borderColor: 'var(--border)' }}
        >
          <label
            className="block text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: 'var(--muted)', letterSpacing: '0.08em' }}
          >
            Voice Clone (optional)
          </label>
          <p className="text-xs mb-3" style={{ color: 'var(--subtle)' }}>
            Upload a reference voice recording to clone its tone and style. Max 15 MB.
          </p>

          {referenceFilename ? (
            <div
              className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 border"
              style={{
                background: 'var(--surface-muted)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Mic size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span className="text-sm truncate" style={{ color: 'var(--ink)' }}>
                  {referenceFilename}
                </span>
              </div>
              <button
                type="button"
                onClick={clearReference}
                className="rounded-lg p-1 transition-colors"
                style={{ color: 'var(--subtle)' }}
                aria-label="Remove reference audio"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="w-full rounded-xl border-2 border-dashed py-4 flex flex-col items-center gap-1.5 transition-colors"
              style={{ borderColor: 'var(--border-strong)', color: 'var(--muted)' }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={18} />
              <span className="text-sm">Click to upload audio</span>
              <span className="text-xs" style={{ color: 'var(--subtle)' }}>
                MP3, WAV, M4A, OGG
              </span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {referenceDataUrl && (
            <div className="mt-3">
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: 'var(--muted)' }}
              >
                Reference transcript{' '}
                <span style={{ color: 'var(--subtle)' }}>(optional, improves quality)</span>
              </label>
              <input
                type="text"
                className="w-full rounded-xl px-3 py-2 text-sm border outline-none transition-colors"
                style={{
                  background: 'var(--surface-muted)',
                  borderColor: 'var(--border)',
                  color: 'var(--ink)',
                  fontFamily: 'inherit',
                }}
                placeholder="What does the recording say?"
                value={referenceTranscript}
                onChange={(e) => setReferenceTranscript(e.target.value)}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--focus)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                }}
              />
            </div>
          )}
        </section>

        {/* CTA */}
        <button
          type="button"
          disabled={!text.trim() || status === 'loading'}
          onClick={() => { void handleSynthesize() }}
          className="w-full rounded-2xl py-4 text-base font-semibold transition-all flex items-center justify-center gap-2"
          style={
            !text.trim() || status === 'loading'
              ? {
                  background: 'var(--surface-muted)',
                  color: 'var(--subtle)',
                  cursor: 'not-allowed',
                  border: '1px solid var(--border)',
                }
              : {
                  background: 'var(--accent)',
                  color: '#fff',
                  border: '1px solid var(--accent)',
                  cursor: 'pointer',
                }
          }
          onMouseEnter={(e) => {
            if (text.trim() && status !== 'loading') {
              e.currentTarget.style.background = 'var(--accent-hover)'
            }
          }}
          onMouseLeave={(e) => {
            if (text.trim() && status !== 'loading') {
              e.currentTarget.style.background = 'var(--accent)'
            }
          }}
        >
          {status === 'loading' ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Synthesizing…
            </>
          ) : (
            <>
              <Mic size={18} />
              Synthesize Voice
            </>
          )}
        </button>

        {/* Error */}
        <AnimatePresence>
          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="rounded-2xl px-4 py-3 flex items-start gap-3 border"
              style={{
                background: 'rgba(186,43,76,0.06)',
                borderColor: 'rgba(186,43,76,0.20)',
              }}
            >
              <AlertCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }} />
              <p className="text-sm" style={{ color: 'var(--danger)' }}>
                {errorMsg}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Audio result */}
        <AnimatePresence>
          {status === 'success' && audioUrl && (
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="rounded-2xl p-5 border backdrop-blur-sm"
              style={{ background: 'var(--surface-strong)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--success)' }}>
                  Audio ready
                </span>
              </div>

              {/* Native audio player */}
              <audio
                ref={audioRef}
                src={audioUrl}
                controls
                className="w-full rounded-xl"
                style={{ accentColor: 'var(--accent)' }}
              />

              {/* Actions */}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => { void audioRef.current?.play() }}
                  className="flex-1 rounded-xl py-2.5 text-sm font-medium border flex items-center justify-center gap-1.5 transition-colors"
                  style={{
                    background: 'var(--surface-muted)',
                    borderColor: 'var(--border)',
                    color: 'var(--ink)',
                  }}
                >
                  <Play size={14} />
                  Play
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex-1 rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                  style={{
                    background: 'var(--accent)',
                    color: '#fff',
                    border: '1px solid var(--accent)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--accent-hover)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--accent)'
                  }}
                >
                  <Download size={14} />
                  Download {format.toUpperCase()}
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
