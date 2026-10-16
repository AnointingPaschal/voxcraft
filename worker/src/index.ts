import type { Env, User } from './types'
import { registerEmail, loginEmail, getGoogleAuthUrl, handleGoogleCallback, requireAuth, requireAdmin, sanitize } from './auth'
import { getSiteConfig, putSiteConfig, getPlans, putPlans, getUser, putUser, listUsers, incrementUsage, getUsage } from './kv'
import { initializePayment, verifyAndActivate, handleWebhook } from './flutterwave'

// ── CORS helpers ──────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...CORS } })
}

function err(msg: string, status = 400): Response {
  return json({ error: msg }, status)
}

// ── Router ────────────────────────────────────────────────────────────────────
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

    const url = new URL(req.url)
    const path = url.pathname

    // ── Auth ──────────────────────────────────────────────────────────────
    if (path === '/api/auth/register' && req.method === 'POST') {
      const { email, password, name } = await req.json() as { email: string; password: string; name: string }
      const result = await registerEmail(env, email, password, name)
      if ('error' in result) return err(result.error)
      return json(result)
    }

    if (path === '/api/auth/login' && req.method === 'POST') {
      const { email, password } = await req.json() as { email: string; password: string }
      const result = await loginEmail(env, email, password)
      if ('error' in result) return err(result.error, 401)
      return json(result)
    }

    if (path === '/api/auth/google' && req.method === 'GET') {
      const authUrl = await getGoogleAuthUrl(env)
      return json({ url: authUrl })
    }

    if (path === '/api/auth/google/callback' && req.method === 'GET') {
      const code = url.searchParams.get('code') ?? ''
      const state = url.searchParams.get('state') ?? ''
      const result = await handleGoogleCallback(env, code, state)
      if ('error' in result) {
        return Response.redirect(`${url.origin}/auth?error=${encodeURIComponent(result.error)}`)
      }
      // Redirect to frontend with token
      return Response.redirect(`${url.origin}/auth/callback?token=${result.token}`)
    }

    if (path === '/api/auth/me' && req.method === 'GET') {
      const user = await requireAuth(env, req)
      if (!user) return err('Unauthorized', 401)
      return json({ user: sanitize(user) })
    }

    // ── Site config (public) ──────────────────────────────────────────────
    if (path === '/api/config' && req.method === 'GET') {
      const config = await getSiteConfig(env)
      // Strip sensitive keys from public response
      const { openrouterApiKey: _k, ...pub } = config
      return json(pub)
    }

    if (path === '/api/plans' && req.method === 'GET') {
      const plans = await getPlans(env)
      return json(plans)
    }

    // ── Usage ─────────────────────────────────────────────────────────────
    if (path === '/api/usage' && req.method === 'GET') {
      const user = await requireAuth(env, req)
      if (!user) return err('Unauthorized', 401)
      const today = new Date().toISOString().slice(0, 10)
      const usage = await getUsage(env, user.id, today)
      const plans = await getPlans(env)
      const plan = plans.find(p => p.id === user.plan) ?? plans[0]
      return json({ tokensUsed: usage.tokensUsed, limit: plan.tokensPerDay, remaining: Math.max(0, plan.tokensPerDay - usage.tokensUsed), plan: user.plan })
    }

    // ── TTS synthesize (auth-gated, token-tracked) ────────────────────────
    if (path === '/api/synthesize' && req.method === 'POST') {
      const user = await requireAuth(env, req)
      if (!user) return err('Please sign in to use VoxCraft.', 401)

      const body = await req.json() as { text?: string; accentInstruction?: string; format?: string; referenceAudioDataUrl?: string; referenceTranscript?: string }
      const { text, accentInstruction, format = 'mp3', referenceAudioDataUrl, referenceTranscript } = body

      if (!text?.trim()) return err('Please enter a script to synthesize.')

      const charCount = text.trim().length
      const quota = await incrementUsage(env, user.id, charCount)
      if (!quota.allowed) {
        return json({ error: `Daily limit reached (${quota.limit.toLocaleString()} chars/day on ${user.plan} plan). ${quota.remaining} remaining. Upgrade to continue.`, limitReached: true, remaining: quota.remaining, limit: quota.limit }, 429)
      }

      const config = await getSiteConfig(env)
      if (!config.openrouterApiKey) return err('Voice engine not configured. Please contact admin.')

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

      let upstream = await fetch('https://openrouter.ai/api/v1/audio/speech', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.openrouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': url.origin,
          'X-OpenRouter-Title': config.siteName,
        },
        body: JSON.stringify(payload),
      })

      if (!upstream.ok) {
        const errText = await upstream.text()
        console.error(`[VoxCraft] Attempt 1 failed (${upstream.status}):`, errText)
        await new Promise(r => setTimeout(r, 1200))
        upstream = await fetch('https://openrouter.ai/api/v1/audio/speech', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.openrouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': url.origin,
            'X-OpenRouter-Title': config.siteName,
          },
          body: JSON.stringify({ model: config.openrouterModel, input: text.trim(), ...(payload.input_references ? { input_references: payload.input_references } : {}) }),
        })
        if (!upstream.ok) {
          const errText2 = await upstream.text()
          console.error(`[VoxCraft] Attempt 2 failed (${upstream.status}):`, errText2)
          let friendly = 'Voice engine is busy. Please try again in a few seconds.'
          if (upstream.status === 429) friendly = 'Rate limit reached. Please wait 15 seconds and try again.'
          else if ([401, 402, 403].includes(upstream.status)) friendly = 'Voice engine quota exceeded. Please contact admin.'
          return err(friendly, upstream.status)
        }
      }

      const ab = await upstream.arrayBuffer()
      const mime = format === 'wav' ? 'audio/wav' : 'audio/mpeg'
      return new Response(ab, { headers: { 'Content-Type': mime, 'Content-Length': String(ab.byteLength), 'Cache-Control': 'no-store', 'X-Tokens-Remaining': String(quota.remaining), ...CORS } })
    }

    // ── Payment ───────────────────────────────────────────────────────────
    if (path === '/api/payment/init' && req.method === 'POST') {
      const user = await requireAuth(env, req)
      if (!user) return err('Unauthorized', 401)
      const { planId } = await req.json() as { planId: string }
      const plans = await getPlans(env)
      const plan = plans.find(p => p.id === planId)
      if (!plan) return err('Invalid plan.')
      if (plan.price === 0) return err('Free plan requires no payment.')
      const redirectUrl = `${url.origin}/billing/callback`
      const result = await initializePayment(env, user, plan, redirectUrl)
      if ('error' in result) return err(result.error)
      return json(result)
    }

    if (path === '/api/payment/verify' && req.method === 'POST') {
      const user = await requireAuth(env, req)
      if (!user) return err('Unauthorized', 401)
      const { txRef } = await req.json() as { txRef: string }
      const result = await verifyAndActivate(env, txRef)
      if (!result.success) return err(result.error ?? 'Verification failed.')
      const updated = await getUser(env, user.id)
      return json({ success: true, plan: result.plan, user: updated ? sanitize(updated) : null })
    }

    if (path === '/api/payment/webhook' && req.method === 'POST') {
      return handleWebhook(env, req)
    }

    // ── Admin ─────────────────────────────────────────────────────────────
    if (path.startsWith('/api/admin')) {
      const admin = await requireAdmin(env, req)
      if (!admin) return err('Forbidden', 403)

      // GET /api/admin/config
      if (path === '/api/admin/config' && req.method === 'GET') {
        return json(await getSiteConfig(env))
      }

      // PATCH /api/admin/config
      if (path === '/api/admin/config' && req.method === 'PATCH') {
        const body = await req.json() as Record<string, unknown>
        const updated = await putSiteConfig(env, body)
        return json(updated)
      }

      // GET /api/admin/plans
      if (path === '/api/admin/plans' && req.method === 'GET') {
        return json(await getPlans(env))
      }

      // PUT /api/admin/plans
      if (path === '/api/admin/plans' && req.method === 'PUT') {
        const plans = await req.json() as typeof import('./types').Plan[]
        await putPlans(env, plans)
        return json({ success: true })
      }

      // GET /api/admin/users
      if (path === '/api/admin/users' && req.method === 'GET') {
        const users = await listUsers(env)
        return json(users.map(u => sanitize(u)))
      }

      // PATCH /api/admin/users/:id
      const userPatch = path.match(/^\/api\/admin\/users\/(.+)$/)
      if (userPatch && req.method === 'PATCH') {
        const uid = userPatch[1]
        const target = await getUser(env, uid)
        if (!target) return err('User not found', 404)
        const body = await req.json() as Partial<User>
        const allowed: (keyof User)[] = ['plan', 'role', 'name']
        for (const k of allowed) {
          if (k in body) (target as Record<string, unknown>)[k] = body[k as keyof User]
        }
        await putUser(env, target)
        return json(sanitize(target))
      }

      // GET /api/admin/stats
      if (path === '/api/admin/stats' && req.method === 'GET') {
        const users = await listUsers(env)
        const plans = await getPlans(env)
        const planCounts = plans.reduce<Record<string, number>>((acc, p) => { acc[p.id] = 0; return acc }, {})
        for (const u of users) planCounts[u.plan] = (planCounts[u.plan] ?? 0) + 1
        return json({ totalUsers: users.length, planCounts, plans })
      }
    }

    return json({ error: 'Not found' }, 404)
  },
}
