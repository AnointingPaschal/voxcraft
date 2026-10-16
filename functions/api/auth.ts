import type { Env, User } from './types'
import { signJWT, verifyJWT } from './jwt'
import { getUser, getUserByEmail, putUser, getSiteConfig, keys } from './kv'

// ── Password hashing (PBKDF2 via WebCrypto) ──────────────────────────────────
async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256)
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')
  const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${saltHex}:${hashHex}`
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':')
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)))
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256)
  const computed = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('')
  return computed === hashHex
}

function generateId(): string { return crypto.randomUUID() }

// ── Email/password register ───────────────────────────────────────────────────
export async function registerEmail(env: Env, email: string, password: string, name: string): Promise<{ token: string; user: User } | { error: string }> {
  if (!email || !password || !name) return { error: 'All fields required.' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' }
  const existing = await getUserByEmail(env, email)
  if (existing) return { error: 'Email already registered.' }
  const cfg = await getSiteConfig(env)
  if (!cfg.jwtSecret) return { error: 'Server not configured yet. Complete setup first.' }

  const id = generateId()
  const isAdmin = email.toLowerCase() === cfg.adminEmail.toLowerCase()
  const user: User = {
    id, email: email.toLowerCase(), name,
    provider: 'email', plan: 'free',
    role: isAdmin ? 'admin' : 'user',
    createdAt: Date.now(), emailVerified: false,
    passwordHash: await hashPassword(password),
  }
  await putUser(env, user)
  const token = await signJWT({ sub: user.id, email: user.email, role: user.role, plan: user.plan }, cfg.jwtSecret)
  return { token, user: sanitize(user) }
}

// ── Email/password login ──────────────────────────────────────────────────────
export async function loginEmail(env: Env, email: string, password: string): Promise<{ token: string; user: User } | { error: string }> {
  const cfg = await getSiteConfig(env)
  if (!cfg.jwtSecret) return { error: 'Server not configured yet.' }
  const user = await getUserByEmail(env, email)
  if (!user || !user.passwordHash) return { error: 'Invalid email or password.' }
  const ok = await verifyPassword(password, user.passwordHash)
  if (!ok) return { error: 'Invalid email or password.' }
  const token = await signJWT({ sub: user.id, email: user.email, role: user.role, plan: user.plan }, cfg.jwtSecret)
  return { token, user: sanitize(user) }
}

// ── Google OAuth ──────────────────────────────────────────────────────────────
export async function getGoogleAuthUrl(env: Env): Promise<string | null> {
  const cfg = await getSiteConfig(env)
  if (!cfg.googleClientId || !cfg.googleRedirectUri) return null
  const state = generateId()
  await env.KV.put(keys.oauthState(state), '1', { expirationTtl: 600 })
  const params = new URLSearchParams({
    client_id: cfg.googleClientId,
    redirect_uri: cfg.googleRedirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state, access_type: 'offline', prompt: 'select_account',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function handleGoogleCallback(env: Env, code: string, state: string): Promise<{ token: string; user: User } | { error: string }> {
  const cfg = await getSiteConfig(env)
  const stateVal = await env.KV.get(keys.oauthState(state))
  if (!stateVal) return { error: 'Invalid or expired OAuth state.' }
  await env.KV.delete(keys.oauthState(state))

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: cfg.googleClientId,
      client_secret: cfg.googleClientSecret,
      redirect_uri: cfg.googleRedirectUri,
      grant_type: 'authorization_code',
    }),
  })
  if (!tokenRes.ok) return { error: 'Failed to exchange Google token.' }
  const { access_token } = await tokenRes.json() as { access_token: string }

  const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  })
  if (!infoRes.ok) return { error: 'Failed to fetch Google profile.' }
  const profile = await infoRes.json() as { sub: string; email: string; name: string; picture?: string }

  let user = await getUserByEmail(env, profile.email)
  if (!user) {
    const isAdmin = profile.email.toLowerCase() === cfg.adminEmail.toLowerCase()
    user = {
      id: generateId(), email: profile.email.toLowerCase(), name: profile.name,
      avatar: profile.picture, provider: 'google', plan: 'free',
      role: isAdmin ? 'admin' : 'user', createdAt: Date.now(), emailVerified: true,
    }
    await putUser(env, user)
  } else if (profile.picture && !user.avatar) {
    user.avatar = profile.picture
    await putUser(env, user)
  }

  const token = await signJWT({ sub: user.id, email: user.email, role: user.role, plan: user.plan }, cfg.jwtSecret)
  return { token, user: sanitize(user) }
}

// ── Session middleware ────────────────────────────────────────────────────────
export async function requireAuth(env: Env, req: Request): Promise<User | null> {
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  const cfg = await getSiteConfig(env)
  if (!cfg.jwtSecret) return null
  const payload = await verifyJWT(token, cfg.jwtSecret)
  if (!payload) return null
  return getUser(env, payload.sub)
}

export async function requireAdmin(env: Env, req: Request): Promise<User | null> {
  const user = await requireAuth(env, req)
  if (!user || user.role !== 'admin') return null
  return user
}

export function sanitize(user: User): User {
  const u = { ...user }
  delete u.passwordHash
  return u
}
