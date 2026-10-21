export interface Env {
  KV: KVNamespace
  ENVIRONMENT: string
  // All of these are OPTIONAL — can be set from Admin panel and stored in KV instead
  ADMIN_EMAIL?: string
  JWT_SECRET?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  GOOGLE_REDIRECT_URI?: string
  FLUTTERWAVE_PUBLIC_KEY?: string
  FLUTTERWAVE_SECRET_KEY?: string
  FLUTTERWAVE_ENCRYPTION_KEY?: string
  FLUTTERWAVE_WEBHOOK_HASH?: string
}

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  passwordHash?: string
  provider: 'email' | 'google'
  plan: 'free' | 'starter' | 'pro' | 'enterprise'
  role: 'user' | 'admin'
  createdAt: number
  emailVerified: boolean
  flwCustomerId?: string
  subscriptionId?: string
  subscriptionExpiry?: number
}

// Individual accent feature flags — accentKey matches AccentOption.label exactly
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
  { id: 'format_mp3',        accentKey: '', category: 'Output Format',  label: 'MP3 Export',                 description: 'Standard compressed audio' },
  { id: 'format_wav',        accentKey: '', category: 'Output Format',  label: 'WAV Export',                 description: 'Lossless studio-quality audio' },
  { id: 'voice_clone',       accentKey: '', category: 'Voice Cloning',  label: 'Voice Print Cloning',        description: 'Upload reference audio to clone a voice' },
  { id: 'voice_library',     accentKey: '', category: 'Voice Cloning',  label: 'Voice Library Selection',    description: 'Pick from admin-curated voice samples' },
  { id: 'vocal_cues',        accentKey: '', category: 'Script Editor',  label: 'Vocal Cue Insertion',        description: '[laughing], [pause], [whispering] etc.' },
  { id: 'script_templates',  accentKey: '', category: 'Script Editor',  label: 'Script Templates',           description: 'Pidgin Broadcast, Documentary, Executive' },
  { id: 'perf_style',        accentKey: '', category: 'Performance',    label: 'Performance Style Picker',   description: 'Conversational, Dramatic, Newscaster etc.' },
  { id: 'pacing_control',    accentKey: '', category: 'Performance',    label: 'Pacing / Speed Control',     description: 'Adjust speech rate 0.5×–2×' },
  { id: 'priority_queue',    accentKey: '', category: 'Quality',        label: 'Priority Processing Queue',  description: 'Jobs processed first' },
  { id: 'batch_synthesis',   accentKey: '', category: 'Quality',        label: 'Batch Synthesis',            description: 'Submit multiple scripts at once' },
  { id: 'download_audio',    accentKey: '', category: 'Downloads',      label: 'Audio Download',             description: 'Download the generated MP3/WAV file' },
  { id: 'history',           accentKey: '', category: 'Downloads',      label: 'Generation History',         description: 'Access past synthesized audio files' },
  { id: 'api_access',        accentKey: '', category: 'API',            label: 'API Access',                 description: 'Programmatic access via REST API' },
] as const

export type FeatureId = typeof PLATFORM_FEATURES[number]['id']
export type AccentFeatureId = typeof ACCENT_FEATURES[number]['id']

// accentKey → featureId lookup for backend enforcement
export const ACCENT_KEY_TO_FEATURE: Record<string, AccentFeatureId> = Object.fromEntries(
  ACCENT_FEATURES.map(f => [f.accentKey, f.id])
)

export interface Plan {
  id: 'free' | 'starter' | 'pro' | 'enterprise'
  name: string
  price: number
  priceNgn?: number
  tokensPerDay: number
  tokenPeriod?: 'day' | 'month'
  features: string[]          // display text lines (kept for Pricing page)
  enabledFeatures?: FeatureId[] // functional feature flags
  popular?: boolean
  flwPlanId?: string
}

export interface ThemePalette { background: string; surface: string; text: string; muted: string; border: string; accent: string }

export interface SiteConfig {
  // ── Identity ────────────────────────────────
  siteName: string
  tagline: string
  logoUrl: string
  primaryColor: string
  lightPalette: ThemePalette
  darkPalette: ThemePalette
  allowThemeToggle: boolean
  supportEmail: string
  // ── Voice Engine ────────────────────────────
  openrouterApiKey: string
  openrouterModel: string
  // ── Auth / Security ─────────────────────────
  jwtSecret: string
  adminEmail: string
  // ── Google OAuth ────────────────────────────
  googleClientId: string
  googleClientSecret: string
  googleRedirectUri: string
  // ── Flutterwave ─────────────────────────────
  flutterwavePublicKey: string
  flutterwaveSecretKey: string
  flutterwaveEncryptionKey: string
  flutterwaveWebhookHash: string
  // ── System ──────────────────────────────────
  maintenanceMode: boolean
  setupComplete: boolean
  updatedAt: number
}

export interface UsageRecord {
  userId: string
  date: string
  tokensUsed: number
  lastUpdated: number
}

export interface JWTPayload {
  sub: string
  email: string
  role: 'user' | 'admin'
  plan: string
  iat: number
  exp: number
}

export interface VoiceSample {
  id: string
  name: string
  accent: string
  description: string
  audioDataUrl: string
  updatedAt: number
}

export interface PaymentRecord {
  id: string
  userId: string
  plan: Plan['id']
  amount: number
  currency: string
  status: 'pending' | 'successful' | 'failed'
  flwRef?: string
  txRef: string
  createdAt: number
}
