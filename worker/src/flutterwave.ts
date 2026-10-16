import type { Env, Plan, User, PaymentRecord } from './types'
import { getUser, putUser, putPayment, getPayment, getPlans } from './kv'

export async function initializePayment(
  env: Env,
  user: User,
  plan: Plan,
  redirectUrl: string,
): Promise<{ link: string; txRef: string } | { error: string }> {
  const txRef = `voxcraft-${user.id}-${Date.now()}`
  const rec: PaymentRecord = {
    id: crypto.randomUUID(),
    userId: user.id,
    plan: plan.id,
    amount: plan.price,
    currency: 'USD',
    status: 'pending',
    txRef,
    createdAt: Date.now(),
  }
  await putPayment(env, rec)

  const payload = {
    tx_ref: txRef,
    amount: plan.price,
    currency: 'USD',
    redirect_url: redirectUrl,
    customer: { email: user.email, name: user.name },
    customizations: {
      title: 'VoxCraft Studio',
      description: `${plan.name} Plan — ${plan.tokensPerDay.toLocaleString()} chars/day`,
      logo: 'https://voxcraft.studio/logo.png',
    },
    payment_options: 'card,ussd,bank_transfer',
    meta: { txRef, userId: user.id, plan: plan.id },
  }

  const res = await fetch('https://api.flutterwave.com/v3/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.FLUTTERWAVE_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[FLW] Init failed:', err)
    return { error: 'Payment initialization failed. Please try again.' }
  }

  const data = await res.json() as { status: string; data?: { link: string } }
  if (data.status !== 'success' || !data.data?.link) return { error: 'Payment initialization failed.' }
  return { link: data.data.link, txRef }
}

export async function verifyAndActivate(env: Env, txRef: string): Promise<{ success: boolean; plan?: string; error?: string }> {
  const rec = await getPayment(env, txRef)
  if (!rec) return { success: false, error: 'Payment record not found.' }
  if (rec.status === 'successful') return { success: true, plan: rec.plan }

  // Verify with Flutterwave
  const res = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${txRef}`, {
    headers: { Authorization: `Bearer ${env.FLUTTERWAVE_SECRET_KEY}` },
  })
  if (!res.ok) return { success: false, error: 'Verification failed.' }
  const data = await res.json() as { status: string; data?: { status: string; amount: number; currency: string; meta?: { plan: string; userId: string } } }

  if (data.status !== 'success' || data.data?.status !== 'successful') {
    rec.status = 'failed'
    await putPayment(env, rec)
    return { success: false, error: 'Payment not completed.' }
  }

  // Activate plan
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
  const hash = req.headers.get('verif-hash')
  if (!hash || hash !== env.FLUTTERWAVE_WEBHOOK_HASH) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await req.json() as { event: string; data?: { tx_ref?: string; status?: string } }
  if (body.event === 'charge.completed' && body.data?.status === 'successful' && body.data?.tx_ref) {
    await verifyAndActivate(env, body.data.tx_ref)
  }
  return new Response('ok')
}

export function getPlanPrice(plan: Plan): string {
  if (plan.price === 0) return 'Free'
  return `$${plan.price}/mo`
}

export async function getAdminStats(env: Env) {
  const plans = await getPlans(env)
  return { plans }
}
