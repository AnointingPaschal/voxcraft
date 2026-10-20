import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Mail, MessageSquare, User, Send, CheckCircle2 } from 'lucide-react'

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, delay },
})

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--subtle)' }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: '12px', fontSize: '14px',
  border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)',
  outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s',
}

export function ContactPage() {
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <div className="pt-16 min-h-screen">
      <div className="py-20 text-center px-4" style={{ background: 'var(--bg-alt)', borderBottom: '1px solid var(--border)' }}>
        <motion.div {...fade()}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>Get in touch</p>
          <h1 className="display text-5xl font-bold mb-4" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>Contact us</h1>
          <p className="text-lg" style={{ color: 'var(--muted)' }}>Questions? We&apos;d love to hear from you.</p>
        </motion.div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Info */}
        <motion.div {...fade(0.1)} className="space-y-6">
          <div>
            <h2 className="display text-2xl font-bold mb-3" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>We&apos;re here to help</h2>
            <p className="text-base leading-relaxed" style={{ color: 'var(--muted)' }}>
              Whether you have a question about features, pricing, need a demo, or want to discuss an enterprise deal — our team is ready to answer all your questions.
            </p>
          </div>
          {[
            { icon: Mail, label: 'Email', value: 'hello@voicera.ai' },
            { icon: MessageSquare, label: 'Support', value: 'support@voicera.ai' },
          ].map(c => (
            <div key={c.label} className="flex items-center gap-4 p-4 rounded-2xl border"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--accent-light)' }}>
                <c.icon size={16} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--subtle)' }}>{c.label}</p>
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{c.value}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Form */}
        <motion.div {...fade(0.2)}>
          {sent ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 rounded-3xl border"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <CheckCircle2 size={48} className="mb-4" style={{ color: 'var(--accent)' }} />
              <h3 className="font-bold text-xl mb-2" style={{ color: 'var(--ink)' }}>Message sent!</h3>
              <p style={{ color: 'var(--muted)' }}>We&apos;ll get back to you within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-3xl border"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Name">
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
                    <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Your name" style={{ ...inputStyle, paddingLeft: '36px' }} />
                  </div>
                </Field>
                <Field label="Email">
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
                    <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="you@example.com" style={{ ...inputStyle, paddingLeft: '36px' }} />
                  </div>
                </Field>
              </div>
              <Field label="Subject">
                <input required value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="How can we help?" style={inputStyle} />
              </Field>
              <Field label="Message">
                <textarea required rows={5} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Tell us more…" style={{ ...inputStyle, resize: 'vertical' }} />
              </Field>
              <button type="submit"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: 'var(--cta)', color: 'var(--cta-text)' }}>
                <Send size={15} /> Send Message
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  )
}
