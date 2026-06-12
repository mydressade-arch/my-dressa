'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

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
      setError(e.response?.data?.message || 'Fehler beim Verbinden')
      setConnecting(false)
    }
  }

  const refreshLink = async () => {
    setRefreshing(true); setError('')
    try {
      const { data } = await api.post('/payments/merchant/stripe-refresh-link') as any
      window.location.href = data.onboardingUrl
    } catch (e: any) {
      setError(e.response?.data?.message || 'Fehler')
      setRefreshing(false)
    }
  }

  if (loading) return <div style={{ padding:64, textAlign:'center', color:'#5e5e5b' }}>Laden...</div>

  return (
    <div style={{ maxWidth:620 }}>
      <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:28, fontWeight:700, marginBottom:8 }}>
        Stripe Payments
      </h1>
      <p style={{ color:'#5e5e5b', fontSize:14, marginBottom:32 }}>
        Verbinde dein Stripe-Konto um Zahlungen zu empfangen
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
              <span className="material-symbols-outlined" style={{ fontSize:24, color: status.onboardingComplete ? '#27500A' : '#633806' }}>
                {status.onboardingComplete ? 'verified' : 'warning'}
              </span>
            </div>
            <div>
              <p style={{ fontWeight:600, fontSize:15, color: status.onboardingComplete ? '#27500A' : '#633806', marginBottom:2 }}>
                {status.message}
              </p>
              <p style={{ fontSize:12, color:'#9e9e9b' }}>
                Account ID: <span style={{ fontFamily:'monospace' }}>acct_...</span>
              </p>
            </div>
          </div>

          {/* Checklist */}
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
            {[
              { label:'Konto verbunden',           ok: true },
              { label:'Details eingereicht',        ok: status.detailsSubmitted },
              { label:'Zahlungen empfangen (charges)', ok: status.chargesEnabled },
              { label:'Auszahlungen möglich (payouts)',  ok: status.payoutsEnabled },
            ].map(({ label, ok }) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{
                  width:20, height:20, borderRadius:'50%',
                  background: ok ? '#EAF3DE' : '#f1edec',
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize:13, color: ok ? '#27500A' : '#c4c7c7' }}>
                    {ok ? 'check' : 'close'}
                  </span>
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
                Folgende Angaben fehlen noch:
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
                {refreshing ? 'Weiterleitung...' : '→ Onboarding fortsetzen'}
              </button>
            )}
            <button onClick={loadStatus}
              style={{ background:'none', border:'1px solid #c4c7c7', padding:'12px 16px', fontSize:12, cursor:'pointer', color:'#5e5e5b', display:'flex', alignItems:'center', gap:6 }}>
              <span className="material-symbols-outlined" style={{ fontSize:16 }}>refresh</span>
              Status aktualisieren
            </button>
          </div>

          {status.onboardingComplete && (
            <div style={{ background:'#EAF3DE', padding:16, marginTop:20 }}>
              <p style={{ fontSize:13, color:'#27500A', lineHeight:1.6 }}>
                <strong>Auszahlungs-Zeitplan:</strong> Zahlungen werden nach Admin-Genehmigung deiner Auszahlungsanfrage auf dein Stripe-Konto überwiesen.
                Gehe zu <strong>Earnings → Request Payout</strong> wenn du eine Auszahlung möchtest.
              </p>
            </div>
          )}
        </div>

      ) : (
        // Noch nicht verbunden
        <div style={{ background:'#fff', border:'1px solid #c4c7c7', padding:28 }}>
          <div style={{ background:'#FAEEDA', border:'1px solid #f8dfbb', padding:16, marginBottom:24, display:'flex', gap:10 }}>
            <span className="material-symbols-outlined" style={{ fontSize:20, color:'#633806', flexShrink:0, marginTop:1 }}>warning</span>
            <p style={{ fontSize:13, color:'#633806', lineHeight:1.5 }}>
              Stripe nicht verbunden — Kunden können deine Produkte noch nicht kaufen oder mieten.
            </p>
          </div>

          <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:600, marginBottom:16 }}>
            Stripe Express verbinden
          </h2>

          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>
            {[
              ['payments', 'Direkte Auszahlungen auf dein Bankkonto'],
              ['security', 'Stripe wickelt alle Zahlungen sicher ab'],
              ['receipt_long', 'Automatische Steuerdokumente (DE-konform)'],
              ['timer', 'Onboarding dauert ca. 5 Minuten'],
            ].map(([icon, text]) => (
              <div key={icon} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span className="material-symbols-outlined" style={{ fontSize:18, color:'#9E896A' }}>{icon}</span>
                <span style={{ fontSize:13, color:'#5e5e5b' }}>{text}</span>
              </div>
            ))}
          </div>

          <button onClick={connectStripe} disabled={connecting}
            style={{ background: connecting ? '#c4c7c7' : '#635BFF', color:'#fff', border:'none', padding:'14px 28px', fontSize:13, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', cursor:connecting?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:10, width:'100%', justifyContent:'center' }}>
            {connecting ? 'Weiterleitung zu Stripe...' : <><span style={{ fontSize:18 }}>⚡</span> Mit Stripe verbinden</>}
          </button>

          <p style={{ fontSize:11, color:'#9e9e9b', textAlign:'center', marginTop:12 }}>
            Du wirst zu stripe.com weitergeleitet. My Dressa speichert keine Bankdaten.
          </p>
        </div>
      )}
    </div>
  )
}
