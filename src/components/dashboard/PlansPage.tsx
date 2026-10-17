import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Loader2, Zap, Star, Crown, Building2 } from 'lucide-react'
import { getPlans, initPayment, type Plan } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import ThemeToggle from '../ThemeToggle'

const ICONS = { free: Zap, starter: Star, pro: Crown, enterprise: Building2 }

interface Props { onBack: () => void }

export default function PlansPage({ onBack }: Props) {
  const { user } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [currency, setCurrency] = useState<'USD' | 'NGN'>(() => (localStorage.getItem('vc_currency') as 'USD' | 'NGN') || 'USD')

  useEffect(() => {
    getPlans().then(setPlans).catch(console.error).finally(() => setLoading(false))
  }, [])

  function changeCurrency(value: 'USD' | 'NGN') { setCurrency(value); localStorage.setItem('vc_currency', value) }

  async function handleUpgrade(plan: Plan) {
    if (!user) return
    if (plan.id === user.plan) return
    if (plan.price === 0) return
    setUpgrading(plan.id)
    setError('')
    try {
      const { link } = await initPayment(plan.id, currency)
      window.open(link, '_self')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment initialization failed.')
    } finally {
      setUpgrading(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 size={28} className="animate-spin" style={{ color: '#20d2a0' }} />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex justify-end mb-3"><ThemeToggle /></div>
      <div className="text-center mb-8">
        <h1 className="display text-2xl font-bold mb-2" style={{ color: '#f0faf7' }}>Choose Your Plan</h1>
        <p className="text-sm" style={{ color: 'rgba(240,250,247,0.5)' }}>Upgrade for more characters, voices, and studio features.</p>
      </div>

      <div className="currency-picker"><label htmlFor="checkout-currency">Checkout currency</label><select id="checkout-currency" value={currency} onChange={e => changeCurrency(e.target.value as 'USD' | 'NGN')}><option value="USD">USD · US Dollar</option><option value="NGN">NGN · Nigerian Naira</option></select><span>Plan prices are set by the site admin for each currency.</span></div>

      {error && (
        <div className="rounded-xl px-4 py-3 mb-6 text-sm text-center" style={{ background: 'rgba(186,43,76,0.12)', border: '1px solid rgba(186,43,76,0.3)', color: '#ff6b8a' }}>{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {plans.map((plan, i) => {
          const Icon = ICONS[plan.id] ?? Zap
          const isCurrent = user?.plan === plan.id
          const isPopular = plan.popular
          const selectedPrice = currency === 'USD' ? plan.price : plan.priceNgn
          const priceLabel = selectedPrice == null ? 'Not configured' : selectedPrice === 0 ? 'Free' : new Intl.NumberFormat(currency === 'NGN' ? 'en-NG' : 'en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(selectedPrice)
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl p-5 relative"
              style={{
                background: isPopular ? 'rgba(32,210,160,0.08)' : 'rgba(255,255,255,0.04)',
                border: isPopular ? '1px solid rgba(32,210,160,0.4)' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg, #20d2a0 0%, #0ea882 100%)', color: '#0a121e' }}>
                  Most Popular
                </div>
              )}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(32,210,160,0.12)' }}>
                    <Icon size={15} style={{ color: '#20d2a0' }} />
                  </div>
                  <div>
                    <div className="text-sm font-bold" style={{ color: '#f0faf7' }}>{plan.name}</div>
                    <div className="text-xs tabular-nums" style={{ color: '#20d2a0' }}>
                      {plan.tokensPerDay.toLocaleString()} chars/day
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold tabular-nums" style={{ color: '#f0faf7' }}>
                    {priceLabel}
                  </div>
                  {selectedPrice != null && selectedPrice > 0 && <div className="text-xs" style={{ color: 'rgba(240,250,247,0.4)' }}>/month</div>}
                </div>
              </div>

              <ul className="space-y-1.5 mb-5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs" style={{ color: 'rgba(240,250,247,0.65)' }}>
                    <CheckCircle2 size={12} style={{ color: '#20d2a0', flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="w-full rounded-xl py-2.5 text-xs font-bold text-center"
                  style={{ background: 'rgba(32,210,160,0.12)', border: '1px solid rgba(32,210,160,0.3)', color: '#20d2a0' }}>
                  Current Plan
                </div>
              ) : selectedPrice === 0 ? (
                <div className="w-full rounded-xl py-2.5 text-xs font-medium text-center"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(240,250,247,0.4)' }}>
                  Free tier
                </div>
              ) : (
                <button type="button" onClick={() => { void handleUpgrade(plan) }}
                  disabled={upgrading === plan.id || selectedPrice == null}
                  className="w-full rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                  style={upgrading === plan.id || selectedPrice == null
                    ? { background: 'rgba(32,210,160,0.1)', color: 'rgba(32,210,160,0.5)', cursor: 'not-allowed' }
                    : { background: 'linear-gradient(135deg, #20d2a0 0%, #0ea882 100%)', color: '#0a121e' }}>
                  {upgrading === plan.id ? <Loader2 size={13} className="animate-spin" /> : null}
                  {selectedPrice == null ? `Set ${currency} price in admin` : `Upgrade to ${plan.name}`}
                </button>
              )}
            </motion.div>
          )
        })}
      </div>

      <button type="button" onClick={onBack}
        className="mt-6 w-full rounded-xl py-2.5 text-sm transition-colors"
        style={{ color: 'rgba(240,250,247,0.4)', border: '1px solid rgba(255,255,255,0.06)', background: 'transparent' }}>
        Back to Studio
      </button>

      <p className="text-center text-xs mt-4" style={{ color: 'rgba(240,250,247,0.25)' }}>
        Payments processed securely via Flutterwave. Cancel anytime.
      </p>
    </div>
  )
}
