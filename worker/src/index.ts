import type { Env, User } from './types'
import { registerEmail, loginEmail, getGoogleAuthUrl, handleGoogleCallback, requireAuth, requireAdmin, sanitize } from './auth'
import { getSiteConfig, putSiteConfig, getPlans, putPlans, getUser, putUser, listUsers, incrementUsage, getUsage } from './kv'
import { initializePayment, verifyAndActivate, handleWebhook } from './flutterwave'

// ── CORS helpers ──────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://voicera.pages.dev',
  'https://voicera.ozoemenapaschal09.workers.dev',
  'http://localhost:5173',
]

function corsHeaders(reqOrigin: string | null): Record<string, string> {
  const origin = reqOrigin && ALLOWED_ORIGINS.includes(reqOrigin) ? reqOrigin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Vary': 'Origin',
  }
}

function json(data: unknown, status = 200, ch: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...ch } })
}

// ── Router ────────────────────────────────────────────────────────────────────
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const ch = corsHeaders(req.headers.get('origin'))
    const e = (msg: string, status = 400) => json({ error: msg }, status, ch)

    if (req.method === 'OPTIONS') return new Response(null, { headers: ch })

    const url = new URL(req.url)
    const path = url.pathname

    // ── Setup (first-run, no auth required) ──────────────────────────────
    if (path === '/api/setup/status' && req.method === 'GET') {
      const config = await getSiteConfig(env)
      return json({ setupComplete: config.setupComplete, hasJwtSecret: !!config.jwtSecret }, 200, ch)
    }

    if (path === '/api/setup/init' && req.method === 'POST') {
      const config = await getSiteConfig(env)
      if (config.setupComplete) return e('Setup already completed.', 403)
      const body = await req.json() as Record<string, string>
      const { adminEmail, adminPassword, adminName, jwtSecret, siteName } = body
      if (!adminEmail || !adminPassword || !adminName) return e('Admin email, password and name are required.')
      if (!jwtSecret || jwtSecret.length < 32) return e('JWT secret must be at least 32 characters.')
      await putSiteConfig(env, {
        adminEmail: adminEmail.toLowerCase(),
        jwtSecret,
        siteName: siteName || 'Voicera',
        setupComplete: true,
      })
      const { registerEmail: reg } = await import('./auth')
      const result = await reg(env, adminEmail, adminPassword, adminName)
      if ('error' in result) return e(result.error)
      return json({ success: true, token: result.token, user: result.user }, 200, ch)
    }

    // ── Auth ──────────────────────────────────────────────────────────────
    if (path === '/api/auth/register' && req.method === 'POST') {
      const { email, password, name } = await req.json() as { email: string; password: string; name: string }
      const result = await registerEmail(env, email, password, name)
      if ('error' in result) return e(result.error)
      return json(result, 200, ch)
    }

    if (path === '/api/auth/login' && req.method === 'POST') {
      const { email, password } = await req.json() as { email: string; password: string }
      const result = await loginEmail(env, email, password)
      if ('error' in result) return e(result.error, 401)
      return json(result, 200, ch)
    }

    if (path === '/api/auth/google' && req.method === 'GET') {
      const authUrl = await getGoogleAuthUrl(env)
      if (!authUrl) return e('Google OAuth is not configured. Set it up in the Admin panel.', 503)
      return json({ url: authUrl }, 200, ch)
    }

    if (path === '/api/auth/google/callback' && req.method === 'GET') {
      const code = url.searchParams.get('code') ?? ''
      const state = url.searchParams.get('state') ?? ''
      const result = await handleGoogleCallback(env, code, state)
      const frontendBase = 'https://voicera.pages.dev'
      if ('error' in result) {
        return Response.redirect(`${frontendBase}/auth?error=${encodeURIComponent(result.error)}`)
      }
      return Response.redirect(`${frontendBase}/auth/callback?token=${result.token}`)
    }

    if (path === '/api/auth/me' && req.method === 'GET') {
      const user = await requireAuth(env, req)
      if (!user) return e('Unauthorized', 401)
      return json({ user: sanitize(user) }, 200, ch)
    }

    // ── Site config (public) ──────────────────────────────────────────────
    if (path === '/api/config' && req.method === 'GET') {
      const config = await getSiteConfig(env)
      const { openrouterApiKey: _k, ...pub } = config
      return json(pub, 200, ch)
    }

    if (path === '/api/plans' && req.method === 'GET') {
      return json(await getPlans(env), 200, ch)
    }

    // ── Usage ─────────────────────────────────────────────────────────────
    if (path === '/api/usage' && req.method === 'GET') {
      const user = await requireAuth(env, req)
      if (!user) return e('Unauthorized', 401)
      const today = new Date().toISOString().slice(0, 10)
      const usage = await getUsage(env, user.id, today)
      const plans = await getPlans(env)
      const plan = plans.find(p => p.id === user.plan) ?? plans[0]
      return json({ tokensUsed: usage.tokensUsed, limit: plan.tokensPerDay, remaining: Math.max(0, plan.tokensPerDay - usage.tokensUsed), plan: user.plan }, 200, ch)
    }

    // ── TTS synthesize (auth-gated, token-tracked) ────────────────────────
    if (path === '/api/synthesize' && req.method === 'POST') {
      const user = await requireAuth(env, req)
      if (!user) return e('Please sign in to use Voicera.', 401)

      const body = await req.json() as { text?: string; accentInstruction?: string; format?: string; referenceAudioDataUrl?: string; referenceTranscript?: string }
      const { text, accentInstruction, format = 'mp3', referenceAudioDataUrl, referenceTranscript } = body

      if (!text?.trim()) return e('Please enter a script to synthesize.')

      const charCount = text.trim().length
      const quota = await incrementUsage(env, user.id, charCount)
      if (!quota.allowed) {
        return json({ error: `Daily limit reached (${quota.limit.toLocaleString()} chars/day on ${user.plan} plan). ${quota.remaining} remaining. Upgrade to continue.`, limitReached: true, remaining: quota.remaining, limit: quota.limit }, 429, ch)
      }

      const config = await getSiteConfig(env)
      if (!config.openrouterApiKey) return e('Voice engine not configured. Please contact admin.')

      const styledInput = accentInstruction ? `[${accentInstruction}] ${text.trim()}` : text.trim()
      const payload: Record<string, unknown> = {
        model: config.openrouterModel || 'fish-audio/s2.1-pro-free:free',
        input: styledInput,
        response_format: format,
      }

      if (referenceAudioDataUrl) {
        const refs: unknown[] = [{ type: 'input_audio', input_audio: { data: referenceAudioDataUrl } }]
        if (referenceTranscript?.trim()) refs.push({ type: 'text', text: referenceTranscript.trim() })
        payload.input_references = refs
      }

      const orHeaders = {
        Authorization: `Bearer ${config.openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://voicera.pages.dev',
        'X-OpenRouter-Title': config.siteName || 'Voicera',
      }

      let upstream = await fetch('https://openrouter.ai/api/v1/audio/speech', { method: 'POST', headers: orHeaders, body: JSON.stringify(payload) })

      if (!upstream.ok) {
        const errText = await upstream.text()
        console.error(`[Voicera] Attempt 1 failed (${upstream.status}):`, errText)
        await new Promise(r => setTimeout(r, 1200))
        upstream = await fetch('https://openrouter.ai/api/v1/audio/speech', {
          method: 'POST', headers: orHeaders,
          body: JSON.stringify({ model: config.openrouterModel, input: text.trim(), ...(payload.input_references ? { input_references: payload.input_references } : {}) }),
        })
        if (!upstream.ok) {
          const errText2 = await upstream.text()
          console.error(`[Voicera] Attempt 2 failed (${upstream.status}):`, errText2)
          let friendly = 'Voice engine is busy. Please try again in a few seconds.'
          if (upstream.status === 429) friendly = 'Rate limit reached. Please wait 15 seconds and try again.'
          else if ([401, 402, 403].includes(upstream.status)) friendly = 'Voice engine quota exceeded. Please contact admin.'
          return e(friendly, upstream.status)
        }
      }

      const ab = await upstream.arrayBuffer()
      const mime = format === 'wav' ? 'audio/wav' : 'audio/mpeg'
      return new Response(ab, { headers: { 'Content-Type': mime, 'Content-Length': String(ab.byteLength), 'Cache-Control': 'no-store', 'X-Tokens-Remaining': String(quota.remaining), ...ch } })
    }

    // ── Payment ───────────────────────────────────────────────────────────
    if (path === '/api/payment/init' && req.method === 'POST') {
      const user = await requireAuth(env, req)
      if (!user) return e('Unauthorized', 401)
      const { planId } = await req.json() as { planId: string }
      const plans = await getPlans(env)
      const plan = plans.find(p => p.id === planId)
      if (!plan) return e('Invalid plan.')
      if (plan.price === 0) return e('Free plan requires no payment.')
      const redirectUrl = 'https://voicera.pages.dev/billing/callback'
      const result = await initializePayment(env, user, plan, redirectUrl)
      if ('error' in result) return e(result.error)
      return json(result, 200, ch)
    }

    if (path === '/api/payment/verify' && req.method === 'POST') {
      const user = await requireAuth(env, req)
      if (!user) return e('Unauthorized', 401)
      const { txRef } = await req.json() as { txRef: string }
      const result = await verifyAndActivate(env, txRef)
      if (!result.success) return e(result.error ?? 'Verification failed.')
      const updated = await getUser(env, user.id)
      return json({ success: true, plan: result.plan, user: updated ? sanitize(updated) : null }, 200, ch)
    }

    if (path === '/api/payment/webhook' && req.method === 'POST') {
      return handleWebhook(env, req)
    }

    // ── Admin ─────────────────────────────────────────────────────────────
    if (path.startsWith('/api/admin')) {
      const admin = await requireAdmin(env, req)
      if (!admin) return e('Forbidden', 403)

      if (path === '/api/admin/config' && req.method === 'GET') {
        return json(await getSiteConfig(env), 200, ch)
      }

      if (path === '/api/admin/config' && req.method === 'PATCH') {
        const body = await req.json() as Record<string, unknown>
        return json(await putSiteConfig(env, body), 200, ch)
      }

      if (path === '/api/admin/plans' && req.method === 'GET') {
        return json(await getPlans(env), 200, ch)
      }

      if (path === '/api/admin/plans' && req.method === 'PUT') {
        const plans = await req.json() as typeof import('./types').Plan[]
        await putPlans(env, plans)
        return json({ success: true }, 200, ch)
      }

      if (path === '/api/admin/users' && req.method === 'GET') {
        const users = await listUsers(env)
        return json(users.map(u => sanitize(u)), 200, ch)
      }

      const userPatch = path.match(/^\/api\/admin\/users\/(.+)$/)
      if (userPatch && req.method === 'PATCH') {
        const uid = userPatch[1]
        const target = await getUser(env, uid)
        if (!target) return e('User not found', 404)
        const body = await req.json() as Partial<User>
        const allowed: (keyof User)[] = ['plan', 'role', 'name']
        for (const k of allowed) {
          if (k in body) (target as Record<string, unknown>)[k] = body[k as keyof User]
        }
        await putUser(env, target)
        return json(sanitize(target), 200, ch)
      }

      if (path === '/api/admin/stats' && req.method === 'GET') {
        const users = await listUsers(env)
        const plans = await getPlans(env)
        const planCounts = plans.reduce<Record<string, number>>((acc, p) => { acc[p.id] = 0; return acc }, {})
        for (const u of users) planCounts[u.plan] = (planCounts[u.plan] ?? 0) + 1
        return json({ totalUsers: users.length, planCounts, plans }, 200, ch)
      }
    }

    return e('Not found', 404)
  },
}
