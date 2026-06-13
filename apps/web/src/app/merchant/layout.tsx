'use client'
import { useEffect, useState } from 'react'
import { useLangStore } from '@/store/lang.store'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore()
  const { t } = useLangStore()
  const router = useRouter()
  const pathname = usePathname()

  const NAV = [
    { href: '/merchant/dashboard', icon: 'dashboard',   label: t(t('Dashboard', 'Dashboard'),     'Dashboard')      },
    { href: '/merchant/products',  icon: 'checkroom',   label: t(t('Produkte', 'Products'),      'Products')       },
    { href: '/merchant/orders',    icon: 'package_2',   label: t(t('Bestellungen', 'Orders'),  'Orders')         },
    { href: '/merchant/earnings',  icon: 'payments',    label: t(t('Einnahmen', 'Earnings'),     'Earnings')       },
    { href: '/merchant/bank',      icon: 'account_balance', label: t(t('Bankverbindung', 'Bank Account'), 'Bank Account') },
    { href: '/account',            icon: 'person',      label: t(t('Profil', 'Profile'),        'Profile')        },
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
          <p className="text-xs text-secondary uppercase tracking-widest">Merchant Portal</p>
        </div>
        <nav className="flex-1 px-3 py-3 md:py-6 flex flex-row md:flex-col gap-1 overflow-x-auto">
          {NAV.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all whitespace-nowrap ${
                pathname === item.href
                  ? 'bg-surface-container text-primary font-semibold'
                  : 'text-secondary hover:text-primary hover:bg-surface-container-low'
              }`}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{item.icon}</span>
              {item.label}
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
