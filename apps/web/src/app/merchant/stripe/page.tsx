'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Icon } from '@/components/ui/Icon'
import { useLangStore } from '@/store/lang.store'

interface StripeStatus {
  connected: boolean
  chargesEnabled: boolean
  payoutsEnabled: boolean
  onboardingComplete: boolean
  detailsSubmitted: boolean
  requirements: string[]
  message: string
}

export default function MerchantStripePage() {
  const { t } = useLangStore()
  const [status, setStatus]       = useState<StripeStatus | null>(null)
  const [loading, setLoading]     = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError]         = useState('')

  const loadStatus = () => {
    setLoading(true)
    api.get('/payments/merchant/stripe-status')
      .then(({ data }: any) => setStatus(data))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadStatus() }, [])

  const connectStripe = async () => {
    setConnecting(true); setError('')
    try {
      const { data } = await api.post('/payments/merchant/stripe-account') as any
      window.location.href = data.onboardingUrl
    } catch (e: any) {
      setError(e.response?.data?.message || t('Fehler beim Verbinden','Error connecting'))
      setConnecting(false)
    }
  }

  const refreshLink = async () => {
    setRefreshing(true); setError('')
    try {
      const { data } = await api.post('/payments/merchant/stripe-refresh-link') as any
      window.location.href = data.onboardingUrl
    } catch (e: any) {
      setError(e.response?.data?.message || t('Fehler','Error'))
      setRefreshing(false)
    }
  }

  if (loading) return <div style={{ padding:64, textAlign:'center', color:'#5e5e5b' }}>{t('Laden...','Loading...')}</div>

  return (
    <div style={{ maxWidth:620 }}>
      <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:28, fontWeight:700, marginBottom:8 }}>
        Stripe Payments
      </h1>
      <p style={{ color:'#5e5e5b', fontSize:14, marginBottom:32 }}>
        {t('Verbinde dein Stripe-Konto, um Zahlungen zu empfangen','Connect your Stripe account to receive payments')}
      </p>

      {error && (
        <div style={{ padding:'12px 16px', background:'#ffdad6', color:'#ba1a1a', fontSize:13, marginBottom:20 }}>
          {error}
        </div>
      )}

      {/* Status Card */}
      {status?.connected ? (
        <div style={{ background:'#fff', border:'1px solid #c4c7c7', padding:28, marginBottom:20 }}>

          {/* Overall Status */}
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:24, paddingBottom:20, borderBottom:'1px solid #f1edec' }}>
            <div style={{
              width:48, height:48, borderRadius:'50%',
              background: status.onboardingComplete ? '#EAF3DE' : '#FAEEDA',
              display:'flex', alignItems:'center', justifyContent:'center'
            }}>
              <Icon name={status.onboardingComplete ? 'verified' : 'warning'} style={{ fontSize:24, color: status.onboardingComplete ? '#27500A' : '#633806' }} />
            </div>
            <div>
              <p style={{ fontWeight:600, fontSize:15, color: status.onboardingComplete ? '#27500A' : '#633806', marginBottom:2 }}>
                {status.message}
              </p>
              <p style={{ fontSize:12, color:'#9e9e9b' }}>
                {t('Konto-ID','Account ID')}: <span style={{ fontFamily:'monospace' }}>acct_...</span>
              </p>
            </div>
          </div>

          {/* Checklist */}
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
            {[
              { label:t('Konto verbunden','Account connected'),           ok: true },
              { label:t('Details eingereicht','Details submitted'),        ok: status.detailsSubmitted },
              { label:t('Zahlungen empfangen (charges)','Receive payments (charges)'), ok: status.chargesEnabled },
              { label:t('Auszahlungen möglich (payouts)','Payouts enabled'),  ok: status.payoutsEnabled },
            ].map(({ label, ok }) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{
                  width:20, height:20, borderRadius:'50%',
                  background: ok ? '#EAF3DE' : '#f1edec',
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0
                }}>
                  <Icon name={ok ? 'check' : 'close'} style={{ fontSize:13, color: ok ? '#27500A' : '#c4c7c7' }} />
                </div>
                <span style={{ fontSize:13, color: ok ? '#1c1b1b' : '#9e9e9b', fontWeight: ok ? 500 : 400 }}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Fehlende Anforderungen */}
          {status.requirements.length > 0 && (
            <div style={{ background:'#FAEEDA', padding:16, marginBottom:20, borderLeft:'3px solid #633806' }}>
              <p style={{ fontSize:12, fontWeight:600, color:'#633806', marginBottom:8 }}>
                {t('Folgende Angaben fehlen noch:','The following details are still missing:')}
              </p>
              {status.requirements.map(req => (
                <p key={req} style={{ fontSize:12, color:'#633806', marginBottom:4, fontFamily:'monospace' }}>
                  • {req}
                </p>
              ))}
            </div>
          )}

          {/* Aktionen */}
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {!status.onboardingComplete && (
              <button onClick={refreshLink} disabled={refreshing}
                style={{ background:'#635BFF', color:'#fff', border:'none', padding:'12px 20px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', cursor:'pointer', opacity:refreshing?0.6:1 }}>
                {refreshing ? t('Weiterleitung...','Redirecting...') : t('→ Onboarding fortsetzen','→ Continue onboarding')}
              </button>
            )}
            <button onClick={loadStatus}
              style={{ background:'none', border:'1px solid #c4c7c7', padding:'12px 16px', fontSize:12, cursor:'pointer', color:'#5e5e5b', display:'flex', alignItems:'center', gap:6 }}>
              <Icon name="refresh" style={{ fontSize:16 }} />
              {t('Status aktualisieren','Refresh status')}
            </button>
          </div>

          {status.onboardingComplete && (
            <div style={{ background:'#EAF3DE', padding:16, marginTop:20 }}>
              <p style={{ fontSize:13, color:'#27500A', lineHeight:1.6 }}>
                <strong>{t('Auszahlungs-Zeitplan:','Payout schedule:')}</strong> {t('Zahlungen werden nach Admin-Genehmigung deiner Auszahlungsanfrage auf dein Stripe-Konto überwiesen. Gehe zu Einnahmen → Auszahlung anfragen, wenn du eine Auszahlung möchtest.','Payments are transferred to your Stripe account after an admin approves your payout request. Go to Earnings → Request payout when you want a payout.')}
              </p>
            </div>
          )}
        </div>

      ) : (
        // Noch nicht verbunden
        <div style={{ background:'#fff', border:'1px solid #c4c7c7', padding:28 }}>
          <div style={{ background:'#FAEEDA', border:'1px solid #f8dfbb', padding:16, marginBottom:24, display:'flex', gap:10 }}>
            <Icon name="warning" style={{ fontSize:20, color:'#633806', flexShrink:0, marginTop:1 }} />
            <p style={{ fontSize:13, color:'#633806', lineHeight:1.5 }}>
              {t('Stripe ist optional — du kannst Auszahlungen auch per Bankverbindung (IBAN) erhalten. Ohne Stripe ODER Bankverbindung können wir dir aber kein Geld auszahlen.','Stripe is optional — you can also receive payouts via bank account (IBAN). Without Stripe OR a bank account we cannot pay you out, though.')}
            </p>
          </div>

          <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:600, marginBottom:16 }}>
            {t('Stripe Express verbinden','Connect Stripe Express')}
          </h2>

          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>
            {[
              ['payments', t('Direkte Auszahlungen auf dein Bankkonto','Direct payouts to your bank account')],
              ['security', t('Stripe wickelt alle Zahlungen sicher ab','Stripe handles all payments securely')],
              ['receipt_long', t('Automatische Steuerdokumente (DE-konform)','Automatic tax documents (DE-compliant)')],
              ['timer', t('Onboarding dauert ca. 5 Minuten','Onboarding takes about 5 minutes')],
            ].map(([icon, text]) => (
              <div key={icon} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <Icon name={icon} style={{ fontSize:18, color:'#9E896A' }} />
                <span style={{ fontSize:13, color:'#5e5e5b' }}>{text}</span>
              </div>
            ))}
          </div>

          <button onClick={connectStripe} disabled={connecting}
            style={{ background: connecting ? '#c4c7c7' : '#635BFF', color:'#fff', border:'none', padding:'14px 28px', fontSize:13, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', cursor:connecting?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:10, width:'100%', justifyContent:'center' }}>
            {connecting ? t('Weiterleitung zu Stripe...','Redirecting to Stripe...') : <><span style={{ fontSize:18 }}>⚡</span> {t('Mit Stripe verbinden','Connect with Stripe')}</>}
          </button>

          <p style={{ fontSize:11, color:'#9e9e9b', textAlign:'center', marginTop:12 }}>
            {t('Du wirst zu stripe.com weitergeleitet. My Dressa speichert keine Bankdaten.','You will be redirected to stripe.com. My Dressa does not store any bank details.')}
          </p>
        </div>
      )}
    </div>
  )
}
