'use client'
import { useState, useEffect } from 'react'
import { useUI } from '@/components/ui/UIProvider'
import Link from 'next/link'
import { productsApi, api } from '@/lib/api'
import { useLangStore } from '@/store/lang.store'

export default function MerchantProductsPage() {
  const { t } = useLangStore()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [publishing, setPublishing] = useState<string|null>(null)
  const { toast, confirm } = useUI()

  const load = () => {
    setLoading(true)
    productsApi.myProducts().then(({data})=>setProducts(data||[])).catch(()=>{}).finally(()=>setLoading(false))
  }
  const deleteProduct = async (p: any) => {
    const ok = await confirm({ title: 'Produkt löschen', message: `"${p.title}" wirklich löschen? Dies kann nicht rückgängig gemacht werden.`, confirmLabel: t('Löschen', 'Delete'), danger: true })
    if (!ok) return
    try {
      const { data: res } = await api.delete(`/products/${p.id}`) as any
      if (res.deleted) {
        setProducts(ps => ps.filter(x => x.id !== p.id))
        toast('Produkt gelöscht ✓', 'info')
      } else {
        setProducts(ps => ps.map(x => x.id===p.id ? {...x, status:'inactive'} : x))
        toast('Produkt hat Bestellungen → deaktiviert', 'info')
      }
    } catch(e:any) { toast(e.response?.data?.message || 'Fehler', 'error') }
  }

  const togglePublish = async (p: any) => {
    setPublishing(p.id)
    try {
      if (p.status === 'active') {
        await api.patch(`/products/${p.id}`, { status: 'draft' })
        setProducts(ps => ps.map(x => x.id===p.id ? {...x, status:'draft'} : x))
      } else {
        await api.post(`/products/${p.id}/publish`)
        setProducts(ps => ps.map(x => x.id===p.id ? {...x, status:'active'} : x))
      }
    } catch(e:any) { toast(e.response?.data?.message || t('Fehler beim Veröffentlichen', 'Error publishing'), 'error') }
    finally { setPublishing(null) }
  }

  useEffect(load, [])

  return (
    <div>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:32 }}>
        <div>
          <h1 style={{ fontFamily:"'Playfair Display', serif",fontSize:28,fontWeight:700,marginBottom:4 }}>My Products</h1>
          <p style={{ color:'#5e5e5b',fontSize:14 }}>{products.length} listings</p>
        </div>
        <Link href="/merchant/products/new"
          style={{ background:'#1c1b1b',color:'#fff',padding:'10px 20px',fontSize:12,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',textDecoration:'none' }}>
          + Add Product
        </Link>
      </div>

      {loading ? (
        <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
          {[1,2,3].map(i=><div key={i} style={{ height:60,background:'#f1edec' }} />)}
        </div>
      ) : products.length === 0 ? (
        <div style={{ textAlign:'center',padding:'80px 0',border:'1px solid #c4c7c7' }}>
          <span className="material-symbols-outlined" style={{ fontSize:48,color:'#c4c7c7',display:'block',marginBottom:16 }}>checkroom</span>
          <p style={{ color:'#5e5e5b',marginBottom:24 }}>No products yet</p>
          <Link href="/merchant/products/new" style={{ background:'#1c1b1b',color:'#fff',padding:'12px 24px',fontSize:12,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',textDecoration:'none' }}>
            Add First Product
          </Link>
        </div>
      ) : (
        <div style={{ background:'#fff',border:'1px solid #c4c7c7' }}>
          <table style={{ width:'100%',fontSize:14,borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid #c4c7c7' }}>
                {[t('Produkt', 'Product'),t('Typ', 'Type'),'Rent','Buy',t('Status', 'Status'),'Kaution',''].map(h=>(
                  <th key={h} style={{ padding:'12px 20px',textAlign:'left',fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.1em',color:'#5e5e5b' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p:any)=>(
                <tr key={p.id} style={{ borderBottom:'1px solid #f1edec' }}>
                  <td style={{ padding:'14px 20px' }}>
                    <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                      <div style={{ width:40,height:50,overflow:'hidden',background:'#f1edec',flexShrink:0 }}>
                        {p.images?.[0] && <img src={p.images[0].url} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>}
                      </div>
                      <span style={{ fontWeight:500 }}>{p.title}</span>
                    </div>
                  </td>
                  <td style={{ padding:'14px 20px',color:'#5e5e5b',fontSize:12 }}>
                    {[p.isForRent&&'Rent',p.isForSale&&'Buy'].filter(Boolean).join(' + ')}
                  </td>
                  <td style={{ padding:'14px 20px',color:'#5e5e5b' }}>{p.rentalPrice?`€${p.rentalPrice}/d`:'—'}</td>
                  <td style={{ padding:'14px 20px',color:'#5e5e5b' }}>{p.salePrice?`€${p.salePrice}`:'—'}</td>
                  <td style={{ padding:'14px 20px' }}>
                    <span style={{ fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.08em',padding:'3px 8px',
                      background:p.status==='active'?'#EAF3DE':p.status==='draft'?'#FAEEDA':'#FCEBEB',
                      color:p.status==='active'?'#27500A':p.status==='draft'?'#633806':'#791F1F' }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding:'14px 20px', fontSize:12 }}>
                    {p.isForRent ? (
                      <span style={{ fontSize:11, background:'#f0f7ff', color:'#0C447C', padding:'2px 8px', fontWeight:600 }}>
                        €{Number(p.depositAmount||50).toFixed(0)}
                      </span>
                    ) : <span style={{ color:'#c4c7c7' }}>—</span>}
                  </td>
                  <td style={{ padding:'14px 20px' }}>
                    <div style={{ display:'flex',gap:12 }}>
                      <Link href={`/merchant/products/edit/${p.id}`}
                        style={{ fontSize:12,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',color:'#9E896A',textDecoration:'none' }}>
                        Bearbeiten
                      </Link>
                      <button onClick={() => togglePublish(p)} disabled={publishing===p.id}
                        style={{ fontSize:12,fontWeight:600,textTransform:'uppercase',background:'none',border:'none',cursor:'pointer',
                          color:p.status==='active'?'#791F1F':'#27500A', opacity:publishing===p.id?0.5:1 }}>
                        {p.status==='active' ? t('Deaktivieren', 'Deactivate') : t('Veröffentlichen', 'Publish')}
                      </button>
                      <Link href={`/products/${p.id}`} target="_blank"
                        style={{ fontSize:12,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',color:'#5e5e5b',textDecoration:'none' }}>
                        Ansehen
                      </Link>
                      <button onClick={() => deleteProduct(p)}
                        style={{ fontSize:12,fontWeight:600,textTransform:'uppercase',background:'none',border:'none',cursor:'pointer',color:'#ba1a1a' }}>
                        Löschen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
