'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useLangStore } from '@/store/lang.store'
import { useUI } from '@/components/ui/UIProvider'

interface MerchantRequest {
  id: string
  shopName: string
  status: 'pending' | 'approved' | 'rejected'
  reason: string | null
  createdAt: string
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

export default function AdminMerchantRequestsPage() {
  const { t } = useLangStore()
  const [requests, setRequests] = useState<MerchantRequest[]>([])
  const { toast } = useUI()
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectingId, setRejectingId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    api.get('/merchant-requests')
      .then((r: any) => setRequests(r.data || []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const approve = async (id: string) => {
    setActionId(id)
    try {
      await api.patch(`/merchant-requests/${id}/approve`)
      setRequests(prev => prev.filter(r => r.id !== id))
    } catch (e: any) {
      toast(e.response?.data?.message || 'Fehler', 'error')
    } finally { setActionId(null) }
  }

  const reject = async (id: string) => {
    setActionId(id)
    try {
      await api.patch(`/merchant-requests/${id}/reject`, { reason: rejectReason || undefined })
      setRequests(prev => prev.filter(r => r.id !== id))
      setRejectingId(null)
      setRejectReason('')
    } catch (e: any) {
      toast(e.response?.data?.message || 'Fehler', 'error')
    } finally { setActionId(null) }
  }

  return (
    <div style={{ padding:'clamp(20px,2vw,40px) clamp(16px,4vw,48px)', maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        Merchant Applications
      </h1>
      <p style={{ color: '#5e5e5b', fontSize: 14, marginBottom: 32 }}>
        {requests.length} pending request{requests.length !== 1 ? 's' : ''}
      </p>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: 90, background: '#f1edec', borderRadius: 4 }} />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', border: '1px solid #c4c7c7', color: '#5e5e5b' }}>
          <span className="material-symbols-outlined" style={{ fontSize:'clamp(24px,3vw,40px)', display: 'block', marginBottom: 12 }}>check_circle</span>
          No pending merchant applications
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {requests.map(req => (
            <div key={req.id} style={{ background: '#fff', border: '1px solid #c4c7c7', padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: 17, marginBottom: 4 }}>
                    {req.shopName}
                  </p>
                  <p style={{ fontSize: 13, color: '#5e5e5b', marginBottom: 2 }}>
                    {req.user.firstName} {req.user.lastName} — {req.user.email}
                  </p>
                  <p style={{ fontSize: 12, color: '#9e9e9b' }}>
                    Applied {new Date(req.createdAt).toLocaleDateString('de-DE', { day:'2-digit', month:'long', year:'numeric' })}
                  </p>
                </div>

                {rejectingId === req.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 260 }}>
                    <input
                      placeholder="Reason for rejection (optional)"
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      style={{ padding: '8px 12px', fontSize: 13, border: '1px solid #c4c7c7', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => reject(req.id)}
                        disabled={actionId === req.id}
                        style={{ flex: 1, background: '#ba1a1a', color: '#fff', border: 'none', padding: '9px 0', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }}>
                        {actionId === req.id ? 'Rejecting…' : 'Confirm Reject'}
                      </button>
                      <button
                        onClick={() => { setRejectingId(null); setRejectReason('') }}
                        style={{ background: 'none', border: '1px solid #c4c7c7', padding: '9px 14px', fontSize: 12, cursor: 'pointer', color: '#5e5e5b' }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => approve(req.id)}
                      disabled={actionId === req.id}
                      style={{ background: '#27500A', color: '#fff', border: 'none', padding: '10px 20px', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', opacity: actionId === req.id ? 0.6 : 1 }}>
                      {actionId === req.id ? 'Approving…' : '✓ Approve'}
                    </button>
                    <button
                      onClick={() => setRejectingId(req.id)}
                      style={{ background: 'none', border: '1px solid #ba1a1a', color: '#ba1a1a', padding: '10px 20px', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }}>
                      ✕ Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
