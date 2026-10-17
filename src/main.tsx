/*
 *  ███████╗████████╗██╗   ██╗██████╗ ██╗ ██████╗
 *  ██╔════╝╚══██╔══╝██║   ██║██╔══██╗██║██╔═══██╗
 *  ███████╗   ██║   ██║   ██║██║  ██║██║██║   ██║
 *  ╚════██║   ██║   ██║   ██║██║  ██║██║██║   ██║
 *  ███████║   ██║   ╚██████╔╝██████╔╝██║╚██████╔╝
 *  ╚══════╝   ╚═╝    ╚═════╝ ╚═════╝ ╚═╝ ╚═════╝
 *
 *  Built with Arc Studio
 *  https://studio.arc.io
 */

import './tracing'
import './console-capture'

// ── Apply cached palette SYNCHRONOUSLY before first paint ─────────────────────
// This eliminates the hardcoded-green flash that occurs while the API loads.
;(function restorePalette() {
  try {
    const raw = localStorage.getItem('vc_palette')
    if (!raw) return
    const { light, dark, brand } = JSON.parse(raw) as {
      light: Record<string, string>
      dark: Record<string, string>
      brand: string
    }
    const theme = (localStorage.getItem('vc_theme') ?? 'light') as 'light' | 'dark'
    const palette = theme === 'dark' ? dark : light
    const r = document.documentElement
    const entries: [string, string][] = [
      ['--site-bg', palette.background], ['--site-surface', palette.surface],
      ['--site-text', palette.text], ['--site-muted', palette.muted],
      ['--site-border', palette.border], ['--site-accent', brand ?? palette.accent],
      ['--bg', palette.background], ['--page', palette.background],
      ['--paper', palette.surface], ['--paper-2', palette.surface],
      ['--surface', palette.surface], ['--ink', palette.text],
      ['--ink-soft', palette.text], ['--ink-2', palette.text],
      ['--muted-ink', palette.muted], ['--subtle', palette.muted],
      ['--line', palette.border], ['--border', palette.border],
      ['--accent', brand ?? palette.accent],
      ['--accent-deep', brand ?? palette.accent],
      ['--accent-hover', brand ?? palette.accent],
      ['--land-bg', palette.background], ['--land-panel', palette.surface],
      ['--land-ink', palette.text], ['--land-muted', palette.muted],
      ['--land-line', palette.border], ['--land-accent', brand ?? palette.accent],
      ['--auth-bg', palette.background], ['--auth-surface', palette.surface],
      ['--auth-text', palette.text], ['--auth-muted', palette.muted],
      ['--auth-border', palette.border], ['--auth-accent', brand ?? palette.accent],
      ['--plans-bg', palette.background], ['--plans-surface', palette.surface],
      ['--plans-text', palette.text], ['--plans-muted', palette.muted],
      ['--plans-border', palette.border], ['--plans-accent', brand ?? palette.accent],
      ['--admin-bg', palette.background], ['--admin-surface', palette.surface],
      ['--admin-text', palette.text], ['--admin-muted', palette.muted],
      ['--admin-border', palette.border], ['--admin-accent', brand ?? palette.accent],
    ]
    entries.forEach(([k, v]) => v && r.style.setProperty(k, v))
    r.dataset.theme = theme
  } catch { /* ignore */ }
})()

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectKitProvider } from 'connectkit'
import { Toaster } from 'sonner'
import { config } from './config'
import App from './App'
import { AuthProvider } from './hooks/useAuth'
import './index.css'

const queryClient = new QueryClient()



createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>
          <AuthProvider>
            <App />
            <Toaster position="top-center" />
          </AuthProvider>
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)

