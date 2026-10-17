import type { Env, Plan, User, PaymentRecord } from './types'
import { getUser, putUser, putPayment, getPayment, getSiteConfig } from './kv'

async function getUsdRate(currency: string): Promise<number> {
  if (currency === 'USD') return 1
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/USD`)
    if (!res.ok) return 1
    const data = await res.json() as { rates?: Record<string, number> }
    return data.rates?.[currency] ?? 1
  } catch { return 1 }
}

export async function initializePayment(
  env: Env, user: User, plan: Plan, redirectUrl: string, currency = 'USD',
): Promise<{ link: string; txRef: string } | { error: string }> {
  const cfg = await getSiteConfig(env)
  if (!cfg.flutterwaveSecretKey) return { error: 'Payment not configured. Contact admin.' }
  if (plan.price <= 0) return { error: 'Free plan requires no payment.' }

  const fxRate = await getUsdRate(currency.toUpperCase())
  const convertedAmount = Math.ceil(plan.price * fxRate * 100) / 100

  const txRef = `voxcraft-${user.id}-${Date.now()}`
  const rec: PaymentRecord = {
    id: crypto.randomUUID(), userId: user.id, plan: plan.id,
    amount: convertedAmount, currency: currency.toUpperCase(), status: 'pending',
    txRef, createdAt: Date.now(),
  }
  await putPayment(env, rec)

  const res = await fetch('https://api.flutterwave.com/v3/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.flutterwaveSecretKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tx_ref: txRef,
      amount: convertedAmount,
      currency: currency.toUpperCase(),
      redirect_url: redirectUrl,
      customer: { email: user.email, name: user.name },
      customizations: {
        title: cfg.siteName || 'VoxCraft Studio',
        description: `${plan.name} Plan — ${plan.tokensPerDay.toLocaleString()} chars/${(plan as { tokenBillingMode?: string }).tokenBillingMode === 'month' ? 'month' : 'day'}`,
        logo: cfg.logoUrl || undefined,
      },
      payment_options: 'card,ussd,bank_transfer,mobilemoney',
      meta: { txRef, userId: user.id, plan: plan.id },
    }),
  })

  if (!res.ok) {
    console.error('[FLW] Init failed:', await res.text())
    return { error: 'Payment initialization failed. Please try again.' }
  }
  const data = await res.json() as { status: string; data?: { link: string } }
  if (data.status !== 'success' || !data.data?.link) return { error: 'Payment initialization failed.' }
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
