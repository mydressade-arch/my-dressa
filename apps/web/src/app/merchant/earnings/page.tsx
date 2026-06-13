'use client'
import { useState, useEffect } from 'react'
import { commissionsApi, api } from '@/lib/api'
import { useLangStore } from '@/store/lang.store'

const STATUS_STYLE: Record<string, {bg:string,color:string}> = {
  pending:    { bg:'#FAEEDA', color:'#633806' },
  processing: { bg:'#E6F1FB', color:'#0C447C' },
  paid:       { bg:'#EAF3DE', color:'#27500A' },
  failed:     { bg:'#FCEBEB', color:'#ba1a1a' },
  rejected:   { bg:'#FCEBEB', color:'#ba1a1a' },
}

export default function MerchantEarningsPage() {
  const { t } = useLangStore()
  const [stats, setStats]     = useState<any>(null)
  const [payouts, setPayouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [note, setNote]       = useState('')
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg]         = useState('')
  const [transfers, setTransfers] = useState<any[]>([])
  const [msgType, setMsgType] = useState<'ok'|'err'>('ok')

  const load = () => {
    Promise.all([
      commissionsApi.merchantStats(),
      commissionsApi.merchantPayouts(),
      api.get('/payments/merchant/transfers').catch(() => ({ data: [] })),
    ]).then(([s, p, tr]: any) => {
      setStats(s.data)
      setPayouts(p.data || [])
      setTransfers(tr.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const notify = (text: string, type: 'ok'|'err' = 'ok') => {
    setMsg(text); setMsgType(type)
    setTimeout(() => setMsg(''), 4000)
  }

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault()
    setRequesting(true)
    try {
      const { data } = await api.post('/commissions/request-payout', { note: note || undefined }) as any
      notify(data.message)
      setShowForm(false)
      setNote('')
      load()
    } catch (e: any) {
      notify(e.response?.data?.message || 'Fehler', 'err')
    } finally { setRequesting(false) }
  }

  const badge = (status: string) => {
    const s = STATUS_STYLE[status] || { bg:'#f1edec', color:'#5e5e5b' }
    return (
      <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.08em', padding:'3px 8px', background:s.bg, color:s.color }}>
        {status}
      </span>
    )
  }

  const pendingAmount = Number(stats?.pendingPayout || 0)
  const hasOpenRequest = Number(stats?.openRequests || 0) > 0
  const webhookNote = stats?.webhookNote

  return (
    <div>
      <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:30, fontWeight:700, marginBottom:4 }}>Earnings</h1>
      <p style={{ color:'#5e5e5b', fontSize:14, marginBottom:32 }}>Your revenue and payout history</p>

      {msg && (
        <div style={{ padding:'12px 16px', background:msgType==='ok'?'#EAF3DE':'#FCEBEB', color:msgType==='ok'?'#27500A':'#791F1F', fontSize:13, marginBottom:20 }}>
          {msg}
        </div>
      )}

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16, marginBottom:32 }}>
        {[
          { label:'Total Earned',   value:`€${Number(stats?.totalEarned||0).toFixed(2)}`,   icon:'payments',      color:'#064E3B' },
          { label:'Pending Payout', value:`€${pendingAmount.toFixed(2)}`,                    icon:'hourglass_empty', color:'#9E896A' },
          { label:'Total Orders',   value:stats?.orderCount||0,                              icon:'package_2',     color:'#185FA5' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={{ background:'#fff', border:'1px solid #c4c7c7', padding:24 }}>
            <div style={{ width:40, height:40, background:'#f1edec', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
              <span className="material-symbols-outlined" style={{ fontSize:20, color }}>{icon}</span>
            </div>
            <p style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b', marginBottom:6 }}>{label}</p>
            <p style={{ fontFamily:"'Playfair Display', serif", fontSize:28, fontWeight:700 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Webhook Warning */}
      {webhookNote && (
        <div style={{ background:'#FAEEDA', border:'1px solid #f8dfbb', padding:'14px 20px', marginBottom:20, display:'flex', gap:10, alignItems:'flex-start' }}>
          <span className="material-symbols-outlined" style={{ fontSize:20, color:'#633806', flexShrink:0 }}>warning</span>
          <div>
            <p style={{ fontSize:13, fontWeight:600, color:'#633806', marginBottom:3 }}>Earnings werden noch nicht angezeigt</p>
            <p style={{ fontSize:12, color:'#633806', lineHeight:1.6 }}>
              Die Einnahmen werden erst nach dem Stripe Webhook-Event aktualisiert.<br />
              Stelle sicher dass <code style={{ background:'rgba(0,0,0,0.08)', padding:'1px 4px' }}>stripe listen</code> läuft oder der Webhook im Stripe Dashboard registriert ist.
            </p>
          </div>
        </div>
      )}

      {/* Payout Request Box */}
      <div style={{ background:'#fff', border:'1px solid #c4c7c7', padding:24, marginBottom:32 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16, flexWrap:'wrap' }}>
          <div>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:600, marginBottom:6 }}>
              Request Payout
            </h2>
            <p style={{ fontSize:13, color:'#5e5e5b', lineHeight:1.6 }}>
              {hasOpenRequest
                ? 'Du hast eine offene Auszahlungsanfrage — ein Admin wird sie bald bearbeiten.'
                : pendingAmount > 0
                  ? `€${pendingAmount.toFixed(2)} stehen zur Auszahlung bereit.`
                  : 'Noch kein ausstehender Betrag vorhanden.'}
            </p>
          </div>

          {!hasOpenRequest && pendingAmount > 0 && !showForm && (
            <button onClick={() => setShowForm(true)}
              style={{ background:'#1c1b1b', color:'#fff', border:'none', padding:'12px 24px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', cursor:'pointer', flexShrink:0 }}>
              Request €{pendingAmount.toFixed(2)}
            </button>
          )}

          {hasOpenRequest && (
            <span style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', padding:'6px 12px', background:'#FAEEDA', color:'#633806' }}>
              ⏳ Pending Review
            </span>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleRequestPayout} style={{ marginTop:20, paddingTop:20, borderTop:'1px solid #f1edec' }}>
            <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b', display:'block', marginBottom:6 }}>
              Note for Admin (optional)
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="z.B. Bitte auf mein Stripe-Konto überweisen..."
              rows={3}
              style={{ width:'100%', padding:'12px 14px', fontSize:13, border:'1px solid #c4c7c7', outline:'none', resize:'vertical', boxSizing:'border-box' as const, marginBottom:12 }}
            />
            <div style={{ display:'flex', gap:10 }}>
              <button type="submit" disabled={requesting}
                style={{ background:'#1c1b1b', color:'#fff', border:'none', padding:'12px 24px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', cursor:'pointer', opacity:requesting?0.6:1 }}>
                {requesting ? 'Sending...' : `Request €${pendingAmount.toFixed(2)}`}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setNote('') }}
                style={{ background:'none', border:'1px solid #c4c7c7', padding:'12px 20px', fontSize:12, cursor:'pointer', color:'#5e5e5b' }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Commission Info */}
      <div style={{ background:'#f7f3f2', border:'1px solid #c4c7c7', padding:20, marginBottom:32, display:'flex', gap:12, alignItems:'flex-start' }}>
        <span className="material-symbols-outlined" style={{ fontSize:20, color:'#9E896A', flexShrink:0 }}>info</span>
        <div style={{ fontSize:13, color:'#5e5e5b', lineHeight:1.6 }}>
          <strong style={{ color:'#1c1b1b' }}>Commission:</strong> My Dressa berechnet 15% auf Verkäufe und 10% auf Mieten. Versandkosten gehen vollständig an dich.
        </div>
      </div>

      {/* Payout History */}
      <div style={{ background:'#fff', border:'1px solid #c4c7c7' }}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #c4c7c7' }}>
          <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:600 }}>Payout History</h2>
        </div>
        {loading ? (
          <div style={{ padding:24 }}>{[1,2,3].map(i => <div key={i} style={{ height:44, background:'#f1edec', marginBottom:8 }} />)}</div>
        ) : payouts.length === 0 ? (
          <div style={{ padding:48, textAlign:'center', color:'#5e5e5b', fontSize:14 }}>No payouts yet</div>
        ) : (
          <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid #c4c7c7', background:'#fdf8f8' }}>
                {['Amount','Status','Note','Transfer ID','Date'].map(h => (
                  <th key={h} style={{ padding:'12px 20px', textAlign:'left', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payouts.map((p: any) => (
                <tr key={p.id} style={{ borderBottom:'1px solid #f1edec' }}>
                  <td style={{ padding:'14px 20px', fontWeight:700, color: p.status==='failed'||p.status==='rejected' ? '#ba1a1a' : '#064E3B' }}>€{Number(p.amount).toFixed(2)}</td>
                  <td style={{ padding:'14px 20px' }}>{badge(p.status === 'rejected' ? 'failed' : p.status)}</td>
                  <td style={{ padding:'14px 20px', color:'#5e5e5b', fontSize:12, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {p.note || '—'}
                  </td>
                  <td style={{ padding:'14px 20px', color:'#5e5e5b', fontFamily:'monospace', fontSize:11 }}>
                    {p.stripeTransferId || '—'}
                  </td>
                  <td style={{ padding:'14px 20px', color:'#5e5e5b' }}>
                    {p.paidAt ? new Date(p.paidAt).toLocaleDateString('de-DE') : new Date(p.createdAt).toLocaleDateString('de-DE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Schadensentschädigungen */}
      {transfers.length > 0 && (
        <div style={{ marginTop:32 }}>
          <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:600, marginBottom:16 }}>
            Schadensentschädigungen
          </h2>
          <div style={{ background:'#fff', border:'1px solid #c4c7c7', overflow:'hidden' }}>
            <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid #c4c7c7', background:'#fdf8f8' }}>
                  {[t('Betrag', 'Amount'),t('Beschreibung', 'Description'),t('Datum', 'Date')].map(h => (
                    <th key={h} style={{ padding:'12px 20px', textAlign:'left', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transfers.map((tr: any) => (
                  <tr key={tr.id} style={{ borderBottom:'1px solid #f1edec' }}>
                    <td style={{ padding:'14px 20px', fontWeight:700, color:'#064E3B' }}>
                      +€{Number(tr.amount).toFixed(2)}
                    </td>
                    <td style={{ padding:'14px 20px', color:'#5e5e5b', fontSize:12 }}>
                      {tr.description || 'Schadensentschädigung'}
                    </td>
                    <td style={{ padding:'14px 20px', color:'#5e5e5b', fontSize:12 }}>
                      {new Date(tr.created).toLocaleDateString('de-DE')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
