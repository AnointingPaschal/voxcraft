import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, Download, Search, Mic2, Globe, Loader2 } from 'lucide-react'

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, delay },
})

export interface VoiceProfile {
  id: string
  name: string
  accent: string
  gender: 'male' | 'female' | 'neutral'
  description: string
  tags: string[]
  sampleUrl: string
  previewTranscript?: string
  createdAt: number
}

interface Props {
  setPage: (p: string) => void
  onSelectVoice?: (v: VoiceProfile) => void
  embedded?: boolean
}

const ACCENTS = ['All', 'Nigerian Pidgin', 'Lagos Executive', 'Ghanaian', 'Kenyan', 'South African', 'Yoruba', 'Igbo', 'British', 'American']
const GENDERS = ['All', 'Male', 'Female', 'Neutral']

export function VoicesPage({ setPage, onSelectVoice, embedded = false }: Props) {
  const [voices, setVoices] = useState<VoiceProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [accent, setAccent] = useState('All')
  const [gender, setGender] = useState('All')
  const [playing, setPlaying] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    fetch('/api/voices')
      .then(r => r.json())
      .then((d: unknown) => {
        if (Array.isArray(d)) setVoices(d as VoiceProfile[])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = voices.filter(v => {
    const q = search.toLowerCase()
    const matchSearch = !q || v.name.toLowerCase().includes(q) || v.accent.toLowerCase().includes(q) || v.tags.some(t => t.toLowerCase().includes(q))
    const matchAccent = accent === 'All' || v.accent === accent
    const matchGender = gender === 'All' || v.gender === gender.toLowerCase()
    return matchSearch && matchAccent && matchGender
  })

  const togglePlay = (v: VoiceProfile) => {
    if (playing === v.id) {
      audioRef.current?.pause()
      setPlaying(null)
      return
    }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = '' }
    const audio = new Audio(v.sampleUrl)
    audioRef.current = audio
    audio.play().then(() => setPlaying(v.id)).catch(() => setPlaying(null))
    audio.onended = () => setPlaying(null)
  }

  const handleSelect = (v: VoiceProfile) => {
    setSelected(v.id)
    onSelectVoice?.(v)
    if (!embedded) setPage('studio')
  }

  return (
    <div className={embedded ? '' : 'pt-16 min-h-screen'}>
      {!embedded && (
        <div className="py-16 text-center px-4" style={{ background: 'var(--bg-alt)', borderBottom: '1px solid var(--border)' }}>
          <motion.div {...fade()}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>Voice Library</p>
            <h1 className="display text-4xl sm:text-5xl font-bold mb-4" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
              Find your perfect voice
            </h1>
            <p className="text-base sm:text-lg" style={{ color: 'var(--muted)', maxWidth: '500px', margin: '0 auto' }}>
              Browse, preview, and select from our curated library of African voice profiles.
            </p>
          </motion.div>
        </div>
      )}

      <div className={`max-w-7xl mx-auto px-4 sm:px-6 ${embedded ? 'py-4' : 'py-10'}`}>
        {/* Filters */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, accent, or tag..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border outline-none transition-all"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--ink)', fontFamily: 'inherit' }} />
          </div>
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map(a => (
              <button key={a} onClick={() => setAccent(a)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  background: accent === a ? 'var(--accent)' : 'var(--surface-muted)',
                  color: accent === a ? 'white' : 'var(--muted)',
                  border: '1px solid',
                  borderColor: accent === a ? 'var(--accent)' : 'var(--border)',
                }}>
                {a}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {GENDERS.map(g => (
              <button key={g} onClick={() => setGender(g)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  background: gender === g ? 'var(--accent-light)' : 'var(--surface-muted)',
                  color: gender === g ? 'var(--accent)' : 'var(--muted)',
                  border: '1px solid',
                  borderColor: gender === g ? 'var(--accent)' : 'var(--border)',
                }}>
                {g}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <Mic2 size={40} className="mx-auto mb-4" style={{ color: 'var(--border-strong)' }} />
            <p className="font-medium" style={{ color: 'var(--ink)' }}>No voices found</p>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
              {voices.length === 0 ? 'The admin hasn\'t uploaded any voices yet.' : 'Try a different search or filter.'}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((v, i) => (
            <motion.div key={v.id} {...fade(i * 0.05)}
              className="p-4 rounded-2xl border transition-all hover:-translate-y-0.5 cursor-pointer"
              style={{
                background: selected === v.id ? 'var(--accent-light)' : 'var(--surface)',
                borderColor: selected === v.id ? 'var(--accent)' : 'var(--border)',
                boxShadow: selected === v.id ? '0 0 0 2px var(--accent)' : 'var(--shadow-sm)',
              }}
              onClick={() => handleSelect(v)}>
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg"
                    style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                    {v.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{v.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Globe size={10} style={{ color: 'var(--muted)' }} />
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>{v.accent}</p>
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                  style={{ background: 'var(--surface-muted)', color: 'var(--muted)' }}>
                  {v.gender}
                </span>
              </div>

              {v.description && (
                <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--muted)' }}>{v.description}</p>
              )}

              {/* Tags */}
              {v.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {v.tags.slice(0, 3).map(t => (
                    <span key={t} className="px-2 py-0.5 rounded-full text-xs"
                      style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button onClick={e => { e.stopPropagation(); togglePlay(v) }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-all"
                  style={{ background: playing === v.id ? 'var(--accent)' : 'var(--surface-muted)', color: playing === v.id ? 'white' : 'var(--muted)' }}>
                  {playing === v.id ? <Pause size={13} /> : <Play size={13} />}
                  {playing === v.id ? 'Playing…' : 'Preview'}
                </button>
                <button onClick={e => { e.stopPropagation(); handleSelect(v) }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                  style={{ background: selected === v.id ? 'var(--accent)' : 'var(--surface-muted)', color: selected === v.id ? 'white' : 'var(--ink)' }}>
                  {selected === v.id ? <Download size={13} /> : 'Use'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
