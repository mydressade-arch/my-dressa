export default function SustainabilityPage() {
  return (
    <div>
      <div style={{ background:'#064E3B', padding:'clamp(40px,5vw,80px) clamp(16px,4vw,64px)', textAlign:'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize:'clamp(28px,4vw,48px)', color:'#9E896A', display:'block', marginBottom:16 }}>eco</span>
        <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:'clamp(28px,4vw,48px)', fontWeight:700, color:'#f4f0ef', marginBottom:16 }}>Sustainable Fashion</h1>
        <p style={{ fontSize:16, color:'rgba(244,240,239,0.75)', maxWidth:540, margin:'0 auto', width:'100%' }}>Every rental is a step toward a more sustainable fashion industry.</p>
      </div>
      <div style={{ maxWidth:1440, margin:'0 auto', width:'100%', padding:'clamp(32px,4vw,64px) clamp(16px,4vw,64px)' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:32, marginBottom:64 }}>
          {[['70%','Less CO₂ vs buying new'],['3x','Longer garment lifespan'],['0','Single-use fashion'],].map(([n,l])=>(
            <div key={l} style={{ textAlign:'center', padding:32, background:'#f7f3f2' }}>
              <p style={{ fontFamily:"'Playfair Display', serif", fontSize:'clamp(24px,3vw,40px)', fontWeight:700, color:'#064E3B', marginBottom:8 }}>{n}</p>
              <p style={{ fontSize:14, color:'#5e5e5b', fontWeight:500 }}>{l}</p>
            </div>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:48, alignItems:'center' }}>
          <div>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:32, fontWeight:700, marginBottom:20 }}>Our Commitment</h2>
            {['We extend the life of luxury garments by enabling multiple wearers.',
              'Professional cleaning between rentals reduces per-wear water usage.',
              'Circular fashion model reduces demand for new production.',
              'Partner with eco-conscious merchants committed to sustainability.'].map(t=>(
              <div key={t} style={{ display:'flex', gap:12, marginBottom:14, alignItems:'flex-start' }}>
                <span className="material-symbols-outlined" style={{ fontSize:18, color:'#064E3B', flexShrink:0, marginTop:2 }}>check_circle</span>
                <p style={{ fontSize:15, color:'#5e5e5b', lineHeight:1.6 }}>{t}</p>
              </div>
            ))}
          </div>
          <div style={{ background:'#f1edec', padding:40 }}>
            <h3 style={{ fontFamily:"'Playfair Display', serif", fontSize:22, fontWeight:600, marginBottom:16 }}>Fashion Industry Facts</h3>
            {[['10%','of global CO₂ emissions'],['20%','of global water pollution'],['85%','of textiles go to landfill'],].map(([n,l])=>(
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid #e5e2e1' }}>
                <span style={{ fontSize:14, color:'#5e5e5b' }}>{l}</span>
                <span style={{ fontSize:16, fontWeight:700, color:'#ba1a1a' }}>{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
