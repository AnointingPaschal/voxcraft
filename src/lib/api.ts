const BASE = '/api'

function token(): string | null {
  return localStorage.getItem('vc_token')
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', ...extra }
  const t = token()
  if (t) h['Authorization'] = `Bearer ${t}`
  return h
}

async function handle<T>(res: Response): Promise<T> {
  const data: unknown = await res.json()
  if (!res.ok) {
    const msg = (typeof data === 'object' && data !== null && 'error' in data)
      ? (data as { error?: string }).error
      : undefined
    throw new Error(msg ?? `HTTP ${res.status}`)
  }
  return data as T
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string
  email: string
  name: string
  avatar?: string
  plan: 'free' | 'starter' | 'pro' | 'enterprise'
  role: 'user' | 'admin'
  createdAt: number
  emailVerified: boolean
  subscriptionExpiry?: number
}

export async function register(email: string, password: string, name: string): Promise<{ token: string; user: AuthUser }> {
  return handle(await fetch(`${BASE}/auth/register`, { method: 'POST', headers: headers(), body: JSON.stringify({ email, password, name }) }))
}

export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  return handle(await fetch(`${BASE}/auth/login`, { method: 'POST', headers: headers(), body: JSON.stringify({ email, password }) }))
}

export async function getGoogleUrl(): Promise<{ url: string }> {
  return handle(await fetch(`${BASE}/auth/google`, { headers: headers() }))
}

export async function getMe(): Promise<{ user: AuthUser }> {
  return handle(await fetch(`${BASE}/auth/me`, { headers: headers() }))
}

// ── Config & Plans ────────────────────────────────────────────────────────────
export interface ThemePalette { background: string; surface: string; text: string; muted: string; border: string; accent: string }

export interface SiteConfig {
  siteName: string
  tagline: string
  logoUrl: string
  primaryColor: string
  lightPalette: ThemePalette
  darkPalette: ThemePalette
  allowThemeToggle: boolean
  supportEmail: string
  maintenanceMode: boolean
  // Contact page details
  contactPhone?: string
  contactAddress?: string
  contactCity?: string
  contactTwitter?: string
  contactInstagram?: string
  contactLinkedin?: string
  contactWhatsapp?: string
}

export interface VoiceSample { id: string; name: string; accent: string; description: string; audioDataUrl: string; updatedAt: number }

export interface Plan {
  id: 'free' | 'starter' | 'pro' | 'enterprise'
  name: string
  price: number
  priceNgn?: number
  tokensPerDay: number
  features: string[]
  popular?: boolean
}

export async function getPublicConfig(): Promise<SiteConfig> {
  return handle(await fetch(`${BASE}/config`))
}

export async function getVoiceSamples(): Promise<VoiceSample[]> {
  return handle(await fetch(`${BASE}/voices`))
}

export async function getPlans(): Promise<Plan[]> {
  return handle(await fetch(`${BASE}/plans`))
}

// ── Usage ─────────────────────────────────────────────────────────────────────
export interface UsageData {
  tokensUsed: number
  limit: number
  remaining: number
  plan: string
}

export async function getUsage(): Promise<UsageData> {
  return handle(await fetch(`${BASE}/usage`, { headers: headers() }))
}

// ── TTS ───────────────────────────────────────────────────────────────────────
export async function synthesize(body: Record<string, unknown>): Promise<{ blob: Blob; remaining: number }> {
  const res = await fetch(`${BASE}/synthesize`, { method: 'POST', headers: headers(), body: JSON.stringify(body) })
  if (!res.ok) {
    const raw: unknown = await res.json()
    const msg = (typeof raw === 'object' && raw !== null && 'error' in raw ? (raw as { error?: string }).error : undefined) ?? 'Synthesis failed'
    throw new Error(msg)
  }
  const remaining = parseInt(res.headers.get('X-Tokens-Remaining') ?? '0', 10)
  const blob = await res.blob()
  return { blob, remaining }
}

// ── Payment ───────────────────────────────────────────────────────────────────
export async function initPayment(planId: string, currency: 'USD' | 'NGN' = 'USD'): Promise<{ link: string; txRef: string }> {
  return handle(await fetch(`${BASE}/payment/init`, { method: 'POST', headers: headers(), body: JSON.stringify({ planId, currency }) }))
}

export async function verifyPayment(txRef: string): Promise<{ success: boolean; plan: string; user: AuthUser }> {
  return handle(await fetch(`${BASE}/payment/verify`, { method: 'POST', headers: headers(), body: JSON.stringify({ txRef }) }))
}

// ── Setup ─────────────────────────────────────────────────────────────────────
export async function getSetupStatus(): Promise<{ setupComplete: boolean; hasJwtSecret: boolean }> {
  return handle(await fetch(`${BASE}/setup/status`))
}

export async function runSetup(body: { adminEmail: string; adminPassword: string; adminName: string; jwtSecret: string; siteName: string }): Promise<{ success: boolean; token: string; user: AuthUser }> {
  return handle(await fetch(`${BASE}/setup/init`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }))
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export interface FullSiteConfig extends SiteConfig {
  openrouterApiKey: string
  openrouterModel: string
  // Auth / Security
  jwtSecret: string
  adminEmail: string
  // Google OAuth
  googleClientId: string
  googleClientSecret: string
  googleRedirectUri: string
  // Flutterwave
  flutterwavePublicKey: string
  flutterwaveSecretKey: string
  flutterwaveEncryptionKey: string
  flutterwaveWebhookHash: string
  setupComplete: boolean
  updatedAt: number
}

export async function adminGetConfig(): Promise<FullSiteConfig> {
  return handle(await fetch(`${BASE}/admin/config`, { headers: headers() }))
}

export async function adminPatchConfig(patch: Partial<FullSiteConfig>): Promise<FullSiteConfig> {
  return handle(await fetch(`${BASE}/admin/config`, { method: 'PATCH', headers: headers(), body: JSON.stringify(patch) }))
}

export async function adminGetVoiceSamples(): Promise<VoiceSample[]> {
  return handle(await fetch(`${BASE}/admin/voices`, { headers: headers() }))
}

export async function adminPutVoiceSamples(voices: VoiceSample[]): Promise<void> {
  return handle(await fetch(`${BASE}/admin/voices`, { method: 'PUT', headers: headers(), body: JSON.stringify(voices) }))
}

export async function adminGetPlans(): Promise<Plan[]> {
  return handle(await fetch(`${BASE}/admin/plans`, { headers: headers() }))
}

export async function adminPutPlans(plans: Plan[]): Promise<void> {
  return handle(await fetch(`${BASE}/admin/plans`, { method: 'PUT', headers: headers(), body: JSON.stringify(plans) }))
}

export async function adminGetUsers(): Promise<AuthUser[]> {
  return handle(await fetch(`${BASE}/admin/users`, { headers: headers() }))
}

export async function adminPatchUser(id: string, patch: { plan?: string; role?: string }): Promise<AuthUser> {
  return handle(await fetch(`${BASE}/admin/users/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(patch) }))
}

export interface AdminStats {
  totalUsers: number
  planCounts: Record<string, number>
  plans: Plan[]
}

export async function adminGetStats(): Promise<AdminStats> {
  return handle(await fetch(`${BASE}/admin/stats`, { headers: headers() }))
}
