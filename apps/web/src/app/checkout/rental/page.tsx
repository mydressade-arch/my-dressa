'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { rentalsApi, api } from '@/lib/api'
import { useLangStore } from '@/store/lang.store'
import { getStripe, isTestMode } from '@/lib/stripe'
import { differenceInDays, parseISO } from 'date-fns'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

const PH = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='260'%3E%3Crect fill='%23f1edec' width='200' height='260'/%3E%3C/svg%3E"

// ── Step 1: Adresse + AGB → Rental erstellen → clientSecret holen ────────────
function RentalCheckoutInner() {
  const params     = useSearchParams()
  const router     = useRouter()
  const { user }   = useAuthStore()
  const variantId  = params.get('variantId') || ''
  const productId  = params.get('productId') || ''
  const startDate  = params.get('start') || ''
  const endDate    = params.get('end')   || ''

  const [product, setProduct]     = useState<any>(null)
  const [variant, setVariant]     = useState<any>(null)
  const [loading, setLoading]     = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')
  const [addr, setAddr]           = useState({ street:'', city:'', zip:'', country:'DE' })
  const [addrErrors, setAddrErrors] = useState<Record<string,string>>({})

  const validateAddress = (a: typeof addr) => {
    const errors: Record<string,string> = {}
    if (!a.street.trim() || a.street.trim().length < 5)
      errors.street = 'Bitte vollständige Straße und Hausnummer eingeben'
    if (!a.city.trim() || a.city.trim().length < 2)
      errors.city = 'Bitte Stadt eingeben'
    const zipClean = a.zip.replace(/\s/g, '')
    if (!/^\d{5}$/.test(zipClean))
      errors.zip = 'PLZ muss 5 Ziffern haben (z.B. 10115)'
    return errors
  }
  const [consent, setConsent]     = useState({ agb:false, rental:false, liability:false })

  // Stripe payment step
  const { t } = useLangStore()
  const [step, setStep]               = useState<'details' | 'payment'>('details')
  const [clientSecret, setClientSecret]         = useState('')
  const [depositClientSecret, setDepositClientSecret] = useState('')
  const [orderId, setOrderId]                     = useState('')
  const [stripeReady, setStripeReady] = useState(false)
  const [stripeInstance, setStripeInstance] = useState<any>(null)

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return }
    if (!variantId) { setLoading(false); return }
    api.get(`/products/variant/${variantId}`)
      .then(({ data }) => {
        setProduct(data)
        setVariant(data.variants?.find((v: any) => v.id === variantId) || data.variants?.[0])
      })
      .catch(() => setError(t('Produkt nicht gefunden', 'Product not found')))
      .finally(() => setLoading(false))
  }, [variantId, user, router])

  useEffect(() => {
    getStripe().then(s => { setStripeInstance(s); setStripeReady(true) })
  }, [])

  const days       = startDate && endDate ? Math.max(1, differenceInDays(parseISO(endDate), parseISO(startDate))) : 0
  const pricePerDay  = Number(product?.rentalPrice || 0)
  const rentalFee    = days * pricePerDay
  const shippingCost = Number(product?.shippingCost || 0)
  const deposit      = product?.depositAmount != null ? Number(product.depositAmount) : 50
  const total        = rentalFee + shippingCost

  // Step 1: Rental anlegen + Payment Intent holen
  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consent.agb || !consent.rental || !consent.liability) {
      setError(t('Bitte alle Bedingungen akzeptieren', 'Please accept all terms')); return
    }
    const addrErrs = validateAddress(addr)
    if (Object.keys(addrErrs).length > 0) {
      setAddrErrors(addrErrs)
      return
    }
    setAddrErrors({})
    setSubmitting(true); setError('')
    try {
      // Token prüfen bevor wir anfangen
      // 1. Rental + Order erstellen
      const { data: rentalData } = await rentalsApi.create({
        productVariantId: variantId,
        startDate, endDate,
        shippingAddress: addr,
        consent: { agbVersion:'1.0', rentalTermsVersion:'1.0', liabilityAccepted:true },
      })

      // 2. Payment Intent für diese Order erstellen
      const { data: paymentData } = await api.post('/payments/create-intent', {
        orderId: rentalData.orderId,
      })

      setOrderId(rentalData.orderId)
      setClientSecret(paymentData.rentalClientSecret)
      setDepositClientSecret(paymentData.depositClientSecret || '')
      setStep('payment')
    } catch (e: any) {
      const status = (e as any).response?.status
      const msg    = (e as any).response?.data?.message
      console.error('Checkout error:', status, msg)
      if (status === 401) {
        setError('Session abgelaufen — bitte erneut einloggen')
        setTimeout(() => router.push('/auth/login'), 2000)
      } else {
        setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Booking failed')
      }
    } finally { setSubmitting(false) }
  }

  if (loading) return <div style={{ padding:80, textAlign:'center', color:'#9e9e9b' }}>Laden...</div>

  const inp = (label: string, key: keyof typeof addr, placeholder: string) => (
    <div>
      <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.08em', color:'#5e5e5b', display:'block', marginBottom:6 }}>{label}</label>
      <input value={addr[key]} onChange={e => setAddr(a => ({ ...a, [key]: e.target.value }))}
        placeholder={placeholder}
        style={{ width:'100%', padding:'12px 14px', fontSize:14, border:`1px solid ${addrErrors[key] ? '#ba1a1a' : '#c4c7c7'}`, outline:'none', background:'#fdf8f8', boxSizing:'border-box' as const }} />
      {addrErrors[key] && <p style={{ fontSize:12, color:'#ba1a1a', marginTop:4 }}>{addrErrors[key]}</p>}
    </div>
  )

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', width:'100%', padding:'clamp(20px,4vw,40px) clamp(12px,3vw,24px)' }}>
      <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:32, fontWeight:700, marginBottom:8 }}>
        {step === 'details' ? 'Complete Your Rental' : 'Payment'}
      </h1>
      <p style={{ color:'#5e5e5b', fontSize:14, marginBottom:32 }}>
        {startDate} → {endDate} · {days} days
      </p>

      {/* Step indicator */}
      <div style={{ display:'flex', gap:0, marginBottom:32 }}>
        {['Details & Terms', 'Payment'].map((s, i) => (
          <div key={s} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{
                width:24, height:24, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                background: (step === 'details' && i === 0) || (step === 'payment' && i === 1) ? '#1c1b1b' : i < (step === 'payment' ? 1 : 0) ? '#27500A' : '#e8e3e1',
                color: '#fff', fontSize:11, fontWeight:700, flexShrink:0,
              }}>
                {i < (step === 'payment' ? 1 : 0) ? '✓' : i + 1}
              </div>
              <span style={{ fontSize:13, fontWeight:600, color: (step === 'details' && i === 0) || (step === 'payment' && i === 1) ? '#1c1b1b' : '#9e9e9b' }}>
                {s}
              </span>
            </div>
            {i < 1 && <div style={{ width:40, height:1, background:'#e8e3e1', margin:'0 8px' }} />}
          </div>
        ))}
      </div>

      <div className="responsive-grid-2" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:40 }}>
        {step === 'details' ? (
          <form onSubmit={handleConfirm} style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <div style={{ background:'#fff', border:'1px solid #c4c7c7', padding:24 }}>
              <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:600, marginBottom:20, paddingBottom:14, borderBottom:'1px solid #f1edec' }}>Delivery Address</h2>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {inp(t('Straße & Hausnummer', 'Street & Number'), 'street', 'Musterstraße 1')}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12 }}>
                  {inp(t('Stadt', 'City'), 'city', 'Berlin')}
                  {inp(t('Postleitzahl', 'Postal Code'), 'zip', '10115')}
                </div>
              </div>
            </div>

            <div style={{ background:'#fff', border:'1px solid #c4c7c7', padding:24 }}>
              <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:600, marginBottom:20, paddingBottom:14, borderBottom:'1px solid #f1edec' }}>Terms & Conditions</h2>
              {([
                ['agb', t('Ich akzeptiere die Allgemeinen Geschäftsbedingungen (AGB)', 'I accept the General Terms and Conditions')],
                ['rental', t(`Ich akzeptiere die Mietbedingungen — max. 7 Tage, €${deposit} Kaution`, `I accept the Rental Terms — max 7 days, €${deposit} deposit required`)],
                ['liability', 'I accept liability for damage or loss of the item'],
              ] as const).map(([k, label]) => (
                <label key={k} style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:14, cursor:'pointer' }}>
                  <div onClick={() => setConsent(c => ({...c, [k]: !c[k]}))}
                    style={{ width:18, height:18, border:`2px solid ${consent[k] ? '#1c1b1b' : '#c4c7c7'}`, background:consent[k] ? '#1c1b1b' : 'transparent', flexShrink:0, marginTop:1, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                    {consent[k] && <span className="material-symbols-outlined" style={{ fontSize:13, color:'#fff' }}>check</span>}
                  </div>
                  <span style={{ fontSize:13, color:'#5e5e5b', lineHeight:1.5 }}>{label}</span>
                </label>
              ))}
            </div>

            {error && <div style={{ padding:'12px 14px', background:'#ffdad6', color:'#ba1a1a', fontSize:13 }}>{error}</div>}

            <div style={{ display:'flex', gap:12 }}>
              <a href={productId ? `/products/${productId}` : '/products'}
                style={{ padding:'14px 20px', background:'none', border:'1px solid #c4c7c7', fontSize:13, cursor:'pointer', color:'#5e5e5b', fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center', gap:6 }}>
                <span className="material-symbols-outlined" style={{ fontSize:16 }}>arrow_back</span>
                {t('Zurück zum Produkt', 'Back to Product')}
              </a>
              <button type="submit" disabled={submitting}
              style={{ flex:1, background:'#9E896A', color:'#fff', border:'none', padding:16, fontSize:13, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.05em', cursor:submitting ? 'not-allowed' : 'pointer', opacity:submitting ? 0.7 : 1 }}>
              {submitting ? t('Verarbeitung...', 'Processing...') : t('Weiter zur Zahlung', 'Continue to Payment') + ` — €${total.toFixed(2)}`}
            </button>
            </div>
          </form>
        ) : (
          // Step 2: Stripe Payment
          stripeReady && clientSecret && stripeInstance ? (
            <Elements stripe={stripeInstance} options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#1c1b1b',
                  colorBackground: '#ffffff',
                  colorText: '#1c1b1b',
                  colorDanger: '#ba1a1a',
                  fontFamily: 'Helvetica Neue, sans-serif',
                  borderRadius: '2px',
                  spacingUnit: '4px',
                },
              },
            }}>
              <StripePaymentForm
                orderId={orderId}
                amount={total}
                depositClientSecret={depositClientSecret}
                onBack={() => setStep('details')}
              />
            </Elements>
          ) : (
            <div style={{ padding:40, textAlign:'center', color:'#5e5e5b' }}>
              {!stripeInstance && stripeReady ? (
                <div>
                  <p style={{ color:'#ba1a1a', fontWeight:600, marginBottom:8 }}>⚠️ Stripe nicht konfiguriert</p>
                  <p style={{ fontSize:13 }}>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY fehlt in .env.local</p>
                </div>
              ) : !clientSecret ? (
                <div>
                  <p style={{ color:'#ba1a1a', fontWeight:600, marginBottom:8 }}>⚠️ Payment Intent fehlt</p>
                  <p style={{ fontSize:13 }}>Bitte gehe zurück und versuche es erneut.</p>
                  <button onClick={() => setStep('details')} style={{ marginTop:16, padding:'10px 20px', background:'#1c1b1b', color:'#fff', border:'none', cursor:'pointer', fontSize:12, fontWeight:600 }}>← Zurück</button>
                </div>
              ) : (
                <>
                  <div style={{ width:32, height:32, border:'3px solid #c4c7c7', borderTopColor:'#1c1b1b', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }} />
                  {t('Lade Zahlungsformular...', 'Loading payment form...')}
                </>
              )}
            </div>
          )
        )}

        {/* Order Summary */}
        <div style={{ background:'#fff', border:'1px solid #e8e3e1', padding:24, position:'sticky', top:88, alignSelf:'start' }}>
          <h3 style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:600, marginBottom:18, paddingBottom:14, borderBottom:'1px solid #f1edec' }}>
            {t('Bestellübersicht', 'Order Summary')}
          </h3>
          {product && (() => {
            const rate    = Number(product.rentalPrice || 0)
            const ship    = Number(product.shippingCost || 0)
            const deposit = Number(product.depositAmount || 0)
            const rentalTotal = rate * days
            const payNow  = rentalTotal + ship
            return (
              <div>
                {/* Produktzeile mit Bild */}
                <div style={{ display:'flex', gap:12, marginBottom:18 }}>
                  {product.images?.[0]?.url && (
                    <img src={product.images[0].url} alt={product.title}
                      style={{ width:64, height:80, objectFit:'cover', flexShrink:0, borderRadius:2 }} />
                  )}
                  <div style={{ minWidth:0 }}>
                    <p style={{ fontSize:14, fontWeight:600, marginBottom:2, lineHeight:1.3 }}>{product.title}</p>
                    <p style={{ fontSize:12, color:'#9e9e9b', marginBottom:4 }}>{product.merchant?.shopName || ''}</p>
                    <p style={{ fontSize:11, color:'#9E896A', fontWeight:600 }}>{startDate} → {endDate}</p>
                  </div>
                </div>

                {/* Kostenaufstellung */}
                <div style={{ display:'flex', flexDirection:'column', gap:10, fontSize:13, color:'#5e5e5b' }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span>€{rate.toFixed(2)} × {days} {days === 1 ? t('Tag','day') : t('Tage','days')}</span>
                    <span style={{ color:'#1c1b1b' }}>€{rentalTotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span>{t('Versand', 'Shipping')}</span>
                    <span style={{ color:'#1c1b1b' }}>€{ship.toFixed(2)}</span>
                  </div>

                  {/* Jetzt zahlbar */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid #f1edec', paddingTop:12, marginTop:2 }}>
                    <span style={{ fontSize:15, fontWeight:700, color:'#1c1b1b' }}>{t('Jetzt zahlbar', 'Pay now')}</span>
                    <span style={{ fontSize:18, fontWeight:700, color:'#1c1b1b' }}>€{payNow.toFixed(2)}</span>
                  </div>

                  {/* Kaution separat */}
                  {deposit > 0 && (
                    <div style={{ background:'#FAEEDA', padding:'12px 14px', marginTop:8, borderRadius:2 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                        <span style={{ fontSize:13, fontWeight:600, color:'#633806' }}>{t('Kaution', 'Deposit')}</span>
                        <span style={{ fontSize:14, fontWeight:700, color:'#633806' }}>€{deposit.toFixed(2)}</span>
                      </div>
                      <p style={{ fontSize:11, color:'#8a6d3b', lineHeight:1.5, margin:0 }}>
                        {t(
                          'Wird nur auf deiner Karte reserviert (nicht abgebucht) und nach Rückgabe freigegeben.',
                          'Only held on your card (not charged) and released after return.'
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

// ── Stripe Payment Form Component ─────────────────────────────────────────────
function StripePaymentForm({ orderId, amount, depositClientSecret, onBack }: {
  orderId: string
  amount: number
  depositClientSecret?: string
  onBack: () => void
}) {
  const stripe   = useStripe()
  const elements = useElements()
  const router   = useRouter()
  const { t }    = useLangStore()
  const [paying, setPaying]   = useState(false)
  const [error, setError]     = useState('')

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setPaying(true); setError('')

    const { error: submitError } = await elements.submit()
    if (submitError) {
      setError(submitError.message || 'Fehler beim Absenden')
      setPaying(false); return
    }

    // 1. Hauptzahlung + Zahlungsmethode bestätigen
    const { error: mainError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success?orderId=${orderId}`,
      },
      redirect: 'if_required',
    })

    if (mainError) {
      setError(mainError.message || 'Zahlung fehlgeschlagen')
      setPaying(false)
      return
    }

    // 2. Kaution mit gleicher PaymentMethod (setup_future_usage erlaubt Wiederverwendung)
    if (depositClientSecret && paymentIntent?.payment_method) {
      const { error: depositError } = await stripe.confirmCardPayment(
        depositClientSecret,
        { payment_method: paymentIntent.payment_method as string }
      )
      if (depositError) {
        console.warn('Kaution Fehler:', depositError.message)
      }
    }

    // Weiterleitung zur Success-Seite
    window.location.href = `${window.location.origin}/checkout/success?orderId=${orderId}`
  }

  return (
    <form onSubmit={handlePay} style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ background:'#fff', border:'1px solid #c4c7c7', padding:24 }}>
        <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:600, marginBottom:20, paddingBottom:14, borderBottom:'1px solid #f1edec' }}>
          {t('Kartendaten', 'Card Details')}
        </h2>
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      {error && (
        <div style={{ padding:'12px 14px', background:'#ffdad6', color:'#ba1a1a', fontSize:13, display:'flex', gap:8, alignItems:'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize:16 }}>error</span>
          {error}
        </div>
      )}

      <div style={{ display:'flex', gap:12 }}>
        <button type="button" onClick={onBack}
          style={{ padding:'14px 20px', background:'none', border:'1px solid #c4c7c7', fontSize:13, cursor:'pointer', color:'#5e5e5b', fontWeight:600 }}>
          {t('← Zurück', '← Back')}
        </button>
        <button type="submit" disabled={!stripe || paying}
          style={{ flex:1, background:'#9E896A', color:'#fff', border:'none', padding:14, fontSize:13, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.05em', cursor: (!stripe || paying) ? 'not-allowed' : 'pointer', opacity:(!stripe || paying) ? 0.7 : 1 }}>
          {paying ? 'Processing...' : `Pay €${amount.toFixed(2)}`}
        </button>
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginTop:4 }}>
        <span className="material-symbols-outlined" style={{ fontSize:14, color:'#9e9e9b' }}>lock</span>
        <p style={{ fontSize:11, color:'#9e9e9b', margin:0 }}>Secured by Stripe · SSL encrypted</p>
      </div>
    </form>
  )
}

export default function RentalCheckoutPage() {
  return (
    <Suspense fallback={<div style={{ padding:80, textAlign:'center' }}>Laden...</div>}>
      <RentalCheckoutInner />
    </Suspense>
  )
}
