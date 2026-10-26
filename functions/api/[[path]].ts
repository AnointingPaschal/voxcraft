import type { Env, User, Plan } from './types'
import { registerEmail, loginEmail, getGoogleAuthUrl, handleGoogleCallback, requireAuth, requireAdmin, sanitize } from './auth'
import { getSiteConfig, putSiteConfig, getPlans, putPlans, getUser, putUser, listUsers, incrementUsage, getUsage, getVoiceSamples, putVoiceSamples, saveHistoryEntry, getHistoryIndex, getHistoryEntry, deleteHistoryEntry } from './kv'
import { ACCENT_KEY_TO_FEATURE } from './types'
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
    return json({ tokensUsed: usage.tokensUsed, limit: plan.tokensPerDay, remaining: Math.max(0, plan.tokensPerDay - usage.tokensUsed), plan: user.plan, period, enabledFeatures: plan.enabledFeatures ?? [], allowedVoiceIds: plan.allowedVoiceIds ?? [], historyRetentionDays: plan.historyRetentionDays ?? 0, charLimit: plan.charLimit })
  }

  // ── TTS Synthesize ────────────────────────────────────────────────────────
  if (path === '/api/synthesize' && req.method === 'POST') {
    const user = await requireAuth(env, req)
    if (!user) return e('Please sign in to use Voicera.', 401)

    const body = await req.json() as { text?: string; accentInstruction?: string; format?: string; referenceAudioDataUrl?: string; referenceTranscript?: string; speed?: number; pitch?: number; voiceId?: string; gender?: string; perfStyle?: string }
    const { text, accentInstruction, format = 'mp3', referenceAudioDataUrl, referenceTranscript, speed, pitch, voiceId, gender, perfStyle } = body
    if (!text?.trim()) return e('Please enter a script to synthesize.')

    // ── Feature gate checks ──────────────────────────────────────────────────
    const plans = await getPlans(env)
    const userPlan = plans.find(p => p.id === user.plan) ?? plans[0]!
    const fx = userPlan.enabledFeatures ?? []

    // charLimit of undefined means no per-synthesis cap configured — allow through.
    const charCap = userPlan.charLimit
    if (charCap != null && text.trim().length > charCap) return e(`Your script exceeds the ${charCap.toLocaleString()}-character limit for your plan. Upgrade for a higher limit.`, 400)
    // Voice access gate — allowedVoiceIds empty means all voices allowed
    if (voiceId) {
      const allowed = userPlan.allowedVoiceIds ?? []
      if (allowed.length > 0 && !allowed.includes(voiceId)) return e('This voice is not available on your current plan. Upgrade to access more voices.', 403)
    }
    const hasFx = (id: string) => fx.includes(id as never)

    // WAV format gate
    if (format === 'wav' && !hasFx('format_wav')) {
      return e('WAV export is not available on your plan. Upgrade to unlock WAV.', 403)
    }
    // Voice cloning gate
    if (referenceAudioDataUrl && !hasFx('voice_clone')) {
      return e('Voice Print Cloning is not available on your plan. Upgrade to Starter or higher.', 403)
    }
    // Per-accent gate — check the accentInstruction matches an enabled accent
    if (accentInstruction) {
      // Find which accent label is being used by matching against ACCENT_FEATURES accentKeys
      const accentFeatureId = ACCENT_KEY_TO_FEATURE[accentInstruction.split(' ')[0] ?? '']
        ?? Object.entries(ACCENT_KEY_TO_FEATURE).find(([k]) => accentInstruction.includes(k))?.[1]
      if (accentFeatureId && !hasFx(accentFeatureId)) {
        const featureName = accentInstruction.split(' ')[0] ?? 'This accent'
        return e(`${featureName} is not available on your current plan. Upgrade to access more accents.`, 403)
      }
    }

    const charCount = text.trim().length
    const quota = await incrementUsage(env, user.id, charCount)
    if (!quota.allowed) {
      const periodLabel = quota.period === 'month' ? 'Monthly' : 'Daily'
      return json({ error: `${periodLabel} limit reached. ${quota.remaining.toLocaleString()} chars remaining. Upgrade to continue.`, limitReached: true, remaining: quota.remaining, limit: quota.limit }, 429)
    }

    const config = await getSiteConfig(env)
    if (!config.openrouterApiKey) return e('Voice engine not configured. Please contact admin.')

    // ── Delivery style tag ──────────────────────────────────────────────────
    // Fish Audio S2.1 reads [bracket] cues as style/emotion directions, NOT spoken text.
    // Language lock MUST come first — Fish Audio can drift into German/French/other
    // languages when the style tag contains loanwords it associates with those languages.
    const langLock = '[speak in English only]'
    const perfStyleLower = (perfStyle ?? '').toLowerCase()
    let styleTag = '[warm audiobook narrator, natural intonation, expressive storytelling]'
    if (perfStyleLower.includes('storytelling') || perfStyleLower.includes('narrative')) {
      styleTag = '[master storyteller, immersive, vivid, emotionally resonant, vary pace and pitch]'
    } else if (perfStyleLower.includes('documentary')) {
      styleTag = '[documentary narrator, authoritative, measured, each sentence lands with weight]'
    } else if (perfStyleLower.includes('broadcast') || perfStyleLower.includes('authoritative')) {
      styleTag = '[broadcast journalist, clear, confident, compelling delivery]'
    } else if (perfStyleLower.includes('calm') || perfStyleLower.includes('soothing')) {
      styleTag = '[calm, gentle, soothing, slow and soft, reassuring tone]'
    } else if (perfStyleLower.includes('energetic') || perfStyleLower.includes('excited')) {
      styleTag = '[high energy, enthusiastic, bright and upbeat, punch key words]'
    } else if (perfStyleLower.includes('corporate') || perfStyleLower.includes('professional')) {
      styleTag = '[professional corporate narrator, clear, polished, confident]'
    } else if (perfStyleLower.includes('natural') || perfStyleLower.includes('conversational')) {
      styleTag = '[natural conversational tone, friendly, relaxed, like talking to a friend]'
    }

    // Build the final input: language lock first, then style, then the user's raw script
    const baseText = text.trim()

    // ── Text pre-processing ─────────────────────────────────────────────────
    // 1. Normalise Unicode punctuation to ASCII equivalents
    const normalised = baseText
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\u2014|\u2013/g, ' — ')
      .replace(/\u2026/g, '...')

    // 2. Inject Fish Audio S2 pause markers.
    //    normalize MUST be false for these to survive (set below in provider.options).
    const processedScript = normalised
      // paragraph breaks — deep breath between paragraphs
      .replace(/\n{2,}/g, ' [long-break] [long-break] ')
      // single newlines — sentence boundary
      .replace(/\n/g, ' [long-break] ')
      // ellipsis — dramatic trailing pause
      .replace(/\.\.\.(\s*)/g, '... [long-break] ')
      // sentence-ending punctuation
      .replace(/([.?!])(\s+|$)/g, '$1 [long-break] ')
      // clause separators
      .replace(/([,;:])(\s+)/g, '$1 [break] ')
      // em dash — parenthetical pause
      .replace(/ — /g, ' [break] — [break] ')
      // collapse multiple spaces
      .replace(/ {2,}/g, ' ')
      .trim()

    // Language lock first, then style tag — Fish Audio reads these left-to-right
    const processedInput = `${langLock} ${styleTag} ${processedScript}`

    const payload: Record<string, unknown> = {
      model: config.openrouterModel || 'fish-audio/s2.1-pro-free:free',
      input: processedInput,
      response_format: format,
    }
    // Speed — baked into audio only when plan enables speed_control AND no reference
    // voice is in use. When cloning, speed distorts the reference voice; the client
    // applies speed client-side via Web Audio playbackRate instead.
    if (hasFx('speed_control') && !referenceAudioDataUrl && typeof speed === 'number' && speed >= 0.5 && speed <= 2.0 && speed !== 1.0) {
      payload.speed = Math.round(speed * 100) / 100
    }
    // Pitch shifting — only when plan enables pitch_control
    if (hasFx('pitch_control') && typeof pitch === 'number' && pitch !== 0 && pitch >= -12 && pitch <= 12) {
      payload.pitch = pitch
    }
    // Always set provider options: language lock + normalize=false for pause markers
    payload.provider = {
      options: {
        'fish-audio': {
          language: 'en',       // force English — prevents drift into German/French/etc
          normalize: false,     // must be false to preserve [break]/[long-break] tokens
          chunk_length: 200,
        },
      },
    }

    if (referenceAudioDataUrl) {
      // OpenRouter voice cloning format: input_references with type=input_audio
      const refs: unknown[] = [
        { type: 'input_audio', input_audio: { data: referenceAudioDataUrl } },
      ]
      if (referenceTranscript?.trim()) {
        refs.push({ type: 'text', text: referenceTranscript.trim() })
      }
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
      // Only retry on transient errors; surface auth/client errors immediately
      if (![429, 500, 502, 503, 504].includes(upstream.status)) {
        let orError = ''
        try { orError = (JSON.parse(errText) as { error?: { message?: string } })?.error?.message ?? errText } catch { orError = errText }
        const friendly = [401, 402, 403].includes(upstream.status)
          ? `Voice engine auth error: ${orError}`
          : `Voice engine error (${upstream.status}): ${orError}`
        return e(friendly, upstream.status)
      }
      await new Promise(r => setTimeout(r, 2000))
      // Retry with the exact same payload — model is already resolved with fallback
      upstream = await fetch('https://openrouter.ai/api/v1/audio/speech', {
        method: 'POST', headers: orHeaders, body: JSON.stringify(payload),
      })
      if (!upstream.ok) {
        const errText2 = await upstream.text()
        console.error(`[Voicera] Attempt 2 failed (${upstream.status}):`, errText2)
        let orError = ''
        try { orError = (JSON.parse(errText2) as { error?: { message?: string } })?.error?.message ?? errText2 } catch { orError = errText2 }
        let friendly = `Voice engine error (${upstream.status}): ${orError}`
        if (upstream.status === 429) friendly = `Rate limit reached — ${orError}`
        else if ([401, 402, 403].includes(upstream.status)) friendly = `Voice engine auth error: ${orError}`
        return e(friendly, upstream.status)
      }
    }

    const mime = format === 'wav' ? 'audio/wav' : 'audio/mpeg'

    // History is now saved explicitly by the client after applying speed+pitch
    // via POST /api/history/save — not auto-saved here.

    // Stream the body directly — buffering with arrayBuffer() holds CPU active for
    // the full download and can trip Cloudflare Pages' CPU timeout on longer scripts.
    return new Response(upstream.body, { headers: { 'Content-Type': mime, 'Cache-Control': 'no-store', 'X-Tokens-Remaining': String(quota.remaining), 'X-Tokens-Limit': String(quota.limit), 'X-Tokens-Period': quota.period } })
  }

  // ── Audio History ─────────────────────────────────────────────────────────
  // POST /api/history/save — save pre-rendered audio (with speed+pitch already applied)
  if (path === '/api/history/save' && req.method === 'POST') {
    const user = await requireAuth(env, req)
    if (!user) return e('Unauthorized', 401)
    const userPlan = (await getPlans(env)).find(p => p.id === user.plan) ?? (await getPlans(env))[0]
    const hasFx = (id: string) => (userPlan.enabledFeatures ?? []).includes(id as never)
    if (!hasFx('history')) return e('History is not available on your plan.', 403)
    const retentionDays = userPlan.historyRetentionDays ?? 0
    if (retentionDays <= 0) return e('History retention is not configured for your plan.', 403)

    const body = await req.json() as { audioDataUrl?: string; script?: string; accent?: string; format?: string; chars?: number; speed?: number; pitch?: number }
    if (!body.audioDataUrl?.startsWith('data:audio/')) return e('Invalid audio data.', 400)

    const entryId = crypto.randomUUID()
    const now = Date.now()
    await saveHistoryEntry(env, {
      id: entryId,
      userId: user.id,
      createdAt: now,
      expiresAt: now + retentionDays * 86400_000,
      script: (body.script ?? '').slice(0, 200),
      accent: body.accent ?? '',
      format: (body.format === 'wav' ? 'wav' : 'mp3') as 'mp3' | 'wav',
      chars: body.chars ?? 0,
      audioDataUrl: body.audioDataUrl,
      planId: user.plan,
    }, retentionDays)
    return json({ ok: true, id: entryId })
  }

  if (path === '/api/history' && req.method === 'GET') {
    const user = await requireAuth(env, req)
    if (!user) return e('Unauthorized', 401)
    const idx = await getHistoryIndex(env, user.id)
    return json(idx)
  }

  if (path.startsWith('/api/history/') && req.method === 'GET') {
    const user = await requireAuth(env, req)
    if (!user) return e('Unauthorized', 401)
    const id = path.replace('/api/history/', '')
    const entry = await getHistoryEntry(env, user.id, id)
    if (!entry) return e('Not found', 404)
    // Return the audio as a binary response
    const b64 = entry.audioDataUrl.split(',')[1] ?? ''
    const binary = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    const mime = entry.format === 'wav' ? 'audio/wav' : 'audio/mpeg'
    return new Response(binary.buffer, { headers: { 'Content-Type': mime, 'Content-Disposition': `attachment; filename="voicera-${id}.${entry.format}"`, 'Cache-Control': 'private, max-age=3600' } })
  }

  if (path.startsWith('/api/history/') && req.method === 'DELETE') {
    const user = await requireAuth(env, req)
    if (!user) return e('Unauthorized', 401)
    const id = path.replace('/api/history/', '')
    await deleteHistoryEntry(env, user.id, id)
    return json({ ok: true })
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
