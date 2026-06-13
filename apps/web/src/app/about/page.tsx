import Link from 'next/link'

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <div style={{ background:'#1c1b1b', padding:'clamp(48px,6vw,96px) clamp(16px,4vw,64px)', textAlign:'center' }}>
        <p style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.15em', color:'#9E896A', marginBottom:16 }}>Our Story</p>
        <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:'clamp(31px,4vw,52px)', fontWeight:700, color:'#f4f0ef', lineHeight:1.1, maxWidth:700, margin:'0 auto 20px' }}>
          Redefining Fashion Ownership
        </h1>
        <p style={{ fontSize:16, color:'#9c9a92', lineHeight:1.7, maxWidth:560, margin:'0 auto', width:'100%' }}>
          My Dressa is Germany's premier luxury fashion rental and resale marketplace, connecting discerning customers with exceptional merchants.
        </p>
      </div>

      {/* Mission */}
      <div style={{ maxWidth:1440, margin:'0 auto', width:'100%', padding:'clamp(40px,5vw,80px) clamp(16px,4vw,64px)' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:64, alignItems:'center' }}>
          <div>
            <p style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#9E896A', marginBottom:16 }}>Our Mission</p>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:36, fontWeight:700, marginBottom:20, lineHeight:1.2 }}>Fashion for Every Moment</h2>
            <p style={{ fontSize:15, color:'#5e5e5b', lineHeight:1.8, marginBottom:20 }}>
              We believe that luxury fashion should be accessible, sustainable, and circular. Whether you need a stunning gown for a special occasion or want to permanently add a designer piece to your collection, My Dressa is your trusted partner.
            </p>
            <p style={{ fontSize:15, color:'#5e5e5b', lineHeight:1.8 }}>
              Founded with a commitment to sustainability, we help reduce fashion waste by enabling clothes to be worn and loved by multiple people throughout their lifetime.
            </p>
          </div>
          <div style={{ background:'#f1edec', padding:48, textAlign:'center' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:24 }}>
              {[['500+','Designer pieces'],['50+','Partner merchants'],['DSGVO','Compliant'],['100%','Authenticated']].map(([num,label])=>(
                <div key={label} style={{ padding:20, background:'#fff' }}>
                  <p style={{ fontFamily:"'Playfair Display', serif", fontSize:28, fontWeight:700, color:'#1c1b1b', marginBottom:4 }}>{num}</p>
                  <p style={{ fontSize:12, color:'#5e5e5b', fontWeight:500 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Values */}
      <div style={{ background:'#f7f3f2', padding:'clamp(32px,4vw,64px) clamp(16px,4vw,64px)' }}>
        <div style={{ maxWidth:1440, margin:'0 auto', width:'100%' }}>
          <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:32, fontWeight:700, textAlign:'center', marginBottom:48 }}>Our Values</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:32 }}>
            {[
              { icon:'eco', title:'Sustainability', desc:'Every rental extends a garment\'s life and reduces fashion waste. We\'re committed to a circular fashion economy.' },
              { icon:'verified', title:'Authenticity', desc:'Every item is verified by our expert team. We guarantee the authenticity of all designer pieces on our platform.' },
              { icon:'security', title:'Trust & Safety', desc:'DSGVO-compliant, secure payments via Stripe, and transparent policies. Your data and money are always protected.' },
            ].map(({icon,title,desc})=>(
              <div key={title} style={{ background:'#fff', padding:28 }}>
                <span className="material-symbols-outlined" style={{ fontSize:32, color:'#9E896A', display:'block', marginBottom:16 }}>{icon}</span>
                <h3 style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:600, marginBottom:12 }}>{title}</h3>
                <p style={{ fontSize:14, color:'#5e5e5b', lineHeight:1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding:'clamp(32px,4vw,64px) clamp(16px,4vw,64px)', textAlign:'center', maxWidth:1440, margin:'0 auto', width:'100%' }}>
        <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:32, fontWeight:700, marginBottom:12 }}>Join My Dressa</h2>
        <p style={{ color:'#5e5e5b', fontSize:15, marginBottom:32 }}>Discover luxury fashion or become a merchant partner.</p>
        <div style={{ display:'flex', gap:16, justifyContent:'center' }}>
          <Link href="/products" style={{ background:'#1c1b1b', color:'#fff', padding:'14px 28px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', textDecoration:'none' }}>Shop Collection</Link>
          <Link href="/merchant/onboarding" style={{ background:'transparent', color:'#1c1b1b', border:'1px solid #1c1b1b', padding:'14px 28px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', textDecoration:'none' }}>Become a Merchant</Link>
        </div>
      </div>
    </div>
  )
}
