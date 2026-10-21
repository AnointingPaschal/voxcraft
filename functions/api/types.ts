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

// Master list of every platform feature that can be toggled per plan.
// Keep IDs stable — they are persisted in KV.
export const PLATFORM_FEATURES = [
  // Accents
  { id: 'accent_all',        category: 'Accents',        label: 'All Accents (10+)',              description: 'Unlock all regional accents' },
  { id: 'accent_african',    category: 'Accents',        label: 'African Accents Only',            description: 'Nigerian, Ghanaian, Kenyan, S.African' },
  // Formats
  { id: 'format_mp3',        category: 'Output Format',  label: 'MP3 Export',                     description: 'Standard compressed audio' },
  { id: 'format_wav',        category: 'Output Format',  label: 'WAV Export',                     description: 'Lossless studio-quality audio' },
  // Voice cloning
  { id: 'voice_clone',       category: 'Voice Cloning',  label: 'Voice Print Cloning',            description: 'Upload reference audio to clone a voice' },
  { id: 'voice_library',     category: 'Voice Cloning',  label: 'Voice Library Selection',        description: 'Pick from admin-curated voice samples' },
  // Vocal cues
  { id: 'vocal_cues',        category: 'Script Editor',  label: 'Vocal Cue Insertion',            description: '[laughing], [pause], [whispering] etc.' },
  { id: 'script_templates',  category: 'Script Editor',  label: 'Script Templates',               description: 'Pidgin Broadcast, Documentary, Executive' },
  // Performance
  { id: 'perf_style',        category: 'Performance',    label: 'Performance Style Picker',       description: 'Conversational, Dramatic, Newscaster etc.' },
  { id: 'pacing_control',    category: 'Performance',    label: 'Pacing / Speed Control',         description: 'Adjust speech rate 0.5×–2×' },
  // Quality
  { id: 'priority_queue',    category: 'Quality',        label: 'Priority Processing Queue',      description: 'Jobs processed first' },
  { id: 'batch_synthesis',   category: 'Quality',        label: 'Batch Synthesis',                description: 'Submit multiple scripts at once' },
  // Downloads
  { id: 'download_audio',    category: 'Downloads',      label: 'Audio Download',                 description: 'Download the generated MP3/WAV file' },
  { id: 'history',           category: 'Downloads',      label: 'Generation History',             description: 'Access past synthesized audio files' },
  // API
  { id: 'api_access',        category: 'API',            label: 'API Access',                     description: 'Programmatic access via REST API' },
] as const

export type FeatureId = typeof PLATFORM_FEATURES[number]['id']

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
