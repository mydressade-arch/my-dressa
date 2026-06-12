'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { productsApi, ordersApi, api } from '@/lib/api'
import { useLangStore } from '@/store/lang.store'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

function StatCard({ icon, label, value, sub }: any) {
  return (
    <div className="bg-white border border-outline-variant p-6">
      <div className="w-10 h-10 flex items-center justify-center mb-4" style={{background:'#f1edec'}}>
        <span className="material-symbols-outlined" style={{fontSize:20,color:'#9E896A'}}>{icon}</span>
      </div>
      <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2">{label}</p>
      <p className="font-serif text-3xl font-bold mb-1">{value}</p>
      {sub && <p className="text-xs text-secondary">{sub}</p>}
    </div>
  )
}

export default function MerchantDashboardPage() {
  const { t } = useLangStore()
  const [products, setProducts] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stripeConnected, setStripeConnected] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    Promise.all([
      productsApi.myProducts(),
      ordersApi.myOrders(),
      (api as any).get('/users/merchant-profile'),
    ])
      .then(([p, o, m]: any) => {
        setProducts(p.data || [])
        setOrders(o.data || [])
        setStripeConnected(!!(m.data?.stripeAccountId))
      })
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  const totalRevenue = orders.filter(o=>o.status!=='cancelled')
    .reduce((s:number,o:any)=>s+Number(o.merchantAmount||0),0)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold mb-1">Dashboard</h1>
          <p className="text-secondary text-sm">Your shop at a glance</p>
        </div>
        <Link href="/merchant/products/new"><Button variant="primary" size="md">+ New Product</Button></Link>
      </div>

      {/* Stripe Warning Banner */}
      {stripeConnected === false && (
        <div style={{ background:'#FAEEDA', border:'1px solid #f8dfbb', padding:'14px 20px', marginBottom:24, display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize:20, color:'#633806', flexShrink:0 }}>warning</span>
            <p style={{ fontSize:13, color:'#633806' }}>
              <strong>Stripe nicht verbunden</strong> — Kunden können deine Produkte noch nicht kaufen oder mieten.
            </p>
          </div>
          <button onClick={() => router.push('/merchant/stripe')}
            style={{ background:'#633806', color:'#fff', border:'none', padding:'8px 16px', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>
            Jetzt verbinden
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard icon="checkroom"  label="Products"    value={products.length} sub="Active listings" />
        <StatCard icon="package_2"  label="Orders"      value={orders.length}   sub="All time" />
        <StatCard icon="payments"   label="Revenue"     value={`€${totalRevenue.toFixed(2)}`} sub="After 10% commission" />
        <StatCard icon="hourglass_empty" label="Pending" value={orders.filter(o=>o.status==='paid').length} sub="To ship" />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white border border-outline-variant">
          <div className="flex justify-between items-center px-6 py-5 border-b border-outline-variant">
            <h2 className="font-serif text-lg font-semibold">Recent Orders</h2>
            <Link href="/merchant/orders" className="text-xs uppercase tracking-widest text-secondary hover:text-primary">View All</Link>
          </div>
          {loading ? <div className="p-6 space-y-3">{[1,2,3].map(i=><div key={i} className="h-12 bg-surface-container-high animate-pulse"/>)}</div>
          : orders.length===0 ? <div className="p-12 text-center text-secondary text-sm">No orders yet</div>
          : <div className="divide-y divide-outline-variant">
              {orders.slice(0,5).map((o:any)=>(
                <div key={o.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{o.productVariant?.product?.title||'Product'}</p>
                    <p className="text-xs text-secondary uppercase tracking-widest mt-0.5">{o.type}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={o.status as any}>{o.status}</Badge>
                    <span className="text-sm font-bold">€{Number(o.merchantAmount||o.totalPrice).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>}
        </div>

        <div className="bg-white border border-outline-variant">
          <div className="flex justify-between items-center px-6 py-5 border-b border-outline-variant">
            <h2 className="font-serif text-lg font-semibold">My Products</h2>
            <Link href="/merchant/products" className="text-xs uppercase tracking-widest text-secondary hover:text-primary">Manage</Link>
          </div>
          {loading ? <div className="p-6 space-y-3">{[1,2].map(i=><div key={i} className="h-12 bg-surface-container-high animate-pulse"/>)}</div>
          : products.length===0
            ? <div className="p-8 text-center"><p className="text-sm text-secondary mb-4">No products yet</p>
                <Link href="/merchant/products/new"><Button variant="rent" size="sm">Add First</Button></Link></div>
            : <div className="divide-y divide-outline-variant">
                {products.slice(0,5).map((p:any)=>(
                  <div key={p.id} className="px-6 py-4 flex items-center justify-between">
                    <p className="text-sm font-medium truncate flex-1">{p.title}</p>
                    <span className={`text-xs font-semibold px-2 py-1 ml-2 ${p.status==='active'?'bg-emerald-deep/10 text-emerald-deep':'bg-surface-container-highest text-secondary'}`}>{p.status}</span>
                  </div>
                ))}
              </div>}
        </div>
      </div>
    </div>
  )
}
