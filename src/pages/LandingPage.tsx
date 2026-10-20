import { motion } from 'framer-motion'
import {
  AudioWaveform, Globe, Mic, Wand2, Zap, ShieldCheck,
  ArrowRight, Play, Star, CheckCircle2, ChevronRight
} from 'lucide-react'

interface Props { setPage: (p: string) => void }

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
})

const FEATURES = [
  { icon: Globe, title: '10+ African Accents', desc: 'Naija Pidgin, Lagos Executive, Ghanaian, Kenyan, South African, Yoruba, Igbo, Hausa and more.' },
  { icon: Mic, title: 'Voice Print Cloning', desc: 'Upload 5–15 seconds of clear speech to replicate any speaker\'s exact vocal identity.' },
  { icon: Wand2, title: 'Vocal Cue System', desc: 'Insert [laughing], [whispering], [excited], [pause] and other emotional markers naturally.' },
  { icon: Zap, title: 'Studio Quality', desc: 'MP3 44.1kHz and lossless WAV output powered by Fish Audio S2.1 Pro.' },
  { icon: ShieldCheck, title: 'Secure & Private', desc: 'Your scripts and voice prints are never stored or used for training.' },
  { icon: AudioWaveform, title: 'Real-time Synthesis', desc: 'Generate and download audio in seconds, not minutes. Average render time under 3s.' },
]

const TESTIMONIALS = [
  { name: 'Adaeze Okafor', role: 'Podcast Producer, Lagos', text: 'I use Voicera to produce intros in pure Naija Pidgin. The accent is spot-on — listeners always ask who the voice artist is.', stars: 5 },
  { name: 'Kwame Asante', role: 'Content Creator, Accra', text: 'The Ghanaian accent is the best I\'ve found anywhere. I\'ve tried 6 other TTS tools — none come close for African voices.', stars: 5 },
  { name: 'Nadia Kamau', role: 'E-learning Developer, Nairobi', text: 'We\'ve localised 40+ courses using Voicera. The team loves how natural the Kenyan accent sounds.', stars: 5 },
]

const STATS = [
  { value: '50K+', label: 'Audio clips generated' },
  { value: '120+', label: 'Countries reached' },
  { value: '10+', label: 'African accents' },
  { value: '< 3s', label: 'Average render time' },
]

export function LandingPage({ setPage }: Props) {
  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[100dvh] flex flex-col items-center justify-center text-center px-4 pt-24 pb-16 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)', filter: 'blur(60px)' }} />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-5"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)', filter: 'blur(80px)' }} />
        </div>

        <div className="relative max-w-3xl mx-auto">
          <motion.div {...fade(0)} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6 border"
            style={{ background: 'var(--accent-light)', color: 'var(--accent)', borderColor: 'rgba(32,210,160,0.3)' }}>
            <Zap size={12} />
            Powered by Fish Audio S2.1 Pro
          </motion.div>

          <motion.h1 {...fade(0.1)} className="display text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight text-balance mb-6"
            style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
            African Voice AI<br />
            <span className="gradient-text">Studio</span>
          </motion.h1>

          <motion.p {...fade(0.2)} className="text-lg sm:text-xl leading-relaxed text-pretty mb-8 mx-auto"
            style={{ color: 'var(--muted)', maxWidth: '540px' }}>
            Generate studio-quality speech in authentic African accents with voice cloning, vocal cues, and professional audio mastering.
          </motion.p>

          <motion.div {...fade(0.3)} className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={() => setPage('studio')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold transition-all hover:scale-105 active:scale-95"
              style={{ background: 'var(--cta)', color: 'var(--cta-text)', boxShadow: '0 4px 20px rgba(32,210,160,0.3)' }}>
              <AudioWaveform size={18} />
              Launch Studio — Free
              <ArrowRight size={16} />
            </button>
            <button onClick={() => setPage('voices')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-base font-medium transition-all hover:opacity-80"
              style={{ background: 'var(--surface-muted)', color: 'var(--ink)', border: '1px solid var(--border)' }}>
              <Play size={16} />
              Preview Voices
            </button>
          </motion.div>

          <motion.p {...fade(0.4)} className="mt-4 text-xs" style={{ color: 'var(--subtle)' }}>
            No credit card required &nbsp;&middot;&nbsp; 500 characters free daily
          </motion.p>
        </div>

        {/* Floating audio wave mockup */}
        <motion.div {...fade(0.5)} className="relative mt-16 w-full max-w-2xl mx-auto">
          <div className="glass rounded-3xl p-6 accent-glow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                <AudioWaveform size={14} color="white" />
              </div>
              <div className="flex-1">
                <div className="h-2.5 rounded-full w-48" style={{ background: 'var(--surface-muted)' }} />
                <div className="h-2 rounded-full w-28 mt-1.5" style={{ background: 'var(--surface-muted)', opacity: 0.6 }} />
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                Ready
              </span>
            </div>
            {/* Wave bars animation */}
            <div className="flex items-end justify-center gap-0.5 h-12">
              {Array.from({ length: 48 }).map((_, i) => (
                <motion.div key={i}
                  className="w-1 rounded-full flex-shrink-0"
                  style={{ background: i % 3 === 0 ? 'var(--accent)' : 'var(--border-strong)', minWidth: '4px' }}
                  animate={{ height: [`${20 + Math.sin(i * 0.5) * 18}px`, `${28 + Math.cos(i * 0.7) * 18}px`, `${20 + Math.sin(i * 0.5) * 18}px`] }}
                  transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.04, ease: 'easeInOut' }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Stats */}
      <section style={{ background: 'var(--bg-alt)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-5xl mx-auto px-4 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {STATS.map((s, i) => (
            <motion.div key={s.label} {...fade(i * 0.1)}>
              <p className="display text-3xl sm:text-4xl font-bold" style={{ color: 'var(--accent)' }}>{s.value}</p>
              <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-24">
        <motion.div {...fade()} className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>What we offer</p>
          <h2 className="display text-4xl sm:text-5xl font-bold text-balance" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
            Everything you need for<br />African voice generation
          </h2>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} {...fade(i * 0.07)}
              className="p-6 rounded-2xl border transition-all hover:-translate-y-1"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-light)' }}>
                <f.icon size={20} style={{ color: 'var(--accent)' }} />
              </div>
              <h3 className="font-semibold text-base mb-2" style={{ color: 'var(--ink)' }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="mx-4 sm:mx-6 max-w-7xl lg:mx-auto mb-24 rounded-3xl overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, var(--cta) 0%, #1a3a5c 100%)' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, var(--accent) 0%, transparent 60%)' }} />
        <div className="relative px-8 sm:px-12 py-14 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="display text-2xl sm:text-3xl font-bold mb-2 text-white text-balance">Ready to sound authentically African?</h2>
            <p className="text-sm sm:text-base" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Start generating for free. No setup. No credit card.
            </p>
          </div>
          <button onClick={() => setPage('studio')}
            className="flex-shrink-0 flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-semibold transition-all hover:scale-105"
            style={{ background: 'var(--accent)', color: 'var(--cta-text)' }}>
            Start for Free <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        <motion.div {...fade()} className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>Testimonials</p>
          <h2 className="display text-4xl sm:text-5xl font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
            Loved by creators across Africa
          </h2>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <motion.div key={t.name} {...fade(i * 0.1)}
              className="p-6 rounded-2xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="flex mb-3">
                {Array.from({ length: t.stars }).map((_, si) => (
                  <Star key={si} size={14} fill="currentColor" style={{ color: 'var(--accent)' }} />
                ))}
              </div>
              <p className="text-sm leading-relaxed mb-4 text-pretty" style={{ color: 'var(--ink-2)' }}>
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{t.name}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: 'var(--bg-alt)', borderTop: '1px solid var(--border)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-24">
          <motion.div {...fade()} className="text-center mb-14">
            <h2 className="display text-4xl font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
              Three steps to studio audio
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { n: '01', title: 'Write your script', desc: 'Type your script or paste existing content. Use vocal cues like [laughing] or [pause] for expression.' },
              { n: '02', title: 'Choose your voice', desc: 'Select an accent, pick from the voice library, or clone your own voice with a 10-second sample.' },
              { n: '03', title: 'Download & publish', desc: 'Get studio-quality MP3 or WAV in seconds. Ready for podcasts, ads, e-learning, or social media.' },
            ].map((s, i) => (
              <motion.div key={s.n} {...fade(i * 0.1)} className="text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 display text-2xl font-bold"
                  style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                  {s.n}
                </div>
                <h3 className="font-semibold text-lg mb-2" style={{ color: 'var(--ink)' }}>{s.title}</h3>
                <p className="text-sm leading-relaxed text-pretty" style={{ color: 'var(--muted)' }}>{s.desc}</p>
                {i < 2 && <ChevronRight size={20} className="mx-auto mt-6 hidden sm:block" style={{ color: 'var(--border-strong)' }} />}
              </motion.div>
            ))}
          </div>
          <motion.div {...fade(0.3)} className="text-center mt-12">
            <button onClick={() => setPage('studio')}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold transition-all hover:scale-105"
              style={{ background: 'var(--cta)', color: 'var(--cta-text)' }}>
              <AudioWaveform size={18} /> Start Creating
            </button>
          </motion.div>
        </div>
      </section>

      {/* Plan teaser */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-24">
        <motion.div {...fade()} className="text-center mb-12">
          <h2 className="display text-4xl font-bold mb-3" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>Simple, transparent pricing</h2>
          <p style={{ color: 'var(--muted)' }}>Start free. Upgrade when you need more.</p>
        </motion.div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <motion.div {...fade(0.1)} className="w-full sm:w-64 p-6 rounded-2xl text-center border"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>Free</p>
            <p className="display text-3xl font-bold my-2" style={{ color: 'var(--ink)' }}>$0</p>
            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>500 chars/day</p>
            {['3 accents', 'MP3 output', 'Basic quality'].map(f => (
              <div key={f} className="flex items-center gap-2 text-sm mb-1.5">
                <CheckCircle2 size={14} style={{ color: 'var(--accent)' }} />
                <span style={{ color: 'var(--muted)' }}>{f}</span>
              </div>
            ))}
            <button onClick={() => setPage('studio')} className="mt-4 w-full py-2.5 rounded-xl text-sm font-medium border transition-all"
              style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}>Get started</button>
          </motion.div>

          <motion.div {...fade(0.2)} className="w-full sm:w-72 p-6 rounded-2xl text-center relative border-2 scale-105"
            style={{ background: 'var(--surface-strong)', borderColor: 'var(--accent)', boxShadow: '0 0 30px rgba(32,210,160,0.15)' }}>
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: 'var(--accent)', color: 'white' }}>Most Popular</span>
            <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>Pro</p>
            <p className="display text-3xl font-bold my-2" style={{ color: 'var(--ink)' }}>$15<span className="text-base font-normal" style={{ color: 'var(--muted)' }}>/mo</span></p>
            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>25,000 chars/day</p>
            {['All accents', 'MP3 + WAV', 'Voice cloning', 'Priority render'].map(f => (
              <div key={f} className="flex items-center gap-2 text-sm mb-1.5">
                <CheckCircle2 size={14} style={{ color: 'var(--accent)' }} />
                <span style={{ color: 'var(--muted)' }}>{f}</span>
              </div>
            ))}
            <button onClick={() => setPage('plans')} className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: 'var(--accent)', color: 'white' }}>Upgrade to Pro</button>
          </motion.div>

          <motion.div {...fade(0.3)} className="w-full sm:w-64 p-6 rounded-2xl text-center border"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>Enterprise</p>
            <p className="display text-3xl font-bold my-2" style={{ color: 'var(--ink)' }}>$49<span className="text-base font-normal" style={{ color: 'var(--muted)' }}>/mo</span></p>
            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>Unlimited</p>
            {['All features', 'API access', 'Custom voices', 'Dedicated support'].map(f => (
              <div key={f} className="flex items-center gap-2 text-sm mb-1.5">
                <CheckCircle2 size={14} style={{ color: 'var(--accent)' }} />
                <span style={{ color: 'var(--muted)' }}>{f}</span>
              </div>
            ))}
            <button onClick={() => setPage('plans')} className="mt-4 w-full py-2.5 rounded-xl text-sm font-medium border transition-all"
              style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}>View plans</button>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
