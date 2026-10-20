import { motion } from 'framer-motion'
import { Globe, Mic, Wand2, Zap, ShieldCheck, AudioWaveform, Clock, Download, Headphones, Layers, Star, Code2 } from 'lucide-react'

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] },
})

const SECTIONS = [
  {
    icon: Globe, title: '10+ African Accents', tag: 'Accents',
    desc: 'From the crisp tones of Lagos Executive to the melodic rhythm of Ghanaian English, every accent is meticulously trained on native speakers.',
    bullets: ['Nigerian Pidgin & Standard', 'Lagos Executive & Eko', 'Ghanaian English', 'Kenyan English', 'South African English', 'Yoruba-inflected', 'Igbo-inflected', 'Hausa-inflected'],
  },
  {
    icon: Mic, title: 'Voice Print Cloning', tag: 'Clone',
    desc: 'Upload 5–15 seconds of clear speech and Voicera will replicate the exact vocal identity — tone, pitch, pacing, and accent.',
    bullets: ['Works with any speaker', 'Preserves native inflection', 'No special equipment needed', 'Clone from phone recordings'],
  },
  {
    icon: Wand2, title: 'Vocal Cue System', tag: 'Expression',
    desc: 'Go beyond plain text. Insert bracketed cues directly in your script to control emotion, timing, and delivery style.',
    bullets: ['[laughing] [excited] [sigh]', '[whispering] [pause] [fast]', '[singing] [crying] [serious]', 'Custom cue combinations'],
  },
  {
    icon: Headphones, title: 'Studio Quality Audio', tag: 'Quality',
    desc: 'Every render passes through Fish Audio\'s S2.1 Pro acoustic engine — the same technology used in professional broadcast studios.',
    bullets: ['MP3 44.1kHz standard', 'Lossless WAV output', 'Low-latency streaming', 'Consistent loudness normalisation'],
  },
]

const QUICK = [
  { icon: Clock, label: '< 3 seconds', sub: 'Average render time' },
  { icon: Download, label: 'MP3 + WAV', sub: 'Output formats' },
  { icon: Zap, label: 'Instant', sub: 'No queuing' },
  { icon: Layers, label: '3,000 chars', sub: 'Per request' },
  { icon: ShieldCheck, label: 'Encrypted', sub: 'Audio transit' },
  { icon: Code2, label: 'API ready', sub: 'Enterprise plan' },
  { icon: Star, label: '5-star', sub: 'User rated' },
  { icon: AudioWaveform, label: 'Fish S2.1', sub: 'AI engine' },
]

interface Props { setPage: (p: string) => void }

export function FeaturesPage({ setPage }: Props) {
  return (
    <div className="pt-16 min-h-screen">
      {/* Header */}
      <div className="py-20 text-center px-4" style={{ background: 'var(--bg-alt)', borderBottom: '1px solid var(--border)' }}>
        <motion.div {...fade()}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>Features</p>
          <h1 className="display text-5xl font-bold mb-4 text-balance" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
            Built for authentic African voices
          </h1>
          <p className="text-lg" style={{ color: 'var(--muted)', maxWidth: '520px', margin: '0 auto' }}>
            Every feature is designed specifically for African content creators, not adapted from generic TTS tools.
          </p>
        </motion.div>
      </div>

      {/* Quick stats */}
      <div style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-4 sm:grid-cols-8 gap-4">
          {QUICK.map((q, i) => (
            <motion.div key={q.label} {...fade(i * 0.05)} className="text-center">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: 'var(--accent-light)' }}>
                <q.icon size={16} style={{ color: 'var(--accent)' }} />
              </div>
              <p className="text-xs font-bold" style={{ color: 'var(--ink)' }}>{q.label}</p>
              <p className="text-xs" style={{ color: 'var(--subtle)' }}>{q.sub}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Feature deep dives */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 space-y-24">
        {SECTIONS.map((s, i) => (
          <motion.div key={s.title} {...fade(0.1)} className={`flex flex-col ${i % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12`}>
            <div className="flex-1">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4"
                style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                {s.tag}
              </span>
              <h2 className="display text-3xl sm:text-4xl font-bold mb-4 text-balance" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
                {s.title}
              </h2>
              <p className="text-base leading-relaxed mb-6 text-pretty" style={{ color: 'var(--muted)', maxWidth: '440px' }}>
                {s.desc}
              </p>
              <ul className="space-y-2">
                {s.bullets.map(b => (
                  <li key={b} className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--ink-2)' }}>
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--accent)' }} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-1 w-full">
              <div className="glass rounded-3xl p-8 aspect-[4/3] flex items-center justify-center"
                style={{ border: '1px solid var(--border)' }}>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: 'var(--accent-light)' }}>
                    <s.icon size={28} style={{ color: 'var(--accent)' }} />
                  </div>
                  <p className="font-semibold" style={{ color: 'var(--ink)' }}>{s.title}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* CTA */}
      <div className="text-center pb-24 px-4">
        <motion.div {...fade()}>
          <h2 className="display text-3xl font-bold mb-4" style={{ color: 'var(--ink)' }}>Ready to experience it?</h2>
          <button onClick={() => setPage('studio')}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold transition-all hover:scale-105"
            style={{ background: 'var(--cta)', color: 'var(--cta-text)' }}>
            <AudioWaveform size={18} /> Open Studio Free
          </button>
        </motion.div>
      </div>
    </div>
  )
}
