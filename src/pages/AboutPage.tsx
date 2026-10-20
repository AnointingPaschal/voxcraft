import { motion } from 'framer-motion'
import { AudioWaveform, Globe, Zap, Heart } from 'lucide-react'

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.55, delay },
})

interface Props { setPage: (p: string) => void }

export function AboutPage({ setPage }: Props) {
  return (
    <div className="pt-16 min-h-screen">
      {/* Hero */}
      <div className="py-20 text-center px-4" style={{ background: 'var(--bg-alt)', borderBottom: '1px solid var(--border)' }}>
        <motion.div {...fade()}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>Our Story</p>
          <h1 className="display text-5xl font-bold mb-6 text-balance" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
            Built by Africans,<br />for African voices
          </h1>
          <p className="text-lg leading-relaxed text-pretty mx-auto" style={{ color: 'var(--muted)', maxWidth: '560px' }}>
            We noticed that most AI voice tools sound awkward with African accents — mispronounced words, wrong tones, and that unmistakably foreign delivery. Voicera exists to fix that.
          </p>
        </motion.div>
      </div>

      {/* Mission */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[
            { icon: Globe, title: 'Our Mission', desc: 'To make authentic African-accented AI voice generation accessible to every creator, business, and developer on the continent.' },
            { icon: Zap, title: 'Our Tech', desc: 'We use Fish Audio\'s S2.1 Pro acoustic engine — one of the most capable speech synthesis models available — tuned specifically for African phonetics.' },
            { icon: Heart, title: 'Our Values', desc: 'Authenticity first. We never ship a voice that doesn\'t sound right to a native ear. Our accents are tested by real people from each region.' },
            { icon: AudioWaveform, title: 'Our Impact', desc: 'Powering podcasts, ads, e-learning, audiobooks, and IVR systems across Nigeria, Ghana, Kenya, South Africa, and beyond.' },
          ].map((c, i) => (
            <motion.div key={c.title} {...fade(i * 0.1)} className="p-6 rounded-2xl border"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-light)' }}>
                <c.icon size={18} style={{ color: 'var(--accent)' }} />
              </div>
              <h3 className="font-semibold mb-2" style={{ color: 'var(--ink)' }}>{c.title}</h3>
              <p className="text-sm leading-relaxed text-pretty" style={{ color: 'var(--muted)' }}>{c.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center pb-24 px-4">
        <motion.div {...fade()}>
          <button onClick={() => setPage('studio')}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold transition-all hover:scale-105"
            style={{ background: 'var(--cta)', color: 'var(--cta-text)' }}>
            <AudioWaveform size={18} /> Try Voicera Free
          </button>
        </motion.div>
      </div>
    </div>
  )
}
