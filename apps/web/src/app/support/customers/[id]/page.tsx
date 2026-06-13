'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useLangStore } from '@/store/lang.store'
import Link from 'next/link'

export default function SupportCustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { t } = useLangStore()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/support/customers/${id}`)
      .then(({ data }: any) => setData(data))
      .catch(() => router.push('/support/customers'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ padding:64, textAlign:'center', color:'#9e9e9b' }}>Laden...</div>
  if (!data) return null

  const { user, orders, orderCount, totalSpent } = data
  const STATUS_STYLE: Record<string, any> = {
    paid: { bg:'#EAF3DE', color:'#27500A' }, shipped: { bg:'#E6F1FB', color:'#0C447C' },
    delivered: { bg:'#EAF3DE', color:'#27500A' }, cancelled: { bg:'#FCEBEB', color:'#791F1F' },
    returned: { bg:'#EAF3DE', color:'#27500A' }, pending: { bg:'#FAEEDA', color:'#633806' },
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <button onClick={() => router.push('/support/customers')}
        style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#5e5e5b', marginBottom:20, display:'flex', alignItems:'center', gap:4 }}>
        <span className="material-symbols-outlined" style={{ fontSize:16 }}>arrow_back</span>
        {t('Zurück', 'Back')}
      </button>

      <div style={{ background:'#fff', border:'1px solid #c4c7c7', padding:24, marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:24, fontWeight:700, marginBottom:4 }}>
              {user.firstName} {user.lastName}
            </h1>
            <p style={{ fontSize:14, color:'#5e5e5b', marginBottom:2 }}>{user.email}</p>
            <p style={{ fontSize:12, color:'#9e9e9b' }}>
              {t('Registriert seit', 'Registered since')} {new Date(user.createdAt).toLocaleDateString('de-DE', { day:'2-digit', month:'long', year:'numeric' })}
            </p>
          </div>
          <span style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', padding:'3px 10px', background: user.isActive ? '#EAF3DE' : '#FCEBEB', color: user.isActive ? '#27500A' : '#791F1F' }}>
            {user.isActive ? t('Aktiv', 'Active') : t('Gesperrt', 'Suspended')}
          </span>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:12, marginTop:20 }}>
          <div style={{ background:'#fdf8f8', padding:'12px 16px' }}>
            <p style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', color:'#9e9e9b', marginBottom:4 }}>{t('Bestellungen', 'Orders')}</p>
            <p style={{ fontSize:22, fontWeight:700 }}>{orderCount}</p>
          </div>
          <div style={{ background:'#fdf8f8', padding:'12px 16px' }}>
            <p style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', color:'#9e9e9b', marginBottom:4 }}>{t('Gesamt ausgegeben', 'Total spent')}</p>
            <p style={{ fontSize:22, fontWeight:700, color:'#27500A' }}>€{totalSpent.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:600, marginBottom:12 }}>
        {t('Bestellhistorie', 'Order History')}
      </h2>
      <div style={{ background:'#fff', border:'1px solid #c4c7c7' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ borderBottom:'1px solid #c4c7c7', background:'#fdf8f8' }}>
              {['ID','Produkt','Typ','Status','Betrag','Datum',''].map(h => (
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600, textTransform:'uppercase', color:'#5e5e5b' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((o: any) => {
              const s = STATUS_STYLE[o.status] || { bg:'#f1edec', color:'#5e5e5b' }
              return (
                <tr key={o.id} style={{ borderBottom:'1px solid #f9f6f5' }}>
                  <td style={{ padding:'10px 14px', fontFamily:'monospace', fontSize:11, color:'#9E896A' }}>#{o.id.substring(0,8).toUpperCase()}</td>
                  <td style={{ padding:'10px 14px', fontSize:12 }}>{o.product || '—'}</td>
                  <td style={{ padding:'10px 14px', fontSize:11, textTransform:'uppercase', color:'#5e5e5b' }}>{o.type}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', padding:'2px 8px', background:s.bg, color:s.color }}>{o.status}</span>
                  </td>
                  <td style={{ padding:'10px 14px', fontWeight:600 }}>€{Number(o.totalPrice||0).toFixed(2)}</td>
                  <td style={{ padding:'10px 14px', fontSize:11, color:'#9e9e9b' }}>{new Date(o.createdAt).toLocaleDateString('de-DE')}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <Link href={`/support/orders/${o.id}`} style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', color:'#9E896A', textDecoration:'none' }}>
                      →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
