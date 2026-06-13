'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useLangStore } from '@/store/lang.store'
import Link from 'next/link'

export default function SupportDashboard() {
  const { t } = useLangStore()
  const [stats, setStats] = useState<any>(null)
  const [recentOrders, setRecentOrders] = useState<any[]>([])

  useEffect(() => {
    api.get('/support/dashboard').then(({ data }: any) => setStats(data)).catch(() => {})
    api.get('/support/orders?page=1').then(({ data }: any) => setRecentOrders(data.orders?.slice(0,5) || [])).catch(() => {})
  }, [])

  const STAT_CARDS = stats ? [
    { label: t('Offene Bestellungen', 'Open Orders'), value: stats.openOrders, icon: 'package_2', color: '#0C447C', bg: '#E6F1FB' },
    { label: t('Rückgabe ausstehend', 'Pending Returns'), value: stats.pendingReturns, icon: 'undo', color: '#633806', bg: '#FAEEDA' },
    { label: t('Schadensmeldungen', 'Damage Reports'), value: stats.openDamageReports, icon: 'report', color: '#791F1F', bg: '#FCEBEB' },
    { label: t('Bestellungen heute', 'Orders today'), value: stats.ordersToday, icon: 'today', color: '#27500A', bg: '#EAF3DE' },
  ] : []

  const STATUS_STYLE: Record<string, any> = {
    pending:   { bg:'#FAEEDA', color:'#633806' },
    paid:      { bg:'#EAF3DE', color:'#27500A' },
    shipped:   { bg:'#E6F1FB', color:'#0C447C' },
    delivered: { bg:'#EAF3DE', color:'#27500A' },
    cancelled: { bg:'#FCEBEB', color:'#791F1F' },
    returned:  { bg:'#EAF3DE', color:'#27500A' },
  }

  return (
    <div>
      <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:28, fontWeight:700, marginBottom:4 }}>
        {t('Support Dashboard', 'Support Dashboard')}
      </h1>
      <p style={{ color:'#5e5e5b', fontSize:14, marginBottom:28 }}>
        {t('Übersicht & schnelle Aktionen', 'Overview & quick actions')}
      </p>

      {/* Stats */}
      <div className="responsive-grid-4" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:16, marginBottom:32 }}>
        {STAT_CARDS.map(c => (
          <div key={c.label} style={{ background:'#fff', border:'1px solid #c4c7c7', padding:'16px 20px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <p style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#9e9e9b', marginBottom:6 }}>{c.label}</p>
                <p style={{ fontSize:28, fontWeight:700, color:'#1c1b1b' }}>{c.value ?? '—'}</p>
              </div>
              <div style={{ width:40, height:40, borderRadius:'50%', background:c.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize:20, color:c.color }}>{c.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="responsive-grid-3" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:32 }}>
        {[
          { label: t('Bestellung suchen', 'Search Order'), href: '/support/orders', icon: 'search', color: '#0C447C', bg: '#E6F1FB' },
          { label: t('Kunden suchen', 'Search Customer'), href: '/support/customers', icon: 'person_search', color: '#27500A', bg: '#EAF3DE' },
          { label: t('Schadensmeldungen', 'Damage Reports'), href: '/support/damage', icon: 'report', color: '#791F1F', bg: '#FCEBEB' },
        ].map(item => (
          <Link key={item.href} href={item.href}
            style={{ background:'#fff', border:'1px solid #c4c7c7', padding:'16px 20px', textDecoration:'none', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:'50%', background:item.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span className="material-symbols-outlined" style={{ fontSize:20, color:item.color }}>{item.icon}</span>
            </div>
            <span style={{ fontSize:13, fontWeight:600, color:'#1c1b1b' }}>{item.label}</span>
          </Link>
        ))}
      </div>

      {/* Recent Orders */}
      <div style={{ background:'#fff', border:'1px solid #c4c7c7' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #f1edec', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:600 }}>
            {t('Neueste Bestellungen', 'Recent Orders')}
          </h2>
          <Link href="/support/orders" style={{ fontSize:12, color:'#9E896A', textDecoration:'none', fontWeight:600, textTransform:'uppercase' }}>
            {t('Alle anzeigen →', 'View all →')}
          </Link>
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ borderBottom:'1px solid #f1edec', background:'#fdf8f8' }}>
              {[t('Bestellung','Order'), t('Kunde','Customer'), t('Produkt','Product'), t('Status','Status'), t('Betrag','Amount')].map(h => (
                <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:'#5e5e5b' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((o: any) => {
              const s = STATUS_STYLE[o.status] || { bg:'#f1edec', color:'#5e5e5b' }
              return (
                <tr key={o.id} style={{ borderBottom:'1px solid #f9f6f5' }}>
                  <td style={{ padding:'12px 16px' }}>
                    <Link href={`/support/orders/${o.id}`} style={{ fontSize:11, fontFamily:'monospace', color:'#9E896A', textDecoration:'none' }}>
                      #{o.id.substring(0,8).toUpperCase()}
                    </Link>
                  </td>
                  <td style={{ padding:'12px 16px', fontSize:12 }}>{o.customer?.name || '—'}</td>
                  <td style={{ padding:'12px 16px', fontSize:12, color:'#5e5e5b' }}>{o.product || '—'}</td>
                  <td style={{ padding:'12px 16px' }}>
                    <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', padding:'2px 8px', background:s.bg, color:s.color }}>{o.status}</span>
                  </td>
                  <td style={{ padding:'12px 16px', fontWeight:600 }}>€{Number(o.totalPrice||0).toFixed(2)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
