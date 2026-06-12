'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { useLangStore } from '@/store/lang.store'
import Link from 'next/link'
import { LangSwitcher } from '@/lib/lang'

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  const { user, loadUser } = useAuthStore()
  const { t } = useLangStore()
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    loadUser().catch(() => {})
  }, [])

  useEffect(() => {
    if (mounted && user && user.role !== 'support' && user.role !== 'admin') {
      router.replace('/')
    }
    if (mounted && !user) {
      router.replace('/auth/login')
    }
  }, [user, mounted])

  if (!mounted || !user) return null

  const NAV = [
    { href: '/support',           icon: 'dashboard',  label: t('Dashboard', 'Dashboard') },
    { href: '/support/orders',    icon: 'package_2',  label: t('Bestellungen', 'Orders') },
    { href: '/support/customers', icon: 'group',      label: t('Kunden', 'Customers') },
    { href: '/support/damage',    icon: 'report',     label: t('Schadensmeldungen', 'Damage Reports') },
  ]

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#fdf8f8' }}>
      {/* Sidebar */}
      <div className="support-sidebar" style={{ width:220, background:'#1c1b1b', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'24px 20px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:700, color:'#fdf8f8', margin:0 }}>My Dressa</p>
          <p style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#9E896A', margin:'4px 0 0' }}>
            Support
          </p>
        </div>
        <nav style={{ flex:1, padding:'16px 0' }}>
          {NAV.map(item => (
            <Link key={item.href} href={item.href}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 20px', textDecoration:'none', color: pathname===item.href ? '#fdf8f8' : 'rgba(253,248,248,0.5)', background: pathname===item.href ? 'rgba(255,255,255,0.08)' : 'transparent', fontSize:13, fontWeight: pathname===item.href ? 600 : 400 }}>
              <span className="material-symbols-outlined" style={{ fontSize:18 }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ padding:'16px 20px', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ fontSize:12, color:'rgba(253,248,248,0.5)', margin:'0 0 4px' }}>{user.firstName} {user.lastName}</p>
          <LangSwitcher />
        </div>
      </div>
      {/* Content */}
      <div style={{ flex:1, padding:32, overflow:'auto' }}>
        {children}
      </div>
    </div>
  )
}
