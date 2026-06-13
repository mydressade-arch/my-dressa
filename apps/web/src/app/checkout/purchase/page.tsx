'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api'
import { useLangStore } from '@/store/lang.store'
import { getStripe, isTestMode } from '@/lib/stripe'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

const PH = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='260'%3E%3Crect fill='%23f1edec' width='200' height='260'/%3E%3C/svg%3E"

function PurchaseInner() {
  const params    = useSearchParams()
  const router    = useRouter()
  const { user }  = useAuthStore()
  const variantId = params.get('variantId') || ''

  const { t } = useLangStore()
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

  const [step, setStep]               = useState<'details' | 'payment'>('details')
  const [clientSecret, setClientSecret] = useState('')
  const [orderId, setOrderId]         = useState('')
  const [stripeInstance, setStripeInstance] = useState<any>(null)
  const [stripeReady, setStripeReady] = useState(false)

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return }
    if (!variantId) { setLoading(false); return }
    api.get(`/products/variant/${variantId}`)
      .then(({ data }) => {
        setProduct(data)
        setVariant(data.variants?.find((v: any) => v.id === variantId) || data.variants?.[0])
      })
      .catch(() => setError('Product not found'))
      .finally(() => setLoading(false))
  }, [variantId, user, router])

  useEffect(() => {
    getStripe().then(s => { setStripeInstance(s); setStripeReady(true) })
  }, [])

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    const addrErrs = validateAddress(addr)
    if (Object.keys(addrErrs).length > 0) {
      setAddrErrors(addrErrs)
      return
    }
    setAddrErrors({})
    setSubmitting(true); setError('')
    try {
      // 1. Order erstellen
      const { data: orderData } = await api.post('/orders', {
        productVariantId: variantId,
        type: 'purchase',
        shippingAddress: addr,
      })
      // 2. Payment Intent holen
      const { data: paymentData } = await api.post('/payments/create-intent', {
        orderId: orderData.id,
      })
      setOrderId(orderData.id)
      setClientSecret(paymentData.clientSecret)
      setStep('payment')
    } catch (e: any) {
      const status = (e as any).response?.status
      const msg    = (e as any).response?.data?.message
      console.error('Checkout error:', status, msg)
      if (status === 401) {
        setError('Session abgelaufen — bitte erneut einloggen')
        setTimeout(() => router.push('/auth/login'), 2000)
      } else {
        setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Checkout failed')
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
        {step === 'details' ? t('Kauf abschließen', 'Complete Purchase') : t('Zahlung', 'Payment')}
      </h1>
      <p style={{ color:'#5e5e5b', fontSize:14, marginBottom:32 }}>
        Secure this piece permanently for your collection.
      </p>

      {/* Step indicator */}
      <div style={{ display:'flex', gap:0, marginBottom:32 }}>
        {['Delivery Details', t('Zahlung', 'Payment')].map((s, i) => (
          <div key={s} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{
                width:24, height:24, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                background: (step === 'details' && i === 0) || (step === 'payment' && i === 1) ? '#1c1b1b' : i < (step === 'payment' ? 1 : 0) ? '#27500A' : '#e8e3e1',
                color:'#fff', fontSize:11, fontWeight:700, flexShrink:0,
              }}>
                {i < (step === 'payment' ? 1 : 0) ? '✓' : i + 1}
              </div>
              <span style={{ fontSize:13, fontWeight:600, color:(step === 'details' && i === 0) || (step === 'payment' && i === 1) ? '#1c1b1b' : '#9e9e9b' }}>
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
                  {inp('ZIP', 'zip', '10115')}
                </div>
              </div>
            </div>

            {error && <div style={{ padding:'12px 14px', background:'#ffdad6', color:'#ba1a1a', fontSize:13 }}>{error}</div>}

            <button type="submit" disabled={submitting}
              style={{ background:'#1c1b1b', color:'#fff', border:'none', padding:16, fontSize:13, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.05em', cursor:submitting ? 'not-allowed' : 'pointer', opacity:submitting ? 0.7 : 1 }}>
              {submitting ? 'Processing...' : `Continue to Payment — €${Number(product.salePrice).toFixed(2)}`}
            </button>
          </form>
        ) : (
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
                },
              },
            }}>
              <StripePaymentForm
                orderId={orderId}
                amount={Number(product.salePrice)}
                onBack={() => setStep('details')}
              />
            </Elements>
          ) : (
            <div style={{ padding:40, textAlign:'center', color:'#5e5e5b' }}>
              <div style={{ width:32, height:32, border:'3px solid #c4c7c7', borderTopColor:'#1c1b1b', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }} />
              Loading payment form...
            </div>
          )
        )}
        {/* Order Summary */}
        <div style={{ background:'#fdf8f8', border:'1px solid #e8e3e1', padding:20 }}>
          <h3 style={{ fontFamily:"'Playfair Display', serif", fontSize:16, fontWeight:600, marginBottom:16 }}>
            {t('Bestellübersicht', 'Order Summary')}
          </h3>
          {product && (
            <div>
              <p style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>{product.title}</p>
              <p style={{ fontSize:12, color:'#5e5e5b', marginBottom:12 }}>{product.merchant?.shopName || ''}</p>
              <div style={{ display:'flex', flexDirection:'column', gap:6, fontSize:13, color:'#5e5e5b', borderTop:'1px solid #f1edec', paddingTop:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span>{t('Preis', 'Price')}</span>
                  <span>€{Number(product.salePrice||0).toFixed(2)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span>{t('Versand', 'Shipping')}</span>
                  <span>€{Number(product.shippingCost||0).toFixed(2)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontWeight:600, fontSize:14, borderTop:'1px solid #f1edec', paddingTop:8, marginTop:4 }}>
                  <span>{t('Gesamt', 'Total')}</span>
                  <span>€{(Number(product.salePrice||0) + Number(product.shippingCost||0)).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StripePaymentForm({ orderId, amount, onBack }: {
  orderId: string
  amount: number
  onBack: () => void
}) {
  const stripe   = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)
  const [error, setError]   = useState('')

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setPaying(true); setError('')

    const { error: submitError } = await elements.submit()
    if (submitError) {
      setError(submitError.message || 'Fehler'); setPaying(false); return
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success?orderId=${orderId}`,
      },
    })

    if (confirmError) {
      setError(confirmError.message || 'Zahlung fehlgeschlagen')
      setPaying(false)
    }
  }

  return (
    <form onSubmit={handlePay} style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ background:'#fff', border:'1px solid #c4c7c7', padding:24 }}>
        <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:600, marginBottom:20, paddingBottom:14, borderBottom:'1px solid #f1edec' }}>Card Details</h2>
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
          ← Back
        </button>
        <button type="submit" disabled={!stripe || paying}
          style={{ flex:1, background:'#1c1b1b', color:'#fff', border:'none', padding:14, fontSize:13, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.05em', cursor:(!stripe || paying) ? 'not-allowed' : 'pointer', opacity:(!stripe || paying) ? 0.7 : 1 }}>
          {paying ? 'Processing...' : `Pay €${amount.toFixed(2)}`}
        </button>
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
        <span className="material-symbols-outlined" style={{ fontSize:14, color:'#9e9e9b' }}>lock</span>
        <p style={{ fontSize:11, color:'#9e9e9b', margin:0 }}>Secured by Stripe · SSL encrypted</p>
      </div>
    </form>
  )
}

export default function PurchasePage() {
  return (
    <Suspense fallback={<div style={{ padding:80, textAlign:'center' }}>Loading...</div>}>
      <PurchaseInner />
    </Suspense>
  )
}
