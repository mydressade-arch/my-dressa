'use client'
import { useLangStore } from '@/store/lang.store'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { SalesChart } from '@/components/admin/SalesChart'

export default function AdminDashboardPage() {
  const { t } = useLangStore()
  const [stats, setStats]   = useState<any>(null)
  const [chart, setChart]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [chartType, setChartType] = useState<'count'|'revenue'>('count')

  useEffect(() => {
    Promise.all([
      api.get('/admin/dashboard'),
      api.get('/admin/charts/sales'),
    ]).then(([s, c]: any) => {
      setStats(s.data)
      // Backend gibt bereits gemappte Daten {date, purchases, rentals, ...}
      setChart(c.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const STAT_CARDS = stats ? [
    { label:t('Benutzer gesamt', 'Total Users'),    value: stats.totalUsers,    icon:'group',       color:'#0C447C', bg:'#E6F1FB' },
    { label:t('Produkte', 'Products'),           value: stats.totalProducts, icon:'checkroom',   color:'#27500A', bg:'#EAF3DE' },
    { label:t('Bestellungen', 'Orders'),       value: stats.totalOrders,   icon:'package_2',   color:'#633806', bg:'#FAEEDA' },
    { label:t('Umsatz Gesamt', 'Total Revenue'),      value: `€${Number(stats.totalRevenue||0).toFixed(0)}`, icon:'payments', color:'#064E3B', bg:'#EAF3DE' },
    { label:t('Händler ausstehend', 'Pending Merchants'), value: stats.pendingMerchants, icon:'storefront', color:'#791F1F', bg:'#FCEBEB' },
  ] : []

  const totalPurchases = chart.reduce((s, d) => s + (Number(d.purchases) || 0), 0)
  const totalRentals   = chart.reduce((s, d) => s + (Number(d.rentals)   || 0), 0)
  const totalRevenue   = chart.reduce((s, d) => s + (Number(d.purchaseRevenue) || 0) + (Number(d.rentalRevenue) || 0), 0)

  return (
    <div>
      <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:28, fontWeight:700, marginBottom:4 }}>Dashboard</h1>
      <p style={{ color:'#5e5e5b', fontSize:14, marginBottom:28 }}>Übersicht der Plattform</p>

      {/* Stat Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:16, marginBottom:32 }}>
        {loading ? Array(5).fill(0).map((_,i) => (
          <div key={i} style={{ height:90, background:'#f1edec', borderRadius:6 }} />
        )) : STAT_CARDS.map(card => (
          <div key={card.label} style={{ background:'#fff', border:'1px solid #c4c7c7', padding:'16px 20px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <p style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#9e9e9b', marginBottom:6 }}>{card.label}</p>
                <p style={{ fontSize:24, fontWeight:700, color:'#1c1b1b' }}>{card.value}</p>
              </div>
              <div style={{ width:36, height:36, borderRadius:'50%', background:card.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize:18, color:card.color }}>{card.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ background:'#fff', border:'1px solid #c4c7c7', padding:'16px 20px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:600, marginBottom:4 }}>
              Verkäufe & Mieten — letzte 30 Tage
            </h2>
            <div style={{ display:'flex', gap:20, fontSize:12, color:'#5e5e5b' }}>
              <span>📦 {totalPurchases} Käufe</span>
              <span>🎗️ {totalRentals} Mieten</span>
              <span>💰 €{totalRevenue.toFixed(0)} Umsatz</span>
            </div>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {(['count','revenue'] as const).map(type => (
              <button key={type} onClick={() => setChartType(type)}
                style={{ padding:'6px 14px', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', border:'none', cursor:'pointer', background: chartType===type ? '#1c1b1b' : '#f1edec', color: chartType===type ? '#fff' : '#5e5e5b' }}>
                {type === 'count' ? t('Anzahl', 'Count') : t('Umsatz €', 'Revenue €')}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ height:280, background:'#fdf8f8', display:'flex', alignItems:'center', justifyContent:'center', color:'#9e9e9b' }}>Laden...</div>
        ) : !chart.some(d => d.purchases > 0 || d.rentals > 0) ? (
          <div style={{ height:280, background:'#fdf8f8', display:'flex', alignItems:'center', justifyContent:'center', color:'#9e9e9b', flexDirection:'column', gap:8 }}>
            <span className="material-symbols-outlined" style={{ fontSize:40, color:'#c4c7c7' }}>bar_chart</span>
            Noch keine Daten
          </div>
        ) : (
          <SalesChart data={chart} chartType={chartType} />
        )}
      </div>

      {/* Quick Links */}
      <div className="responsive-grid-4" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginTop:24 }}>
        {[
          { label:t('Händler genehmigen', 'Approve Merchants'), href:'/admin/merchant-requests', icon:'storefront', color:'#633806', bg:'#FAEEDA' },
          { label:t('Auszahlungen prüfen', 'Review Payouts'), href:'/admin/payouts', icon:'payments', color:'#0C447C', bg:'#E6F1FB' },
          { label:t('Schadensmeldungen', 'Damage Reports'), href:'/admin/damage-reports', icon:'report', color:'#791F1F', bg:'#FCEBEB' },
          { label:t('Alle Bestellungen', 'All Orders'), href:'/admin/orders', icon:'package_2', color:'#27500A', bg:'#EAF3DE' },
        ].map(item => (
          <a key={item.href} href={item.href}
            style={{ background:'#fff', border:'1px solid #c4c7c7', padding:'16px 20px', textDecoration:'none', display:'flex', alignItems:'center', gap:12, transition:'border-color 0.15s' }}>
            <div style={{ width:40, height:40, borderRadius:'50%', background:item.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span className="material-symbols-outlined" style={{ fontSize:20, color:item.color }}>{item.icon}</span>
            </div>
            <span style={{ fontSize:13, fontWeight:600, color:'#1c1b1b' }}>{item.label}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
