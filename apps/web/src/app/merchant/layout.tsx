'use client'
import { useEffect, useState } from 'react'
import { useLangStore } from '@/store/lang.store'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { Icon } from '@/components/ui/Icon'
import { ordersApi } from '@/lib/api'

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore()
  const { t } = useLangStore()
  const router = useRouter()
  const pathname = usePathname()

  // Benachrichtigung auf "Bestellungen": Vorgänge, die der Händler bearbeiten
  // muss. Bernstein = normale Aktion (versenden / Rückgabe bestätigen),
  // Rot = dringend (überfällige Rückgabe).
  const [orderAlerts, setOrderAlerts] = useState<{ amber: number; red: number }>({ amber: 0, red: 0 })
  useEffect(() => {
    if (!user || (user.role !== 'merchant' && user.role !== 'admin')) return
    const load = () => {
      ordersApi.myMerchantOrders().then(({ data }: any) => {
        let amber = 0, red = 0
        ;(data || []).forEach((o: any) => {
          const rental = o.rentals?.[0] || o.rental
          if (rental?.status === 'overdue') red++ // dringend: überfällig
          else if (o.status === 'paid') amber++ // noch zu versenden
          else if (o.type === 'rental' && rental &&
                   (rental.customerConfirmedReturn || rental.status === 'pending_return') &&
                   o.status !== 'returned' && rental.status !== 'returned') amber++ // Rückgabe bestätigen
        })
        setOrderAlerts({ amber, red })
      }).catch(() => {})
    }
    load()
    const i = setInterval(load, 30000)
    return () => clearInterval(i)
  }, [user])

  const ordersBadge = orderAlerts.amber + orderAlerts.red
  const ordersBadgeColor = orderAlerts.red > 0 ? '#ba1a1a' : '#b9791a'

  const NAV = [
    { href: '/merchant/dashboard', icon: 'dashboard',   label: t(t('Dashboard', 'Dashboard'),     'Dashboard'),     badge: 0, color: '#b9791a' },
    { href: '/merchant/products',  icon: 'checkroom',   label: t(t('Produkte', 'Products'),      'Products'),      badge: 0, color: '#b9791a' },
    { href: '/merchant/orders',    icon: 'package_2',   label: t(t('Bestellungen', 'Orders'),  'Orders'),        badge: ordersBadge, color: ordersBadgeColor },
    { href: '/merchant/earnings',  icon: 'payments',    label: t(t('Einnahmen', 'Earnings'),     'Earnings'),      badge: 0, color: '#b9791a' },
    { href: '/merchant/bank',      icon: 'account_balance', label: t(t('Bankverbindung', 'Bank Account'), 'Bank Account'), badge: 0, color: '#b9791a' },
    { href: '/account',            icon: 'person',      label: t(t('Profil', 'Profile'),        'Profile'),       badge: 0, color: '#b9791a' },
  ]
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => { setHydrated(true) }, [])

  useEffect(() => {
    if (!hydrated || isLoading) return
    if (!user) { router.push('/auth/login'); return }
    if (user.role !== 'merchant' && user.role !== 'admin') router.push('/')
  }, [hydrated, isLoading, user, router])

  if (!hydrated || isLoading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#fdf8f8'}}>
      <div style={{width:32,height:32,border:'3px solid #c4c7c7',borderTopColor:'#1c1b1b',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
    </div>
  )
  if (!user) return null

  return (
    <div className="flex flex-col md:flex-row min-h-screen" style={{ background: '#fdf8f8' }}>
      <aside className="w-full md:w-64 flex-shrink-0 border-b md:border-b-0 md:border-r border-outline-variant flex flex-col bg-white">
        <div className="px-6 py-4 md:py-6 border-b border-outline-variant">
          <Link href="/" className="font-serif text-xl font-bold tracking-tighter text-primary block mb-1">My Dressa</Link>
          <p className="text-xs text-secondary uppercase tracking-widest">{t('Händler-Portal','Merchant Portal')}</p>
        </div>
        <nav className="flex-1 px-3 py-3 md:py-6 flex flex-row md:flex-col gap-1 overflow-x-auto">
          {NAV.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all whitespace-nowrap ${
                pathname === item.href
                  ? 'bg-surface-container text-primary font-semibold'
                  : 'text-secondary hover:text-primary hover:bg-surface-container-low'
              }`}>
              <Icon name={item.icon} style={{ fontSize: 20 }} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && (
                <span style={{ background:item.color, color:'#fff', fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:10, minWidth:18, textAlign:'center' }}>
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="hidden md:block px-6 py-5 border-t border-outline-variant">
          <p className="text-xs font-semibold mb-0.5">{user.firstName} {user.lastName}</p>
          <p className="text-xs text-secondary">{user.email}</p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">{children}</div>
      </main>
    </div>
  )
}
