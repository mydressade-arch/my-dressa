'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { productsApi } from '@/lib/api'
import { useLangStore } from '@/store/lang.store'
import { RentalCalendar } from '@/components/rental/RentalCalendar'
import { useAuthStore } from '@/store/auth.store'
import { Suspense } from 'react'

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='800' viewBox='0 0 600 800'%3E%3Crect fill='%23f1edec' width='600' height='800'/%3E%3Ctext fill='%23c4c7c7' font-family='sans-serif' font-size='18' text-anchor='middle' x='300' y='400'%3EMy Dressa%3C/text%3E%3C/svg%3E"

function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { t } = useLangStore()
  const { user } = useAuthStore()
  const [merchantProfile, setMerchantProfile] = useState<any>(null)
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeImg, setActiveImg] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<any>(null)
  const [showCalendar, setShowCalendar] = useState(false)

  useEffect(() => {
    productsApi.detail(id)
      .then(({ data }) => { setProduct(data); setSelectedVariant(data.variants?.[0]) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (user?.role === 'merchant') {
      import('@/lib/api').then(({ api }) => {
        api.get('/users/merchant-profile')
          .then(({ data }: any) => setMerchantProfile(data))
          .catch(() => {})
      })
    }
  }, [user])

  // Prüfen ob dieses Produkt dem eingeloggten Händler gehört
  const isOwnProduct = merchantProfile && product &&
    product.merchantId === merchantProfile.id

  if (loading) return (
    <div style={{ maxWidth: 1440, margin: '0 auto', padding: '48px 64px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64 }}>
        <div style={{ background: '#f1edec', aspectRatio: '3/4', animation: 'pulse 1.5s infinite' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[40, 60, 100, 60].map((h, i) => <div key={i} style={{ height: h, background: '#f1edec', borderRadius: 4 }} />)}
        </div>
      </div>
    </div>
  )
  if (!product) return <div style={{ padding: 80, textAlign: 'center', color: '#5e5e5b' }}>Produkt nicht gefunden</div>

  const images = product.images?.length > 0 ? product.images : [{ url: PLACEHOLDER }]
  const sizes  = [...new Set((product.variants || []).map((v: any) => v.size))]
  const colors = [...new Set((product.variants || []).map((v: any) => v.color))]

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto', padding: '48px 64px' }}>
      {/* Breadcrumb */}
      <nav style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#5e5e5b', marginBottom: 40, display: 'flex', gap: 8 }}>
        <a href="/" style={{ color: '#5e5e5b', textDecoration: 'none' }}>Home</a>
        <span>›</span>
        <a href="/products" style={{ color: '#5e5e5b', textDecoration: 'none' }}>Collection</a>
        <span>›</span>
        <span style={{ color: '#1c1b1b' }}>{product.title}</span>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64 }}>
        {/* Left: Images */}
        <div>
          <div style={{ position: 'relative', paddingBottom: '125%', overflow: 'hidden', background: '#f1edec', marginBottom: 12 }}>
            <img
              src={images[activeImg]?.url || PLACEHOLDER}
              alt={product.title}
              onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER }}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          {images.length > 1 && (
            <div style={{ display: 'flex', gap: 8 }}>
              {images.map((img: any, i: number) => (
                <button key={i} onClick={() => setActiveImg(i)} style={{
                  width: 72, height: 90, overflow: 'hidden', border: `2px solid ${activeImg === i ? '#1c1b1b' : 'transparent'}`,
                  padding: 0, cursor: 'pointer', background: 'none',
                }}>
                  <img src={img.url} alt="" onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Details */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <a href={`/products?merchant=${product.merchantId}`}
              style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#9E896A', textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
              <span className="material-symbols-outlined" style={{ fontSize:14 }}>storefront</span>
              {product.merchant?.shopName || 'My Dressa'}
            </a>
            {isOwnProduct && (
              <a href={`/merchant/products/edit/${product.id}`}
                style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', padding:'4px 12px', background:'#1c1b1b', color:'#fff', textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
                <span className="material-symbols-outlined" style={{ fontSize:14 }}>edit</span>
                Edit
              </a>
            )}
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700, lineHeight: 1.15, color: '#1c1b1b', marginBottom: 16 }}>
            {product.title}
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: '#5e5e5b', marginBottom: 28 }}>
            {product.description}
          </p>

          {/* Size selector */}
          {sizes.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#5e5e5b', marginBottom: 10 }}>Size</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(sizes as string[]).map(size => (
                  <button key={size} onClick={() => { const v = product.variants.find((v:any)=>v.size===size); if(v) setSelectedVariant(v) }}
                    style={{
                      width: 44, height: 44, border: `2px solid ${selectedVariant?.size === size ? '#1c1b1b' : '#c4c7c7'}`,
                      background: selectedVariant?.size === size ? '#1c1b1b' : 'transparent',
                      color: selectedVariant?.size === size ? '#fff' : '#1c1b1b',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}>
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rent box */}
          {product.isForRent && (
            <div style={{ border: '1px solid #c4c7c7', padding: 20, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#5e5e5b' }}>Rental Experience</p>
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', background: '#064E3B', color: '#fff', padding: '3px 8px' }}>Available Now</span>
              </div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
                €{product.rentalPrice} <span style={{ fontSize: 16, fontWeight: 400, color: '#5e5e5b' }}>/ day</span>
              </p>
              <p style={{ fontSize: 12, color: '#5e5e5b', marginBottom: 16 }}>Max 7 Tage. Kaution: €{Number(product.depositAmount) || 50}.</p>

              {showCalendar && selectedVariant ? (
                <RentalCalendar
                  productVariantId={selectedVariant.id}
                  rentalPricePerDay={product.rentalPrice}
                  shippingCost={Number(product.shippingCost || 0)}
                  depositAmount={product.depositAmount != null ? Number(product.depositAmount) : 50}
                  stockQuantity={selectedVariant?.stockQuantity}
                  onConfirm={(start, end) => {
                    if (!user) { router.push('/auth/login'); return }
                    router.push(`/checkout/rental?variantId=${selectedVariant.id}&productId=${id}&start=${start}&end=${end}`)
                  }}
                />
              ) : (
                <button onClick={() => { if(!user){router.push('/auth/login');return}; setShowCalendar(true) }}
                  style={{ width: '100%', background: '#9E896A', color: '#fff', border: 'none', padding: '14px', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }}>
                  Reserve for Rental
                </button>
              )}
            </div>
          )}

          {/* Buy box — nur wenn stock > 0 */}
          {product.isForSale && product.variants?.some((v: any) => v.stockQuantity > 0) && (
            <div style={{ border: '1px solid #c4c7c7', padding: 20, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#5e5e5b' }}>Ownership</p>
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', background: '#E5E1D8', color: '#1c1b1b', padding: '3px 8px' }}>Investment Piece</span>
              </div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, marginBottom: 4 }}>€{product.salePrice}</p>
              <p style={{ fontSize: 12, color: '#5e5e5b', marginBottom: 16 }}>Secure this for your permanent collection.</p>
              {/* Stock Warning — nur wenn unter 3 */}
              {selectedVariant && selectedVariant.stockQuantity > 0 && selectedVariant.stockQuantity < 3 && (
                <div style={{ background:'#FAEEDA', border:'1px solid #f8dfbb', padding:'8px 12px', marginBottom:12, display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#633806' }}>
                  <span className="material-symbols-outlined" style={{ fontSize:16 }}>warning</span>
                  Nur noch <strong>{selectedVariant.stockQuantity}</strong> {selectedVariant.stockQuantity === 1 ? 'Stück' : 'Stücke'} verfügbar
                </div>
              )}
              <button
                onClick={() => { if(!user){router.push('/auth/login');return}; router.push(`/checkout/purchase?variantId=${selectedVariant?.id}`) }}
                style={{ width: '100%', background: '#1c1b1b', color: '#fff', border: 'none', padding: '14px', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }}>
                Buy Now
              </button>
            </div>
          )}

          {/* Trust badges */}
          {[['local_shipping','Complimentary Concierge Shipping'],['assignment_return','Hassle-free Returns within 14 Days']].map(([icon,label])=>(
            <div key={icon} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1edec' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#5e5e5b' }}>{icon}</span>
              <span style={{ fontSize: 13, color: '#5e5e5b' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ProductDetailPage() {
  return <Suspense fallback={<div style={{ padding: 80, textAlign: 'center' }}>Loading...</div>}><ProductDetail /></Suspense>
}
