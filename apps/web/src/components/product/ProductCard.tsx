'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { wishlistApi } from '@/lib/api'
import { useLangStore } from '@/store/lang.store'
import { useAuthStore } from '@/store/auth.store'

interface ProductCardProps {
  id: string
  title: string
  merchantName: string
  rentalPrice?: number
  salePrice?: number
  imageUrl?: string
  isAvailable?: boolean
  isForRent?: boolean
  isForSale?: boolean
  initialSaved?: boolean
}

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='533' viewBox='0 0 400 533'%3E%3Crect fill='%23f1edec' width='400' height='533'/%3E%3Ctext fill='%23c4c7c7' font-family='sans-serif' font-size='14' text-anchor='middle' x='200' y='270'%3EMy Dressa%3C/text%3E%3C/svg%3E"

export function ProductCard({
  id, title, merchantName, rentalPrice, salePrice,
  imageUrl, isAvailable = true, isForRent, isForSale,
  initialSaved = false,
}: ProductCardProps) {
  const { user }  = useAuthStore()
  const { t } = useLangStore()
  const [saved, setSaved]       = useState(initialSaved)
  const [toggling, setToggling] = useState(false)
  const [mounted, setMounted]   = useState(false)
  useEffect(() => setMounted(true), [])
  const imgSrc = imageUrl || PLACEHOLDER

  useEffect(() => {
    // Keine Wishlist-Abfrage für Demo-IDs
    if (!user || !id || id.startsWith('demo-')) return
    wishlistApi.isSaved(id)
      .then(({ data }: any) => setSaved(data.saved))
      .catch(() => {})
  }, [id, user])

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (!user) { window.location.href = '/auth/login'; return }
    setToggling(true)
    try {
      const { data } = await wishlistApi.toggle(id) as any
      setSaved(data.saved)
    } catch {}
    finally { setToggling(false) }
  }

  return (
    <article>
      {/* Image */}
      <Link href={`/products/${id}`} style={{ display:'block', textDecoration:'none' }}>
        <div style={{ position:'relative', paddingBottom:'133%', overflow:'hidden', background:'#f1edec', marginBottom:16 }}>
          <img src={imgSrc} alt={title}
            onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER }}
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.6s ease' }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          />

          {/* Available badge */}
          <div style={{ position:'absolute', top:10, left:10 }}>
            <span style={{ fontSize:11, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.08em', padding:'3px 8px', background: isAvailable ? '#064E3B' : '#e5e2e1', color: isAvailable ? '#fff' : '#444748' }}>
              {isAvailable ? 'Available' : 'Rented'}
            </span>
          </div>

          {/* Heart button */}
          <button
            onClick={handleToggle}
            disabled={toggling}
            style={{
              position:'absolute', top:10, right:10,
              width:34, height:34, borderRadius:'50%',
              background: saved ? '#1c1b1b' : 'rgba(255,255,255,0.92)',
              border: 'none', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 2px 8px rgba(0,0,0,0.12)',
              transition:'all 0.2s',
              opacity: toggling ? 0.6 : 1,
            }}>
            <span className="material-symbols-outlined" style={{ fontSize:17, color: saved ? '#fff' : '#1c1b1b', fontVariationSettings: saved ? "'FILL' 1" : "'FILL' 0" }}>
              favorite
            </span>
          </button>
        </div>
      </Link>

      {/* Text */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <Link href={`/products/${id}`} style={{ display:'block', textDecoration:'none', color:'inherit', flex:1 }}>
          <p style={{ fontSize:11, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.1em', color:'#5e5e5b', marginBottom:3 }}>
            {merchantName}
          </p>
          <h3 style={{ fontFamily:"'Playfair Display', serif", fontSize:15, fontWeight:600, color:'#1c1b1b', lineHeight:1.3, margin:0 }}>
            {title}
          </h3>
        </Link>
      </div>

      {/* CTAs */}
      <div style={{ display:'flex', gap:6 }}>
        {isForRent && rentalPrice && (
          <Link href={`/products/${id}`} style={{ flex:1, fontSize:11, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.05em', padding:'9px 0', textAlign:'center' as const, background:'#9E896A', color:'#fff', textDecoration:'none', display:'block' }}>
            {mounted ? t('Jetzt Mieten', 'Rent Now') : 'Jetzt Mieten'} €{rentalPrice}
          </Link>
        )}
        {isForSale && salePrice && (
          <Link href={`/products/${id}`} style={{ flex:1, fontSize:11, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.05em', padding:'9px 0', textAlign:'center' as const, border:'1px solid #1A1A1A', color:'#1A1A1A', background:'transparent', textDecoration:'none', display:'block' }}>
            {mounted ? t('Jetzt Kaufen', 'Buy Now') : 'Jetzt Kaufen'} €{salePrice}
          </Link>
        )}
      </div>
    </article>
  )
}
