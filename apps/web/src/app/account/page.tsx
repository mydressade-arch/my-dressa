'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ordersApi, rentalsApi, authApi } from '@/lib/api'
import { useUI } from '@/components/ui/UIProvider'
import { useLangStore } from '@/store/lang.store'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api'

const TABS = ['My Orders','My Rentals','Profile']
const PH = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='80'%3E%3Crect fill='%23f1edec' width='64' height='80'/%3E%3C/svg%3E"

const statusStyle: Record<string, {bg:string,color:string}> = {
  pending:   { bg:'#FAEEDA', color:'#633806' },
  paid:      { bg:'#EAF3DE', color:'#27500A' },
  shipped:   { bg:'#E6F1FB', color:'#0C447C' },
  delivered: { bg:'#EAF3DE', color:'#27500A' },
  returned:  { bg:'#EAF3DE', color:'#27500A' },
  cancelled: { bg:'#FCEBEB', color:'#791F1F' },
  active:    { bg:'#EAF3DE', color:'#27500A' },
  overdue:   { bg:'#FCEBEB', color:'#791F1F' },
}

function AccountPageInner() {
  const { user, logout, loadUser } = useAuthStore()
  const { toast, confirm } = useUI()
  const { t } = useLangStore()
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = Number(searchParams.get('tab') ?? '0')
  const [tab, setTab] = useState(isNaN(initialTab) ? 0 : Math.min(initialTab, 2))
  const [orders, setOrders] = useState<any[]>([])
  const [rentals, setRentals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [returnTracking, setReturnTracking] = useState<Record<string,string>>({})
  const [submittingReturn, setSubmittingReturn] = useState<string|null>(null)

  const [merchantStatus, setMerchantStatus] = useState<'none'|'pending'|'approved'|'rejected'|'active'>('none')
  const [merchantReason, setMerchantReason] = useState<string|null>(null)
  const [shopName, setShopName] = useState('')
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState('')
  const [showApplyForm, setShowApplyForm] = useState(false)
  const [qrCode, setQrCode]             = useState('')
  const [otp2FA, setOtp2FA]             = useState('')
  const [twoFaEnabled, setTwoFaEnabled] = useState<boolean>((user as any)?.twoFaEnabled || false)
  const [twoFaStep, setTwoFaStep]       = useState<'idle'|'scan'|'verify'>('idle')
  useEffect(() => { setTwoFaEnabled((user as any)?.twoFaEnabled || false) }, [user])

  const submitReturnTracking = async (rentalId: string, orderId: string) => {
    const tracking = returnTracking[rentalId]
    if (!tracking?.trim()) return
    setSubmittingReturn(rentalId)
    try {
      await api.patch(`/rentals/${rentalId}/set-return-tracking`, { trackingNumber: tracking.trim() })
      toast('Rücksendung bestätigt ✓', 'success')
      setRentals(rs => rs.map(r => r.id === rentalId ? {...r, returnTrackingNumber: tracking.trim()} : r))
    } catch(e:any) {
      toast(e.response?.data?.message || 'Fehler', 'error')
    } finally { setSubmittingReturn(null) }
  }

  useEffect(() => {
    if (!hydrated) return  // Noch nicht hydratiert
    if (!user) { router.push('/auth/login'); return }

    // Merchant Status: zuerst Rolle prüfen, dann API
    if (user.role === 'merchant' || user.role === 'admin') {
      setMerchantStatus('active')
    } else {
      // Echten Status vom Backend holen
      api.get('/merchant-requests/my-status')
        .then((res: any) => {
          const data = res.data
          if (!data.hasRequest) {
            setMerchantStatus('none')
          } else if (data.status === 'approved') {
            setMerchantStatus('active')
          } else if (data.status === 'rejected') {
            setMerchantStatus('rejected')
            setMerchantReason(data.reason)
          } else {
            setMerchantStatus('pending')
          }
        })
        .catch(() => setMerchantStatus('none'))
    }

    Promise.all([
      ordersApi.myOrders().catch(() => ({ data: [] })),
      rentalsApi.myRentals().catch(() => ({ data: [] })),
    ]).then(([o, r]) => {
      setOrders((o as any).data || [])
      setRentals((r as any).data || [])
    }).finally(() => setLoading(false))
  }, [user, router, hydrated])

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    setApplying(true); setApplyError('')
    try {
      await api.post('/merchant-requests', { shopName })
      setMerchantStatus('pending')
      setShowApplyForm(false)
    } catch (err: any) {
      const msg = err.response?.data?.message
      if (msg?.includes('bereits') || msg?.includes('already') || msg?.includes('offenen')) {
        setMerchantStatus('pending')
        setShowApplyForm(false)
      } else {
        setApplyError(Array.isArray(msg) ? msg.join(', ') : msg || 'Fehler beim Absenden')
      }
    } finally { setApplying(false) }
  }

  if (!hydrated) return null  // Warten bis Zustand aus localStorage geladen
  if (!user) return null

  const badge = (status: string) => {
    const s = statusStyle[status] || { bg:'#f1edec', color:'#5e5e5b' }
    return (
      <span style={{ fontSize:11, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.08em', padding:'3px 8px', background:s.bg, color:s.color }}>
        {status}
      </span>
    )
  }

  return (
    <div style={{ maxWidth:1440, margin:'0 auto', padding:'40px 64px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:32 }}>
        <div>
          <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:32, fontWeight:700, marginBottom:4 }}>{t("Mein Konto", "My Account")}</h1>
          <p style={{ color:'#5e5e5b', fontSize:14 }}>Welcome back, {user.firstName}</p>
        </div>
        <button onClick={()=>{logout();router.push('/')}}
          style={{ background:'none', border:'1px solid #c4c7c7', padding:'8px 16px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', cursor:'pointer', color:'#5e5e5b' }}>
          Sign Out
        </button>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom:'1px solid #c4c7c7', marginBottom:32, display:'flex', gap:32 }}>
        {TABS.map((t,i)=>(
          <button key={t} onClick={()=>setTab(i)}
            style={{ paddingBottom:14, fontSize:14, fontWeight:600, background:'none', border:'none', cursor:'pointer', borderBottom:`2px solid ${tab===i?'#1c1b1b':'transparent'}`, color:tab===i?'#1c1b1b':'#5e5e5b', marginBottom:-1 }}>
            {t}
          </button>
        ))}
      </div>

      {loading && tab < 2 ? (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[1,2,3].map(i=><div key={i} style={{ height:80, background:'#f1edec', borderRadius:4 }} />)}
        </div>
      ) : (
        <>
          {/* Orders */}
          {tab===0 && (
            <div>
              {orders.length === 0 ? (
                <div style={{ textAlign:'center', padding:'64px 0', border:'1px solid #c4c7c7' }}>
                  <span className="material-symbols-outlined" style={{ fontSize:40, color:'#c4c7c7', display:'block', marginBottom:12 }}>shopping_bag</span>
                  <p style={{ color:'#5e5e5b', marginBottom:20 }}>No orders yet</p>
                  <Link href="/products" style={{ background:'#1c1b1b', color:'#fff', padding:'12px 24px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', textDecoration:'none' }}>
                    Start Shopping
                  </Link>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {orders.map((o:any)=>(
                    <div key={o.id} style={{ background:'#fff', border:'1px solid #c4c7c7', padding:20, display:'flex', justifyContent:'space-between', alignItems:'center', gap:16 }}>
                      <div style={{ display:'flex', gap:14, alignItems:'center' }}>
                        <div style={{ width:50, height:64, overflow:'hidden', background:'#f1edec', flexShrink:0 }}>
                          <img src={o.productVariant?.product?.images?.[0]?.url||PH} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        </div>
                        <div>
                          <p style={{ fontFamily:"'Playfair Display', serif", fontWeight:600, fontSize:15, marginBottom:3 }}>
                            {o.productVariant?.product?.title || 'Product'}
                          </p>
                          <p style={{ fontSize:11, color:'#5e5e5b', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>{o.type}</p>
                          {badge(o.status)}
                        </div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <p style={{ fontWeight:700, fontSize:16, marginBottom:4 }}>€{Number(o.totalPrice).toFixed(2)}</p>
                        <p style={{ fontSize:12, color:'#5e5e5b' }}>{new Date(o.createdAt).toLocaleDateString('de-DE')}</p>
                        {/* Tracking Link */}
                        {o.trackingNumber && o.status === 'shipped' && (
                          <a href={`https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${o.trackingNumber}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', padding:'7px 12px', background:'#E6F1FB', color:'#0C447C', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:5 }}>
                            <span className="material-symbols-outlined" style={{ fontSize:14 }}>local_shipping</span>
                            DHL {o.trackingNumber}
                          </a>
                        )}
                        {/* Status Info */}
                        {o.status === 'shipped' && (
                          <div style={{ fontSize:11, color:'#0C447C', background:'#E6F1FB', padding:'6px 12px', display:'flex', alignItems:'center', gap:5 }}>
                            <span className="material-symbols-outlined" style={{ fontSize:14 }}>local_shipping</span>
                            Paket ist unterwegs
                          </div>
                        )}
                        {o.status === 'delivered' && !o.returnRequested && o.type === 'purchase' && (
                          <button onClick={async () => {
                            const reason = window.prompt('Grund für Rückgabe:')
                            if (!reason) return
                            try {
                              await api.post(`/orders/${o.id}/request-return`, { reason })
                              setOrders(os => os.map(x => x.id===o.id ? {...x, returnRequested:true} : x))
                              toast('Rückgabe beantragt — Händler wird benachrichtigt', 'info')
                            } catch(e:any) { toast(e.response?.data?.message||'Fehler', 'error') }
                          }} style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', padding:'6px 12px', background:'#FAEEDA', color:'#633806', border:'1px solid #f8dfbb', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                            <span className="material-symbols-outlined" style={{ fontSize:14 }}>undo</span>
                            Rückgabe beantragen
                          </button>
                        )}
                        {o.returnRequested && !o.returnApproved && (
                          <div style={{ fontSize:11, color:'#633806', background:'#FAEEDA', padding:'6px 12px', display:'flex', alignItems:'center', gap:4 }}>
                            <span className="material-symbols-outlined" style={{ fontSize:14 }}>schedule</span>
                            Rückgabe ausstehend
                          </div>
                        )}
                        {o.status === 'returned' && (
                          <div style={{ fontSize:11, color:'#27500A', background:'#EAF3DE', padding:'6px 12px', display:'flex', alignItems:'center', gap:4 }}>
                            <span className="material-symbols-outlined" style={{ fontSize:14 }}>payments</span>
                            {t('Erstattet ✓', 'Refunded ✓')}
                          </div>
                        )}
                        {o.status === 'delivered' && !o.returnRequested && (
                          <div style={{ fontSize:11, color:'#27500A', background:'#EAF3DE', padding:'6px 12px', display:'flex', alignItems:'center', gap:5 }}>
                            <span className="material-symbols-outlined" style={{ fontSize:14 }}>check_circle</span>
                            Geliefert ✓
                          </div>
                        )}
                        {(o.status==='pending'||o.status==='paid') && (
                          <button onClick={async ()=>{
                              const isPaid = o.status === 'paid'
                              const msg = isPaid
                                ? 'Bist du sicher? Die Zahlung wird vollständig erstattet (5-10 Werktage).'
                                : 'Bestellung wirklich stornieren?'
                              const cancelOk = await confirm({ title:'Bestellung stornieren', message: isPaid ? 'Die Zahlung wird vollständig erstattet (5–10 Werktage).' : 'Bestellung wirklich stornieren?', confirmLabel:'Stornieren', danger:true })
                              if (!cancelOk) return
                              try {
                                const { data } = await ordersApi.cancel(o.id) as any
                                setOrders(os=>os.map(x=>x.id===o.id?{...x,status:'cancelled'}:x))
                                toast(data?.message || 'Storniert', 'info')
                              } catch(e:any) {
                                toast(e.response?.data?.message || 'Fehler beim Stornieren', 'error')
                              }
                            }}
                            style={{ fontSize:11, fontWeight:600, color:'#ba1a1a', background:'none', border:'none', cursor:'pointer', marginTop:6 }}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Rentals */}
          {tab===1 && (
            <div>
              {rentals.length === 0 ? (
                <div style={{ textAlign:'center', padding:'64px 0', border:'1px solid #c4c7c7' }}>
                  <span className="material-symbols-outlined" style={{ fontSize:40, color:'#c4c7c7', display:'block', marginBottom:12 }}>calendar_month</span>
                  <p style={{ color:'#5e5e5b', marginBottom:20 }}>No active rentals</p>
                  <Link href="/products?forRent=true" style={{ background:'#9E896A', color:'#fff', padding:'12px 24px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', textDecoration:'none' }}>
                    Browse Rentals
                  </Link>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {rentals.map((r:any)=>(
                    <div key={r.id} style={{ background:'#fff', border:'1px solid #c4c7c7', padding:20, display:'flex', justifyContent:'space-between', alignItems:'center', gap:16 }}>
                      <div>
                        <p style={{ fontFamily:"'Playfair Display', serif", fontWeight:600, fontSize:15, marginBottom:6 }}>
                          {r.order?.productVariant?.product?.title || 'Product'}
                        </p>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                          <span className="material-symbols-outlined" style={{ fontSize:16, color:'#9E896A' }}>calendar_month</span>
                          <span style={{ fontSize:13, color:'#5e5e5b' }}>{r.startDate} → {r.endDate} ({r.durationDays} days)</span>
                        </div>
                        {badge(r.status)}
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <p style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Deposit: €{Number(r.depositAmount || 50).toFixed(2)}</p>
                        <p style={{ fontSize:12, color: r.status==='returned'?'#27500A':'#5e5e5b', marginBottom:8 }}>
                          {r.status==='returned' ? t('✓ Freigegeben', '✓ Released') : t('Reserviert auf Karte', 'Held on card')}
                        </p>
                        {/* Order Status Badge */}
                        {r.order?.status === 'delivered' && r.status !== 'returned' && (
                          <div style={{ fontSize:11, color:'#27500A', background:'#EAF3DE', padding:'4px 8px', marginBottom:8, display:'inline-block' }}>
                            ✓ Geliefert — bitte zurücksenden
                          </div>
                        )}

                        {/* Rücksendung bestätigen wenn aktiv */}
                        {(r.order?.status === 'delivered' || r.status === 'delivered') && !r.returnTrackingNumber && (
                          <div style={{ marginTop:8 }}>
                            <p style={{ fontSize:11, color:'#5e5e5b', marginBottom:4, textAlign:'left' }}>DHL Rücksende-Nr.:</p>
                            <div style={{ display:'flex', gap:6 }}>
                              <input
                                value={returnTracking[r.id]||''}
                                onChange={e => setReturnTracking(rt => ({...rt, [r.id]: e.target.value}))}
                                placeholder="Tracking Nr."
                                style={{ padding:'6px 10px', fontSize:12, border:'1px solid #c4c7c7', outline:'none', width:130, fontFamily:'monospace' }}
                              />
                              <button
                                onClick={() => submitReturnTracking(r.id, r.order?.id || r.orderId)}
                                disabled={!returnTracking[r.id]?.trim() || submittingReturn===r.id}
                                style={{ padding:'6px 10px', fontSize:11, fontWeight:600, background:'#9E896A', color:'#fff', border:'none', cursor:'pointer', opacity:(!returnTracking[r.id]?.trim()||submittingReturn===r.id)?0.5:1 }}>
                                {submittingReturn===r.id ? '...' : 'Absenden'}
                              </button>
                            </div>
                          </div>
                        )}
                        {r.returnTrackingNumber && (
                          <a href={`https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${r.returnTrackingNumber}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ fontSize:11, color:'#0C447C', fontFamily:'monospace', display:'block', marginTop:6 }}>
                            ↩ {r.returnTrackingNumber}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Profile */}
          {tab===2 && (
            <div style={{ maxWidth:560 }}>

              {/* 2FA */}
              <div style={{ background:'#fff', border:'1px solid #c4c7c7', padding:24, marginBottom:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: twoFaStep!=='idle' ? 16 : 0 }}>
                  <div>
                    <h3 style={{ fontFamily:"'Playfair Display', serif", fontSize:16, fontWeight:600, marginBottom:4 }}>Zwei-Faktor-Authentifizierung</h3>
                    <p style={{ fontSize:12, color:'#5e5e5b' }}>{twoFaEnabled ? '\u2713 Aktiviert' : 'Google Authenticator nutzen'}</p>
                  </div>
                  <button onClick={async () => {
                    if (twoFaEnabled) { setTwoFaStep('verify') } else {
                      const { data } = await api.get('/auth/2fa/generate') as any
                      setQrCode(data.qrCode); setTwoFaStep('scan')
                    }
                  }} style={{ padding:'8px 16px', fontSize:11, fontWeight:600, textTransform:'uppercase', background:twoFaEnabled?'#FCEBEB':'#1c1b1b', color:twoFaEnabled?'#791F1F':'#fff', border:'none', cursor:'pointer' }}>
                    {twoFaEnabled ? '2FA Deaktivieren' : '2FA Aktivieren'}
                  </button>
                </div>

                {twoFaStep==='scan' && qrCode && (
                  <div>
                    <p style={{ fontSize:13, color:'#5e5e5b', marginBottom:12, lineHeight:1.6 }}>1. <strong>Google Authenticator</strong> App auf dem Handy \u00f6ffnen<br/>2. Tippe auf + \u2192 QR-Code scannen<br/>3. Scanne diesen Code:</p>
                    <img src={qrCode} alt='QR Code' style={{ width:160, height:160, display:'block', marginBottom:16, border:'1px solid #c4c7c7' }} />
                    <p style={{ fontSize:13, color:'#5e5e5b', marginBottom:8 }}>4. 6-stelligen Code eingeben:</p>
                    <div style={{ display:'flex', gap:8 }}>
                      <input value={otp2FA} onChange={e => setOtp2FA(e.target.value.replace(/[^0-9]/g,'').slice(0,6))} placeholder='000000' maxLength={6}
                        style={{ padding:'10px', fontSize:20, border:'1px solid #c4c7c7', outline:'none', width:110, fontFamily:'monospace', letterSpacing:'0.2em', textAlign:'center' }} />
                      <button onClick={async () => {
                        try { await api.post('/auth/2fa/enable', { code: otp2FA }); setTwoFaEnabled(true); setTwoFaStep('idle'); setOtp2FA(''); setQrCode(''); toast('2FA aktiviert ✓', 'success') }
                        catch(e:any) { toast(e.response?.data?.message||'Ungültiger Code — bitte neuen Code eingeben', 'error'); setOtp2FA('') }
                      }} disabled={otp2FA.length!==6} style={{ padding:'10px 16px', background:'#27500A', color:'#fff', border:'none', fontSize:12, fontWeight:600, cursor:'pointer', opacity:otp2FA.length!==6?0.5:1 }}>Aktivieren</button>
                      <button onClick={()=>{setTwoFaStep('idle');setOtp2FA('');setQrCode('')}} style={{ padding:'10px', background:'none', border:'1px solid #c4c7c7', fontSize:12, cursor:'pointer' }}>Abbrechen</button>
                    </div>
                  </div>
                )}

                {twoFaStep==='verify' && (
                  <div style={{ marginTop:16 }}>
                    <p style={{ fontSize:13, color:'#5e5e5b', marginBottom:8 }}>Code aus Authenticator App eingeben:</p>
                    <div style={{ display:'flex', gap:8 }}>
                      <input value={otp2FA} onChange={e => setOtp2FA(e.target.value.replace(/[^0-9]/g,'').slice(0,6))} placeholder='000000' maxLength={6}
                        style={{ padding:'10px', fontSize:20, border:'1px solid #c4c7c7', outline:'none', width:110, fontFamily:'monospace', letterSpacing:'0.2em', textAlign:'center' }} />
                      <button onClick={async () => {
                        try { await api.post('/auth/2fa/disable', { code: otp2FA }); setTwoFaEnabled(false); setTwoFaStep('idle'); setOtp2FA(''); toast('2FA deaktiviert', 'info') }
                        catch(e:any) { toast(e.response?.data?.message||'Ungültiger Code — bitte neuen Code eingeben', 'error'); setOtp2FA('') }
                      }} disabled={otp2FA.length!==6} style={{ padding:'10px 16px', background:'#ba1a1a', color:'#fff', border:'none', fontSize:12, fontWeight:600, cursor:'pointer', opacity:otp2FA.length!==6?0.5:1 }}>Deaktivieren</button>
                      <button onClick={()=>{setTwoFaStep('idle');setOtp2FA('')}} style={{ padding:'10px', background:'none', border:'1px solid #c4c7c7', fontSize:12, cursor:'pointer' }}>Abbrechen</button>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ background:'#fff', border:'1px solid #c4c7c7', padding:28, marginBottom:20 }}>
                <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:600, marginBottom:20, paddingBottom:14, borderBottom:'1px solid #f1edec' }}>Personal Details</h2>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
                  {[['First Name',user.firstName],['Last Name',user.lastName]].map(([l,v])=>(
                    <div key={l}>
                      <p style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b', marginBottom:4 }}>{l}</p>
                      <p style={{ fontSize:15, fontWeight:500 }}>{v}</p>
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom:16 }}>
                  <p style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b', marginBottom:4 }}>Email</p>
                  <p style={{ fontSize:15, fontWeight:500 }}>{user.email}</p>
                </div>
                <div>
                  <p style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b', marginBottom:4 }}>Role</p>
                  <span style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', padding:'3px 10px', background:'#f1edec', color:'#1c1b1b' }}>{user.role}</span>
                </div>
              </div>

              {/* Merchant Section */}
              <div style={{ background:'#fff', border:'1px solid #c4c7c7', padding:28 }}>
                <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:600, marginBottom:6 }}>Merchant Status</h2>

                {merchantStatus === 'active' ? (
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 0', marginBottom:16 }}>
                      <span className="material-symbols-outlined" style={{ fontSize:24, color:'#27500A' }}>verified</span>
                      <div>
                        <p style={{ fontSize:14, fontWeight:600, color:'#27500A' }}>Active Merchant</p>
                        <p style={{ fontSize:12, color:'#5e5e5b' }}>Your shop is live on My Dressa</p>
                      </div>
                    </div>
                    <Link href="/merchant/dashboard"
                      style={{ display:'inline-block', background:'#1c1b1b', color:'#fff', padding:'10px 20px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', textDecoration:'none' }}>
                      Go to Merchant Dashboard →
                    </Link>
                  </div>
                ) : merchantStatus === 'pending' ? (
                  <div style={{ background:'#FAEEDA', padding:20, border:'1px solid #f8dfbb' }}>
                    <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                      <span className="material-symbols-outlined" style={{ fontSize:24, color:'#633806', flexShrink:0 }}>hourglass_empty</span>
                      <div>
                        <p style={{ fontSize:14, fontWeight:600, color:'#633806', marginBottom:4 }}>Application Pending</p>
                        <p style={{ fontSize:13, color:'#633806', lineHeight:1.6 }}>
                          Your merchant application has been submitted. Our team will review it and activate your account within 1–2 business days. You'll be notified by email once approved.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : merchantStatus === 'rejected' ? (
                  <div>
                    <div style={{ background:'#FCEBEB', padding:20, border:'1px solid #f5c2c2', marginBottom:16 }}>
                      <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                        <span className="material-symbols-outlined" style={{ fontSize:24, color:'#791F1F', flexShrink:0 }}>cancel</span>
                        <div>
                          <p style={{ fontSize:14, fontWeight:600, color:'#791F1F', marginBottom:4 }}>Application Declined</p>
                          <p style={{ fontSize:13, color:'#791F1F', lineHeight:1.6 }}>
                            Your merchant application was not approved.
                            {merchantReason && <><br /><strong>Reason:</strong> {merchantReason}</>}
                          </p>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { setShowApplyForm(true); setMerchantStatus('none') }}
                      style={{ background:'#1c1b1b', color:'#fff', border:'none', padding:'12px 24px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', cursor:'pointer' }}>
                      Apply Again
                    </button>
                  </div>
                ) : showApplyForm ? (
                  <form onSubmit={handleApply} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    <div>
                      <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b', display:'block', marginBottom:6 }}>Shop Name</label>
                      <input value={shopName} onChange={e=>setShopName(e.target.value)} placeholder="e.g. Marias Vintage Mode" required
                        style={{ width:'100%', padding:'12px 14px', fontSize:14, border:'1px solid #c4c7c7', outline:'none', background:'#fdf8f8', boxSizing:'border-box' as const }} />
                    </div>
                    <p style={{ fontSize:12, color:'#5e5e5b', lineHeight:1.6 }}>
                      Platform fee: 10% on rentals, 15% on sales. Payouts are processed after successful delivery.
                    </p>
                    {applyError && <div style={{ padding:'10px 14px', background:'#ffdad6', color:'#ba1a1a', fontSize:13 }}>{applyError}</div>}
                    <div style={{ display:'flex', gap:10 }}>
                      <button type="submit" disabled={applying}
                        style={{ background:'#1c1b1b', color:'#fff', border:'none', padding:'12px 20px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', cursor:applying?'not-allowed':'pointer', opacity:applying?0.7:1 }}>
                        {applying ? 'Submitting...' : 'Submit Application'}
                      </button>
                      <button type="button" onClick={()=>setShowApplyForm(false)}
                        style={{ background:'none', border:'1px solid #c4c7c7', padding:'12px 16px', fontSize:12, cursor:'pointer', color:'#5e5e5b' }}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <p style={{ fontSize:14, color:'#5e5e5b', lineHeight:1.6, marginBottom:16 }}>
                      Start selling and renting your fashion pieces to thousands of customers across Germany.
                    </p>
                    <div style={{ display:'flex', gap:20, marginBottom:20 }}>
                      {[['checkroom','List pieces'],['payments','Earn revenue'],['star','10% fee']].map(([icon,label])=>(
                        <div key={icon} style={{ textAlign:'center' }}>
                          <span className="material-symbols-outlined" style={{ fontSize:24, color:'#9E896A', display:'block', marginBottom:4 }}>{icon}</span>
                          <p style={{ fontSize:12, color:'#5e5e5b' }}>{label}</p>
                        </div>
                      ))}
                    </div>
                    <button onClick={()=>setShowApplyForm(true)}
                      style={{ background:'#1c1b1b', color:'#fff', border:'none', padding:'12px 24px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', cursor:'pointer' }}>
                      Apply as Merchant
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div style={{ padding:80, textAlign:'center' }}>Laden...</div>}>
      <AccountPageInner />
    </Suspense>
  )
}