import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { History, Play, Pause, Download, Trash2, Loader2, Clock, Mic, FileAudio, Crown, Search, X } from 'lucide-react'
import { getHistory, deleteHistoryItem, getHistoryAudioUrl, type AudioHistoryItem } from '../../lib/api'

interface Props {
  onPlans: () => void
  hasHistory: boolean
  retentionDays: number
}

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function timeLeft(expiresAt: number, now: number): string {
  const diff = expiresAt - now
  if (diff <= 0) return 'Expired'
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  if (days > 0) return `${days}d ${hours}h left`
  return `${hours}h left`
}

function ExpiryBadge({ expiresAt, now }: { expiresAt: number; now: number }) {
  const diff = expiresAt - now
  const days = diff / 86400000
  const color = days < 1 ? 'text-red-500 bg-red-50' : days < 3 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50'
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
      <Clock size={9} />{timeLeft(expiresAt, now)}
    </span>
  )
}

export default function HistoryPage({ onPlans, hasHistory, retentionDays }: Props) {
  const [items, setItems] = useState<AudioHistoryItem[]>([])
  const [loading, setLoading] = useState(hasHistory)
  const [search, setSearch] = useState('')
  const [playing, setPlaying] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  // Stable "now" snapshot: initialised once from useState (not Date.now() in render)
  const [now] = useState<number>(() => Date.now())

  useEffect(() => {
    if (!hasHistory) return
    getHistory()
      .then(data => setItems(data.sort((a, b) => b.createdAt - a.createdAt)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [hasHistory])

  const handlePlay = (id: string) => {
    if (playing === id) {
      audioRef.current?.pause()
      setPlaying(null)
      return
    }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = '' }
    const audio = new Audio(getHistoryAudioUrl(id))
    audio.onended = () => setPlaying(null)
    audio.onerror = () => setPlaying(null)
    audioRef.current = audio
    void audio.play()
    setPlaying(id)
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      await deleteHistoryItem(id)
      if (playing === id) { audioRef.current?.pause(); setPlaying(null) }
      setItems(prev => prev.filter(i => i.id !== id))
    } finally { setDeleting(null) }
  }

  const filtered = items.filter(i =>
    !search || i.script.toLowerCase().includes(search.toLowerCase()) || i.accent.toLowerCase().includes(search.toLowerCase())
  )

  const T = {
    bg: 'var(--site-bg)',
    surface: 'var(--site-surface)',
    text: 'var(--site-text)',
    muted: 'var(--site-muted)',
    border: 'var(--site-border)',
    accent: 'var(--site-accent)',
  }

  if (!hasHistory) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: T.bg }}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full text-center rounded-3xl p-8" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: `${T.accent}15` }}>
            <History size={28} style={{ color: T.accent }} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: T.text }}>History Not Available</h2>
          <p className="text-sm mb-6" style={{ color: T.muted }}>
            Audio history is available on Pro and Enterprise plans. Upgrade to keep your generated audio for up to 90 days.
          </p>
          <button onClick={onPlans}
            className="w-full py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2"
            style={{ background: T.accent, color: '#fff' }}>
            <Crown size={15} /> View Plans
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: T.bg }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-4 border-b" style={{ background: T.bg, borderColor: T.border }}>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${T.accent}15` }}>
                <History size={18} style={{ color: T.accent }} />
              </div>
              <div>
                <h1 className="text-lg font-bold" style={{ color: T.text }}>Audio History</h1>
                <p className="text-xs" style={{ color: T.muted }}>
                  {items.length} recording{items.length !== 1 ? 's' : ''} · kept for {retentionDays} days
                </p>
              </div>
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.muted }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by script or accent…"
              className="w-full rounded-xl pl-9 pr-9 py-2.5 text-sm outline-none"
              style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: T.muted }}>
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin" style={{ color: T.accent }} />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-16">
            <FileAudio size={40} className="mx-auto mb-3" style={{ color: T.muted }} />
            <p className="text-sm font-medium" style={{ color: T.muted }}>
              {search ? 'No results match your search' : 'No audio generated yet'}
            </p>
            {!search && <p className="text-xs mt-1" style={{ color: T.muted }}>Generate audio in the studio — it will appear here.</p>}
          </motion.div>
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {filtered.map((item, i) => (
                <motion.div key={item.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                  {/* Top row */}
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handlePlay(item.id)}
                      className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center transition-all"
                      style={{ background: playing === item.id ? T.accent : `${T.accent}15`, color: playing === item.id ? '#fff' : T.accent }}>
                      {playing === item.id ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug mb-1 line-clamp-2" style={{ color: T.text }}>
                        {item.script || '(no script preview)'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {item.accent && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                            style={{ background: `${T.accent}12`, color: T.accent }}>
                            <Mic size={9} />{item.accent.split(' ')[0]}
                          </span>
                        )}
                        <span className="text-xs uppercase font-mono px-2 py-0.5 rounded-full"
                          style={{ background: `${T.border}`, color: T.muted }}>
                          {item.format}
                        </span>
                        <span className="text-xs" style={{ color: T.muted }}>{item.chars.toLocaleString()} chars</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom row */}
                  <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${T.border}` }}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: T.muted }}>{formatDate(item.createdAt)}</span>
                      <ExpiryBadge expiresAt={item.expiresAt} now={now} />
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={getHistoryAudioUrl(item.id)} download={`voicera-${item.id}.${item.format}`}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                        style={{ background: `${T.accent}12`, color: T.accent }}>
                        <Download size={13} />
                      </a>
                      <button
                        onClick={() => { void handleDelete(item.id) }}
                        disabled={deleting === item.id}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                        style={{ background: 'rgba(239,68,68,.1)', color: '#ef4444' }}>
                        {deleting === item.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
