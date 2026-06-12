'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useLangStore } from '@/store/lang.store'
import Link from 'next/link'

const STATUS_STYLE: Record<string, any> = {
  pending: { bg:'#FAEEDA', color:'#633806' }, paid: { bg:'#EAF3DE', color:'#27500A' },
  shipped: { bg:'#E6F1FB', color:'#0C447C' }, delivered: { bg:'#EAF3DE', color:'#27500A' },
  cancelled: { bg:'#FCEBEB', color:'#791F1F' }, returned: { bg:'#EAF3DE', color:'#27500A' },
}

export default function SupportOrdersPage() {
  const { t } = useLangStore()
  const [orders, setOrders]   = useState<any[]>([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)
  const [q, setQ]             = useState('')
  const [status, setStatus]   = useState('')

  const load = (p = page, query = q, st = status) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p) })
    if (query) params.set('q', query)
    if (st) params.set('status', st)
    api.get(`/support/orders?${params}`)
      .then(({ data }: any) => { setOrders(data.orders || []); setTotal(data.total || 0) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); load(1, q, status) }

  return (
    <div>
      <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:28, fontWeight:700, marginBottom:24 }}>
        {t('Bestellungen', 'Orders')}
      </h1>

      {/* Search */}
      <form onSubmit={handleSearch} style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('Suche: E-Mail, Name, ID, Produkt...', 'Search: email, name, ID, product...')}
          style={{ flex:1, minWidth:200, padding:'8px 12px', fontSize:13, border:'1px solid #c4c7c7', outline:'none' }} />
        <select value={status} onChange={e => setStatus(e.target.value)}
          style={{ padding:'8px 12px', fontSize:13, border:'1px solid #c4c7c7', outline:'none' }}>
          <option value="">{t('Alle Status', 'All statuses')}</option>
          {['pending','paid','shipped','delivered','returned','cancelled'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button type="submit" style={{ padding:'8px 20px', background:'#1c1b1b', color:'#fff', border:'none', fontSize:12, fontWeight:600, cursor:'pointer' }}>
          {t('Suchen', 'Search')}
        </button>
      </form>

      <p style={{ fontSize:12, color:'#9e9e9b', marginBottom:12 }}>{total} {t('Ergebnisse', 'results')}</p>

      <div style={{ background:'#fff', border:'1px solid #c4c7c7' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ borderBottom:'1px solid #c4c7c7', background:'#fdf8f8' }}>
              {['ID','Kunde','Produkt','Typ','Status','Betrag','Datum',''].map(h => (
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600, textTransform:'uppercase', color:'#5e5e5b', letterSpacing:'0.08em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding:40, textAlign:'center', color:'#9e9e9b' }}>{t('Laden...', 'Loading...')}</td></tr>
            ) : orders.map((o: any) => {
              const s = STATUS_STYLE[o.status] || { bg:'#f1edec', color:'#5e5e5b' }
              return (
                <tr key={o.id} style={{ borderBottom:'1px solid #f9f6f5' }}>
                  <td style={{ padding:'10px 14px', fontFamily:'monospace', fontSize:11, color:'#9E896A' }}>#{o.id.substring(0,8).toUpperCase()}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <p style={{ fontSize:12, fontWeight:600, margin:0 }}>{o.customer?.name}</p>
                    <p style={{ fontSize:11, color:'#9e9e9b', margin:0 }}>{o.customer?.email}</p>
                  </td>
                  <td style={{ padding:'10px 14px', fontSize:12, color:'#5e5e5b' }}>{o.product || '—'}</td>
                  <td style={{ padding:'10px 14px', fontSize:11, textTransform:'uppercase', color:'#5e5e5b' }}>{o.type}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', padding:'2px 8px', background:s.bg, color:s.color }}>{o.status}</span>
                    {o.returnRequested && <span style={{ marginLeft:4, fontSize:10, background:'#FAEEDA', color:'#633806', padding:'2px 6px' }}>↩ Return</span>}
                  </td>
                  <td style={{ padding:'10px 14px', fontWeight:600 }}>€{Number(o.totalPrice||0).toFixed(2)}</td>
                  <td style={{ padding:'10px 14px', fontSize:11, color:'#9e9e9b' }}>{new Date(o.createdAt).toLocaleDateString('de-DE')}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <Link href={`/support/orders/${o.id}`} style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', color:'#9E896A', textDecoration:'none' }}>
                      {t('Details', 'Details')} →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div style={{ display:'flex', gap:8, marginTop:16, justifyContent:'center' }}>
          <button disabled={page===1} onClick={() => { setPage(p => p-1); load(page-1) }}
            style={{ padding:'6px 14px', border:'1px solid #c4c7c7', background:'none', cursor:'pointer', fontSize:12 }}>←</button>
          <span style={{ padding:'6px 14px', fontSize:12, color:'#5e5e5b' }}>{page} / {Math.ceil(total/20)}</span>
          <button disabled={page>=Math.ceil(total/20)} onClick={() => { setPage(p => p+1); load(page+1) }}
            style={{ padding:'6px 14px', border:'1px solid #c4c7c7', background:'none', cursor:'pointer', fontSize:12 }}>→</button>
        </div>
      )}
    </div>
  )
}
