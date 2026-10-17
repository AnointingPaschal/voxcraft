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

export interface Plan {
  id: 'free' | 'starter' | 'pro' | 'enterprise'
  name: string
  price: number
  priceNgn?: number
  tokensPerDay: number
  features: string[]
  popular?: boolean
  flwPlanId?: string
}

export interface SiteConfig {
  // ── Identity ────────────────────────────────
  siteName: string
  tagline: string
  logoUrl: string
  primaryColor: string
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
