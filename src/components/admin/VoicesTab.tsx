import { useState, useEffect, useRef, type ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Play, Pause, Upload, Loader2, Mic2, Tag, X } from 'lucide-react'
import { adminGetVoices, adminCreateVoice, adminDeleteVoice, type VoiceProfile } from '@/lib/api'
import { toast } from 'sonner'

const T = {
  bg: 'var(--bg)', surface: 'var(--surface)', border: 'var(--border)',
  ink: 'var(--ink)', muted: 'var(--muted)', accent: 'var(--accent)',
  accentLight: 'var(--accent-light)', danger: 'var(--danger)',
}

const ACCENTS = ['Nigerian Pidgin', 'Lagos Executive', 'Ghanaian', 'Kenyan', 'South African', 'Yoruba', 'Igbo', 'Hausa', 'British RP', 'American', 'Other']

export function VoicesTab() {
  const [voices, setVoices] = useState<VoiceProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [playing, setPlaying] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [tagInput, setTagInput] = useState('')

  const [form, setForm] = useState({
    name: '', accent: ACCENTS[0], gender: 'neutral' as 'male' | 'female' | 'neutral',
    description: '', tags: [] as string[], previewTranscript: '',
    sampleDataUrl: '',
  })

  useEffect(() => {
    adminGetVoices().then(setVoices).catch(console.error).finally(() => setLoading(false))
  }, [])

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Sample audio must be under 5MB'); return }
    const reader = new FileReader()
    reader.onload = ev => setForm(f => ({ ...f, sampleDataUrl: ev.target?.result as string }))
    reader.readAsDataURL(file)
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !form.tags.includes(t)) setForm(f => ({ ...f, tags: [...f.tags, t] }))
    setTagInput('')
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    if (!form.sampleDataUrl) { toast.error('Upload a sample audio file'); return }
    setSaving(true)
    try {
      const v = await adminCreateVoice(form)
      setVoices(vs => [v, ...vs])
      setShowForm(false)
      setForm({ name: '', accent: ACCENTS[0], gender: 'neutral', description: '', tags: [], previewTranscript: '', sampleDataUrl: '' })
      toast.success('Voice added!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save voice')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      await adminDeleteVoice(id)
      setVoices(vs => vs.filter(v => v.id !== id))
      toast.success('Voice removed')
    } catch { toast.error('Failed to delete') }
  }

  const togglePlay = (v: VoiceProfile) => {
    if (playing === v.id) { audioRef.current?.pause(); setPlaying(null); return }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = '' }
    const audio = new Audio(v.sampleUrl)
    audioRef.current = audio
    audio.play().then(() => setPlaying(v.id)).catch(() => setPlaying(null))
    audio.onended = () => setPlaying(null)
  }

  const iStyle = {
    width: '100%', padding: '8px 12px', borderRadius: '10px', fontSize: '13px',
    border: `1px solid ${T.border}`, background: 'rgba(0,0,0,0.12)', color: T.ink,
    outline: 'none', fontFamily: 'inherit',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold" style={{ color: T.ink }}>Voice Library</h2>
          <p className="text-sm mt-0.5" style={{ color: T.muted }}>{voices.length} voices available to users</p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{ background: T.accent, color: '#fff' }}>
          <Plus size={15} /> Add Voice
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden">
            <div className="p-5 rounded-2xl border" style={{ background: T.surface, borderColor: T.border }}>
              <h3 className="font-semibold mb-4 text-sm" style={{ color: T.ink }}>Add New Voice Profile</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs mb-1" style={{ color: T.muted }}>Voice Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Chioma" style={iStyle} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: T.muted }}>Accent *</label>
                  <select value={form.accent} onChange={e => setForm(f => ({ ...f, accent: e.target.value }))}
                    style={{ ...iStyle }}>
                    {ACCENTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: T.muted }}>Gender</label>
                  <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value as 'male' | 'female' | 'neutral' }))}
                    style={{ ...iStyle }}>
                    {['male', 'female', 'neutral'].map(g => <option key={g} value={g} className="capitalize">{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: T.muted }}>Preview Transcript (optional)</label>
                  <input value={form.previewTranscript} onChange={e => setForm(f => ({ ...f, previewTranscript: e.target.value }))}
                    placeholder="What the sample says" style={iStyle} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs mb-1" style={{ color: T.muted }}>Description</label>
                  <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Brief description of this voice..." style={iStyle} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs mb-1" style={{ color: T.muted }}>Tags</label>
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {form.tags.map(t => (
                      <span key={t} className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs"
                        style={{ background: T.accentLight, color: T.accent }}>
                        {t}
                        <button onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }))}><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addTag()}
                      placeholder="Add tag (press Enter)" style={{ ...iStyle, flex: 1 }} />
                    <button onClick={addTag} className="px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: T.accentLight, color: T.accent }}>
                      <Tag size={13} />
                    </button>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs mb-2" style={{ color: T.muted }}>Sample Audio * (MP3 or WAV, max 5MB)</label>
                  <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all"
                    style={{ borderColor: form.sampleDataUrl ? T.accent : T.border, background: 'rgba(0,0,0,0.08)' }}>
                    <Upload size={18} style={{ color: form.sampleDataUrl ? T.accent : T.muted }} />
                    <span className="text-xs" style={{ color: form.sampleDataUrl ? T.accent : T.muted }}>
                      {form.sampleDataUrl ? 'Audio loaded — click to replace' : 'Click to upload sample audio'}
                    </span>
                    <input type="file" accept="audio/*" onChange={handleFile} className="hidden" />
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm" style={{ color: T.muted }}>Cancel</button>
                <button onClick={() => { void handleSave() }} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: T.accent, color: '#fff', opacity: saving ? 0.7 : 1 }}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Mic2 size={14} />}
                  {saving ? 'Saving…' : 'Save Voice'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && <div className="flex justify-center py-12"><Loader2 className="animate-spin" style={{ color: T.accent }} /></div>}

      {!loading && voices.length === 0 && !showForm && (
        <div className="text-center py-16 border-2 border-dashed rounded-2xl" style={{ borderColor: T.border }}>
          <Mic2 size={36} className="mx-auto mb-3" style={{ color: T.border }} />
          <p className="font-medium" style={{ color: T.ink }}>No voices yet</p>
          <p className="text-sm mt-1 mb-4" style={{ color: T.muted }}>Add your first voice profile above.</p>
        </div>
      )}

      <div className="space-y-3">
        {voices.map(v => (
          <div key={v.id} className="flex items-center gap-4 p-4 rounded-2xl border"
            style={{ background: T.surface, borderColor: T.border }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold flex-shrink-0"
              style={{ background: T.accentLight, color: T.accent }}>
              {v.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm" style={{ color: T.ink }}>{v.name}</p>
              <p className="text-xs" style={{ color: T.muted }}>{v.accent} &middot; {v.gender}</p>
              {v.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {v.tags.slice(0, 3).map((tag: string) => (
                    <span key={tag} className="px-1.5 py-0.5 rounded text-xs" style={{ background: T.accentLight, color: T.accent }}>{tag}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => togglePlay(v)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                style={{ background: playing === v.id ? T.accent : T.accentLight, color: playing === v.id ? '#fff' : T.accent }}>
                {playing === v.id ? <Pause size={13} /> : <Play size={13} />}
              </button>
              <button onClick={() => { void handleDelete(v.id) }}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
                style={{ background: 'rgba(186,43,76,0.1)', color: T.danger }}>
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
