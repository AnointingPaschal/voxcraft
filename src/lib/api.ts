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

export interface VoiceSample {
  id: string
  name: string
  accent: string
  description: string
  audioDataUrl: string
  updatedAt: number
  gender?: 'male' | 'female' | 'neutral'  // gender of the voice preset
}

// Studio configuration managed by the admin
export interface AccentOption { label: string; value: string }
export interface ScriptTemplate { label: string; text: string }

export interface StudioConfig {
  accentOptions: AccentOption[]
  perfStyles: string[]
  vocalCues: string[]
  scriptTemplates: ScriptTemplate[]
  timbreOptions: string[]
  speedMin: number
  speedMax: number
  speedDefault: number
  maxChars: number
}

const DEFAULT_STUDIO_CONFIG: StudioConfig = {
  accentOptions: [
    { label: 'Nigerian Pidgin', value: 'Nigerian Pidgin English accent, Naija street style' },
    { label: 'Nigerian (Standard)', value: 'Nigerian Standard English accent, educated and clear' },
    { label: 'Lagos Executive', value: 'Lagos professional English, polished Nigerian accent' },
    { label: 'Ghanaian English', value: 'Ghanaian English accent, West African intonation' },
    { label: 'Kenyan English', value: 'Kenyan English accent, East African intonation' },
    { label: 'South African', value: 'South African English accent' },
    { label: 'Jamaican Patois', value: 'Jamaican Patois accent and cadence' },
    { label: 'British RP', value: 'British Received Pronunciation, crisp and clear' },
    { label: 'American Midwest', value: 'American Midwest neutral accent' },
    { label: 'Middle Eastern / Arabic', value: 'Middle Eastern English accent with Arabic inflection' },
    { label: 'No accent hint', value: '' },
  ],
  perfStyles: [
    'Natural & Conversational', 'Broadcast & Authoritative', 'Storytelling & Narrative',
    'Energetic & Excited', 'Calm & Soothing', 'Documentary', 'Corporate & Professional',
  ],
  vocalCues: ['[laughing]', '[sigh]', '[excited]', '[whispering]', '[pause]', '[nervous]', '[crying]'],
  scriptTemplates: [
    { label: 'Pidgin Broadcast', text: 'How far my people! [laughing] Make una gather here sharp sharp. Dis new studio voice engine sabi speak better Naija Pidgin well well, everything clean without stress!' },
    { label: 'Lagos Executive', text: 'Good morning, esteemed colleagues. Today, we present an innovative solution that will transform the African technology landscape and deliver measurable value to our stakeholders.' },
    { label: 'Documentary', text: 'Across the vast savannahs of East Africa, ancient traditions meet the pulse of modern innovation. This is a story of resilience, culture, and the unbreakable human spirit.' },
  ],
  timbreOptions: ['Male', 'Female', 'Auto / Match'],
  speedMin: 0.5,
  speedMax: 2.0,
  speedDefault: 1.0,
  maxChars: 3000,
}

export async function getStudioConfig(): Promise<StudioConfig> {
  try {
    const raw = await fetch(`${BASE}/studio-config`)
    if (!raw.ok) return DEFAULT_STUDIO_CONFIG
    const data: unknown = await raw.json()
    if (typeof data === 'object' && data !== null && 'accentOptions' in data) return data as StudioConfig
    return DEFAULT_STUDIO_CONFIG
  } catch { return DEFAULT_STUDIO_CONFIG }
}

export { DEFAULT_STUDIO_CONFIG }

export interface Plan {
  id: 'free' | 'starter' | 'pro' | 'enterprise'
  name: string
  price: number
  priceNgn?: number
  tokensPerDay: number
  tokenBillingMode?: 'day' | 'month'   // default 'day' when absent
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

export async function adminGetStudioConfig(): Promise<StudioConfig> {
  try { return handle(await fetch(`${BASE}/admin/studio-config`, { headers: headers() })) }
  catch { return DEFAULT_STUDIO_CONFIG }
}

export async function adminPutStudioConfig(cfg: StudioConfig): Promise<void> {
  return handle(await fetch(`${BASE}/admin/studio-config`, { method: 'PUT', headers: headers(), body: JSON.stringify(cfg) }))
}
