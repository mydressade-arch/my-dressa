'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { LangSwitcher } from '@/lib/lang'
import { useLangStore } from '@/store/lang.store'

export function Navbar() {
  const [mounted, setMounted] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [wishlistCount, setWishlistCount] = useState(0)
  const [q, setQ] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { t } = useLangStore()
  const { user, logout } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const profileRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!user) { setWishlistCount(0); return }
    import('@/lib/api').then(({ wishlistApi }) => {
      wishlistApi.getWishlist()
        .then(({ data }: any) => setWishlistCount(data?.length || 0))
        .catch(() => {})
    })
  }, [user])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 50)
  }, [searchOpen])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (q.trim()) {
      router.push(`/products?search=${encodeURIComponent(q.trim())}`)
      setSearchOpen(false)
      setQ('')
    }
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '?')

  return (
    <>
      {/* Top announcement bar — only after hydration */}
      {mounted && (
        <div style={{ background:'#1c1b1b', color:'#f4f0ef', textAlign:'center', padding:'8px 0', fontSize:11, fontWeight:500, letterSpacing:'0.12em', textTransform:'uppercase' }}>
          Free shipping on orders over €80 · Secure rentals with €50 deposit
        </div>
      )}

      <nav style={{ background:'#fdf8f8', borderBottom:'1px solid #e8e3e1', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ maxWidth:1440, margin:'0 auto', padding:'0 48px' }}>

          {/* Main bar */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', height:64 }}>

            {/* Hamburger (nur Mobile) */}
            <button className="navbar-hamburger" onClick={() => setMobileMenuOpen(o => !o)}
              style={{ display:'none', background:'none', border:'none', cursor:'pointer', padding:8, marginRight:4 }}>
              <span className="material-symbols-outlined" style={{ fontSize:24, color:'#1c1b1b' }}>
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>

            {/* Logo */}
            <Link href="/" style={{ fontFamily:"'Playfair Display', serif", fontSize:24, fontWeight:700, letterSpacing:'-0.03em', color:'#1c1b1b', textDecoration:'none', flexShrink:0 }}>
              My Dressa
            </Link>

            {/* Center Nav */}
            <div className="navbar-center" style={{ display:'flex', alignItems:'center', gap:2 }}>
              {[
                { label: mounted ? t('Neu', 'New In') : 'New In',       href:'/products',                    },
                { label: mounted ? t('Mieten', 'Rent') : 'Rent',         href:'/products?forRent=true',       accent:'#9E896A' },
                { label: mounted ? t('Kaufen', 'Buy') : 'Buy',           href:'/products?forSale=true',       },
                { label: mounted ? t('Vintage', 'Vintage') : 'Vintage',  href:'/products?category=Vintage',   },
              ].map(item => {
                const active = pathname + (typeof window !== 'undefined' ? window.location.search : '') === item.href
                  || (item.href !== '/products' && pathname === '/products' && typeof window !== 'undefined' && window.location.href.includes(item.href.split('?')[1] || '___'))
                return (
                  <Link key={item.label} href={item.href}
                    style={{
                      fontSize:13, fontWeight:500, textDecoration:'none', padding:'6px 14px',
                      color: item.accent || '#1c1b1b',
                      borderRadius:2,
                      background: item.label === 'Rent' ? 'rgba(158,137,106,0.08)' : 'transparent',
                      transition:'all 0.15s',
                      letterSpacing:'0.01em',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = item.label === 'Rent' ? 'rgba(158,137,106,0.15)' : 'rgba(28,27,27,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = item.label === 'Rent' ? 'rgba(158,137,106,0.08)' : 'transparent')}
                  >
                    {item.label === 'Rent' && <span style={{ marginRight:5 }}>◈</span>}
                    {item.label}
                  </Link>
                )
              })}
            </div>

            {/* Right icons */}
            <div style={{ display:'flex', alignItems:'center', gap:2 }}>

              {/* Search */}
              {searchOpen ? (
                <form onSubmit={handleSearch} className="navbar-search" style={{ display:'flex', alignItems:'center', border:'1px solid #c4c7c7', background:'#fff', borderRadius:2, overflow:'hidden' }}>
                  <input ref={searchRef} value={q} onChange={e => setQ(e.target.value)}
                    placeholder="Search pieces..."
                    style={{ padding:'7px 14px', fontSize:13, background:'transparent', border:'none', outline:'none', width:220 }} />
                  <button type="submit" style={{ padding:'7px 12px', background:'#1c1b1b', color:'#fff', border:'none', cursor:'pointer', display:'flex', alignItems:'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize:16 }}>search</span>
                  </button>
                  <button type="button" onClick={() => { setSearchOpen(false); setQ('') }}
                    style={{ padding:'7px 10px', background:'none', border:'none', cursor:'pointer', color:'#5e5e5b', display:'flex', alignItems:'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize:16 }}>close</span>
                  </button>
                </form>
              ) : (
                <IconBtn onClick={() => setSearchOpen(true)} icon="search" />
              )}

              <div style={{ position:'relative' }}>
                <IconBtn href="/wishlist" icon="favorite_border" />
                {wishlistCount > 0 && (
                  <div style={{ position:'absolute', top:4, right:4, width:14, height:14, borderRadius:'50%', background:'#9E896A', display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                    <span style={{ fontSize:9, fontWeight:700, color:'#fff', lineHeight:1 }}>{wishlistCount > 9 ? '9+' : wishlistCount}</span>
                  </div>
                )}
              </div>

              <IconBtn href={user ? '/account' : '/auth/login'} icon="shopping_bag" />
              <LangSwitcher />

              {/* Profile dropdown */}
              {user ? (
                <div ref={profileRef} style={{ position:'relative' }}>
                  <button onClick={() => setProfileOpen(p => !p)}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 10px', background: profileOpen ? 'rgba(28,27,27,0.06)' : 'none', border:'none', cursor:'pointer', borderRadius:2 }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:'#1c1b1b', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <span style={{ fontSize:12, fontWeight:700, color:'#fdf8f8', textTransform:'uppercase' }}>
                        {user.firstName[0]}{user.lastName[0]}
                      </span>
                    </div>
                    <span style={{ fontSize:12, fontWeight:600, color:'#1c1b1b', maxWidth:80, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {user.firstName}
                    </span>
                    <span className="material-symbols-outlined" style={{ fontSize:16, color:'#5e5e5b', transition:'transform 0.2s', transform: profileOpen ? 'rotate(180deg)' : 'none' }}>
                      expand_more
                    </span>
                  </button>

                  {profileOpen && (
                    <div style={{
                      position:'absolute', right:0, top:'calc(100% + 8px)', background:'#fff',
                      border:'1px solid #e8e3e1', boxShadow:'0 8px 24px rgba(0,0,0,0.10)',
                      minWidth:200, zIndex:200,
                    }}>
                      {/* User info header */}
                      <div style={{ padding:'14px 16px', borderBottom:'1px solid #f1edec' }}>
                        <p style={{ fontSize:13, fontWeight:600, color:'#1c1b1b', marginBottom:2 }}>{user.firstName} {user.lastName}</p>
                        <p style={{ fontSize:11, color:'#9e9e9b', overflow:'hidden', textOverflow:'ellipsis' }}>{user.email}</p>
                      </div>

                      {/* Menu items */}
                      {[
                        { icon:'person', label: t(t('Mein Konto', 'My Account'), 'My Account'), href:'/account?tab=2' },
                        { icon:'package_2', label: t('Meine Bestellungen', 'My Orders'), href:'/account?tab=0' },
                        { icon:'calendar_month', label: t('Meine Mieten', 'My Rentals'), href:'/account?tab=1' },
                        ...(user.role === 'merchant' || user.role === 'admin' ? [
                          { icon:'storefront', label:'Merchant Dashboard', href:'/merchant/dashboard', divider:true },
                        ] : []),
                        ...(user.role === 'support' ? [
                          { icon:'support_agent', label:t('Support Portal', 'Support Portal'), href:'/support' },
                        ] : []),
                        ...(user.role === 'admin' ? [
                          { icon:'admin_panel_settings', label:t('Admin Panel', 'Admin Panel'), href:'/admin' },
                        ] : []),
                      ].map((item: any) => (
                        <div key={item.label}>
                          {item.divider && <div style={{ height:1, background:'#f1edec', margin:'4px 0' }} />}
                          <Link href={item.href} onClick={() => setProfileOpen(false)}
                            style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', textDecoration:'none', color:'#1c1b1b', fontSize:13 }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#fdf8f8')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize:18, color:'#9E896A' }}>{item.icon}</span>
                            {item.label}
                          </Link>
                        </div>
                      ))}

                      <div style={{ height:1, background:'#f1edec', margin:'4px 0' }} />
                      <button
                        onClick={() => { logout(); router.push('/'); setProfileOpen(false) }}
                        style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', width:'100%', background:'none', border:'none', cursor:'pointer', color:'#ba1a1a', fontSize:13, textAlign:'left' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#fff5f5')}
                        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize:18 }}>logout</span>
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/auth/login"
                  style={{ marginLeft:4, fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', padding:'7px 16px', background:'#1c1b1b', color:'#fff', textDecoration:'none', borderRadius:2 }}>
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="navbar-mobile-menu" style={{ display:'none', flexDirection:'column', borderTop:'1px solid #e8e3e1', background:'#fdf8f8', padding:'8px 0' }}>
            {[
              { label: mounted ? t('Neu', 'New In') : 'New In', href:'/products' },
              { label: mounted ? t('Mieten', 'Rent') : 'Rent', href:'/products?forRent=true' },
              { label: mounted ? t('Kaufen', 'Buy') : 'Buy', href:'/products?forSale=true' },
              { label: mounted ? t('Vintage', 'Vintage') : 'Vintage', href:'/products?category=Vintage' },
            ].map(item => (
              <Link key={item.label} href={item.href} onClick={() => setMobileMenuOpen(false)}
                style={{ padding:'14px 24px', fontSize:15, fontWeight:500, color:'#1c1b1b', textDecoration:'none', borderBottom:'1px solid #f1edec' }}>
                {item.label}
              </Link>
            ))}
            {/* Mobile Suche */}
            <form onSubmit={(e) => { handleSearch(e); setMobileMenuOpen(false) }} style={{ display:'flex', padding:'12px 24px', gap:8 }}>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder={mounted ? t('Suchen...', 'Search...') : 'Suchen...'}
                style={{ flex:1, padding:'10px 14px', fontSize:14, border:'1px solid #c4c7c7', outline:'none' }} />
              <button type="submit" style={{ padding:'10px 16px', background:'#1c1b1b', color:'#fff', border:'none', cursor:'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize:18 }}>search</span>
              </button>
            </form>
          </div>
        )}
      </nav>
    </>
  )
}

function IconBtn({ icon, href, onClick }: { icon:string, href?:string, onClick?:()=>void }) {
  const style = { padding:8, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:2, textDecoration:'none', color:'#1c1b1b' as const }
  if (href) return (
    <Link href={href} style={style}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(28,27,27,0.06)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      <span className="material-symbols-outlined" style={{ fontSize:22 }}>{icon}</span>
    </Link>
  )
  return (
    <button onClick={onClick} style={style}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(28,27,27,0.06)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      <span className="material-symbols-outlined" style={{ fontSize:22 }}>{icon}</span>
    </button>
  )
}
