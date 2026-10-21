import type { Env, User, Plan } from './types'
import { registerEmail, loginEmail, getGoogleAuthUrl, handleGoogleCallback, requireAuth, requireAdmin, sanitize } from './auth'
import { getSiteConfig, putSiteConfig, getPlans, putPlans, getUser, putUser, listUsers, incrementUsage, getUsage, getVoiceSamples, putVoiceSamples } from './kv'
import { initializePayment, verifyAndActivate, handleWebhook } from './flutterwave'

// Pages Functions use EventContext — same KV/secrets bindings, different export shape
type PagesEnv = Env  // KV binding is identical

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

export async function onRequest(ctx: { request: Request; env: PagesEnv }): Promise<Response> {
  const req = ctx.request
  const env = ctx.env

  // No CORS needed — Pages Functions are same-origin with the frontend
  const e = (msg: string, status = 400) => json({ error: msg }, status)

  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })

  const url = new URL(req.url)
  const path = url.pathname

  // ── Setup ────────────────────────────────────────────────────────────────
  if (path === '/api/setup/status' && req.method === 'GET') {
    const config = await getSiteConfig(env)
    return json({ setupComplete: config.setupComplete, hasJwtSecret: !!config.jwtSecret })
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
    return json({ success: true, token: result.token, user: result.user })
  }

  // ── Auth ─────────────────────────────────────────────────────────────────
  if (path === '/api/auth/register' && req.method === 'POST') {
    const { email, password, name } = await req.json() as { email: string; password: string; name: string }
    const result = await registerEmail(env, email, password, name)
    if ('error' in result) return e(result.error)
    return json(result)
  }

  if (path === '/api/auth/login' && req.method === 'POST') {
    const { email, password } = await req.json() as { email: string; password: string }
    const result = await loginEmail(env, email, password)
    if ('error' in result) return e(result.error, 401)
    return json(result)
  }

  if (path === '/api/auth/google' && req.method === 'GET') {
    const authUrl = await getGoogleAuthUrl(env)
    if (!authUrl) return e('Google OAuth is not configured. Set it up in the Admin panel.', 503)
    return json({ url: authUrl })
  }

  if (path === '/api/auth/google/callback' && req.method === 'GET') {
    const code = url.searchParams.get('code') ?? ''
    const state = url.searchParams.get('state') ?? ''
    const result = await handleGoogleCallback(env, code, state)
    if ('error' in result) {
      return Response.redirect(`https://voicera.pages.dev/auth?error=${encodeURIComponent(result.error)}`)
    }
    return Response.redirect(`https://voicera.pages.dev/auth/callback?token=${result.token}`)
  }

  if (path === '/api/auth/me' && req.method === 'GET') {
    const user = await requireAuth(env, req)
    if (!user) return e('Unauthorized', 401)
    return json({ user: sanitize(user) })
  }

  // ── Public config + plans ────────────────────────────────────────────────
  if (path === '/api/config' && req.method === 'GET') {
    const config = await getSiteConfig(env)
    const { openrouterApiKey: _k, ...pub } = config
    return json(pub)
  }

  if (path === '/api/plans' && req.method === 'GET') {
    return json(await getPlans(env))
  }

  if (path === '/api/voices' && req.method === 'GET') {
    const voices = await getVoiceSamples(env)
    return json(voices.map(({ audioDataUrl, ...voice }) => ({ ...voice, audioDataUrl })))
  }

  // ── Usage ─────────────────────────────────────────────────────────────────
  if (path === '/api/usage' && req.method === 'GET') {
    const user = await requireAuth(env, req)
    if (!user) return e('Unauthorized', 401)
    const plans = await getPlans(env)
    const plan = plans.find(p => p.id === user.plan) ?? plans[0]!
    const period = plan.tokenPeriod ?? (plan.price > 0 ? 'month' : 'day')
    const now = new Date()
    const periodKey = period === 'month' ? now.toISOString().slice(0, 7) : now.toISOString().slice(0, 10)
    const usage = await getUsage(env, user.id, periodKey)
    return json({ tokensUsed: usage.tokensUsed, limit: plan.tokensPerDay, remaining: Math.max(0, plan.tokensPerDay - usage.tokensUsed), plan: user.plan, period, enabledFeatures: plan.enabledFeatures ?? [] })
  }

  // ── TTS Synthesize ────────────────────────────────────────────────────────
  if (path === '/api/synthesize' && req.method === 'POST') {
    const user = await requireAuth(env, req)
    if (!user) return e('Please sign in to use Voicera.', 401)

    const body = await req.json() as { text?: string; accentInstruction?: string; format?: string; referenceAudioDataUrl?: string; referenceTranscript?: string }
    const { text, accentInstruction, format = 'mp3', referenceAudioDataUrl, referenceTranscript } = body
    if (!text?.trim()) return e('Please enter a script to synthesize.')

    // ── Feature gate checks ──────────────────────────────────────────────────
    const plans = await getPlans(env)
    const userPlan = plans.find(p => p.id === user.plan) ?? plans[0]!
    const fx = userPlan.enabledFeatures ?? []
    const hasFx = (id: string) => fx.includes(id as never)

    // WAV format gate
    if (format === 'wav' && !hasFx('format_wav')) {
      return e('WAV export is not available on your plan. Upgrade to Starter or higher.', 403)
    }
    // Voice cloning gate
    if (referenceAudioDataUrl && !hasFx('voice_clone')) {
      return e('Voice Print Cloning is not available on your plan. Upgrade to Starter or higher.', 403)
    }

    const charCount = text.trim().length
    const quota = await incrementUsage(env, user.id, charCount)
    if (!quota.allowed) {
      const periodLabel = quota.period === 'month' ? 'Monthly' : 'Daily'
      return json({ error: `${periodLabel} limit reached. ${quota.remaining.toLocaleString()} chars remaining. Upgrade to continue.`, limitReached: true, remaining: quota.remaining, limit: quota.limit }, 429)
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
        let friendly = 'Voice engine is busy. Please try again in a few seconds.'
        if (upstream.status === 429) friendly = 'Rate limit reached. Please wait 15 seconds and try again.'
        else if ([401, 402, 403].includes(upstream.status)) friendly = 'Voice engine quota exceeded. Please contact admin.'
        return e(friendly, upstream.status)
      }
    }

    const ab = await upstream.arrayBuffer()
    const mime = format === 'wav' ? 'audio/wav' : 'audio/mpeg'
    return new Response(ab, { headers: { 'Content-Type': mime, 'Content-Length': String(ab.byteLength), 'Cache-Control': 'no-store', 'X-Tokens-Remaining': String(quota.remaining), 'X-Tokens-Limit': String(quota.limit), 'X-Tokens-Period': quota.period } })
  }

  // ── Payment ───────────────────────────────────────────────────────────────
  if (path === '/api/payment/init' && req.method === 'POST') {
    const user = await requireAuth(env, req)
    if (!user) return e('Unauthorized', 401)
    const { planId, currency = 'USD' } = await req.json() as { planId: string; currency?: string }
    const plans = await getPlans(env)
    const plan = plans.find(p => p.id === planId)
    if (!plan) return e('Invalid plan.')
    if (plan.price <= 0) return e('Free plan requires no payment.')
    // Derive redirect URL from the request origin so it works on any deployment
    const origin = new URL(req.url).origin
    const redirectUrl = `${origin}/billing/callback`
    const result = await initializePayment(env, user, plan, redirectUrl, currency.toUpperCase())
    if ('error' in result) return e(result.error)
    return json(result)
  }

  if (path === '/api/payment/verify' && req.method === 'POST') {
    const user = await requireAuth(env, req)
    if (!user) return e('Unauthorized', 401)
    const { txRef } = await req.json() as { txRef: string }
    const result = await verifyAndActivate(env, txRef)
    if (!result.success) return e(result.error ?? 'Verification failed.')
    const updated = await getUser(env, user.id)
    return json({ success: true, plan: result.plan, user: updated ? sanitize(updated) : null })
  }

  if (path === '/api/payment/webhook' && req.method === 'POST') {
    return handleWebhook(env, req)
  }

  // ── Admin ─────────────────────────────────────────────────────────────────
  if (path.startsWith('/api/admin')) {
    const admin = await requireAdmin(env, req)
    if (!admin) return e('Forbidden', 403)

    if (path === '/api/admin/voices' && req.method === 'GET') return json(await getVoiceSamples(env))
    if (path === '/api/admin/voices' && req.method === 'PUT') {
      const voices = await req.json() as import('./types').VoiceSample[]
      if (!Array.isArray(voices) || voices.length > 12) return e('Add up to 12 sample voices.')
      if (voices.some(v => !v.name?.trim() || !/^data:audio\//.test(v.audioDataUrl) || v.audioDataUrl.length > 1_500_000)) return e('Each voice needs a name and an audio sample under 1 MB.')
      await putVoiceSamples(env, voices)
      return json({ success: true })
    }
    if (path === '/api/admin/config' && req.method === 'GET') return json(await getSiteConfig(env))
    if (path === '/api/admin/config' && req.method === 'PATCH') {
      const body = await req.json() as Record<string, unknown>
      if (typeof body.logoUrl === 'string' && body.logoUrl && !/^data:image\//.test(body.logoUrl) && !/^https?:\/\//.test(body.logoUrl)) return e('Logo must be an uploaded image or an HTTPS URL.')
      if (typeof body.logoUrl === 'string' && body.logoUrl.length > 1_000_000) return e('Logo file is too large.')
      return json(await putSiteConfig(env, body))
    }
    if (path === '/api/admin/plans' && req.method === 'GET') return json(await getPlans(env))
    if (path === '/api/admin/plans' && req.method === 'PUT') {
      const plans = await req.json() as Plan[]
      await putPlans(env, plans)
      return json({ success: true })
    }
    if (path === '/api/admin/users' && req.method === 'GET') {
      return json((await listUsers(env)).map(u => sanitize(u)))
    }
    const userPatch = path.match(/^\/api\/admin\/users\/(.+)$/)
    if (userPatch && req.method === 'PATCH') {
      const uid = userPatch[1]
      const target = await getUser(env, uid)
      if (!target) return e('User not found', 404)
      const body = await req.json() as Partial<User>
      for (const k of ['plan', 'role', 'name'] as (keyof User)[]) {
        if (k in body) (target as Record<string, unknown>)[k] = body[k]
      }
      await putUser(env, target)
      return json(sanitize(target))
    }
    if (path === '/api/admin/stats' && req.method === 'GET') {
      const users = await listUsers(env)
      const plans = await getPlans(env)
      const planCounts = plans.reduce<Record<string, number>>((acc, p) => { acc[p.id] = 0; return acc }, {})
      for (const u of users) planCounts[u.plan] = (planCounts[u.plan] ?? 0) + 1
      return json({ totalUsers: users.length, planCounts, plans })
    }
  }

  return e('Not found', 404)
}
