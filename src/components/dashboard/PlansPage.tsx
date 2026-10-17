import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Loader2, Zap, Star, Crown, Building2, ChevronDown, RefreshCw } from 'lucide-react'
import { getPlans, initPayment, type Plan } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import ThemeToggle from '../ThemeToggle'

const ICONS = { free: Zap, starter: Star, pro: Crown, enterprise: Building2 }

// 22 supported currencies with Flutterwave support
const CURRENCIES = [
  { code: 'USD', name: 'US Dollar',         symbol: '$',  locale: 'en-US' },
  { code: 'NGN', name: 'Nigerian Naira',    symbol: '₦',  locale: 'en-NG' },
  { code: 'GHS', name: 'Ghanaian Cedi',     symbol: '₵',  locale: 'en-GH' },
  { code: 'KES', name: 'Kenyan Shilling',   symbol: 'KSh',locale: 'en-KE' },
  { code: 'UGX', name: 'Ugandan Shilling',  symbol: 'USh',locale: 'en-UG' },
  { code: 'TZS', name: 'Tanzanian Shilling',symbol: 'TSh',locale: 'en-TZ' },
  { code: 'ZAR', name: 'South African Rand',symbol: 'R',  locale: 'en-ZA' },
  { code: 'EGP', name: 'Egyptian Pound',    symbol: 'E£', locale: 'en-EG' },
  { code: 'XOF', name: 'West African CFA',  symbol: 'CFA',locale: 'fr-SN' },
  { code: 'MAD', name: 'Moroccan Dirham',   symbol: 'د.م',locale: 'ar-MA' },
  { code: 'GBP', name: 'British Pound',     symbol: '£',  locale: 'en-GB' },
  { code: 'EUR', name: 'Euro',              symbol: '€',  locale: 'de-DE' },
  { code: 'CAD', name: 'Canadian Dollar',   symbol: 'CA$',locale: 'en-CA' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', locale: 'en-AU' },
  { code: 'INR', name: 'Indian Rupee',      symbol: '₹',  locale: 'en-IN' },
  { code: 'BRL', name: 'Brazilian Real',    symbol: 'R$', locale: 'pt-BR' },
  { code: 'MXN', name: 'Mexican Peso',      symbol: 'MX$',locale: 'es-MX' },
  { code: 'JPY', name: 'Japanese Yen',      symbol: '¥',  locale: 'ja-JP' },
  { code: 'CNY', name: 'Chinese Yuan',      symbol: '¥',  locale: 'zh-CN' },
  { code: 'AED', name: 'UAE Dirham',        symbol: 'د.إ',locale: 'ar-AE' },
  { code: 'SAR', name: 'Saudi Riyal',       symbol: '﷼',  locale: 'ar-SA' },
  { code: 'RWF', name: 'Rwandan Franc',     symbol: 'FRw',locale: 'en-RW' },
]

type CurrencyCode = typeof CURRENCIES[number]['code']

// Cache FX rates for session
const rateCache: Record<string, { rate: number; ts: number }> = {}

async function getUsdRate(toCurrency: CurrencyCode): Promise<number> {
  if (toCurrency === 'USD') return 1
  const cached = rateCache[toCurrency]
  if (cached && Date.now() - cached.ts < 5 * 60 * 1000) return cached.rate
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/USD`)
    const data = await res.json() as { rates: Record<string, number> }
    // Cache all rates at once
    Object.entries(data.rates).forEach(([code, rate]) => {
      rateCache[code] = { rate, ts: Date.now() }
    })
    return data.rates[toCurrency] ?? 1
  } catch {
    // Fallback static rates
    const fallback: Record<string, number> = {
      NGN: 1600, GHS: 15, KES: 130, UGX: 3700, TZS: 2600,
      ZAR: 18, EGP: 50, XOF: 620, MAD: 10, GBP: 0.79,
      EUR: 0.92, CAD: 1.36, AUD: 1.53, INR: 83, BRL: 5.1,
      MXN: 17, JPY: 155, CNY: 7.2, AED: 3.67, SAR: 3.75, RWF: 1300,
    }
    return fallback[toCurrency] ?? 1
  }
}

interface Props { onBack: () => void; allowThemeToggle?: boolean }

export default function PlansPage({ onBack, allowThemeToggle = true }: Props) {
  const { user } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [currency, setCurrency] = useState<CurrencyCode>(() =>
    (localStorage.getItem('vc_currency') as CurrencyCode) || 'USD')
  const [fxRate, setFxRate] = useState(1)
  const [fxLoading, setFxLoading] = useState(false)
  const [dropOpen, setDropOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getPlans().then(setPlans).catch(console.error).finally(() => setLoading(false))
  }, [])

  // Fetch live rate when currency changes
  useEffect(() => {
    let cancelled = false
    void (async () => {
      setFxLoading(true)
      try {
        const r = await getUsdRate(currency)
        if (!cancelled) setFxRate(r)
      } finally {
        if (!cancelled) setFxLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [currency])

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropOpen) return
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropOpen])

  function changeCurrency(code: CurrencyCode) {
    setCurrency(code)
    localStorage.setItem('vc_currency', code)
    setDropOpen(false)
  }

  function formatPrice(usdPrice: number): string {
    if (usdPrice === 0) return 'Free'
    const converted = usdPrice * fxRate
    const cur = CURRENCIES.find(c => c.code === currency)!
    try {
      return new Intl.NumberFormat(cur.locale, {
        style: 'currency', currency: currency,
        maximumFractionDigits: currency === 'JPY' || currency === 'KES' || currency === 'UGX' || currency === 'TZS' || currency === 'XOF' || currency === 'RWF' ? 0 : 2,
      }).format(converted)
    } catch {
      return `${cur.symbol}${converted.toFixed(0)}`
    }
  }

  async function handleUpgrade(plan: Plan) {
    if (!user || plan.id === user.plan || plan.price === 0) return
    setUpgrading(plan.id); setError('')
    try {
      const { link } = await initPayment(plan.id, currency === 'NGN' ? 'NGN' : 'USD')
      window.open(link, '_self')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment initialization failed.')
    } finally { setUpgrading(null) }
  }

  const selectedCur = CURRENCIES.find(c => c.code === currency)!

  if (loading) return (
    <div className="plans-page flex items-center justify-center min-h-[60vh]">
      <Loader2 size={28} className="animate-spin plans-accent" />
    </div>
  )

  return (
    <div className="plans-page max-w-2xl mx-auto px-4 py-8">
      <div className="flex justify-end mb-3"><ThemeToggle enabled={allowThemeToggle} /></div>

      <div className="text-center mb-8">
        <h1 className="display text-2xl font-bold mb-2 plans-heading">Choose Your Plan</h1>
        <p className="text-sm plans-subtext">Upgrade for more characters, voices, and studio features.</p>
      </div>

      {/* Currency picker — div dropdown, no native select */}
      <div className="plans-currency-bar mb-6">
        <span className="text-sm font-medium plans-heading">Checkout currency</span>
        <div className="relative" ref={dropRef}>
          <button
            type="button"
            className="plans-cur-trigger flex items-center gap-2"
            onClick={() => setDropOpen(v => !v)}
          >
            <span className="font-mono text-xs plans-accent">{selectedCur.code}</span>
            <span className="plans-subtext text-xs">{selectedCur.name}</span>
            {fxLoading
              ? <RefreshCw size={12} className="animate-spin plans-accent" />
              : <ChevronDown size={14} className={`plans-subtext transition-transform${dropOpen ? ' rotate-180' : ''}`} />}
          </button>

          <AnimatePresence>
            {dropOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.16 }}
                className="plans-cur-dropdown absolute right-0 top-full mt-2 z-50"
              >
                <div className="plans-cur-scroll">
                  {CURRENCIES.map(cur => (
                    <button
                      key={cur.code}
                      type="button"
                      onClick={() => changeCurrency(cur.code)}
                      className={`plans-cur-option w-full flex items-center gap-3 px-3 py-2 text-left${cur.code === currency ? ' active' : ''}`}
                    >
                      <span className="font-mono text-xs w-10 flex-shrink-0 plans-accent">{cur.code}</span>
                      <span className="text-sm flex-1 plans-heading">{cur.name}</span>
                      {cur.code === currency && <CheckCircle2 size={13} className="plans-accent flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {currency !== 'USD' && !fxLoading && (
        <p className="text-xs plans-subtext text-center mb-4 -mt-2">
          Live rate: 1 USD = {fxRate.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}
          <span className="ml-1 opacity-60">(prices auto-converted)</span>
        </p>
      )}

      {error && (
        <div className="rounded-xl px-4 py-3 mb-6 text-sm text-center plans-error">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {plans.map((plan, i) => {
          const Icon = ICONS[plan.id] ?? Zap
          const isCurrent = user?.plan === plan.id
          const priceLabel = formatPrice(plan.price)
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`plans-card rounded-2xl p-5 relative${plan.popular ? ' popular' : ''}`}
            >
              {plan.popular && (
                <div className="plans-popular-badge absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold">
                  Most Popular
                </div>
              )}

              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="plans-icon-wrap w-8 h-8 rounded-xl flex items-center justify-center">
                    <Icon size={15} className="plans-accent" />
                  </div>
                  <div>
                    <div className="text-sm font-bold plans-card-name">{plan.name}</div>
                    <div className="text-xs tabular-nums plans-accent">{plan.tokensPerDay.toLocaleString()} chars/day</div>
                  </div>
                </div>
                <div className="text-right">
                  {fxLoading
                    ? <Loader2 size={14} className="animate-spin plans-accent" />
                    : <div className="text-lg font-bold tabular-nums plans-card-name">{priceLabel}</div>}
                  {plan.price > 0 && !fxLoading && (
                    <div className="text-xs plans-subtext">/month</div>
                  )}
                </div>
              </div>

              <ul className="space-y-1.5 mb-5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs plans-feature">
                    <CheckCircle2 size={12} className="plans-accent flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="w-full rounded-xl py-2.5 text-xs font-bold text-center plans-current-badge">
                  Current Plan
                </div>
              ) : plan.price === 0 ? (
                <div className="w-full rounded-xl py-2.5 text-xs font-medium text-center plans-free-badge">
                  Free tier
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { void handleUpgrade(plan) }}
                  disabled={upgrading === plan.id}
                  className={`w-full rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-2 transition-all plans-upgrade-btn${upgrading === plan.id ? ' disabled' : ''}`}
                >
                  {upgrading === plan.id ? <Loader2 size={13} className="animate-spin" /> : null}
                  Upgrade to {plan.name}
                </button>
              )}
            </motion.div>
          )
        })}
      </div>

      <button type="button" onClick={onBack}
        className="mt-6 w-full rounded-xl py-2.5 text-sm transition-colors plans-back-btn">
        Back to Studio
      </button>

      <p className="text-center text-xs mt-4 plans-fine-print">
        Payments processed securely via Flutterwave. Cancel anytime.
      </p>
    </div>
  )
}
