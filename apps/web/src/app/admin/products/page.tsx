'use client'
import { useLangStore } from '@/store/lang.store'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'

export default function AdminProductsPage() {
  const { t } = useLangStore()
  const [data, setData] = useState<any>({ products: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const load = (p = 1) => {
    setLoading(true)
    api.get('/admin/products', { params: { page: p, limit: 20 } })
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(page) }, [page])

  const suspend = async (id: string) => {
    await api.post(`/admin/products/${id}/suspend`)
    load(page)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold mb-1">Products</h1>
          <p className="text-secondary text-sm">{data.total} total listings</p>
        </div>
      </div>

      <div className="bg-white border border-outline-variant">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant">
              {['Product', 'Merchant', 'Type', 'Rent', 'Buy', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-widest text-on-surface-variant">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {loading
              ? [1,2,3,4].map(i => <tr key={i}><td colSpan={7} className="px-5 py-3"><div className="h-4 bg-surface-container-high animate-pulse"/></td></tr>)
              : data.products.map((p: any) => (
                  <tr key={p.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-12 bg-surface-container-high flex-shrink-0 overflow-hidden">
                          {p.images?.[0] && <img src={p.images[0].url} alt="" className="w-full h-full object-cover"/>}
                        </div>
                        <span className="font-medium">{p.title}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-secondary">{p.merchant?.shopName || '—'}</td>
                    <td className="px-5 py-4 text-secondary text-xs">
                      {[p.isForRent && 'Rent', p.isForSale && 'Buy'].filter(Boolean).join(' + ')}
                    </td>
                    <td className="px-5 py-4 text-secondary">{p.rentalPrice ? `€${p.rentalPrice}` : '—'}</td>
                    <td className="px-5 py-4 text-secondary">{p.salePrice ? `€${p.salePrice}` : '—'}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 uppercase tracking-wider ${
                        p.status === 'active' ? 'bg-emerald-deep/10 text-emerald-deep' :
                        p.status === 'suspended' ? 'bg-error-container text-error' :
                        'bg-surface-container-highest text-secondary'
                      }`}>{p.status}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-3">
                        <Link href={`/products/${p.id}`} className="text-xs font-semibold uppercase tracking-widest text-secondary hover:text-primary">
                          View
                        </Link>
                        {p.status !== 'suspended' && (
                          <button onClick={() => suspend(p.id)}
                            className="text-xs font-semibold uppercase tracking-widest text-error hover:underline">
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        {data.totalPages > 1 && (
          <div className="px-5 py-4 border-t border-outline-variant flex items-center justify-between">
            <p className="text-xs text-secondary">Page {page} of {data.totalPages}</p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Prev</Button>
              <Button variant="ghost" size="sm" disabled={page===data.totalPages} onClick={()=>setPage(p=>p+1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
