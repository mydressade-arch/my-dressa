'use client'
import { useState, useEffect } from 'react'
import { ordersApi, api } from '@/lib/api'
import { useLangStore } from '@/store/lang.store'
import { useUI } from '@/components/ui/UIProvider'

const STATUS_STYLE: Record<string, {bg:string,color:string}> = {
  pending:        { bg:'#FAEEDA', color:'#633806' },
  paid:           { bg:'#EAF3DE', color:'#27500A' },
  shipped:        { bg:'#E6F1FB', color:'#0C447C' },
  delivered:      { bg:'#EAF3DE', color:'#27500A' },
  returned:       { bg:'#f1edec', color:'#5e5e5b' },
  cancelled:      { bg:'#FCEBEB', color:'#791F1F' },
  active:         { bg:'#EAF3DE', color:'#27500A' },
  pending_return: { bg:'#FAEEDA', color:'#633806' },
  overdue:        { bg:'#FCEBEB', color:'#791F1F' },
}

type ReturnCondition = 'good' | 'damaged' | 'lost'

export default function MerchantOrdersPage() {
  const { toast, confirm } = useUI()
  const { t } = useLangStore()
  const [orders, setOrders]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<'purchase'|'rental'>('rental')
  const [updating, setUpdating] = useState<string|null>(null)
  const [msg, setMsg]         = useState('')

  // DHL Modal
  const [shipModal, setShipModal]   = useState<string|null>(null)
  const [trackingNum, setTrackingNum] = useState('')

  // Return Modal
  const [returnModal, setReturnModal] = useState<{orderId:string, rentalId:string}|null>(null)
  const [returnCondition, setReturnCondition] = useState<ReturnCondition>('good')
  const [damageNotes, setDamageNotes] = useState('')
  const [damagePhotos, setDamagePhotos] = useState<File[]>([])

  // Damage Report
  const [damageReport, setDamageReport] = useState<{rentalId:string,orderId:string}|null>(null)
  const [damageDesc, setDamageDesc]     = useState('')
  const [damageSev, setDamageSev]       = useState('minor')
  const [sendingReport, setSendingReport] = useState(false)

  const load = () => {
    setLoading(true)
    ordersApi.myMerchantOrders()
      .then(({ data }: any) => setOrders(data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const notify = (text: string, type: 'success'|'error'|'info' = 'success') => { toast(text, type); setMsg(text); setTimeout(() => setMsg(''), 4000) }

  const handleShip = async () => {
    if (!shipModal || !trackingNum.trim()) return
    setUpdating(shipModal)
    try {
      const { data } = await api.patch(`/orders/${shipModal}/ship`, { trackingNumber: trackingNum.trim() }) as any
      notify(data.message)
      setOrders(o => o.map(x => x.id === shipModal ? { ...x, status:'shipped', trackingNumber: trackingNum.trim() } : x))
      setShipModal(null); setTrackingNum('')
    } catch (e: any) { notify(e.response?.data?.message || 'Fehler') }
    finally { setUpdating(null) }
  }

  const confirmReturn = async () => {
    if (!returnModal) return
    setUpdating(returnModal.rentalId)
    try {
      await api.patch(`/rentals/${returnModal.rentalId}/return`, {
        condition: returnCondition,
        damageNotes: damageNotes || undefined,
      })

      if (returnCondition !== 'good' && (damageNotes || damagePhotos.length > 0)) {
        try {
          const fd = new FormData()
          fd.append('rentalId', returnModal.rentalId)
          fd.append('description', damageNotes || `Zustand: ${returnCondition}`)
          fd.append('severity', returnCondition === 'lost' ? 'lost' : 'moderate')
          damagePhotos.forEach(f => fd.append('photos', f))
          await api.post('/damage-reports', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        } catch {}
      }

      notify(`Rückgabe bestätigt — ${returnCondition === 'good' ? 'Kaution wird freigegeben ✓' : 'Schadensmeldung eingereicht'}`)
      setReturnModal(null); setReturnCondition('good'); setDamageNotes(''); setDamagePhotos([])
      load()
    } catch (e: any) { notify(e.response?.data?.message || 'Fehler bei Rückgabe') }
    finally { setUpdating(null) }
  }

  const submitDamageReport = async () => {
    if (!damageReport || !damageDesc.trim()) return
    setSendingReport(true)
    try {
      const fd = new FormData()
      fd.append('rentalId', damageReport.rentalId)
      fd.append('description', damageDesc)
      fd.append('severity', damageSev)
      damagePhotos.forEach(f => fd.append('photos', f))
      await api.post('/damage-reports', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      notify('Schadensmeldung gesendet')
      setDamageReport(null); setDamageDesc(''); setDamageSev('minor'); setDamagePhotos([])
    } catch (e: any) { notify(e.response?.data?.message || 'Fehler') }
    finally { setSendingReport(false) }
  }

  const badge = (status: string) => {
    const s = STATUS_STYLE[status] || { bg:'#f1edec', color:'#5e5e5b' }
    return (
      <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.08em', padding:'3px 10px', background:s.bg, color:s.color }}>
        {status}
      </span>
    )
  }

  const purchases = orders.filter(o => o.type === 'purchase')
  const rentals   = orders.filter(o => o.type === 'rental')
  const displayed = tab === 'purchase' ? purchases : rentals

  return (
    <div>
      <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:28, fontWeight:700, marginBottom:4 }}>Orders</h1>
      <p style={{ color:'#5e5e5b', fontSize:14, marginBottom:24 }}>Manage incoming orders from customers</p>

      {msg && (
        <div style={{ padding:'12px 16px', background:'#EAF3DE', color:'#27500A', fontSize:13, marginBottom:16, display:'flex', justifyContent:'space-between' }}>
          {msg}
          <button onClick={() => setMsg('')} style={{ background:'none', border:'none', cursor:'pointer' }}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid #c4c7c7', marginBottom:24 }}>
        {([['rental',t(t('Mieten', 'Rentals'), 'Rentals'), rentals.length], ['purchase',t(t('Käufe', 'Purchases'), 'Purchases'), purchases.length]] as const).map(([t, label, count]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:'10px 20px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', background:'none', border:'none', cursor:'pointer', borderBottom:`2px solid ${tab===t?'#1c1b1b':'transparent'}`, color:tab===t?'#1c1b1b':'#5e5e5b', marginBottom:-1 }}>
            {label} <span style={{ marginLeft:4, fontSize:10, background:'#f1edec', padding:'1px 6px', borderRadius:8 }}>{count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[1,2,3].map(i => <div key={i} style={{ height:100, background:'#f1edec', borderRadius:4 }} />)}
        </div>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign:'center', padding:'64px 0', border:'1px solid #c4c7c7', color:'#5e5e5b' }}>
          <span className="material-symbols-outlined" style={{ fontSize:'clamp(24px,3vw,40px)', display:'block', marginBottom:12, color:'#c4c7c7' }}>package_2</span>
          No {tab} orders yet
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {displayed.map((order: any) => {
            const rental = order.rentals?.[0] || order.rental
            const canShip = (order.status === 'paid' || order.status === 'pending') && !order.trackingNumber

            return (
              <div key={order.id} style={{ background:'#fff', border:'1px solid #c4c7c7' }}>

                {/* Product Info */}
                <div style={{ padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #f1edec' }}>
                  <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                    <div style={{ width:44, height:56, background:'#f1edec', flexShrink:0 }} />
                    <div>
                      <p style={{ fontFamily:"'Playfair Display', serif", fontWeight:600, fontSize:15, marginBottom:2 }}>
                        {order.productVariant?.product?.title || 'Product'}
                      </p>
                      <p style={{ fontSize:11, color:'#5e5e5b', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                        {order.productVariant?.size} · {order.productVariant?.color}
                      </p>
                      <p style={{ fontSize:12, color:'#9e9e9b', marginTop:2 }}>
                        Kunde: {order.user?.firstName} {order.user?.lastName}
                      </p>
                      {order.shippingAddress && (
                        <div style={{ marginTop:6, padding:'5px 8px', background:'#f7f3f2', border:'1px solid #e8e3e1', fontSize:11 }}>
                          <span className="material-symbols-outlined" style={{ fontSize:12, verticalAlign:'middle', marginRight:3, color:'#9E896A' }}>location_on</span>
                          {order.shippingAddress.street}, {order.shippingAddress.zip} {order.shippingAddress.city}
                        </div>
                      )}
                    </div>
                  </div>
                  <p style={{ fontWeight:700, fontSize:20, color:'#064E3B' }}>
                    €{Number(order.merchantAmount || order.totalPrice).toFixed(2)}
                  </p>
                </div>

                {/* Status + Actions */}
                <div style={{ padding:'12px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap', background: canShip ? '#FFFDF7' : '#fff' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    {badge(order.status)}
                    {tab === 'rental' && rental?.startDate && (
                      <span style={{ fontSize:12, color:'#5e5e5b' }}>{rental.startDate} → {rental.endDate}</span>
                    )}
                    {/* Rücksende-Tracking — Kunde hat zurückgeschickt */}
                    {tab === 'rental' && rental?.returnTrackingNumber && (
                      <div style={{ display:'flex', alignItems:'center', gap:6, background:'#E6F1FB', padding:'4px 10px', fontSize:11 }}>
                        <span className="material-symbols-outlined" style={{ fontSize:13, color:'#0C447C' }}>undo</span>
                        <span style={{ color:'#0C447C', fontWeight:600 }}>Rücksendung:</span>
                        <a href={`https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${rental.returnTrackingNumber}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ color:'#0C447C', fontFamily:'monospace', fontSize:11, textDecoration:'none', fontWeight:700 }}>
                          {rental.returnTrackingNumber}
                        </a>
                      </div>
                    )}
                    {order.trackingNumber && (
                      <a href={`https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${order.trackingNumber}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ fontSize:11, color:'#0C447C', fontFamily:'monospace', display:'flex', alignItems:'center', gap:4, textDecoration:'none' }}>
                        <span className="material-symbols-outlined" style={{ fontSize:13 }}>local_shipping</span>
                        {order.trackingNumber}
                      </a>
                    )}
                  </div>

                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    {/* ── HAUPTAKTION: DHL versenden ── */}
                    {canShip && (
                      <button onClick={() => { setShipModal(order.id); setTrackingNum('') }}
                        style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', padding:'10px 20px', background:'#1c1b1b', color:'#fff', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                        <span className="material-symbols-outlined" style={{ fontSize:16 }}>local_shipping</span>
                        DHL versenden
                      </button>
                    )}

                    {/* ── Rückgabe genehmigen ── */}
                    {order.returnRequested && !order.returnApproved && tab === 'purchase' && (
                      <button onClick={async () => {
                        if (!window.confirm('Rückgabe bestätigen? Kunde bekommt Geld zurück.')) return
                        try {
                          await api.patch(`/orders/${order.id}/approve-return`)
                          setOrders(o => o.map(x => x.id===order.id ? {...x, status:'returned', returnApproved:true} : x))
                          notify('Rückgabe genehmigt — Stripe Refund ausgeführt ✓', 'success')
                        } catch (e:any) { notify(e.response?.data?.message||'Fehler', 'error') }
                      }}
                        style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', padding:'10px 16px', background:'#FCEBEB', color:'#791F1F', border:'1px solid #f5c6c6', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                        <span className="material-symbols-outlined" style={{ fontSize:14 }}>undo</span>
                        Rückgabe + Refund
                      </button>
                    )}

                    {/* ── Händler: Delivered bestätigen (nach shipped) ── */}
                    {order.status === 'shipped' && (
                      <button onClick={async () => {
                        setUpdating(order.id)
                        try {
                          await api.patch(`/orders/${order.id}/confirm-delivery`)
                          setOrders(o => o.map(x => x.id===order.id ? {...x, status:'delivered'} : x))
                          notify('Als geliefert markiert ✓')
                        } catch (e: any) { notify(e.response?.data?.message||'Fehler') }
                        finally { setUpdating(null) }
                      }} disabled={!!updating}
                        style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', padding:'10px 16px', background:'#EAF3DE', color:'#27500A', border:'1px solid #b2dfb2', cursor:'pointer', opacity:updating?0.5:1 }}>
                        ✓ Delivered
                      </button>
                    )}

                    {/* Rental: Rückgabe bestätigen */}
                    {tab === 'rental' && rental && (order.status==='shipped'||order.status==='paid'||order.status==='delivered'||rental?.status==='active'||rental?.status==='pending_return') && (
                      <button onClick={() => setReturnModal({ orderId: order.id, rentalId: rental.id })}
                        style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', padding:'10px 16px', background:'#9E896A', color:'#fff', border:'none', cursor:'pointer' }}>
                        ✓ Confirm Return
                      </button>
                    )}

                    {/* Schaden melden nach returned */}
                    {tab === 'rental' && rental && (order.status==='returned'||rental?.status==='returned') && (
                      <button onClick={() => setDamageReport({ rentalId: rental.id, orderId: order.id })}
                        style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', padding:'10px 16px', background:'#FAEEDA', color:'#633806', border:'1px solid #f8dfbb', cursor:'pointer' }}>
                        ⚠ Schaden melden
                      </button>
                    )}
                  </div>
                </div>

                {/* Canship hint */}
                {canShip && (
                  <div style={{ padding:'8px 20px', background:'#FFFBF0', borderTop:'1px solid #f8dfbb', fontSize:12, color:'#633806', display:'flex', alignItems:'center', gap:6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize:14 }}>info</span>
                    Zahlung bestätigt — bitte Produkt versenden und DHL Nummer eingeben
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── DHL Ship Modal ── */}
      {shipModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1002 }}>
          <div style={{ background:'#fff', padding:32, maxWidth:420, width:'90%' }}>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:22, fontWeight:700, marginBottom:6 }}>Versand bestätigen</h2>
            <p style={{ fontSize:13, color:'#5e5e5b', marginBottom:24, lineHeight:1.5 }}>
              Gib die DHL Sendungsnummer ein. Der Kunde wird automatisch informiert.
            </p>
            <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.1em', color:'#5e5e5b', display:'block', marginBottom:6 }}>
              DHL Sendungsnummer *
            </label>
            <input value={trackingNum} onChange={e => setTrackingNum(e.target.value)}
              placeholder="z.B. 1234567890123"
              style={{ width:'100%', padding:'12px 14px', fontSize:14, border:'1px solid #c4c7c7', outline:'none', fontFamily:'monospace', boxSizing:'border-box' as const, marginBottom:10 }} />
            <p style={{ fontSize:11, color:'#9e9e9b', marginBottom:20 }}>
              Tracking Link: dhl.de → Sendung verfolgen → Nummer eingeben
            </p>
            <div style={{ background:'#E6F1FB', padding:'10px 14px', fontSize:12, color:'#0C447C', marginBottom:20 }}>
              ℹ️ Status wird automatisch auf <strong>Shipped</strong> gesetzt.
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={handleShip} disabled={!trackingNum.trim() || updating === shipModal}
                style={{ flex:1, background:'#1c1b1b', color:'#fff', border:'none', padding:14, fontSize:12, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.05em', cursor:'pointer', opacity:(!trackingNum.trim()||updating===shipModal)?0.5:1 }}>
                {updating === shipModal ? 'Senden...' : '📦 Versand bestätigen'}
              </button>
              <button onClick={() => { setShipModal(null); setTrackingNum('') }}
                style={{ background:'none', border:'1px solid #c4c7c7', padding:'14px 18px', fontSize:12, cursor:'pointer', color:'#5e5e5b' }}>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Damage Report Modal ── */}
      {damageReport && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1001 }}>
          <div style={{ background:'#fff', padding:28, maxWidth:480, width:'90%', maxHeight:'80vh', overflow:'auto' }}>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700, marginBottom:6 }}>Schaden melden</h2>
            <p style={{ fontSize:13, color:'#5e5e5b', marginBottom:20, lineHeight:1.5 }}>
              Beschreibe den Schaden und lade Fotos als Beweis hoch.
            </p>
            <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.1em', color:'#5e5e5b', display:'block', marginBottom:6 }}>Schwere</label>
            <select value={damageSev} onChange={e => setDamageSev(e.target.value)}
              style={{ width:'100%', padding:'10px 14px', fontSize:13, border:'1px solid #c4c7c7', outline:'none', marginBottom:14, boxSizing:'border-box' as const }}>
              <option value="minor">Leicht</option>
              <option value="moderate">Mittel</option>
              <option value="severe">Schwer</option>
              <option value="lost">Verloren</option>
            </select>
            <textarea value={damageDesc} onChange={e => setDamageDesc(e.target.value)}
              placeholder="Beschreibe den Schaden..." rows={4}
              style={{ width:'100%', padding:'12px 14px', fontSize:13, border:'1px solid #c4c7c7', outline:'none', resize:'vertical', boxSizing:'border-box' as const, marginBottom:14 }} />
            <input type="file" multiple accept="image/*"
              onChange={e => setDamagePhotos(Array.from(e.target.files||[]).slice(0,5))}
              style={{ width:'100%', marginBottom:16, fontSize:13 }} />
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={submitDamageReport} disabled={!damageDesc.trim() || sendingReport}
                style={{ flex:1, background:'#ba1a1a', color:'#fff', border:'none', padding:12, fontSize:12, fontWeight:600, textTransform:'uppercase' as const, cursor:'pointer', opacity:(!damageDesc.trim()||sendingReport)?0.5:1 }}>
                {sendingReport ? 'Senden...' : 'Schaden melden'}
              </button>
              <button onClick={() => { setDamageReport(null); setDamageDesc(''); setDamageSev('minor'); setDamagePhotos([]) }}
                style={{ background:'none', border:'1px solid #c4c7c7', padding:'12px 16px', fontSize:12, cursor:'pointer', color:'#5e5e5b' }}>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Return Modal ── */}
      {returnModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#fff', padding:32, maxWidth:440, width:'90%', maxHeight:'80vh', overflow:'auto' }}>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:22, fontWeight:700, marginBottom:6 }}>Confirm Return</h2>
            <p style={{ fontSize:13, color:'#5e5e5b', marginBottom:24 }}>
              In welchem Zustand ist das Kleid zurückgekommen?
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
              {([
                ['good',    '✓ Guter Zustand — Kaution wird freigegeben',   '#EAF3DE', '#27500A'],
                ['damaged', '⚠ Beschädigt — Kaution wird einbehalten',      '#FAEEDA', '#633806'],
                ['lost',    '✗ Nicht zurückgekommen — Kaution einbehalten', '#FCEBEB', '#791F1F'],
              ] as const).map(([val, label, bg, color]) => (
                <label key={val} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:returnCondition===val?bg:'#fdf8f8', border:`1.5px solid ${returnCondition===val?color:'#c4c7c7'}`, cursor:'pointer' }}>
                  <input type="radio" name="condition" value={val} checked={returnCondition===val} onChange={() => setReturnCondition(val)} style={{ accentColor: color }} />
                  <span style={{ fontSize:13, color, fontWeight:returnCondition===val?600:400 }}>{label}</span>
                </label>
              ))}
            </div>
            {returnCondition !== 'good' && (
              <>
                <textarea placeholder="Schadensbeschreibung (empfohlen)..." value={damageNotes}
                  onChange={e => setDamageNotes(e.target.value)} rows={3}
                  style={{ width:'100%', padding:'12px 14px', fontSize:13, border:'1px solid #c4c7c7', outline:'none', resize:'vertical', boxSizing:'border-box' as const, marginBottom:12 }} />
                <div style={{ marginBottom:16 }}>
                  <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase' as const, color:'#791F1F', display:'block', marginBottom:6 }}>Fotos als Beweis</label>
                  <input type="file" multiple accept="image/*"
                    onChange={e => setDamagePhotos(Array.from(e.target.files||[]).slice(0,5))}
                    style={{ fontSize:12, width:'100%' }} />
                  {damagePhotos.length > 0 && <p style={{ fontSize:11, color:'#9E896A', marginTop:4 }}>{damagePhotos.length} Foto(s)</p>}
                </div>
              </>
            )}
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={confirmReturn} disabled={!!updating}
                style={{ flex:1, background:'#1c1b1b', color:'#fff', border:'none', padding:'12px', fontSize:12, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.05em', cursor:'pointer', opacity:updating?0.6:1 }}>
                {updating ? t('Verarbeite...', 'Processing...') : t('Rückgabe bestätigen', 'Confirm Return')}
              </button>
              <button onClick={() => { setReturnModal(null); setReturnCondition('good'); setDamageNotes(''); setDamagePhotos([]) }}
                style={{ background:'none', border:'1px solid #c4c7c7', padding:'12px 20px', fontSize:12, cursor:'pointer', color:'#5e5e5b' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
