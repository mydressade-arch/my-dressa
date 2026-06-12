'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useLangStore } from '@/store/lang.store'
import { useUI } from '@/components/ui/UIProvider'

const STATUS_OPTS = ['pending','paid','shipped','delivered','returned','cancelled']
const SUPPORT_CAN_SET = ['shipped','delivered','cancelled'] // Support darf NICHT auf paid setzen

export default function SupportOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const { t }   = useLangStore()
  const { toast } = useUI()
  const [order, setOrder]     = useState<any>(null)
  const [notes, setNotes]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [working, setWorking] = useState(false)

  useEffect(() => {
    api.get(`/support/orders/${id}`)
      .then(({ data }: any) => { setOrder(data); setNotes(data.notes || []) })
      .catch(() => router.push('/support/orders'))
      .finally(() => setLoading(false))
  }, [id])

  const changeStatus = async () => {
    if (!newStatus) return
    setWorking(true)
    try {
      await api.patch(`/support/orders/${id}/status`, { status: newStatus })
      setOrder((o: any) => ({ ...o, status: newStatus }))
      toast(`Status → ${newStatus}`, 'success')
      setNewStatus('')
    } catch (e: any) { toast(e.response?.data?.message || 'Fehler', 'error') }
    finally { setWorking(false) }
  }

  const doRefund = async () => {
    if (!refundReason.trim()) { toast('Bitte Grund angeben', 'error'); return }
    setWorking(true)
    try {
      await api.post(`/support/orders/${id}/refund`, { reason: refundReason })
      setOrder((o: any) => ({ ...o, status: 'cancelled' }))
      toast('Refund erfolgreich ✓', 'success')
      setRefundReason('')
    } catch (e: any) { toast(e.response?.data?.message || 'Fehler', 'error') }
    finally { setWorking(false) }
  }

  const addNote = async () => {
    if (!newNote.trim()) return
    setWorking(true)
    try {
      await api.post(`/support/orders/${id}/notes`, { note: newNote })
      const { data } = await api.get(`/support/orders/${id}/notes`) as any
      setNotes(data)
      setNewNote('')
      toast('Notiz gespeichert', 'success')
    } catch { toast('Fehler', 'error') }
    finally { setWorking(false) }
  }

  if (loading) return <div style={{ padding:64, textAlign:'center', color:'#9e9e9b' }}>Laden...</div>
  if (!order) return null

  const STATUS_STYLE: Record<string, any> = {
    pending: { bg:'#FAEEDA', color:'#633806' }, paid: { bg:'#EAF3DE', color:'#27500A' },
    shipped: { bg:'#E6F1FB', color:'#0C447C' }, delivered: { bg:'#EAF3DE', color:'#27500A' },
    cancelled: { bg:'#FCEBEB', color:'#791F1F' }, returned: { bg:'#EAF3DE', color:'#27500A' },
  }
  const s = STATUS_STYLE[order.status] || { bg:'#f1edec', color:'#5e5e5b' }

  return (
    <div style={{ maxWidth: 800 }}>
      <button onClick={() => router.push('/support/orders')}
        style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#5e5e5b', marginBottom:20, display:'flex', alignItems:'center', gap:4 }}>
        <span className="material-symbols-outlined" style={{ fontSize:16 }}>arrow_back</span>
        {t('Zurück', 'Back')}
      </button>

      {/* Order Header */}
      <div style={{ background:'#fff', border:'1px solid #c4c7c7', padding:24, marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <div>
            <p style={{ fontFamily:'monospace', fontSize:13, color:'#9E896A', marginBottom:4 }}>#{order.id.substring(0,8).toUpperCase()}</p>
            <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:22, fontWeight:700, marginBottom:4 }}>
              {order.productVariant?.product?.title || 'Produkt'}
            </h1>
            <span style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', padding:'3px 10px', background:s.bg, color:s.color }}>
              {order.status}
            </span>
          </div>
          <div style={{ textAlign:'right' }}>
            <p style={{ fontSize:22, fontWeight:700 }}>€{Number(order.totalPrice||0).toFixed(2)}</p>
            <p style={{ fontSize:12, color:'#9e9e9b' }}>{new Date(order.createdAt).toLocaleDateString('de-DE', { day:'2-digit', month:'long', year:'numeric' })}</p>
          </div>
        </div>

        {/* Customer Info */}
        <div style={{ background:'#fdf8f8', padding:16, borderRadius:4 }}>
          <p style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:'#9e9e9b', marginBottom:8 }}>Kunde</p>
          <p style={{ fontSize:14, fontWeight:600 }}>{order.user?.firstName} {order.user?.lastName}</p>
          <p style={{ fontSize:13, color:'#5e5e5b' }}>{order.user?.email}</p>
        </div>

        {order.returnRequested && (
          <div style={{ background:'#FAEEDA', padding:'10px 14px', marginTop:12, fontSize:13, color:'#633806', display:'flex', gap:8 }}>
            <span className="material-symbols-outlined" style={{ fontSize:16 }}>undo</span>
            {t('Rückgabe beantragt', 'Return requested')} — {order.returnReason}
          </div>
        )}
      </div>

      {/* Status ändern */}
      <div style={{ background:'#fff', border:'1px solid #c4c7c7', padding:20, marginBottom:16 }}>
        <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:16, fontWeight:600, marginBottom:14 }}>
          {t('Status ändern', 'Change Status')}
        </h2>
        <div style={{ display:'flex', gap:8 }}>
          <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
            style={{ flex:1, padding:'8px 12px', fontSize:13, border:'1px solid #c4c7c7', outline:'none' }}>
            <option value="">{t('Status wählen...', 'Select status...')}</option>
            {SUPPORT_CAN_SET.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button onClick={changeStatus} disabled={!newStatus || working}
            style={{ padding:'8px 20px', background:'#1c1b1b', color:'#fff', border:'none', fontSize:12, fontWeight:600, cursor:'pointer', opacity:(!newStatus||working)?0.5:1 }}>
            {t('Setzen', 'Set')}
          </button>
        </div>
        <p style={{ fontSize:11, color:'#9e9e9b', marginTop:8 }}>
          ⚠ {t('Support kann nur shipped, delivered, cancelled setzen. Nicht paid (nur Stripe).', 'Support can only set shipped, delivered, cancelled. Not paid (Stripe only).')}
        </p>
      </div>

      {/* Refund */}
      {order.status !== 'cancelled' && order.stripePaymentIntentId && (
        <div style={{ background:'#fff', border:'1px solid #c4c7c7', padding:20, marginBottom:16 }}>
          <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:16, fontWeight:600, marginBottom:14 }}>
            {t('Refund auslösen', 'Issue Refund')}
          </h2>
          <div style={{ display:'flex', gap:8 }}>
            <input value={refundReason} onChange={e => setRefundReason(e.target.value)}
              placeholder={t('Grund für Refund...', 'Reason for refund...')}
              style={{ flex:1, padding:'8px 12px', fontSize:13, border:'1px solid #c4c7c7', outline:'none' }} />
            <button onClick={doRefund} disabled={!refundReason.trim() || working}
              style={{ padding:'8px 20px', background:'#ba1a1a', color:'#fff', border:'none', fontSize:12, fontWeight:600, cursor:'pointer', opacity:(!refundReason.trim()||working)?0.5:1 }}>
              {t('Refund', 'Refund')}
            </button>
          </div>
        </div>
      )}

      {/* Notizen */}
      <div style={{ background:'#fff', border:'1px solid #c4c7c7', padding:20 }}>
        <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:16, fontWeight:600, marginBottom:14 }}>
          {t('Interne Notizen', 'Internal Notes')}
        </h2>
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          <input value={newNote} onChange={e => setNewNote(e.target.value)}
            placeholder={t('Notiz hinzufügen...', 'Add note...')}
            style={{ flex:1, padding:'8px 12px', fontSize:13, border:'1px solid #c4c7c7', outline:'none' }} />
          <button onClick={addNote} disabled={!newNote.trim() || working}
            style={{ padding:'8px 20px', background:'#1c1b1b', color:'#fff', border:'none', fontSize:12, fontWeight:600, cursor:'pointer', opacity:(!newNote.trim()||working)?0.5:1 }}>
            {t('Speichern', 'Save')}
          </button>
        </div>
        {notes.length === 0 ? (
          <p style={{ fontSize:13, color:'#9e9e9b', textAlign:'center', padding:20 }}>{t('Keine Notizen', 'No notes')}</p>
        ) : notes.map((n: any) => (
          <div key={n.id} style={{ borderBottom:'1px solid #f1edec', padding:'12px 0' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
              <span style={{ fontSize:12, fontWeight:600, color:'#9E896A' }}>{n.agent_name}</span>
              <span style={{ fontSize:11, color:'#9e9e9b' }}>{new Date(n.created_at).toLocaleString('de-DE')}</span>
            </div>
            <p style={{ fontSize:13, color:'#1c1b1b', margin:0 }}>{n.note}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
