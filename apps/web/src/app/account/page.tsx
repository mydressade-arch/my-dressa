'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ordersApi, rentalsApi, authApi } from '@/lib/api'
import { useUI } from '@/components/ui/UIProvider'
import { useLangStore } from '@/store/lang.store'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api'
import { Icon } from '@/components/ui/Icon'
import { VerificationBanner } from '@/components/auth/VerificationBanner'
import { PasswordInput } from '@/components/ui/PasswordInput'

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
  const [confirmingReturn, setConfirmingReturn] = useState<string|null>(null)
  const [confirmedReturns, setConfirmedReturns] = useState<Record<string, boolean>>({})
  // Inline-Rückgabe (Kauf): welche Order gerade einen Grund eingibt + der Text
  const [returnReasonFor, setReturnReasonFor] = useState<string|null>(null)
  const [returnReasonText, setReturnReasonText] = useState('')
  const [submittingOrderReturn, setSubmittingOrderReturn] = useState(false)

  // Kauf-Rückgabe beantragen (mit Grund) — ersetzt den hässlichen window.prompt
  const submitOrderReturn = async (orderId: string) => {
    const reason = returnReasonText.trim()
    if (!reason) return
    setSubmittingOrderReturn(true)
    try {
      await api.post(`/orders/${orderId}/request-return`, { reason })
      setOrders(os => os.map(x => x.id === orderId ? { ...x, returnRequested: true } : x))
      setReturnReasonFor(null); setReturnReasonText('')
      toast(t('Rückgabe beantragt — der Händler wird benachrichtigt', 'Return requested — the merchant has been notified'), 'info')
    } catch (e:any) {
      toast(e.response?.data?.message || t('Fehler', 'Error'), 'error')
    } finally { setSubmittingOrderReturn(false) }
  }

  // Rücksendung in EINEM Schritt melden: optionale Tracking-Nr. setzen (falls
  // eingegeben) und die Rücksendung bestätigen. Der Händler entscheidet beim
  // Empfang über den Zustand (gut → Kaution frei, Schaden → einziehen).
  const reportReturn = async (rentalId: string) => {
    setConfirmingReturn(rentalId)
    try {
      const tracking = returnTracking[rentalId]?.trim()
      if (tracking) {
        await api.patch(`/rentals/${rentalId}/set-return-tracking`, { trackingNumber: tracking })
      }
      await rentalsApi.confirmReturnCustomer(rentalId)
      setConfirmedReturns(cr => ({ ...cr, [rentalId]: true }))
      setRentals(rs => rs.map(r => r.id === rentalId
        ? { ...r, customerConfirmedReturn: true, returnTrackingNumber: tracking || r.returnTrackingNumber }
        : r))
      toast(t('Rücksendung gemeldet ✓ — der Händler wird benachrichtigt',
              'Return reported ✓ — the merchant has been notified'), 'success')
    } catch (e:any) {
      toast(e.response?.data?.message || t('Rücksendung konnte nicht gemeldet werden','Could not report return'), 'error')
    } finally { setConfirmingReturn(null) }
  }

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
  const [pwForm, setPwForm]             = useState({ oldPassword:'', newPassword:'', confirm:'', twoFaCode:'' })
  const [pwSaving, setPwSaving]         = useState(false)
  useEffect(() => { setTwoFaEnabled((user as any)?.twoFaEnabled || false) }, [user])

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

  // Rohe DB-Status in lesbare, lokalisierte Labels übersetzen.
  const statusLabel = (s: string): string => (({
    pending:        t('Ausstehend', 'Pending'),
    paid:           t('Bezahlt', 'Paid'),
    shipped:        t('Versandt', 'Shipped'),
    delivered:      t('Geliefert', 'Delivered'),
    returned:       t('Zurückgegeben', 'Returned'),
    cancelled:      t('Storniert', 'Cancelled'),
    refunded:       t('Erstattet', 'Refunded'),
    active:         t('Aktiv', 'Active'),
    overdue:        t('Überfällig', 'Overdue'),
    pending_return: t('Rückgabe läuft', 'Return in progress'),
  } as Record<string, string>)[s] || s)

  const roleLabel = (r: string): string => (({
    customer: t('Kunde', 'Customer'),
    merchant: t('Händler', 'Merchant'),
    admin:    'Admin',
    support:  'Support',
  } as Record<string, string>)[r] || r)

  const badge = (status: string) => {
    const s = statusStyle[status] || { bg:'#f1edec', color:'#5e5e5b' }
    return (
      <span style={{ fontSize:11, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.08em', padding:'3px 8px', background:s.bg, color:s.color }}>
        {statusLabel(status)}
      </span>
    )
  }

  return (
    <div style={{ maxWidth:1440, margin:'0 auto', width:'100%', padding:'clamp(20px,2vw,40px) clamp(16px,4vw,64px)' }}>
      <div style={{ marginBottom: 20 }}>
        <VerificationBanner />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:32 }}>
        <div>
          <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:32, fontWeight:700, marginBottom:4 }}>{t("Mein Konto", "My Account")}</h1>
          <p style={{ color:'#5e5e5b', fontSize:14 }}>{t('Willkommen zurück', 'Welcome back')}, {user.firstName}</p>
        </div>
        <button onClick={()=>{logout();router.push('/')}}
          style={{ background:'none', border:'1px solid #c4c7c7', padding:'8px 16px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', cursor:'pointer', color:'#5e5e5b' }}>
          {t('Abmelden', 'Sign Out')}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom:'1px solid #c4c7c7', marginBottom:32, display:'flex', gap:'clamp(16px,4vw,32px)', flexWrap:'wrap' }}>
        {[
          { label: t('Bestellungen','Orders'), icon:'shopping_bag', count: orders.length },
          { label: t('Mieten','Rentals'),      icon:'calendar_month', count: rentals.length },
          { label: t('Profil','Profile'),      icon:'person',         count: null as number | null },
        ].map((tb,i)=>(
          <button key={i} onClick={()=>setTab(i)}
            style={{ display:'flex', alignItems:'center', gap:8, paddingBottom:14, fontSize:14, fontWeight:600, background:'none', border:'none', cursor:'pointer', borderBottom:`2px solid ${tab===i?'#1c1b1b':'transparent'}`, color:tab===i?'#1c1b1b':'#5e5e5b', marginBottom:-1 }}>
            <Icon name={tb.icon} style={{ fontSize:18, color: tab===i?'#1c1b1b':'#b0aca9' }} />
            {tb.label}{tb.count ? <span style={{ fontSize:12, color:'#9e9e9b', fontWeight:500 }}> ({tb.count})</span> : null}
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
                  <Icon name="shopping_bag" style={{ fontSize:'clamp(24px,3vw,40px)', color:'#c4c7c7', display:'inline-block', marginBottom:12 }} />
                  <p style={{ color:'#5e5e5b', marginBottom:20 }}>{t('Noch keine Bestellungen', 'No orders yet')}</p>
                  <Link href="/products" style={{ background:'#1c1b1b', color:'#fff', padding:'12px 24px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', textDecoration:'none' }}>
                    {t('Jetzt shoppen', 'Start Shopping')}
                  </Link>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {orders.map((o:any)=>(
                    <div key={o.id} style={{ background:'#fff', border:'1px solid #c4c7c7', padding:20, display:'flex', justifyContent:'space-between', alignItems:'center', gap:16, flexWrap:'wrap' }}>
                      <div style={{ display:'flex', gap:14, alignItems:'center', flex:'1 1 240px', minWidth:0 }}>
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
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8, marginLeft:'auto' }}>
                        <div style={{ textAlign:'right' }}>
                          <p style={{ fontWeight:700, fontSize:16 }}>€{Number(o.totalPrice).toFixed(2)}</p>
                          <p style={{ fontSize:12, color:'#5e5e5b' }}>{new Date(o.createdAt).toLocaleDateString('de-DE')}</p>
                        </div>
                        {/* Tracking Link */}
                        {o.trackingNumber && o.status === 'shipped' && (
                          <a href={`https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${o.trackingNumber}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', padding:'7px 12px', background:'#E6F1FB', color:'#0C447C', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:5 }}>
                            <Icon name="local_shipping" style={{ fontSize:14 }} />
                            DHL {o.trackingNumber}
                          </a>
                        )}
                        {/* Status Info */}
                        {o.status === 'shipped' && (
                          <div style={{ fontSize:11, color:'#0C447C', background:'#E6F1FB', padding:'6px 12px', display:'flex', alignItems:'center', gap:5 }}>
                            <Icon name="local_shipping" style={{ fontSize:14 }} />
                            {t('Paket ist unterwegs', 'Package on its way')}
                          </div>
                        )}
                        {o.status === 'delivered' && !o.returnRequested && o.type === 'purchase' && (
                          returnReasonFor === o.id ? (
                            <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end' }}>
                              <textarea
                                value={returnReasonText}
                                onChange={e => setReturnReasonText(e.target.value)}
                                placeholder={t('Grund für die Rückgabe…', 'Reason for return…')}
                                rows={2}
                                style={{ width:220, maxWidth:'60vw', padding:'8px 10px', fontSize:12, border:'1px solid #c4c7c7', borderRadius:6, outline:'none', resize:'vertical', boxSizing:'border-box' }}
                              />
                              <div style={{ display:'flex', gap:6 }}>
                                <button onClick={() => { setReturnReasonFor(null); setReturnReasonText('') }}
                                  style={{ fontSize:11, padding:'6px 12px', background:'none', border:'1px solid #c4c7c7', borderRadius:6, cursor:'pointer', color:'#5e5e5b' }}>
                                  {t('Abbrechen', 'Cancel')}
                                </button>
                                <button onClick={() => submitOrderReturn(o.id)} disabled={!returnReasonText.trim() || submittingOrderReturn}
                                  style={{ fontSize:11, fontWeight:600, padding:'6px 12px', background:'#633806', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', opacity:(!returnReasonText.trim()||submittingOrderReturn)?0.5:1 }}>
                                  {submittingOrderReturn ? '…' : t('Rückgabe senden', 'Submit return')}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => { setReturnReasonFor(o.id); setReturnReasonText('') }}
                              style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', padding:'6px 12px', background:'#FAEEDA', color:'#633806', border:'1px solid #f8dfbb', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                              <Icon name="undo" style={{ fontSize:14 }} />
                              {t('Rückgabe beantragen', 'Request return')}
                            </button>
                          )
                        )}
                        {o.returnRequested && !o.returnApproved && (
                          <div style={{ fontSize:11, color:'#633806', background:'#FAEEDA', padding:'6px 12px', display:'flex', alignItems:'center', gap:4 }}>
                            <Icon name="schedule" style={{ fontSize:14 }} />
                            {t('Rückgabe ausstehend', 'Return pending')}
                          </div>
                        )}
                        {o.status === 'returned' && (
                          <div style={{ fontSize:11, color:'#27500A', background:'#EAF3DE', padding:'6px 12px', display:'flex', alignItems:'center', gap:4 }}>
                            <Icon name="payments" style={{ fontSize:14 }} />
                            {t('Erstattet ✓', 'Refunded ✓')}
                          </div>
                        )}
                        {o.status === 'delivered' && !o.returnRequested && (
                          <div style={{ fontSize:11, color:'#27500A', background:'#EAF3DE', padding:'6px 12px', display:'flex', alignItems:'center', gap:5 }}>
                            <Icon name="check_circle" style={{ fontSize:14 }} />
                            {t('Geliefert ✓', 'Delivered ✓')}
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
                            {t('Stornieren', 'Cancel')}
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
                  <Icon name="calendar_month" style={{ fontSize:'clamp(24px,3vw,40px)', color:'#c4c7c7', display:'inline-block', marginBottom:12 }} />
                  <p style={{ color:'#5e5e5b', marginBottom:20 }}>{t('Noch keine aktiven Mieten', 'No active rentals')}</p>
                  <Link href="/products?forRent=true" style={{ background:'#9E896A', color:'#fff', padding:'12px 24px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', textDecoration:'none' }}>
                    {t('Mieten entdecken', 'Browse Rentals')}
                  </Link>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {rentals.map((r:any)=>(
                    <div key={r.id} style={{ background:'#fff', border:'1px solid #c4c7c7', padding:20, display:'flex', justifyContent:'space-between', alignItems:'center', gap:16, flexWrap:'wrap' }}>
                      <div style={{ flex:'1 1 240px', minWidth:0 }}>
                        <p style={{ fontFamily:"'Playfair Display', serif", fontWeight:600, fontSize:15, marginBottom:6 }}>
                          {r.order?.productVariant?.product?.title || 'Product'}
                        </p>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                          <Icon name="calendar_month" style={{ fontSize:16, color:'#9E896A' }} />
                          <span style={{ fontSize:13, color:'#5e5e5b' }}>{r.startDate} → {r.endDate} ({r.durationDays} days)</span>
                        </div>
                        {badge(r.status)}
                      </div>
                      <div style={{ textAlign:'right', marginLeft:'auto' }}>
                        <p style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>{t('Kaution','Deposit')}: €{Number(r.depositAmount || 50).toFixed(2)}</p>
                        {/* Kautions-Status klar für den Kunden:
                            freigegeben / einbehalten / reserviert (nicht abgebucht) */}
                        {(r.depositStatus === 'released' || (r.status === 'returned' && r.returnCondition === 'good')) ? (
                          <p style={{ fontSize:12, color:'#27500A', marginBottom:8 }}>
                            ✓ {t('Freigegeben — nichts abgebucht','Released — nothing charged')}
                          </p>
                        ) : (r.depositStatus === 'retained' || r.depositStatus === 'partially_retained') ? (
                          <p style={{ fontSize:12, color:'#791F1F', marginBottom:8 }}>
                            {t('Einbehalten','Retained')}: €{Number(r.depositRetained || 0).toFixed(2)}
                            {Number(r.depositRetained || 0) < Number(r.depositAmount || 0) &&
                              ` · ${t('Rest freigegeben','rest released')}`}
                          </p>
                        ) : (
                          <p style={{ fontSize:12, color:'#5e5e5b', marginBottom:8 }}>
                            🔒 {t('Auf deiner Karte reserviert — nicht abgebucht','Held on your card — not charged')}
                          </p>
                        )}
                        {/* Order Status Badge */}
                        {r.order?.status === 'delivered' && r.status !== 'returned' && (
                          <div style={{ fontSize:11, color:'#27500A', background:'#EAF3DE', padding:'4px 8px', marginBottom:8, display:'inline-block' }}>
                            ✓ Geliefert — bitte zurücksenden
                          </div>
                        )}

                        {/* Rücksendung melden — EIN Schritt, nur NACH Lieferung.
                            Tracking-Nr. optional. Vorher (nur bezahlt/aktiv, noch
                            nicht geliefert) gibt es nichts zurückzusenden. */}
                        {(r.order?.status === 'delivered' || r.status === 'delivered') &&
                          r.status !== 'returned' &&
                          !r.customerConfirmedReturn && !confirmedReturns[r.id] && (
                          <div style={{ marginTop:8 }}>
                            <p style={{ fontSize:11, color:'#5e5e5b', marginBottom:4, textAlign:'left' }}>
                              {t('DHL-Sendungsnr. (optional)','Tracking no. (optional)')}
                            </p>
                            <input
                              value={returnTracking[r.id]||''}
                              onChange={e => setReturnTracking(rt => ({...rt, [r.id]: e.target.value}))}
                              placeholder={t('z. B. 00340434…','e.g. 00340434…')}
                              style={{ padding:'6px 10px', fontSize:12, border:'1px solid #c4c7c7', outline:'none', width:'100%', boxSizing:'border-box', fontFamily:'monospace', marginBottom:8 }}
                            />
                            <button
                              onClick={() => reportReturn(r.id)}
                              disabled={confirmingReturn===r.id}
                              style={{ padding:'8px 14px', fontSize:12, fontWeight:600, background:'#9E896A', color:'#fff', border:'none', cursor:'pointer', display:'block', width:'100%', opacity: confirmingReturn===r.id?0.5:1 }}>
                              {confirmingReturn===r.id ? '...' : t('Rücksendung melden','Report my return')}
                            </button>
                          </div>
                        )}
                        {(r.customerConfirmedReturn || confirmedReturns[r.id]) && r.status !== 'returned' && (
                          <div style={{ marginTop:8 }}>
                            <p style={{ fontSize:11, color:'#27500A' }}>
                              ✓ {t('Rücksendung gemeldet — warte auf Händler','Return reported — waiting for merchant')}
                            </p>
                            {r.returnTrackingNumber && (
                              <a href={`https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${r.returnTrackingNumber}`}
                                target="_blank" rel="noopener noreferrer"
                                style={{ fontSize:11, color:'#0C447C', fontFamily:'monospace', display:'block', marginTop:6 }}>
                                ↩ {r.returnTrackingNumber}
                              </a>
                            )}
                          </div>
                        )}
                        {/* Feature 5: Miete verlängern */}
                        {['active','overdue'].includes(r.status) &&
                          !r.customerConfirmedReturn && !confirmedReturns[r.id] && (
                          <button
                            onClick={() => router.push(`/rentals/${r.id}/extend`)}
                            style={{ marginTop:8, padding:'8px 14px', fontSize:12, fontWeight:600, background:'#9E896A', color:'#fff', border:'none', cursor:'pointer', display:'block', width:'100%' }}>
                            {t('Miete verlängern','Extend rental')}
                          </button>
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

              {/* 1) Pers\u00f6nliche Daten */}
              <div style={{ background:'#fff', border:'1px solid #e3dedd', borderRadius:10, padding:24, marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
                  <Icon name="person" style={{ fontSize:20, color:'#9E896A' }} />
                  <h3 style={{ fontFamily:"'Playfair Display', serif", fontSize:17, fontWeight:600 }}>{t('Pers\u00f6nliche Daten','Personal details')}</h3>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16, marginBottom:16 }}>
                  {[[t('Vorname','First name'),user.firstName],[t('Nachname','Last name'),user.lastName]].map(([l,v])=>(
                    <div key={l}>
                      <p style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#9e9e9b', marginBottom:4 }}>{l}</p>
                      <p style={{ fontSize:15, fontWeight:500 }}>{v}</p>
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom:16 }}>
                  <p style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#9e9e9b', marginBottom:4 }}>{t('E-Mail','Email')}</p>
                  <p style={{ fontSize:15, fontWeight:500 }}>{user.email}</p>
                </div>
                <div>
                  <p style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#9e9e9b', marginBottom:4 }}>{t('Rolle','Role')}</p>
                  <span style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', padding:'3px 10px', background:'#f1edec', color:'#1c1b1b' }}>{roleLabel(user.role)}</span>
                </div>
              </div>

              {/* 2) Sicherheit \u2014 Zwei-Faktor-Authentifizierung */}
              <div style={{ background:'#fff', border:'1px solid #e3dedd', borderRadius:10, padding:24, marginBottom:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap', marginBottom: twoFaStep!=='idle' ? 16 : 0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <Icon name="shield" style={{ fontSize:20, color:'#9E896A' }} />
                    <div>
                      <h3 style={{ fontFamily:"'Playfair Display', serif", fontSize:17, fontWeight:600 }}>{t('Zwei-Faktor-Authentifizierung','Two-factor authentication')}</h3>
                      <p style={{ fontSize:12, color: twoFaEnabled ? '#27500A' : '#5e5e5b', marginTop:2 }}>{twoFaEnabled ? t('\u2713 Aktiviert','\u2713 Enabled') : t('Mit Google Authenticator absichern','Secure with Google Authenticator')}</p>
                    </div>
                  </div>
                  <button onClick={async () => {
                    if (twoFaEnabled) { setTwoFaStep('verify') } else {
                      const { data } = await api.get('/auth/2fa/generate') as any
                      setQrCode(data.qrCode); setTwoFaStep('scan')
                    }
                  }} style={{ padding:'8px 16px', fontSize:11, fontWeight:600, textTransform:'uppercase', borderRadius:6, background:twoFaEnabled?'#FCEBEB':'#1c1b1b', color:twoFaEnabled?'#791F1F':'#fff', border:'none', cursor:'pointer', whiteSpace:'nowrap' }}>
                    {twoFaEnabled ? t('Deaktivieren','Disable') : t('Aktivieren','Enable')}
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

              {/* 3) Sicherheit — Passwort ändern */}
              <div style={{ background:'#fff', border:'1px solid #e3dedd', borderRadius:10, padding:24, marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                  <Icon name="key" style={{ fontSize:20, color:'#9E896A' }} />
                  <h3 style={{ fontFamily:"'Playfair Display', serif", fontSize:17, fontWeight:600 }}>{t('Passwort ändern','Change password')}</h3>
                </div>
                <p style={{ fontSize:12, color:'#5e5e5b', marginBottom:16 }}>
                  {twoFaEnabled
                    ? t('Mit aktivem 2FA: aktuelles Passwort + Authenticator-Code erforderlich','With 2FA active: current password + authenticator code required')
                    : t('Aktuelles Passwort eingeben, dann neues setzen','Enter your current password, then set a new one')}
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:12, maxWidth:360 }}>
                  <PasswordInput value={pwForm.oldPassword} onChange={e=>setPwForm(f=>({...f, oldPassword:e.target.value}))}
                    placeholder={t('Aktuelles Passwort','Current password')}
                    style={{ padding:'10px 14px', fontSize:14, border:'1px solid #c4c7c7', borderRadius:6, outline:'none' }} />
                  <PasswordInput value={pwForm.newPassword} onChange={e=>setPwForm(f=>({...f, newPassword:e.target.value}))}
                    placeholder={t('Neues Passwort (min. 8 Zeichen)','New password (min. 8 characters)')}
                    style={{ padding:'10px 14px', fontSize:14, border:'1px solid #c4c7c7', borderRadius:6, outline:'none' }} />
                  <PasswordInput value={pwForm.confirm} onChange={e=>setPwForm(f=>({...f, confirm:e.target.value}))}
                    placeholder={t('Neues Passwort bestätigen','Confirm new password')}
                    style={{ padding:'10px 14px', fontSize:14, border:'1px solid #c4c7c7', borderRadius:6, outline:'none' }} />
                  {twoFaEnabled && (
                    <input value={pwForm.twoFaCode} onChange={e=>setPwForm(f=>({...f, twoFaCode:e.target.value.replace(/[^0-9]/g,'').slice(0,6)}))}
                      placeholder={t('2FA-Code (6-stellig)','2FA code (6 digits)')} maxLength={6}
                      style={{ padding:'10px 14px', fontSize:14, border:'1px solid #c4c7c7', borderRadius:6, outline:'none', fontFamily:'monospace', letterSpacing:'0.2em' }} />
                  )}
                  <button disabled={pwSaving} onClick={async () => {
                    if (!pwForm.oldPassword || !pwForm.newPassword) { toast(t('Bitte alle Felder ausfüllen','Please fill in all fields'), 'error'); return }
                    if (pwForm.newPassword.length < 8) { toast(t('Neues Passwort min. 8 Zeichen','New password must be at least 8 characters'), 'error'); return }
                    if (pwForm.newPassword !== pwForm.confirm) { toast(t('Passwörter stimmen nicht überein','Passwords do not match'), 'error'); return }
                    if (twoFaEnabled && pwForm.twoFaCode.length !== 6) { toast(t('2FA-Code erforderlich','2FA code required'), 'error'); return }
                    setPwSaving(true)
                    try {
                      await api.post('/auth/change-password', {
                        oldPassword: pwForm.oldPassword,
                        newPassword: pwForm.newPassword,
                        twoFaCode: twoFaEnabled ? pwForm.twoFaCode : undefined,
                      })
                      toast(t('Passwort erfolgreich geändert ✓','Password changed successfully ✓'), 'success')
                      setPwForm({ oldPassword:'', newPassword:'', confirm:'', twoFaCode:'' })
                    } catch(e:any) {
                      toast(e.response?.data?.message || t('Fehler beim Ändern','Error while changing'), 'error')
                    } finally { setPwSaving(false) }
                  }} style={{ padding:'11px 24px', background:'#1c1b1b', color:'#fff', border:'none', borderRadius:6, fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', cursor:pwSaving?'not-allowed':'pointer', opacity:pwSaving?0.6:1, alignSelf:'flex-start' }}>
                    {pwSaving ? t('Speichern…','Saving…') : t('Passwort ändern','Change password')}
                  </button>
                </div>
              </div>


              {/* 4) Händler-Status */}
              <div style={{ background:'#fff', border:'1px solid #e3dedd', borderRadius:10, padding:24 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                  <Icon name="storefront" style={{ fontSize:20, color:'#9E896A' }} />
                  <h3 style={{ fontFamily:"'Playfair Display', serif", fontSize:17, fontWeight:600 }}>{t('Händler-Status','Merchant status')}</h3>
                </div>

                {merchantStatus === 'active' ? (
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                      <Icon name="verified" style={{ fontSize:24, color:'#27500A' }} />
                      <div>
                        <p style={{ fontSize:14, fontWeight:600, color:'#27500A' }}>{t('Aktiver Händler','Active merchant')}</p>
                        <p style={{ fontSize:12, color:'#5e5e5b' }}>{t('Dein Shop ist auf My Dressa live','Your shop is live on My Dressa')}</p>
                      </div>
                    </div>
                    <Link href="/merchant/dashboard"
                      style={{ display:'inline-block', background:'#1c1b1b', color:'#fff', padding:'10px 20px', borderRadius:6, fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', textDecoration:'none' }}>
                      {t('Zum Händler-Dashboard','Go to merchant dashboard')} →
                    </Link>
                  </div>
                ) : merchantStatus === 'pending' ? (
                  <div style={{ background:'#FAEEDA', padding:20, borderRadius:8, border:'1px solid #f8dfbb' }}>
                    <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                      <Icon name="hourglass_empty" style={{ fontSize:24, color:'#633806', flexShrink:0 }} />
                      <div>
                        <p style={{ fontSize:14, fontWeight:600, color:'#633806', marginBottom:4 }}>{t('Antrag in Prüfung','Application pending')}</p>
                        <p style={{ fontSize:13, color:'#633806', lineHeight:1.6 }}>
                          {t('Dein Händler-Antrag wurde eingereicht. Unser Team prüft ihn und schaltet dein Konto innerhalb von 1–2 Werktagen frei. Du wirst nach der Freigabe per E-Mail benachrichtigt.',
                             'Your merchant application has been submitted. Our team will review it and activate your account within 1–2 business days. You will be notified by email once approved.')}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : merchantStatus === 'rejected' ? (
                  <div>
                    <div style={{ background:'#FCEBEB', padding:20, borderRadius:8, border:'1px solid #f5c2c2', marginBottom:16 }}>
                      <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                        <Icon name="cancel" style={{ fontSize:24, color:'#791F1F', flexShrink:0 }} />
                        <div>
                          <p style={{ fontSize:14, fontWeight:600, color:'#791F1F', marginBottom:4 }}>{t('Antrag abgelehnt','Application declined')}</p>
                          <p style={{ fontSize:13, color:'#791F1F', lineHeight:1.6 }}>
                            {t('Dein Händler-Antrag wurde nicht genehmigt.','Your merchant application was not approved.')}
                            {merchantReason && <><br /><strong>{t('Grund','Reason')}:</strong> {merchantReason}</>}
                          </p>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { setShowApplyForm(true); setMerchantStatus('none') }}
                      style={{ background:'#1c1b1b', color:'#fff', border:'none', borderRadius:6, padding:'12px 24px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', cursor:'pointer' }}>
                      {t('Erneut bewerben','Apply again')}
                    </button>
                  </div>
                ) : showApplyForm ? (
                  <form onSubmit={handleApply} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    <div>
                      <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b', display:'block', marginBottom:6 }}>{t('Shop-Name','Shop name')}</label>
                      <input value={shopName} onChange={e=>setShopName(e.target.value)} placeholder={t('z. B. Marias Vintage Mode','e.g. Maria’s Vintage Fashion')} required
                        style={{ width:'100%', padding:'12px 14px', fontSize:14, border:'1px solid #c4c7c7', borderRadius:6, outline:'none', background:'#fdf8f8', boxSizing:'border-box' as const }} />
                    </div>
                    <p style={{ fontSize:12, color:'#5e5e5b', lineHeight:1.6 }}>
                      {t('Plattformgebühr: 10 % bei Mieten, 15 % bei Verkäufen. Auszahlungen erfolgen nach erfolgreicher Lieferung.',
                         'Platform fee: 10% on rentals, 15% on sales. Payouts are processed after successful delivery.')}
                    </p>
                    {applyError && <div style={{ padding:'10px 14px', background:'#ffdad6', color:'#ba1a1a', fontSize:13, borderRadius:6 }}>{applyError}</div>}
                    <div style={{ display:'flex', gap:10 }}>
                      <button type="submit" disabled={applying}
                        style={{ background:'#1c1b1b', color:'#fff', border:'none', borderRadius:6, padding:'12px 20px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', cursor:applying?'not-allowed':'pointer', opacity:applying?0.7:1 }}>
                        {applying ? t('Senden…','Submitting…') : t('Antrag senden','Submit application')}
                      </button>
                      <button type="button" onClick={()=>setShowApplyForm(false)}
                        style={{ background:'none', border:'1px solid #c4c7c7', borderRadius:6, padding:'12px 16px', fontSize:12, cursor:'pointer', color:'#5e5e5b' }}>
                        {t('Abbrechen','Cancel')}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <p style={{ fontSize:14, color:'#5e5e5b', lineHeight:1.6, marginBottom:16 }}>
                      {t('Verkaufe und vermiete deine Mode an tausende Kundinnen und Kunden in ganz Deutschland.',
                         'Sell and rent your fashion pieces to thousands of customers across Germany.')}
                    </p>
                    <div style={{ display:'flex', gap:20, marginBottom:20, flexWrap:'wrap' }}>
                      {[['checkroom',t('Stücke einstellen','List pieces')],['payments',t('Einnahmen erzielen','Earn revenue')],['star',t('10 % Gebühr','10% fee')]].map(([icon,label])=>(
                        <div key={icon} style={{ textAlign:'center' }}>
                          <Icon name={icon} style={{ fontSize:24, color:'#9E896A', display:'inline-block', marginBottom:4 }} />
                          <p style={{ fontSize:12, color:'#5e5e5b' }}>{label}</p>
                        </div>
                      ))}
                    </div>
                    <button onClick={()=>setShowApplyForm(true)}
                      style={{ background:'#1c1b1b', color:'#fff', border:'none', borderRadius:6, padding:'12px 24px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', cursor:'pointer' }}>
                      {t('Als Händler bewerben','Apply as merchant')}
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