import type { Env, Plan, User, PaymentRecord } from './types'
import { getUser, putUser, putPayment, getPayment, getSiteConfig } from './kv'

export async function initializePayment(
  env: Env, user: User, plan: Plan, redirectUrl: string,
): Promise<{ link: string; txRef: string } | { error: string }> {
  const cfg = await getSiteConfig(env)
  if (!cfg.flutterwaveSecretKey) return { error: 'Payment not configured. Contact admin.' }

  const txRef = `voxcraft-${user.id}-${Date.now()}`
  const rec: PaymentRecord = {
    id: crypto.randomUUID(), userId: user.id, plan: plan.id,
    amount: plan.price, currency: 'USD', status: 'pending',
    txRef, createdAt: Date.now(),
  }
  await putPayment(env, rec)

  const res = await fetch('https://api.flutterwave.com/v3/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.flutterwaveSecretKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tx_ref: txRef, amount: plan.price, currency: 'USD',
      redirect_url: redirectUrl,
      customer: { email: user.email, name: user.name },
      customizations: {
        title: cfg.siteName,
        description: `${plan.name} Plan — ${plan.tokensPerDay.toLocaleString()} chars/day`,
        logo: cfg.logoUrl || undefined,
      },
      payment_options: 'card,ussd,bank_transfer',
      meta: { txRef, userId: user.id, plan: plan.id },
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error('[FLW] Init failed:', res.status, errText)
    try {
      const parsed = JSON.parse(errText) as { message?: string }
      if (parsed.message) return { error: `Payment error: ${parsed.message}` }
    } catch { /* ignore */ }
    return { error: `Payment initialization failed (${res.status}). Please try again.` }
  }
  const data = await res.json() as { status: string; message?: string; data?: { link: string } }
  if (data.status !== 'success' || !data.data?.link) {
    return { error: data.message ? `Payment error: ${data.message}` : 'Payment initialization failed.' }
  }
  return { link: data.data.link, txRef }
}

export async function verifyAndActivate(env: Env, txRef: string): Promise<{ success: boolean; plan?: string; error?: string }> {
  const cfg = await getSiteConfig(env)
  const rec = await getPayment(env, txRef)
  if (!rec) return { success: false, error: 'Payment record not found.' }
  if (rec.status === 'successful') return { success: true, plan: rec.plan }

  const res = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${txRef}`, {
    headers: { Authorization: `Bearer ${cfg.flutterwaveSecretKey}` },
  })
  if (!res.ok) return { success: false, error: 'Verification failed.' }
  const data = await res.json() as { status: string; data?: { status: string } }

  if (data.status !== 'success' || data.data?.status !== 'successful') {
    rec.status = 'failed'
    await putPayment(env, rec)
    return { success: false, error: 'Payment not completed.' }
  }

  rec.status = 'successful'
  rec.flwRef = txRef
  await putPayment(env, rec)

  const user = await getUser(env, rec.userId)
  if (user) {
    user.plan = rec.plan
    user.subscriptionExpiry = Date.now() + 30 * 86400 * 1000
    await putUser(env, user)
  }
  return { success: true, plan: rec.plan }
}

export async function handleWebhook(env: Env, req: Request): Promise<Response> {
  const cfg = await getSiteConfig(env)
  const hash = req.headers.get('verif-hash')
  if (!hash || hash !== cfg.flutterwaveWebhookHash) return new Response('Unauthorized', { status: 401 })
  const body = await req.json() as { event: string; data?: { tx_ref?: string; status?: string } }
  if (body.event === 'charge.completed' && body.data?.status === 'successful' && body.data?.tx_ref) {
    await verifyAndActivate(env, body.data.tx_ref)
  }
  return new Response('ok')
}
