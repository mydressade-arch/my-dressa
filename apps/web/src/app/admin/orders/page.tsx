'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useLangStore } from '@/store/lang.store'

const STATUS_FILTERS = ['all', 'pending', 'paid', 'shipped', 'delivered', 'returned', 'cancelled']
const NEXT_STATUSES: Record<string, string[]> = {
  pending:   ['paid', 'cancelled'],
  paid:      ['cancelled'],
  shipped:   ['delivered', 'cancelled'],  // Admin setzt delivered
  delivered: [],                           // Kunde gibt Rücksende-Tracking ein
  returned:  [],
  cancelled: [],
}
const STATUS_STYLE: Record<string, {bg:string,color:string}> = {
  pending:   { bg:'#FAEEDA', color:'#633806' },
  paid:      { bg:'#EAF3DE', color:'#27500A' },
  shipped:   { bg:'#E6F1FB', color:'#0C447C' },
  delivered: { bg:'#EAF3DE', color:'#27500A' },
  returned:  { bg:'#f1edec', color:'#5e5e5b' },
  cancelled: { bg:'#FCEBEB', color:'#791F1F' },
}

export default function AdminOrdersPage() {
  const { t } = useLangStore()
  const [orders, setOrders]     = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [search, setSearch]     = useState('')
  const [updating, setUpdating] = useState<string|null>(null)
  const [msg, setMsg]           = useState('')

  // Tracking modal
  const [trackingOrderId, setTrackingOrderId] = useState<string|null>(null)
  const [trackingNum, setTrackingNum]         = useState('')

  // Damage report modal
  const [viewDamage, setViewDamage] = useState<any>(null)
  const [damageReports, setDamageReports] = useState<any[]>([])

  const load = () => {
    setLoading(true)
    api.get('/admin/orders')
      .then(({ data }: any) => setOrders(data.orders || data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const notify = (text: string) => { setMsg(text); setTimeout(() => setMsg(''), 3500) }

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id)
    try {
      // delivered → spezieller Endpoint
      if (status === 'delivered') {
        await api.patch(`/orders/${id}/confirm-delivery`)
      } else {
        await api.patch(`/admin/orders/${id}/status`, { status })
      }
      setOrders(prev => prev.map(o => o.id === id ? {...o, status} : o))
      notify(`Status → ${status}`)
    } catch (e: any) { notify(e.response?.data?.message || 'Fehler') }
    finally { setUpdating(null) }
  }

  const setTracking = async () => {
    if (!trackingOrderId || !trackingNum.trim()) return
    setUpdating(trackingOrderId)
    try {
      const { data } = await api.patch(`/admin/orders/${trackingOrderId}/tracking`, {
        trackingNumber: trackingNum.trim(),
      }) as any
      notify(data.message)
      setOrders(prev => prev.map(o => o.id === trackingOrderId
        ? {...o, status:'shipped', trackingNumber: trackingNum.trim()}
        : o))
      setTrackingOrderId(null)
      setTrackingNum('')
    } catch (e: any) { notify(e.response?.data?.message || 'Fehler') }
    finally { setUpdating(null) }
  }

  const loadDamageReports = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    setViewDamage(order)
    try {
      const { data } = await api.get('/damage-reports/all') as any
      setDamageReports((data || []).filter((r: any) => r.orderId === orderId))
    } catch { setDamageReports([]) }
  }

  const resolveReport = async (reportId: string) => {
    const resolution = window.prompt('Auflösungsnotiz:')
    if (!resolution) return
    try {
      await api.patch(`/damage-reports/${reportId}/resolve`, { resolution })
      notify('Report gelöst')
      if (viewDamage) loadDamageReports(viewDamage.id)
    } catch { notify('Fehler') }
  }

  const filtered = orders.filter(o => {
    if (filter !== 'all' && o.status !== filter) return false
    if (search) {
      const s = search.toLowerCase()
      if (!(o.id?.toLowerCase().includes(s) ||
        o.user?.email?.toLowerCase().includes(s) ||
        o.user?.firstName?.toLowerCase().includes(s) ||
        o.productVariant?.product?.title?.toLowerCase().includes(s))) return false
    }
    if (dateFrom) {
      if (new Date(o.createdAt).toISOString().split('T')[0] < dateFrom) return false
    }
    if (dateTo) {
      if (new Date(o.createdAt).toISOString().split('T')[0] > dateTo) return false
    }
    return true
  })

  const badge = (status: string) => {
    const s = STATUS_STYLE[status] || { bg:'#f1edec', color:'#5e5e5b' }
    return <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.08em', padding:'3px 8px', background:s.bg, color:s.color }}>{status}</span>
  }

  const severityColor: Record<string, string> = { minor:'#633806', moderate:'#791F1F', severe:'#ba1a1a', lost:'#791F1F' }

  return (
    <div>
      <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:28, fontWeight:700, marginBottom:4 }}>Orders</h1>
      <p style={{ color:'#5e5e5b', fontSize:14, marginBottom:24 }}>All platform orders</p>

      {msg && <div style={{ padding:'10px 16px', background:'#EAF3DE', color:'#27500A', fontSize:13, marginBottom:16 }}>{msg}</div>}

      {/* Suche + Datum */}
      <div style={{ background:'#fff', border:'1px solid #c4c7c7', padding:'14px 16px', marginBottom:16 }}>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
          {/* Suche */}
          <div style={{ flex:1, minWidth:200, position:'relative' as const }}>
            <span className="material-symbols-outlined" style={{ position:'absolute' as const, left:10, top:'50%', transform:'translateY(-50%)', fontSize:16, color:'#9e9e9b' }}>search</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t('Suche: ID, E-Mail, Produkt...', 'Search: ID, email, product...')}
              style={{ width:'100%', padding:'8px 12px 8px 34px', fontSize:12, border:'1px solid #c4c7c7', outline:'none', boxSizing:'border-box' as const }} />
          </div>

          {/* Datum Von */}
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.08em', color:'#5e5e5b', whiteSpace:'nowrap' as const }}>
              <span className="material-symbols-outlined" style={{ fontSize:14, verticalAlign:'middle', marginRight:4 }}>calendar_today</span>
              {t('Von', 'From')}
            </label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ padding:'7px 10px', fontSize:12, border:'1px solid #c4c7c7', outline:'none', cursor:'pointer', colorScheme:'light' }} />
          </div>

          {/* Datum Bis */}
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.08em', color:'#5e5e5b', whiteSpace:'nowrap' as const }}>
              {t('Bis', 'To')}
            </label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              min={dateFrom || undefined}
              style={{ padding:'7px 10px', fontSize:12, border:'1px solid #c4c7c7', outline:'none', cursor:'pointer', colorScheme:'light' }} />
          </div>

          {/* Schnellfilter */}
          <div style={{ display:'flex', gap:4 }}>
            {[
              { label: t('Heute', 'Today'), action: () => { const d = new Date().toISOString().split('T')[0]; setDateFrom(d); setDateTo(d) } },
              { label: t('7 Tage', '7 days'), action: () => { const d = new Date(); const to = d.toISOString().split('T')[0]; d.setDate(d.getDate()-7); setDateFrom(d.toISOString().split('T')[0]); setDateTo(to) } },
              { label: t('30 Tage', '30 days'), action: () => { const d = new Date(); const to = d.toISOString().split('T')[0]; d.setDate(d.getDate()-30); setDateFrom(d.toISOString().split('T')[0]); setDateTo(to) } },
            ].map(btn => (
              <button key={btn.label} onClick={btn.action}
                style={{ padding:'6px 10px', fontSize:11, fontWeight:600, background:'#fdf8f8', border:'1px solid #c4c7c7', cursor:'pointer', color:'#5e5e5b', whiteSpace:'nowrap' as const }}>
                {btn.label}
              </button>
            ))}
          </div>

          {(dateFrom || dateTo || search) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); setSearch('') }}
              style={{ padding:'7px 12px', fontSize:11, fontWeight:600, background:'none', border:'1px solid #ba1a1a', cursor:'pointer', color:'#ba1a1a', display:'flex', alignItems:'center', gap:4 }}>
              <span className="material-symbols-outlined" style={{ fontSize:13 }}>close</span>
              {t('Reset', 'Reset')}
            </button>
          )}
        </div>

        {/* Active filters summary */}
        {(dateFrom || dateTo || search) && (
          <div style={{ marginTop:10, display:'flex', gap:8, flexWrap:'wrap' as const, alignItems:'center' }}>
            <span style={{ fontSize:11, color:'#9e9e9b' }}>{t('Filter aktiv:', 'Active filters:')}</span>
            {search && <span style={{ fontSize:11, background:'#E6F1FB', color:'#0C447C', padding:'2px 8px', borderRadius:4 }}>"{search}"</span>}
            {dateFrom && <span style={{ fontSize:11, background:'#EAF3DE', color:'#27500A', padding:'2px 8px', borderRadius:4 }}>{t('Von', 'From')}: {new Date(dateFrom+'T00:00').toLocaleDateString('de-DE')}</span>}
            {dateTo && <span style={{ fontSize:11, background:'#EAF3DE', color:'#27500A', padding:'2px 8px', borderRadius:4 }}>{t('Bis', 'To')}: {new Date(dateTo+'T00:00').toLocaleDateString('de-DE')}</span>}
            <span style={{ fontSize:11, color:'#5e5e5b', marginLeft:'auto' }}><strong>{filtered.length}</strong> {t('Ergebnisse', 'results')}</span>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'1px solid #c4c7c7' }}>
        {STATUS_FILTERS.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding:'10px 16px', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', background:'none', border:'none', cursor:'pointer', borderBottom:`2px solid ${filter===s?'#1c1b1b':'transparent'}`, color:filter===s?'#1c1b1b':'#5e5e5b', marginBottom:-1 }}>
            {s}
            {s !== 'all' && <span style={{ marginLeft:6, fontSize:10, background:'#f1edec', padding:'1px 5px', borderRadius:8 }}>{orders.filter(o=>o.status===s).length}</span>}
          </button>
        ))}
      </div>

      <div style={{ background:'#fff', border:'1px solid #c4c7c7' }}>
        <table style={{ width:'100%', fontSize:12, borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid #c4c7c7', background:'#fdf8f8' }}>
              {['ID','Kunde','Produkt','Shop','Typ','Total','Prov.','Händler €','DHL','Status',''].map(h => (
                <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:'#5e5e5b' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3,4].map(i => <tr key={i}><td colSpan={10} style={{ padding:'8px 10px' }}><div style={{ height:16, background:'#f1edec', borderRadius:4 }} /></td></tr>)
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} style={{ padding:'48px', textAlign:'center', color:'#5e5e5b' }}>Keine Bestellungen</td></tr>
            ) : filtered.map((o: any) => {
              const nextOptions = NEXT_STATUSES[o.status] || []
              return (
                <tr key={o.id} style={{ borderBottom:'1px solid #f9f6f5' }}>
                  <td style={{ padding:'8px 10px', fontFamily:'monospace', fontSize:10, color:'#9e9e9b' }}>{o.id.slice(0,6)}</td>
                  <td style={{ padding:'8px 10px' }}>
                    <div>{o.user?.firstName} {o.user?.lastName}</div>
                    {o.shippingAddress && (
                      <div style={{ fontSize:11, color:'#5e5e5b', marginTop:3 }}>
                        {o.shippingAddress.street}, {o.shippingAddress.zip} {o.shippingAddress.city}
                      </div>
                    )}
                  </td>
                  <td style={{ padding:'8px 10px', fontWeight:500, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{o.productVariant?.product?.title||'—'}</td>
                  <td style={{ padding:'8px 10px', fontSize:12, color:'#5e5e5b', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {o.productVariant?.product?.merchant?.shopName || '—'}
                  </td>
                  <td style={{ padding:'8px 10px', fontSize:11, textTransform:'uppercase', letterSpacing:'0.08em', color:'#5e5e5b' }}>{o.type}</td>

                  {/* Finanzen */}
                  <td style={{ padding:'8px 10px', fontWeight:600 }}>€{Number(o.totalPrice||0).toFixed(2)}</td>
                  <td style={{ padding:'8px 10px', color:'#27500A', fontWeight:600, fontSize:12 }}>
                    €{Number(o.commissionAmount||0).toFixed(2)}
                    <div style={{ fontSize:10, color:'#9e9e9b' }}>
                      {o.totalPrice > 0 ? `${((o.commissionAmount/o.totalPrice)*100).toFixed(0)}%` : '—'}
                    </div>
                  </td>
                  <td style={{ padding:'8px 10px', color:'#ba1a1a', fontWeight:600 }}>€{Number(o.merchantAmount||0).toFixed(2)}</td>

                  {/* Tracking */}
                  <td style={{ padding:'8px 10px' }}>
                    {o.trackingNumber ? (
                      <a href={o.trackingUrl || `https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${o.trackingNumber}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ fontSize:11, color:'#185FA5', fontFamily:'monospace', textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
                        <span className="material-symbols-outlined" style={{ fontSize:14 }}>local_shipping</span>
                        {o.trackingNumber}
                      </a>
                    ) : (
                      o.status === 'paid' ? (
                        <button onClick={() => { setTrackingOrderId(o.id); setTrackingNum('') }}
                          style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', padding:'3px 8px', background:'#E6F1FB', color:'#0C447C', border:'none', cursor:'pointer' }}>
                          + DHL Nr.
                        </button>
                      ) : <span style={{ color:'#c4c7c7', fontSize:11 }}>—</span>
                    )}
                  </td>

                  <td style={{ padding:'8px 10px' }}>{badge(o.status)}</td>

                  {/* Actions */}
                  <td style={{ padding:'8px 10px' }}>
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap', alignItems:'center' }}>
                      {nextOptions.map(next => (
                        <button key={next} disabled={updating===o.id} onClick={() => updateStatus(o.id, next)}
                          style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', padding:'4px 8px', cursor:'pointer', border:'1px solid #c4c7c7', background:next==='cancelled'?'#FCEBEB':next==='delivered'?'#EAF3DE':'#f1edec', color:next==='cancelled'?'#791F1F':next==='delivered'?'#27500A':'#1c1b1b', opacity:updating===o.id?0.5:1 }}>
                          →{next}
                        </button>
                      ))}
                      {/* Rücksende-Tracking wenn vorhanden */}
                  {o.rentals?.[0]?.returnTrackingNumber && (
                    <div style={{ padding:'6px 10px', display:'flex', alignItems:'center', gap:5, background:'#E6F1FB', marginBottom:4 }}>
                      <span className="material-symbols-outlined" style={{ fontSize:12, color:'#0C447C' }}>undo</span>
                      <a href={`https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${o.rentals[0].returnTrackingNumber}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ fontSize:10, color:'#0C447C', fontFamily:'monospace', textDecoration:'none', fontWeight:700 }}>
                        ↩ {o.rentals[0].returnTrackingNumber}
                      </a>
                    </div>
                  )}
                  {/* Damage report button for delivered/returned */}
                      {(o.status==='delivered'||o.status==='returned') && (
                        <button onClick={() => loadDamageReports(o.id)}
                          style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', padding:'4px 8px', cursor:'pointer', border:'1px solid #f8dfbb', background:'#FAEEDA', color:'#633806' }}>
                          📋 Reports
                        </button>
                      )}
                      {nextOptions.length===0 && !(o.status==='delivered'||o.status==='returned') && <span style={{ fontSize:11, color:'#c4c7c7' }}>—</span>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Tracking Modal */}
      {trackingOrderId && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#fff', padding:28, maxWidth:400, width:'90%' }}>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700, marginBottom:6 }}>DHL Sendungsnummer</h2>
            <p style={{ fontSize:13, color:'#5e5e5b', marginBottom:20 }}>Order Status wird automatisch auf "shipped" gesetzt.</p>
            <input value={trackingNum} onChange={e => setTrackingNum(e.target.value)}
              placeholder="z.B. 1234567890"
              style={{ width:'100%', padding:'8px 10px', fontSize:14, border:'1px solid #c4c7c7', outline:'none', boxSizing:'border-box' as const, fontFamily:'monospace', marginBottom:16 }} />
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={setTracking} disabled={!trackingNum.trim() || !!updating}
                style={{ flex:1, background:'#1c1b1b', color:'#fff', border:'none', padding:12, fontSize:12, fontWeight:600, textTransform:'uppercase', cursor:'pointer', opacity:(!trackingNum.trim()||!!updating)?0.5:1 }}>
                {updating ? 'Speichern...' : 'Speichern → Shipped'}
              </button>
              <button onClick={() => { setTrackingOrderId(null); setTrackingNum('') }}
                style={{ background:'none', border:'1px solid #c4c7c7', padding:'12px 16px', fontSize:12, cursor:'pointer', color:'#5e5e5b' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Damage Reports Modal */}
      {viewDamage && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#fff', padding:28, maxWidth:560, width:'90%', maxHeight:'80vh', overflow:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
              <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700 }}>
                Damage Reports
              </h2>
              <button onClick={() => setViewDamage(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, color:'#5e5e5b' }}>×</button>
            </div>
            <p style={{ fontSize:13, color:'#5e5e5b', marginBottom:20 }}>
              Order: <span style={{ fontFamily:'monospace' }}>{viewDamage.id.slice(0,8)}…</span> · {viewDamage.productVariant?.product?.title}
            </p>

            {damageReports.length === 0 ? (
              <div style={{ textAlign:'center', padding:'32px 0', color:'#5e5e5b' }}>
                <span className="material-symbols-outlined" style={{ fontSize:32, display:'block', marginBottom:8, color:'#c4c7c7' }}>check_circle</span>
                Keine Schadensmeldungen für diese Bestellung
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                {damageReports.map((r: any) => (
                  <div key={r.id} style={{ border:'1px solid #f8dfbb', padding:16, background:'#FFFBF5' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                      <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', padding:'3px 8px', background:'#FAEEDA', color: severityColor[r.severity]||'#633806' }}>
                        {r.severity}
                      </span>
                      <span style={{ fontSize:11, color:'#9e9e9b' }}>{new Date(r.createdAt).toLocaleDateString('de-DE')}</span>
                    </div>
                    <p style={{ fontSize:13, color:'#1c1b1b', marginBottom:12, lineHeight:1.5 }}>{r.description}</p>

                    {/* Fotos */}
                    {r.photoUrls?.length > 0 && (
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
                        {r.photoUrls.map((url: string, i: number) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            <img src={url} alt={`Foto ${i+1}`}
                              style={{ width:80, height:80, objectFit:'cover', border:'1px solid #e8e3e1' }} />
                          </a>
                        ))}
                      </div>
                    )}

                    {r.resolution ? (
                      <div style={{ background:'#EAF3DE', padding:'8px 12px', fontSize:12, color:'#27500A' }}>
                        ✓ Gelöst: {r.resolution}
                      </div>
                    ) : (
                      <button onClick={() => resolveReport(r.id)}
                        style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', padding:'6px 14px', background:'#27500A', color:'#fff', border:'none', cursor:'pointer' }}>
                        Lösen
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
