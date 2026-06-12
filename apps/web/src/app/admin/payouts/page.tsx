'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useLangStore } from '@/store/lang.store'

export default function AdminPayoutsPage() {
  const { t } = useLangStore()
  const [payouts, setPayouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pending'|'all'>('pending')
  const [processing, setProcessing] = useState<string|null>(null)
  const [rejectId, setRejectId] = useState<string|null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [stripeId, setStripeId]   = useState('')
  const [approveId, setApproveId] = useState<string|null>(null)
  const [msg, setMsg]             = useState('')
  const [bankData, setBankData]   = useState<Record<string,any>>({})
  const [receipts, setReceipts]   = useState<Record<string,any[]>>({})
  const [uploadingId, setUploadingId] = useState<string|null>(null)

  const load = () => {
    setLoading(true)
    const endpoint = tab === 'pending'
      ? '/commissions/admin-pending-payouts'
      : '/commissions/admin-all-payouts'
    api.get(endpoint)
      .then(({ data }: any) => setPayouts(data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [tab])

  const notify = (text: string) => { setMsg(text); setTimeout(() => setMsg(''), 4000) }

  const loadBankData = async (merchantId: string) => {
    if (bankData[merchantId]) return
    try {
      const { data } = await api.get(`/bank/admin/${merchantId}`) as any
      setBankData(prev => ({...prev, [merchantId]: data}))
    } catch {}
  }

  const uploadReceipt = async (payoutId: string, file: File, notes: string) => {
    setUploadingId(payoutId)
    try {
      const fd = new FormData()
      fd.append('receipt', file)
      if (notes) fd.append('notes', notes)
      await api.post(`/bank/payouts/${payoutId}/receipt`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      // Reload receipts
      const { data } = await api.get(`/bank/payouts/${payoutId}/receipts`) as any
      setReceipts(prev => ({...prev, [payoutId]: data}))
      notify('Quittung hochgeladen ✓')
    } catch (e: any) {
      notify(e.response?.data?.message || 'Fehler')
    } finally { setUploadingId(null) }
  }

  const approve = async (id: string) => {
    setProcessing(id)
    try {
      const { data } = await api.patch(`/commissions/payouts/${id}/approve`, {
        stripeTransferId: stripeId || undefined
      }) as any
      notify(data.message)
      setApproveId(null)
      setStripeId('')
      load()
    } catch (e: any) {
      notify(e.response?.data?.message || 'Fehler')
    } finally { setProcessing(null) }
  }

  const reject = async (id: string) => {
    setProcessing(id)
    try {
      const { data } = await api.patch(`/commissions/payouts/${id}/reject`, {
        reason: rejectReason || undefined
      }) as any
      notify(data.message)
      setRejectId(null)
      setRejectReason('')
      load()
    } catch (e: any) {
      notify(e.response?.data?.message || 'Fehler')
    } finally { setProcessing(null) }
  }

  const STATUS_STYLE: Record<string, {bg:string,color:string}> = {
    pending:    { bg:'#FAEEDA', color:'#633806' },
    processing: { bg:'#E6F1FB', color:'#0C447C' },
    paid:       { bg:'#EAF3DE', color:'#27500A' },
    failed:     { bg:'#FCEBEB', color:'#791F1F' },
  }

  return (
    <div>
      <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:28, fontWeight:700, marginBottom:4 }}>Payout Requests</h1>
      <p style={{ color:'#5e5e5b', fontSize:14, marginBottom:24 }}>Händler Auszahlungsanfragen verwalten</p>

      {msg && (
        <div style={{ padding:'10px 16px', background:'#EAF3DE', color:'#27500A', fontSize:13, marginBottom:16 }}>{msg}</div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid #c4c7c7', marginBottom:24 }}>
        {([['pending','Pending'], ['all','All']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:'10px 20px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', background:'none', border:'none', cursor:'pointer', borderBottom:`2px solid ${tab===t?'#1c1b1b':'transparent'}`, color:tab===t?'#1c1b1b':'#5e5e5b', marginBottom:-1 }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[1,2,3].map(i => <div key={i} style={{ height:80, background:'#f1edec' }} />)}
        </div>
      ) : payouts.length === 0 ? (
        <div style={{ textAlign:'center', padding:'64px 0', border:'1px solid #c4c7c7', color:'#5e5e5b' }}>
          <span className="material-symbols-outlined" style={{ fontSize:40, display:'block', marginBottom:12, color:'#c4c7c7' }}>payments</span>
          {tab === 'pending' ? 'Keine offenen Auszahlungsanfragen' : 'Keine Auszahlungen vorhanden'}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {payouts.map((p: any) => {
            const s = STATUS_STYLE[p.status] || { bg:'#f1edec', color:'#5e5e5b' }
            return (
              <div key={p.id} style={{ background:'#fff', border:'1px solid #c4c7c7', padding:24 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16, flexWrap:'wrap' }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                      <p style={{ fontFamily:"'Playfair Display', serif", fontWeight:700, fontSize:22, color:'#064E3B' }}>
                        €{Number(p.amount).toFixed(2)}
                      </p>
                      <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', padding:'3px 8px', background:s.bg, color:s.color }}>
                        {p.status}
                      </span>
                    </div>
                    <p style={{ fontSize:12, color:'#5e5e5b', marginBottom:4 }}>
                      Merchant ID: <span style={{ fontFamily:'monospace' }}>{p.merchantId.slice(0,8)}...</span>
                    </p>
                    <p style={{ fontSize:12, color:'#5e5e5b', marginBottom:4 }}>
                      Angefragt: {new Date(p.createdAt).toLocaleDateString('de-DE', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                    </p>
                    {p.note && (
                      <div style={{ background:'#fdf8f8', padding:'8px 12px', marginTop:8, fontSize:13, color:'#1c1b1b', borderLeft:'3px solid #9E896A' }}>
                        "{p.note}"
                      </div>
                    )}
                    {p.stripeTransferId && (
                      <a href={`https://dashboard.stripe.com/test/transfers/${p.stripeTransferId}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ fontSize:11, color:'#0C447C', fontFamily:'monospace', marginTop:6, display:'flex', alignItems:'center', gap:4, textDecoration:'none' }}>
                        <span className="material-symbols-outlined" style={{ fontSize:13 }}>open_in_new</span>
                        Stripe Transfer: {p.stripeTransferId}
                      </a>
                    )}
                    {p.status === 'paid' && !p.stripeTransferId && (
                      <div style={{ marginTop:8 }}>
                        <p style={{ fontSize:11, color:'#9e9e9b', marginBottom:6 }}>Manuell überwiesen</p>
                        <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', color:'#9E896A', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                          <span className="material-symbols-outlined" style={{ fontSize:14 }}>upload</span>
                          Quittung hochladen
                          <input type="file" accept="image/*,.pdf" style={{ display:'none' }}
                            onChange={e => {
                              const file = e.target.files?.[0]
                              if (file) uploadReceipt(p.id, file, '')
                            }} />
                        </label>
                        {receipts[p.id]?.map((r: any) => (
                          <a key={r.id} href={r.receiptUrl} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize:11, color:'#0C447C', display:'block', marginTop:4 }}>
                            📄 Quittung {new Date(r.createdAt).toLocaleDateString('de-DE')}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {p.status === 'pending' && (
                    <div>
                      {approveId === p.id ? (
                        <div style={{ display:'flex', flexDirection:'column', gap:8, minWidth:240 }}>
                          <div style={{ background:'#E6F1FB', padding:'8px 12px', fontSize:12, color:'#0C447C' }}>
                            💡 Wenn der Händler Stripe Connect hat, wird der Transfer automatisch ausgeführt.
                          </div>
                          {bankData[p.merchantId]?.hasBank && (
                            <div style={{ background:'#f7f3f2', border:'1px solid #e8e3e1', padding:'12px', fontSize:12 }}>
                              <p style={{ fontWeight:600, marginBottom:4 }}>🏦 Bankverbindung:</p>
                              <p>{bankData[p.merchantId].accountName}</p>
                              <p style={{ fontFamily:'monospace' }}>{bankData[p.merchantId].iban}</p>
                              {bankData[p.merchantId].bic && <p>BIC: {bankData[p.merchantId].bic}</p>}
                              {bankData[p.merchantId].bankName && <p>{bankData[p.merchantId].bankName}</p>}
                            </div>
                          )}
                          <input
                            placeholder="Stripe Transfer ID (falls manuell überwiesen)"
                            value={stripeId}
                            onChange={e => setStripeId(e.target.value)}
                            style={{ padding:'8px 12px', fontSize:12, border:'1px solid #c4c7c7', outline:'none', fontFamily:'monospace' }}
                          />
                          <div style={{ display:'flex', gap:8 }}>
                            <button onClick={() => approve(p.id)} disabled={processing===p.id}
                              style={{ flex:1, background:'#27500A', color:'#fff', border:'none', padding:'9px', fontSize:11, fontWeight:600, textTransform:'uppercase', cursor:'pointer', opacity:processing===p.id?0.5:1 }}>
                              {processing===p.id ? '...' : '✓ Confirm Approve'}
                            </button>
                            <button onClick={() => { setApproveId(null); setStripeId('') }}
                              style={{ background:'none', border:'1px solid #c4c7c7', padding:'9px 12px', fontSize:11, cursor:'pointer' }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : rejectId === p.id ? (
                        <div style={{ display:'flex', flexDirection:'column', gap:8, minWidth:240 }}>
                          <input
                            placeholder="Ablehnungsgrund (optional)"
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            style={{ padding:'8px 12px', fontSize:12, border:'1px solid #c4c7c7', outline:'none' }}
                          />
                          <div style={{ display:'flex', gap:8 }}>
                            <button onClick={() => reject(p.id)} disabled={processing===p.id}
                              style={{ flex:1, background:'#ba1a1a', color:'#fff', border:'none', padding:'9px', fontSize:11, fontWeight:600, textTransform:'uppercase', cursor:'pointer', opacity:processing===p.id?0.5:1 }}>
                              {processing===p.id ? '...' : '✕ Confirm Reject'}
                            </button>
                            <button onClick={() => { setRejectId(null); setRejectReason('') }}
                              style={{ background:'none', border:'1px solid #c4c7c7', padding:'9px 12px', fontSize:11, cursor:'pointer' }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display:'flex', gap:10 }}>
                          <button onClick={() => { setApproveId(p.id); loadBankData(p.merchantId) }}
                            style={{ background:'#27500A', color:'#fff', border:'none', padding:'10px 20px', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', cursor:'pointer' }}>
                            ✓ Approve
                          </button>
                          <button onClick={() => setRejectId(p.id)}
                            style={{ background:'none', border:'1px solid #ba1a1a', color:'#ba1a1a', padding:'10px 20px', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', cursor:'pointer' }}>
                            ✕ Reject
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
