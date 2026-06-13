'use client'
import { useLangStore } from '@/store/lang.store'
import Link from 'next/link'
import { ProductCard } from '@/components/product/ProductCard'
import { useState, useEffect } from 'react'
import { productsApi } from '@/lib/api'

const HERO_IMG    = 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1600&q=80'
const DRESS_IMG   = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&q=80'
const SUIT_IMG    = 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80'
const ACCESS_IMG  = 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80'
const VINTAGE_IMG = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80'

const DEMO_PRODUCTS = [
  { id: 'demo-1', title: 'Silk Evening Gown', merchantName: 'Villa Rossi', rentalPrice: 89, salePrice: 1290, imageUrl: 'https://images.unsplash.com/photo-1566479179817-0b0c4036e8c8?w=600&q=80', isForRent: true, isForSale: true, isAvailable: true },
  { id: 'demo-2', title: 'Asymmetric Mini Dress', merchantName: 'Maison Bleu', rentalPrice: 65, salePrice: 890, imageUrl: 'https://images.unsplash.com/photo-1496217590455-aa63a8550c23?w=600&q=80', isForRent: true, isForSale: false, isAvailable: true },
  { id: 'demo-3', title: 'Botanical Floral Midi', merchantName: 'Studio Verde', rentalPrice: 55, salePrice: 750, imageUrl: 'https://images.unsplash.com/photo-1612336307429-8a898d10e223?w=600&q=80', isForRent: true, isForSale: true, isAvailable: true },
  { id: 'demo-4', title: 'Structured Blazer Dress', merchantName: 'Le Noir', rentalPrice: 75, salePrice: 1100, imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&q=80', isForRent: false, isForSale: true, isAvailable: true },
]

const hoverStyle = `
  .collection-img { transition: transform 0.6s ease; }
  .collection-img:hover { transform: scale(1.04); }
`

export default function HomePage() {
  const { t } = useLangStore()
  const [featuredProducts, setFeaturedProducts] = useState<any[]>(DEMO_PRODUCTS)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    productsApi.list({ limit: 4, status: 'active' })
      .then(({ data }: any) => {
        const items = data?.items || data || []
        if (items.length > 0) setFeaturedProducts(items.map((p: any) => ({
          id: p.id,
          title: p.title,
          merchantName: p.merchant?.shopName || 'My Dressa',
          rentalPrice: p.rentalPrice,
          salePrice: p.salePrice,
          imageUrl: p.images?.[0]?.url,
          isForRent: p.isForRent,
          isForSale: p.isForSale,
          isAvailable: p.status === 'active',
        })))
      })
      .catch(() => {})
  }, [])

  return (
    <>
      <style>{hoverStyle}</style>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section style={{ position:'relative', height:'92vh', minHeight:600, overflow:'hidden' }}>
        <img src={HERO_IMG} alt="Hero" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.55) 100%)' }} />
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'0 24px' }}>
          <p style={{ fontSize:11, fontWeight:600, letterSpacing:'0.18em', textTransform:'uppercase', color:'#d4b896', marginBottom:20 }}>
            {mounted ? t('Neue Kollektion 2026', 'New Collection 2026') : 'Neue Kollektion 2026'}
          </p>
          <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:'clamp(36px,6vw,80px)', fontWeight:700, color:'#fdf8f8', lineHeight:1.1, marginBottom:24, maxWidth:760 }}>
            {mounted ? t('Luxus Mode. Gemietet oder Gekauft.', 'Luxury Fashion. Rented or Owned.') : 'Luxus Mode. Gemietet oder Gekauft.'}
          </h1>
          <p style={{ fontSize:16, color:'rgba(253,248,248,0.75)', marginBottom:40, maxWidth:500, lineHeight:1.7 }}>
            {mounted ? t('Entdecke kuratierte Designer-Mode für jeden Anlass.', 'Discover curated designer fashion for every occasion.') : 'Entdecke kuratierte Designer-Mode für jeden Anlass.'}
          </p>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center' }}>
            <Link href="/products" style={{ padding:'14px 36px', background:'#fdf8f8', color:'#1c1b1b', textDecoration:'none', fontSize:12, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase' }}>
              {mounted ? t('Jetzt entdecken', 'Shop Now') : 'Jetzt entdecken'}
            </Link>
            <Link href="/products?type=rental" style={{ padding:'14px 36px', background:'transparent', color:'#fdf8f8', textDecoration:'none', fontSize:12, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', border:'1px solid rgba(253,248,248,0.5)' }}>
              {mounted ? t('Mode mieten', 'Rent Now') : 'Mode mieten'}
            </Link>
          </div>
        </div>
      </section>

      {/* ── USP Bar ────────────────────────────────────────────────────────── */}
      <section style={{ background:'#1c1b1b', padding:'clamp(16px,1vw,20px) clamp(16px,4vw,40px)' }}>
        <div className="responsive-grid-3" style={{ maxWidth:1000, margin:'0 auto', width:'100%', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:24 }}>
          {[
            { icon:'verified', text: mounted ? t('Verifizierte Händler', 'Verified Sellers') : 'Verifizierte Händler' },
            { icon:'local_shipping', text: mounted ? t('Kostenloser Versand ab €100', 'Free shipping over €100') : 'Kostenloser Versand ab €100' },
            { icon:'lock', text: mounted ? t('Sichere Zahlung', 'Secure Payment') : 'Sichere Zahlung' },
          ].map(item => (
            <div key={item.icon} style={{ display:'flex', alignItems:'center', gap:10, justifyContent:'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize:18, color:'#9E896A' }}>{item.icon}</span>
              <span style={{ fontSize:12, color:'rgba(253,248,248,0.7)', fontWeight:500, letterSpacing:'0.05em' }}>{item.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured Products ──────────────────────────────────────────────── */}
      <section style={{ padding:'clamp(40px,6vw,80px) clamp(16px,4vw,40px)', maxWidth:1200, margin:'0 auto', width:'100%' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <p style={{ fontSize:11, fontWeight:600, letterSpacing:'0.15em', textTransform:'uppercase', color:'#9E896A', marginBottom:12 }}>
            {mounted ? t('Ausgewählte Stücke', 'Featured Pieces') : 'Ausgewählte Stücke'}
          </p>
          <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:'clamp(28px,4vw,44px)', fontWeight:700, color:'#1c1b1b' }}>
            {mounted ? t('Neue Ankünfte', 'New Arrivals') : 'Neue Ankünfte'}
          </h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:24 }}>
          {featuredProducts.map(p => <ProductCard key={p.id} {...p} />)}
        </div>
        <div style={{ textAlign:'center', marginTop:48 }}>
          <Link href="/products" style={{ padding:'clamp(14px,2vw,16px) clamp(16px,4vw,40px)', background:'#1c1b1b', color:'#fdf8f8', textDecoration:'none', fontSize:12, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase' }}>
            {mounted ? t('Alle Produkte', 'View All') : 'Alle Produkte'}
          </Link>
        </div>
      </section>

      {/* ── Collections ───────────────────────────────────────────────────── */}
      <section style={{ padding:'0 clamp(16px,4vw,40px) clamp(40px,6vw,80px)', maxWidth:1200, margin:'0 auto', width:'100%' }}>
        <div className="responsive-grid-2" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16, marginBottom:16 }}>
          <div style={{ position:'relative', overflow:'hidden', height:480 }}>
            <img src={DRESS_IMG} alt="Abendmode" className="collection-img" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
            <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:28, background:'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}>
              <p style={{ color:'rgba(253,248,248,0.7)', fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:6 }}>
                {mounted ? t('Kollektion', 'Collection') : 'Kollektion'}
              </p>
              <h3 style={{ fontFamily:"'Playfair Display', serif", fontSize:24, fontWeight:700, color:'#fdf8f8', marginBottom:12 }}>
                {mounted ? t('Abendmode', 'Evening Wear') : 'Abendmode'}
              </h3>
              <Link href="/products?category=Abendmode" style={{ fontSize:11, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'#d4b896', textDecoration:'none' }}>
                {mounted ? t('Entdecken →', 'Explore →') : 'Entdecken →'}
              </Link>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {[
              { img: SUIT_IMG, label: mounted ? t('Business', 'Business') : 'Business', href: '/products?category=Anzüge' },
              { img: ACCESS_IMG, label: mounted ? t('Accessoires', 'Accessories') : 'Accessoires', href: '/products?category=Accessoires' },
            ].map(c => (
              <div key={c.label} style={{ position:'relative', overflow:'hidden', flex:1 }}>
                <img src={c.img} alt={c.label} className="collection-img" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:20, background:'linear-gradient(to top, rgba(0,0,0,0.65), transparent)' }}>
                  <h3 style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:700, color:'#fdf8f8', marginBottom:8 }}>{c.label}</h3>
                  <Link href={c.href} style={{ fontSize:11, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'#d4b896', textDecoration:'none' }}>
                    {mounted ? t('Entdecken →', 'Explore →') : 'Entdecken →'}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section style={{ padding:'clamp(40px,5vw,80px) clamp(16px,4vw,40px)', background:'#fdf8f8' }}>
        <div style={{ maxWidth:900, margin:'0 auto', width:'100%', textAlign:'center' }}>
          <p style={{ fontSize:11, fontWeight:600, letterSpacing:'0.15em', textTransform:'uppercase', color:'#9E896A', marginBottom:12 }}>
            {mounted ? t('So funktioniert es', 'How it works') : 'So funktioniert es'}
          </p>
          <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:'clamp(24px,3vw,36px)', fontWeight:700, color:'#1c1b1b', marginBottom:48 }}>
            {mounted ? t('Mode mieten in 3 Schritten', 'Rent fashion in 3 steps') : 'Mode mieten in 3 Schritten'}
          </h2>
          <div className="responsive-grid-3" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:40 }}>
            {[
              { icon:'search', num:'01', title: mounted ? t('Entdecken', 'Discover') : 'Entdecken', desc: mounted ? t('Durchstöbere hunderte kuratierter Designer-Stücke', 'Browse hundreds of curated designer pieces') : 'Durchstöbere hunderte kuratierter Designer-Stücke' },
              { icon:'calendar_month', num:'02', title: mounted ? t('Buchen', 'Book') : 'Buchen', desc: mounted ? t('Wähle deine Mietdauer und sichere dir das Kleid', 'Choose your rental period and secure the dress') : 'Wähle deine Mietdauer und sichere dir das Kleid' },
              { icon:'local_shipping', num:'03', title: mounted ? t('Genießen', 'Enjoy') : 'Genießen', desc: mounted ? t('Erhalte es geliefert, trage es, sende es zurück', 'Receive it delivered, wear it, send it back') : 'Erhalte es geliefert, trage es, sende es zurück' },
            ].map(s => (
              <div key={s.num} style={{ textAlign:'center' }}>
                <div style={{ width:64, height:64, borderRadius:'50%', background:'#EAF3DE', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize:28, color:'#27500A' }}>{s.icon}</span>
                </div>
                <p style={{ fontSize:11, fontWeight:600, color:'#9E896A', letterSpacing:'0.1em', marginBottom:8 }}>{s.num}</p>
                <h3 style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:700, color:'#1c1b1b', marginBottom:8 }}>{s.title}</h3>
                <p style={{ fontSize:14, color:'#5e5e5b', lineHeight:1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Vintage Banner ─────────────────────────────────────────────────── */}
      <section style={{ position:'relative', height:400, overflow:'hidden' }}>
        <img src={VINTAGE_IMG} alt="Vintage" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
        <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', padding:40 }}>
          <div>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:'clamp(28px,4vw,48px)', fontWeight:700, color:'#fdf8f8', marginBottom:16 }}>
              {mounted ? t('Vintage & Unikate', 'Vintage & One-of-a-kind') : 'Vintage & Unikate'}
            </h2>
            <p style={{ color:'rgba(253,248,248,0.75)', fontSize:15, marginBottom:28 }}>
              {mounted ? t('Einzigartige Stücke für unvergessliche Momente', 'Unique pieces for unforgettable moments') : 'Einzigartige Stücke für unvergessliche Momente'}
            </p>
            <Link href="/products?category=Vintage" style={{ padding:'12px 32px', background:'#9E896A', color:'#fff', textDecoration:'none', fontSize:12, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase' }}>
              {mounted ? t('Jetzt entdecken', 'Discover Now') : 'Jetzt entdecken'}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Newsletter ─────────────────────────────────────────────────────── */}
      <section style={{ padding:'clamp(40px,6vw,80px) clamp(16px,5vw,64px)', background:'#1c1b1b', textAlign:'center' }}>
        <div style={{ maxWidth:480, margin:'0 auto', width:'100%' }}>
          <p style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.12em', color:'#9E896A', marginBottom:12 }}>
            {mounted ? t('Exklusiver Zugang', 'Exclusive Access') : 'Exklusiver Zugang'}
          </p>
          <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:32, fontWeight:700, color:'#fdf8f8', marginBottom:12 }}>Join the Inner Circle</h2>
          <p style={{ color:'rgba(244,240,239,0.5)', fontSize:14, lineHeight:1.7, marginBottom:36 }}>
            {mounted ? t('Neue Kollektionen, private Sales und Fashion Insights direkt in dein Postfach.', 'New collections, private sales and fashion insights directly to your inbox.') : 'Neue Kollektionen, private Sales und Fashion Insights direkt in dein Postfach.'}
          </p>
          <div style={{ display:'flex', border:'1px solid rgba(244,240,239,0.15)' }}>
            <input type="email" placeholder="deine@email.de"
              suppressHydrationWarning
              style={{ flex:1, padding:'16px 20px', fontSize:14, background:'transparent', border:'none', outline:'none', color:'#fdf8f8', borderRight:'1px solid rgba(244,240,239,0.15)' }} />
            <button style={{ padding:'16px 24px', background:'#9E896A', color:'#fff', border:'none', cursor:'pointer', fontSize:12, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', flexShrink:0 }}>
              Subscribe
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
