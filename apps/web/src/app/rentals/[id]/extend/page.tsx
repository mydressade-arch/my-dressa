'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { rentalsApi, paymentsApi } from '@/lib/api'
import { getStripe } from '@/lib/stripe'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

type Option = { extraDays: number; fee: number }

export default function ExtendRentalPage() {
  const params = useParams()
  const router = useRouter()
  const rentalId = String(params?.id ?? '')

  const [loading, setLoading]   = useState(true)
  const [canExtend, setCanExtend] = useState(false)
  const [reason, setReason]     = useState('')
  const [options, setOptions]   = useState<Option[]>([])
  const [currentEnd, setCurrentEnd] = useState('')
  const [used, setUsed]         = useState(0)
  const [maxExt, setMaxExt]     = useState(2)

  const [chosen, setChosen]     = useState<Option | null>(null)
  const [creating, setCreating] = useState(false)
  const [clientSecret, setClientSecret] = useState('')
  const [newEndDate, setNewEndDate] = useState('')
  const [error, setError]       = useState('')

  const [stripeInstance, setStripeInstance] = useState<any>(null)

  useEffect(() => {
    getStripe().then(setStripeInstance).catch(() => {})
  }, [])

  useEffect(() => {
    if (!rentalId) return
    rentalsApi.extensionOptions(rentalId)
      .then(r => {
        const d = (r as any).data
        setCanExtend(!!d.canExtend)
        setReason(d.reason ?? '')
        setOptions(d.options ?? [])
        setCurrentEnd(d.currentEndDate ?? '')
        setUsed(d.extensionsUsed ?? 0)
        setMaxExt(d.maxExtensions ?? 2)
      })
      .catch((e: any) => setError(e?.response?.data?.message || 'Fehler beim Laden'))
      .finally(() => setLoading(false))
  }, [rentalId])

  const startExtension = async (opt: Option) => {
    setChosen(opt)
    setCreating(true)
    setError('')
    try {
      const res = await rentalsApi.requestExtension(rentalId, opt.extraDays)
      const { orderId, newEndDate: ned } = (res as any).data
      setNewEndDate(ned)

      const pay = await paymentsApi.createIntent(orderId)
      const cs = (pay as any).data?.clientSecret
      if (!cs) throw new Error('Zahlung konnte nicht gestartet werden')
      setClientSecret(cs)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Verlängerung fehlgeschlagen')
      setChosen(null)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return <div style={{ padding: 40 }}><div style={{ height: 100, background: '#f1edec' }} /></div>
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, marginBottom: 8 }}>
        Miete verlängern
      </h1>

      {error && (
        <div style={{ padding: '10px 14px', marginBottom: 20, background: '#FCEBEB', color: '#791F1F', fontSize: 13 }}>
          {error}
        </div>
      )}

      {!canExtend ? (
        <div style={{ background: '#fff', border: '1px solid #c4c7c7', padding: 24 }}>
          <p style={{ fontSize: 14, color: '#5e5e5b', lineHeight: 1.6 }}>
            {reason || 'Verlängerung ist für diese Miete nicht möglich.'}
          </p>
          <button
            onClick={() => router.push('/account')}
            style={{ marginTop: 16, padding: '10px 24px', fontSize: 13, fontWeight: 600, background: '#1A1A1A', color: '#fff', border: 'none', cursor: 'pointer' }}>
            Zurück zum Konto
          </button>
        </div>
      ) : clientSecret && stripeInstance ? (
        <div style={{ background: '#fff', border: '1px solid #c4c7c7', padding: 24 }}>
          <div style={{ background: '#fdf8f8', padding: 16, marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: '#5e5e5b', marginBottom: 4 }}>
              Verlängerung um <strong>{chosen?.extraDays} Tage</strong>
            </p>
            <p style={{ fontSize: 13, color: '#5e5e5b', marginBottom: 4 }}>
              Neues Rückgabedatum: <strong>{newEndDate}</strong>
            </p>
            <p style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>
              €{Number(chosen?.fee ?? 0).toFixed(2)}
            </p>
            <p style={{ fontSize: 11, color: '#8a8a87', marginTop: 4 }}>
              Ohne Versandkosten — das Kleid ist bereits bei dir.
            </p>
          </div>

          <Elements stripe={stripeInstance} options={{ clientSecret, appearance: { theme: 'flat' } }}>
            <ExtensionPaymentForm
              onSuccess={() => router.push('/account?extended=1')}
            />
          </Elements>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #c4c7c7', padding: 24 }}>
          <p style={{ fontSize: 14, color: '#5e5e5b', marginBottom: 6 }}>
            Aktuelles Rückgabedatum: <strong>{currentEnd}</strong>
          </p>
          <p style={{ fontSize: 12, color: '#8a8a87', marginBottom: 20 }}>
            Verlängerungen genutzt: {used} von {maxExt}
          </p>

          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
            Um wie viele Tage möchtest du verlängern?
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {options.map(opt => (
              <button
                key={opt.extraDays}
                onClick={() => startExtension(opt)}
                disabled={creating}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 18px', border: '1px solid #c4c7c7', background: '#fff',
                  cursor: creating ? 'default' : 'pointer', opacity: creating ? 0.6 : 1,
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 14 }}>+ {opt.extraDays} Tage</span>
                <span style={{ fontSize: 15, fontWeight: 700 }}>€{Number(opt.fee).toFixed(2)}</span>
              </button>
            ))}
          </div>

          <p style={{ fontSize: 11, color: '#8a8a87', marginTop: 16, lineHeight: 1.6 }}>
            Die Verlängerungsgebühr enthält keine Versandkosten. Das Rückgabedatum
            wird nach der Zahlung automatisch aktualisiert.
          </p>
        </div>
      )}
    </div>
  )
}

function ExtensionPaymentForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)
  const [err, setErr] = useState('')

  const pay = async () => {
    if (!stripe || !elements) return
    setPaying(true)
    setErr('')

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    if (error) {
      setErr(error.message || 'Zahlung fehlgeschlagen')
      setPaying(false)
      return
    }
    if (paymentIntent?.status === 'succeeded') {
      onSuccess()
      return
    }
    setPaying(false)
  }

  return (
    <div>
      <PaymentElement options={{ layout: 'tabs' }} />
      {err && (
        <p style={{ color: '#ba1a1a', fontSize: 12, marginTop: 10 }}>{err}</p>
      )}
      <button
        onClick={pay}
        disabled={!stripe || paying}
        style={{
          width: '100%', marginTop: 20, padding: '14px', fontSize: 14, fontWeight: 600,
          background: '#1A1A1A', color: '#fff', border: 'none',
          cursor: paying ? 'default' : 'pointer', opacity: paying ? 0.6 : 1,
        }}
      >
        {paying ? 'Wird verarbeitet …' : 'Verlängerung bezahlen'}
      </button>
    </div>
  )
}
