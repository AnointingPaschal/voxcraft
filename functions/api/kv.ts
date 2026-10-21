import type { Env, User, SiteConfig, Plan, UsageRecord, PaymentRecord, VoiceSample } from './types'

// ── Key helpers ──────────────────────────────────────────────────────────────
export const keys = {
  user: (id: string) => `user:${id}`,
  userByEmail: (email: string) => `email:${email.toLowerCase()}`,
  siteConfig: () => 'config:site',
  plans: () => 'config:plans',
  voices: () => 'config:voices',
  usage: (userId: string, date: string) => `usage:${userId}:${date}`,
  payment: (txRef: string) => `payment:${txRef}`,
  userList: () => 'list:users',
  pendingVerify: (token: string) => `verify:${token}`,
  passwordReset: (token: string) => `reset:${token}`,
  oauthState: (state: string) => `oauth:${state}`,
}

// ── Config ────────────────────────────────────────────────────────────────────
const DEFAULT_CONFIG: SiteConfig = {
  siteName: 'VoxCraft Studio',
  tagline: 'African Voice AI Studio',
  logoUrl: '',
  primaryColor: '#20d2a0',
  lightPalette: { background: '#f4f6f1', surface: '#ffffff', text: '#17251f', muted: '#65746a', border: '#dfe8dd', accent: '#087f62' },
  darkPalette: { background: '#09151a', surface: '#102329', text: '#eef8f2', muted: '#9aaca2', border: '#294039', accent: '#43d9a5' },
  allowThemeToggle: true,
  supportEmail: '',
  openrouterApiKey: '',
  openrouterModel: 'fish-audio/s2.1-pro-free:free',
  jwtSecret: '',
  adminEmail: '',
  googleClientId: '',
  googleClientSecret: '',
  googleRedirectUri: '',
  flutterwavePublicKey: '',
  flutterwaveSecretKey: '',
  flutterwaveEncryptionKey: '',
  flutterwaveWebhookHash: '',
  maintenanceMode: false,
  setupComplete: false,
  updatedAt: 0,
}

export async function getSiteConfig(env: Env): Promise<SiteConfig> {
  const stored = await env.KV.get<SiteConfig>(keys.siteConfig(), 'json')
  const merged = { ...DEFAULT_CONFIG, ...(stored ?? {}) }
  // Env secrets take precedence only if KV is empty for that field
  if (!merged.jwtSecret && env.JWT_SECRET) merged.jwtSecret = env.JWT_SECRET
  if (!merged.adminEmail && env.ADMIN_EMAIL) merged.adminEmail = env.ADMIN_EMAIL
  if (!merged.googleClientId && env.GOOGLE_CLIENT_ID) merged.googleClientId = env.GOOGLE_CLIENT_ID
  if (!merged.googleClientSecret && env.GOOGLE_CLIENT_SECRET) merged.googleClientSecret = env.GOOGLE_CLIENT_SECRET
  if (!merged.googleRedirectUri && env.GOOGLE_REDIRECT_URI) merged.googleRedirectUri = env.GOOGLE_REDIRECT_URI
  if (!merged.flutterwavePublicKey && env.FLUTTERWAVE_PUBLIC_KEY) merged.flutterwavePublicKey = env.FLUTTERWAVE_PUBLIC_KEY
  if (!merged.flutterwaveSecretKey && env.FLUTTERWAVE_SECRET_KEY) merged.flutterwaveSecretKey = env.FLUTTERWAVE_SECRET_KEY
  if (!merged.flutterwaveEncryptionKey && env.FLUTTERWAVE_ENCRYPTION_KEY) merged.flutterwaveEncryptionKey = env.FLUTTERWAVE_ENCRYPTION_KEY
  if (!merged.flutterwaveWebhookHash && env.FLUTTERWAVE_WEBHOOK_HASH) merged.flutterwaveWebhookHash = env.FLUTTERWAVE_WEBHOOK_HASH
  return merged
}

export async function putSiteConfig(env: Env, patch: Partial<SiteConfig>): Promise<SiteConfig> {
  const current = await getSiteConfig(env)
  const next = { ...current, ...patch, updatedAt: Date.now() }
  await env.KV.put(keys.siteConfig(), JSON.stringify(next))
  return next
}

// ── Users ────────────────────────────────────────────────────────────────────
export async function getUser(env: Env, id: string): Promise<User | null> {
  return env.KV.get<User>(keys.user(id), 'json')
}

export async function getUserByEmail(env: Env, email: string): Promise<User | null> {
  const id = await env.KV.get(keys.userByEmail(email))
  if (!id) return null
  return getUser(env, id)
}

export async function putUser(env: Env, user: User): Promise<void> {
  await Promise.all([
    env.KV.put(keys.user(user.id), JSON.stringify(user)),
    env.KV.put(keys.userByEmail(user.email), user.id),
  ])
  const list = await env.KV.get<string[]>(keys.userList(), 'json') ?? []
  if (!list.includes(user.id)) {
    list.push(user.id)
    await env.KV.put(keys.userList(), JSON.stringify(list))
  }
}

export async function listUsers(env: Env): Promise<User[]> {
  const list = await env.KV.get<string[]>(keys.userList(), 'json') ?? []
  const users = await Promise.all(list.map(id => getUser(env, id)))
  return users.filter(Boolean) as User[]
}

// ── Plans ─────────────────────────────────────────────────────────────────────
const DEFAULT_PLANS: Plan[] = [
  { id: 'free', name: 'Free', price: 0, priceNgn: 0, tokensPerDay: 500, tokenPeriod: 'day',
    features: ['500 chars/day', '3 accents', 'MP3 only', 'Basic quality'],
    enabledFeatures: ['accent_african', 'format_mp3', 'download_audio'] },
  { id: 'starter', name: 'Starter', price: 5, tokensPerDay: 5000, popular: false, tokenPeriod: 'month',
    features: ['5,000 chars/day', 'All accents', 'MP3 + WAV', 'Voice cloning'],
    enabledFeatures: ['accent_all', 'format_mp3', 'format_wav', 'voice_clone', 'voice_library', 'perf_style', 'download_audio', 'vocal_cues'] },
  { id: 'pro', name: 'Pro', price: 15, tokensPerDay: 25000, popular: true, tokenPeriod: 'month',
    features: ['25,000 chars/day', 'All accents', 'MP3 + WAV', 'Voice cloning', 'Priority queue', 'Vocal cues'],
    enabledFeatures: ['accent_all', 'format_mp3', 'format_wav', 'voice_clone', 'voice_library', 'vocal_cues', 'script_templates', 'perf_style', 'pacing_control', 'priority_queue', 'download_audio', 'history'] },
  { id: 'enterprise', name: 'Enterprise', price: 49, tokensPerDay: 200000, popular: false, tokenPeriod: 'month',
    features: ['200,000 chars/day', 'All accents', 'All formats', 'Unlimited cloning', 'API access', 'Dedicated support'],
    enabledFeatures: ['accent_all', 'format_mp3', 'format_wav', 'voice_clone', 'voice_library', 'vocal_cues', 'script_templates', 'perf_style', 'pacing_control', 'priority_queue', 'batch_synthesis', 'download_audio', 'history', 'api_access'] },
]

export async function getPlans(env: Env): Promise<Plan[]> {
  const plans = await env.KV.get<Plan[]>(keys.plans(), 'json')
  return plans ?? DEFAULT_PLANS
}

export async function putPlans(env: Env, plans: Plan[]): Promise<void> {
  await env.KV.put(keys.plans(), JSON.stringify(plans))
}

// ── Usage tracking ────────────────────────────────────────────────────────────
export async function getUsage(env: Env, userId: string, date: string): Promise<UsageRecord> {
  const rec = await env.KV.get<UsageRecord>(keys.usage(userId, date), 'json')
  return rec ?? { userId, date, tokensUsed: 0, lastUpdated: Date.now() }
}

export async function incrementUsage(env: Env, userId: string, chars: number): Promise<{ allowed: boolean; remaining: number; limit: number; period: 'day' | 'month' }> {
  const user = await getUser(env, userId)
  if (!user) return { allowed: false, remaining: 0, limit: 0, period: 'day' }
  const plans = await getPlans(env)
  const plan = plans.find(p => p.id === user.plan) ?? plans[0]!
  // default: free plan is daily, all paid plans are monthly
  const period = plan.tokenPeriod ?? (plan.price > 0 ? 'month' : 'day')
  // Key: YYYY-MM-DD for daily, YYYY-MM for monthly
  const now = new Date()
  const periodKey = period === 'month'
    ? now.toISOString().slice(0, 7)       // e.g. "2026-10"
    : now.toISOString().slice(0, 10)      // e.g. "2026-10-20"
  const ttl = period === 'month' ? 86400 * 35 : 86400 * 2
  const usage = await getUsage(env, userId, periodKey)
  if (usage.tokensUsed + chars > plan.tokensPerDay) {
    return { allowed: false, remaining: Math.max(0, plan.tokensPerDay - usage.tokensUsed), limit: plan.tokensPerDay, period }
  }
  usage.tokensUsed += chars
  usage.lastUpdated = Date.now()
  await env.KV.put(keys.usage(userId, periodKey), JSON.stringify(usage), { expirationTtl: ttl })
  return { allowed: true, remaining: plan.tokensPerDay - usage.tokensUsed, limit: plan.tokensPerDay, period }
}

// ── Payments ──────────────────────────────────────────────────────────────────
export async function putPayment(env: Env, rec: PaymentRecord): Promise<void> {
  await env.KV.put(keys.payment(rec.txRef), JSON.stringify(rec), { expirationTtl: 86400 * 365 })
}

export async function getPayment(env: Env, txRef: string): Promise<PaymentRecord | null> {
  return env.KV.get<PaymentRecord>(keys.payment(txRef), 'json')
}

export async function getVoiceSamples(env: Env): Promise<VoiceSample[]> {
  return await env.KV.get<VoiceSample[]>(keys.voices(), 'json') ?? []
}

export async function putVoiceSamples(env: Env, voices: VoiceSample[]): Promise<void> {
  await env.KV.put(keys.voices(), JSON.stringify(voices))
}
