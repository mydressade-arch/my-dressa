'use client'
import { useLangStore } from '@/store/lang.store'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'

const STATUS_STYLE: Record<string, {bg:string,color:string}> = {
  active:    { bg:'#EAF3DE', color:'#27500A' },
  draft:     { bg:'#FAEEDA', color:'#633806' },
  inactive:  { bg:'#FCEBEB', color:'#791F1F' },
  pending:   { bg:'#FAEEDA', color:'#633806' },
  paid:      { bg:'#EAF3DE', color:'#27500A' },
  shipped:   { bg:'#E6F1FB', color:'#0C447C' },
  delivered: { bg:'#EAF3DE', color:'#27500A' },
  cancelled: { bg:'#FCEBEB', color:'#791F1F' },
}

export default function AdminMerchantDetailPage() {
  const { t } = useLangStore()
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const [data, setData]     = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<'products'|'orders'>('products')

  useEffect(() => {
    api.get(`/admin/merchants/${id}/details`)
      .then(({ data }: any) => setData(data))
      .catch(() => router.push('/admin/merchants'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ padding:64, textAlign:'center', color:'#5e5e5b' }}>Laden...</div>
  if (!data) return null

  const { merchant, products, recentOrders } = data

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:24 }}>
        <button onClick={() => router.push('/admin/merchants')}
          style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4, color:'#5e5e5b', fontSize:13 }}>
          <span className="material-symbols-outlined" style={{ fontSize:16 }}>arrow_back</span>
          Alle Händler
        </button>
      </div>

      {/* Händler Info */}
      <div style={{ background:'#fff', border:'1px solid #c4c7c7', padding:24, marginBottom:24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16 }}>
          <div>
            <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:26, fontWeight:700, marginBottom:4 }}>
              {merchant.shopName}
            </h1>
            <p style={{ fontSize:13, color:'#5e5e5b', marginBottom:2 }}>
              {merchant.user?.firstName} {merchant.user?.lastName} · {merchant.user?.email}
            </p>
            <p style={{ fontSize:12, color:'#9e9e9b' }}>
              Seit {new Date(merchant.createdAt).toLocaleDateString('de-DE', { day:'2-digit', month:'long', year:'numeric' })}
            </p>
          </div>
          <div style={{ display:'flex', gap:12 }}>
            {[
              { label:t('Produkte', 'Products'), value: products.length },
              { label:'Ausstehend', value: `€${Number(merchant.balancePending||0).toFixed(2)}`, color:'#633806' },
              { label:'Verdient', value: `€${Number(merchant.balancePaid||0).toFixed(2)}`, color:'#27500A' },
            ].map(s => (
              <div key={s.label} style={{ background:'#fdf8f8', border:'1px solid #e8e3e1', padding:'12px 20px', textAlign:'center', minWidth:90 }}>
                <p style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#9e9e9b', marginBottom:4 }}>{s.label}</p>
                <p style={{ fontSize:18, fontWeight:700, color: s.color || '#1c1b1b' }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid #c4c7c7', marginBottom:20 }}>
        {([['products',`Produkte (${products.length})`],['orders',`Letzte Bestellungen (${recentOrders.length})`]] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:'10px 20px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', background:'none', border:'none', cursor:'pointer', borderBottom:`2px solid ${tab===t?'#1c1b1b':'transparent'}`, color:tab===t?'#1c1b1b':'#5e5e5b', marginBottom:-1 }}>
            {label}
          </button>
        ))}
      </div>

      {/* Produkte */}
      {tab === 'products' && (
        products.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 0', color:'#9e9e9b', border:'1px solid #c4c7c7' }}>
            Noch keine Produkte
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:16 }}>
            {products.map((p: any) => {
              const s = STATUS_STYLE[p.status] || { bg:'#f1edec', color:'#5e5e5b' }
              const img = p.images?.[0]?.url
              return (
                <div key={p.id} style={{ background:'#fff', border:'1px solid #c4c7c7', overflow:'hidden' }}>
                  {img ? (
                    <img src={img} alt={p.title} style={{ width:'100%', height:180, objectFit:'cover', display:'block' }} />
                  ) : (
                    <div style={{ width:'100%', height:180, background:'#f1edec', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize:40, color:'#c4c7c7' }}>checkroom</span>
                    </div>
                  )}
                  <div style={{ padding:16 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                      <p style={{ fontWeight:600, fontSize:14, flex:1, marginRight:8 }}>{p.title}</p>
                      <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', padding:'2px 8px', background:s.bg, color:s.color }}>
                        {p.status}
                      </span>
                    </div>
                    <div style={{ display:'flex', gap:12, fontSize:12, color:'#5e5e5b' }}>
                      {p.isForSale && <span>Kauf: €{Number(p.salePrice||0).toFixed(2)}</span>}
                      {p.isForRent && <span>Miete: €{Number(p.rentalPrice||0).toFixed(2)}/Tag</span>}
                    </div>
                    {p.isForRent && p.depositAmount && (
                      <p style={{ fontSize:11, color:'#0C447C', marginTop:4 }}>
                        Kaution: €{Number(p.depositAmount).toFixed(2)}
                      </p>
                    )}
                    {p.category && (
                      <p style={{ fontSize:11, color:'#9e9e9b', marginTop:4 }}>{p.category}</p>
                    )}
                    {p.variants?.length > 0 && (
                      <p style={{ fontSize:11, color:'#5e5e5b', marginTop:4 }}>
                        {p.variants.length} Variante(n): {p.variants.map((v: any) => `${v.size||''} ${v.color||''}`.trim()).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Bestellungen */}
      {tab === 'orders' && (
        recentOrders.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 0', color:'#9e9e9b', border:'1px solid #c4c7c7' }}>
            Noch keine Bestellungen
          </div>
        ) : (
          <div style={{ background:'#fff', border:'1px solid #c4c7c7', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid #c4c7c7', background:'#fdf8f8' }}>
                  {['Produkt','Typ','Status','Betrag','Datum'].map(h => (
                    <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o: any) => {
                  const s = STATUS_STYLE[o.status] || { bg:'#f1edec', color:'#5e5e5b' }
                  return (
                    <tr key={o.id} style={{ borderBottom:'1px solid #f1edec' }}>
                      <td style={{ padding:'12px 16px', fontWeight:500 }}>{o.product_title || '—'}</td>
                      <td style={{ padding:'12px 16px', color:'#5e5e5b', textTransform:'uppercase', fontSize:11 }}>{o.type}</td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', padding:'2px 8px', background:s.bg, color:s.color }}>
                          {o.status}
                        </span>
                      </td>
                      <td style={{ padding:'12px 16px', fontWeight:600 }}>€{Number(o.total_price||0).toFixed(2)}</td>
                      <td style={{ padding:'12px 16px', color:'#9e9e9b', fontSize:12 }}>
                        {new Date(o.created_at).toLocaleDateString('de-DE')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
