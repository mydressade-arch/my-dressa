'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { wishlistApi } from '@/lib/api'
import { useLangStore } from '@/store/lang.store'
import { ProductCard } from '@/components/product/ProductCard'

export default function WishlistPage() {
  const { user }  = useAuthStore()
  const router    = useRouter()
  const { t } = useLangStore()
  const [items, setItems]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return }
    wishlistApi.getWishlist()
      .then(({ data }: any) => setItems(data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  const handleRemove = async (productId: string) => {
    try {
      await wishlistApi.remove(productId)
      setItems(prev => prev.filter(i => i.id !== productId))
    } catch {}
  }

  return (
    <div style={{ maxWidth:1440, margin:'0 auto', padding:'40px 48px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:32 }}>
        <div>
          <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:32, fontWeight:700, marginBottom:4 }}>
            Wishlist
          </h1>
          <p style={{ color:'#5e5e5b', fontSize:14 }}>
            {loading ? '—' : `${items.length} saved piece${items.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {items.length > 0 && (
          <Link href="/products" style={{ fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'#5e5e5b', textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
            <span className="material-symbols-outlined" style={{ fontSize:16 }}>add</span>
            Browse more
          </Link>
        )}
      </div>

      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:24 }}>
          {[1,2,3,4].map(i => (
            <div key={i}>
              <div style={{ paddingBottom:'133%', background:'#f1edec', marginBottom:16, animation:'pulse 1.5s infinite' }} />
              <div style={{ height:10, background:'#f1edec', width:'40%', marginBottom:8 }} />
              <div style={{ height:14, background:'#f1edec', width:'70%' }} />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign:'center', padding:'80px 0', border:'1px solid #c4c7c7' }}>
          <span className="material-symbols-outlined" style={{ fontSize:48, color:'#c4c7c7', display:'block', marginBottom:16 }}>favorite</span>
          <h3 style={{ fontFamily:"'Playfair Display', serif", fontSize:20, marginBottom:8 }}>Your wishlist is empty</h3>
          <p style={{ color:'#5e5e5b', fontSize:14, marginBottom:24, lineHeight:1.6 }}>
            Save pieces you love by clicking the ♡ heart icon on any product.
          </p>
          <Link href="/products" style={{ background:'#1c1b1b', color:'#fff', padding:'12px 24px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', textDecoration:'none' }}>
            Browse Collection
          </Link>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:24 }}>
          {items.map((item: any) => (
            <div key={item.id} style={{ position:'relative' }}>
              {/* Remove button */}
              <button
                onClick={() => handleRemove(item.id)}
                title="Remove from wishlist"
                style={{ position:'absolute', top:-8, right:-8, zIndex:10, width:26, height:26, borderRadius:'50%', background:'#1c1b1b', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.15)' }}>
                <span className="material-symbols-outlined" style={{ fontSize:14, color:'#fff' }}>close</span>
              </button>
              <ProductCard
                id={item.id}
                title={item.title}
                merchantName={item.merchantName}
                rentalPrice={item.rentalPrice}
                salePrice={item.salePrice}
                imageUrl={item.imageUrl}
                isForRent={item.isForRent}
                isForSale={item.isForSale}
                initialSaved={true}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
