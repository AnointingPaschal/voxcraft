import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Play, Square } from 'lucide-react'
import type { VoiceSample } from '../lib/api'

interface Props {
  voices: VoiceSample[]
  selected: VoiceSample | null
  onSelect: (v: VoiceSample) => void
  onClose: () => void
}

export default function VoicePicker({ voices, selected, onSelect, onClose }: Props) {
  const [filter, setFilter] = useState<'all' | 'female' | 'male'>('all')
  const [playing, setPlaying] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const filtered = voices.filter(v =>
    filter === 'all' ? true : v.gender === filter
  )

  function handleListen(v: VoiceSample, e: React.MouseEvent) {
    e.stopPropagation()
    if (!v.audioDataUrl) return
    if (playing === v.id) {
      audioRef.current?.pause()
      setPlaying(null)
      return
    }
    if (audioRef.current) {
      audioRef.current.pause()
    }
    const audio = new Audio(v.audioDataUrl)
    audioRef.current = audio
    audio.play().catch(() => {})
    setPlaying(v.id)
    audio.onended = () => setPlaying(null)
  }

  // stop audio on unmount
  useEffect(() => () => { audioRef.current?.pause() }, [])

  // lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // close on backdrop click
  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  function getInitials(name: string) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  return createPortal(
    <div
      className="voice-picker-backdrop"
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Choose a voice"
    >
      <div className="voice-picker-sheet">
        {/* drag handle */}
        <div className="voice-picker-handle" />

        {/* header */}
        <div className="voice-picker-header">
          <div>
            <h2 className="voice-picker-title">Choose a voice</h2>
            <p className="voice-picker-sub">
              {voices.length} voice{voices.length !== 1 ? 's' : ''} available
            </p>
          </div>
          <button type="button" onClick={onClose} className="voice-picker-close" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* gender filter */}
        <div className="voice-picker-filters">
          {(['all', 'female', 'male'] as const).map(f => (
            <button
              key={f}
              type="button"
              className={`voice-picker-filter-btn${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* grid */}
        <div className="voice-picker-grid">
          {filtered.length === 0 && (
            <p className="voice-picker-empty col-span-2">No voices match this filter.</p>
          )}
          {filtered.map(v => {
            const isSelected = selected?.id === v.id
            const isPlaying = playing === v.id
            return (
              <button
                key={v.id}
                type="button"
                className={`voice-picker-card${isSelected ? ' selected' : ''}`}
                onClick={() => { onSelect(v); onClose() }}
              >
                {/* avatar */}
                <div className="voice-picker-avatar">
                  {v.imageDataUrl
                    ? <img src={v.imageDataUrl} alt={v.name} />
                    : <span>{getInitials(v.name)}</span>
                  }
                  {isSelected && (
                    <span className="voice-picker-avatar-check">✓</span>
                  )}
                </div>
                <span className="voice-picker-name">{v.name}</span>
                {v.description && (
                  <span className="voice-picker-desc">{v.description}</span>
                )}
                {v.audioDataUrl && (
                  <span
                    className={`voice-picker-listen${isPlaying ? ' playing' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={e => handleListen(v, e)}
                    onKeyDown={e => { if (e.key === 'Enter') handleListen(v, e as unknown as React.MouseEvent) }}
                    aria-label={isPlaying ? 'Stop preview' : 'Listen to voice'}
                  >
                    {isPlaying ? <Square size={10} /> : <Play size={10} />}
                    {isPlaying ? 'Stop' : 'Listen'}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
  )
}
