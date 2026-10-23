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
  pitchMin: number
  pitchMax: number
  pitchDefault: number
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
  pitchMin: -12,
  pitchMax: 12,
  pitchDefault: 0,
  maxChars: 10000,
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
  tokenBillingMode?: 'day' | 'month'
  tokenPeriod?: 'day' | 'month'
  features: string[]
  enabledFeatures?: FeatureId[]
  historyRetentionDays?: number
  popular?: boolean
  flwPlanId?: string
}

export interface AudioHistoryItem {
  id: string
  createdAt: number
  expiresAt: number
  script: string
  accent: string
  format: string
  chars: number
}

export async function getHistory(): Promise<AudioHistoryItem[]> {
  return handle(await fetch(`${BASE}/history`, { headers: headers() }))
}

export async function deleteHistoryItem(id: string): Promise<void> {
  await fetch(`${BASE}/history/${id}`, { method: 'DELETE', headers: headers() })
}

export function getHistoryAudioUrl(id: string): string {
  return `${BASE}/history/${id}`
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
// Each accent maps to an accentKey that matches AccentOption.label exactly
export const ACCENT_FEATURES = [
  { id: 'accent_nigerian_pidgin',  accentKey: 'Nigerian Pidgin',         category: 'Accents', label: 'Nigerian Pidgin',         description: 'Naija street style, casual and energetic' },
  { id: 'accent_nigerian_std',     accentKey: 'Nigerian (Standard)',     category: 'Accents', label: 'Nigerian (Standard)',     description: 'Educated Nigerian English, clear' },
  { id: 'accent_lagos_exec',       accentKey: 'Lagos Executive',         category: 'Accents', label: 'Lagos Executive',         description: 'Polished Lagos professional English' },
  { id: 'accent_ghanaian',         accentKey: 'Ghanaian English',        category: 'Accents', label: 'Ghanaian English',        description: 'West African intonation, Ghana' },
  { id: 'accent_kenyan',           accentKey: 'Kenyan English',          category: 'Accents', label: 'Kenyan English',          description: 'East African intonation, Kenya' },
  { id: 'accent_south_african',    accentKey: 'South African',           category: 'Accents', label: 'South African',           description: 'South African English accent' },
  { id: 'accent_jamaican',         accentKey: 'Jamaican Patois',         category: 'Accents', label: 'Jamaican Patois',         description: 'Caribbean cadence and Patois rhythm' },
  { id: 'accent_british',          accentKey: 'British RP',              category: 'Accents', label: 'British RP',              description: 'British Received Pronunciation' },
  { id: 'accent_american',         accentKey: 'American Midwest',        category: 'Accents', label: 'American Midwest',        description: 'Neutral American Midwest accent' },
  { id: 'accent_middle_eastern',   accentKey: 'Middle Eastern / Arabic', category: 'Accents', label: 'Middle Eastern / Arabic', description: 'Arabic-inflected English' },
] as const

export const PLATFORM_FEATURES = [
  ...ACCENT_FEATURES,
  // Output
  { id: 'format_mp3',        accentKey: '',  category: 'Output Format',  label: 'MP3 Export',                  description: 'Standard compressed audio' },
  { id: 'format_wav',        accentKey: '',  category: 'Output Format',  label: 'WAV Export',                  description: 'Lossless studio-quality audio' },
  // Voice
  { id: 'voice_clone',       accentKey: '',  category: 'Voice Cloning',  label: 'Voice Print Cloning',         description: 'Upload reference audio to clone a voice' },
  { id: 'voice_library',     accentKey: '',  category: 'Voice Cloning',  label: 'Voice Library Selection',     description: 'Pick from admin-curated voice samples' },
  // Script
  { id: 'vocal_cues',        accentKey: '',  category: 'Script Editor',  label: 'Vocal Cue Insertion',         description: '[laughing], [pause], [whispering] etc.' },
  { id: 'script_templates',  accentKey: '',  category: 'Script Editor',  label: 'Script Templates',            description: 'Pidgin Broadcast, Documentary, Executive' },
  // Performance
  { id: 'perf_style',        accentKey: '',  category: 'Performance',    label: 'Performance Style Picker',    description: 'Conversational, Dramatic, Newscaster etc.' },
  { id: 'pacing_control',    accentKey: '',  category: 'Performance',    label: 'Pacing / Speed Control',      description: 'Adjust speech rate 0.5×–2×' },
  { id: 'speed_control',     accentKey: '',  category: 'Performance',    label: 'Advanced Speed Control',       description: 'Bake generation speed into the synthesized audio (0.5×–2×)' },
  { id: 'pitch_control',     accentKey: '',  category: 'Performance',    label: 'Voice Pitch Shifting',         description: 'Shift voice pitch up/down in semitones (−12 to +12)' },
  // Quality
  { id: 'priority_queue',    accentKey: '',  category: 'Quality',        label: 'Priority Processing Queue',   description: 'Jobs processed first' },
  { id: 'batch_synthesis',   accentKey: '',  category: 'Quality',        label: 'Batch Synthesis',             description: 'Submit multiple scripts at once' },
  // Downloads
  { id: 'download_audio',    accentKey: '',  category: 'Downloads',      label: 'Audio Download',              description: 'Download the generated MP3/WAV file' },
  { id: 'history',           accentKey: '',  category: 'Downloads',      label: 'Generation History',          description: 'Access past synthesized audio files' },
  // API
  { id: 'api_access',        accentKey: '',  category: 'API',            label: 'API Access',                  description: 'Programmatic access via REST API' },
] as const

export type FeatureId = typeof PLATFORM_FEATURES[number]['id']
export type AccentFeatureId = typeof ACCENT_FEATURES[number]['id']

// Map accentKey → featureId for quick lookup
export const ACCENT_KEY_TO_FEATURE: Record<string, AccentFeatureId> = Object.fromEntries(
  ACCENT_FEATURES.map(f => [f.accentKey, f.id])
)

export interface UsageData {
  tokensUsed: number
  limit: number
  remaining: number
  plan: string
  period: 'day' | 'month'
  enabledFeatures: FeatureId[]
  historyRetentionDays: number
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
export async function initPayment(planId: string, currency = 'USD'): Promise<{ link: string; txRef: string }> {
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

// ── Voices ────────────────────────────────────────────────────────────────────
export interface VoiceProfile {
  id: string; name: string; accent: string
  gender: 'male' | 'female' | 'neutral'
  description: string; tags: string[]; sampleUrl: string
  previewTranscript?: string; createdAt: number
}

export async function getVoices(): Promise<VoiceProfile[]> {
  return handle(await fetch(`${BASE}/voices`))
}

export async function adminGetVoices(): Promise<VoiceProfile[]> {
  return handle(await fetch(`${BASE}/admin/voices`, { headers: headers() }))
}

export async function adminCreateVoice(data: Partial<VoiceProfile> & { sampleDataUrl?: string }): Promise<VoiceProfile> {
  return handle(await fetch(`${BASE}/admin/voices`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }))
}

export async function adminDeleteVoice(id: string): Promise<void> {
  return handle(await fetch(`${BASE}/admin/voices/${id}`, { method: 'DELETE', headers: headers() }))
}

export async function adminGetStudioConfig(): Promise<StudioConfig> {
  try { return handle(await fetch(`${BASE}/admin/studio-config`, { headers: headers() })) }
  catch { return DEFAULT_STUDIO_CONFIG }
}

export async function adminPutStudioConfig(cfg: StudioConfig): Promise<void> {
  return handle(await fetch(`${BASE}/admin/studio-config`, { method: 'PUT', headers: headers(), body: JSON.stringify(cfg) }))
}
