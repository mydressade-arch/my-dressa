'use client'
import { useEffect, useState } from 'react'
import { useLangStore } from '@/store/lang.store'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { clsx } from 'clsx'

export default function AdminLayout({children}:{children:React.ReactNode}) {
  const { user, isLoading } = useAuthStore()
  const { t } = useLangStore()
  const router = useRouter()
  const pathname = usePathname()
  const [hydrated, setHydrated] = useState(false)
  const [notifications, setNotifications] = useState<any>({})

  useEffect(() => {
    const load = () => {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/notifications`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      }).then(r => r.json()).then(d => setNotifications(d)).catch(() => {})
    }
    load()
    const interval = setInterval(load, 30000) // alle 30 Sekunden
    return () => clearInterval(interval)
  }, [])

  const NAV = [
    { href:'/admin',                   icon:'dashboard',  label:t(t('Dashboard', 'Dashboard'),          'Dashboard'),      badge: 0 },
    { href:'/admin/users',             icon:'group',      label:t(t('Benutzer', 'Users'),           'Users'),          badge: 0 },
    { href:'/admin/merchant-requests', icon:'storefront', label:t(t('Händler-Anfragen', 'Merchant Requests'),   'Requests'),       badge: notifications.pendingMerchantRequests },
    { href:'/admin/merchants',         icon:'store',      label:t(t('Alle Händler', 'All Merchants'),       'All Merchants'),  badge: 0 },
    { href:'/admin/categories',        icon:'category',   label:t(t('Kategorien', 'Categories'),         'Categories'),     badge: 0 },
    { href:'/admin/orders',            icon:'package_2',  label:t(t('Bestellungen', 'Orders'),       'Orders'),         badge: notifications.returnRequests },
    { href:'/admin/revenue',           icon:'bar_chart',  label:t(t('Umsatz', 'Revenue'),             'Revenue'),        badge: 0 },
    { href:'/admin/payouts',           icon:'payments',   label:t(t('Auszahlungen', 'Payouts'),       'Payouts'),        badge: notifications.pendingPayouts },
    { href:'/admin/damage-reports',    icon:'report',     label:t(t('Schadensmeldungen', 'Damage Reports'),  'Damage Reports'), badge: notifications.openDamageReports },
  ]

  useEffect(() => { setHydrated(true) }, [])

  useEffect(() => {
    if (!hydrated || isLoading) return
    if (!user) { router.push('/auth/login'); return }
    if (user.role !== 'admin') router.push('/')
  }, [hydrated, isLoading, user, router])

  if (!hydrated || isLoading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#1c1b1b'}}>
      <div style={{width:32,height:32,border:'3px solid #f4f0ef',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
    </div>
  )
  if (!user) return null

  return (
    <div className="flex min-h-screen" style={{background:'#fdf8f8'}}>
      <aside className="w-64 flex-shrink-0 border-r flex flex-col" style={{background:'#1c1b1b'}}>
        <div className="px-6 py-6 border-b" style={{borderColor:'#313030'}}>
          <Link href="/" className="font-serif text-xl font-bold tracking-tighter block mb-1" style={{color:'#f4f0ef'}}>My Dressa</Link>
          <p className="text-xs uppercase tracking-widest" style={{color:'#9c9a92'}}>
          Admin Panel
          {notifications.total > 0 && (
            <span style={{marginLeft:8, background:'#ba1a1a', color:'#fff', fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:10}}>
              {notifications.total}
            </span>
          )}
        </p>
        </div>
        <nav className="flex-1 px-3 py-6 space-y-1">
          {NAV.map(item => (
            <Link key={item.href} href={item.href}
              className={clsx('flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all',
                pathname === item.href ? 'text-white' : 'hover:text-white'
              )}
              style={pathname===item.href ? {background:'rgba(255,255,255,0.1)',color:'#f4f0ef'} : {color:'#9c9a92'}}>
              <span className="material-symbols-outlined" style={{fontSize:20}}>{item.icon}</span>
              <span style={{flex:1}}>{item.label}</span>
              {item.badge > 0 && (
                <span style={{background:'#ba1a1a', color:'#fff', fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:10, minWidth:18, textAlign:'center'}}>
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="px-6 py-5 border-t" style={{borderColor:'#313030'}}>
          <p className="text-xs font-semibold mb-0.5" style={{color:'#f4f0ef'}}>{user.firstName} {user.lastName}</p>
          <p className="text-xs" style={{color:'#9c9a92'}}>{user.email}</p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-10">{children}</div>
      </main>
    </div>
  )
}
