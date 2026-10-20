import { AudioWaveform, Github, Twitter, Mail } from 'lucide-react'

interface FooterProps { setPage: (p: string) => void }

const YEAR = new Date().getFullYear()

export function Footer({ setPage }: FooterProps) {
  const year = YEAR
  return (
    <footer style={{ background: 'var(--bg-alt)', borderTop: '1px solid var(--border)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                <AudioWaveform size={18} color="white" />
              </div>
              <span className="font-bold text-lg display" style={{ color: 'var(--ink)' }}>Voicera</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)', maxWidth: '220px' }}>
              African Voice AI Studio — generate studio-quality speech in any African accent.
            </p>
            <div className="flex items-center gap-3 mt-5">
              {[
                { icon: Twitter, href: '#' },
                { icon: Github, href: '#' },
                { icon: Mail, href: 'mailto:hello@voicera.ai' },
              ].map(({ icon: Icon, href }) => (
                <a key={href} href={href}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: 'var(--surface-muted)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--subtle)' }}>Product</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Studio', page: 'studio' },
                { label: 'Features', page: 'features' },
                { label: 'Voice Library', page: 'voices' },
                { label: 'Pricing', page: 'plans' },
              ].map(l => (
                <li key={l.page}>
                  <button onClick={() => setPage(l.page)} className="text-sm transition-all hover:opacity-100"
                    style={{ color: 'var(--muted)' }}>
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--subtle)' }}>Company</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'About', page: 'about' },
                { label: 'Blog', page: 'home' },
                { label: 'Careers', page: 'home' },
                { label: 'Contact', page: 'contact' },
              ].map(l => (
                <li key={l.label}>
                  <button onClick={() => setPage(l.page)} className="text-sm transition-all hover:opacity-100"
                    style={{ color: 'var(--muted)' }}>
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--subtle)' }}>Legal</h4>
            <ul className="space-y-2.5">
              {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Refund Policy'].map(l => (
                <li key={l}>
                  <button className="text-sm transition-all hover:opacity-100" style={{ color: 'var(--muted)' }}>{l}</button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs" style={{ color: 'var(--subtle)' }}>
            &copy; {year} Voicera. All rights reserved.
          </p>
          <p className="text-xs" style={{ color: 'var(--subtle)' }}>
            Powered by Fish Audio S2.1 Pro
          </p>
        </div>
      </div>
    </footer>
  )
}
