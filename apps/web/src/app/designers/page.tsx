'use client'
import Link from 'next/link'

const DESIGNERS = [
  { name:'Valentino',     cat:'Couture',       country:'Italy'    },
  { name:'Saint Laurent', cat:'Ready-to-Wear', country:'France'   },
  { name:'Zimmermann',    cat:'Resort',        country:'Australia'},
  { name:'Gucci',         cat:'Luxury',        country:'Italy'    },
  { name:'Maison de Luxe',cat:'Vintage',       country:'Germany'  },
  { name:"L'Archive",     cat:'Archive',       country:'France'   },
  { name:'Atelier Roma',  cat:'Bridal',        country:'Italy'    },
  { name:'The Vault',     cat:'Archive',       country:'UK'       },
]

export default function DesignersPage() {
  return (
    <div style={{ maxWidth:1440, margin:'0 auto', width:'100%', padding:'clamp(24px,3vw,48px) clamp(16px,4vw,64px)' }}>
      <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:36, fontWeight:700, marginBottom:6 }}>Designers</h1>
      <p style={{ color:'#5e5e5b', fontSize:14, marginBottom:40 }}>Discover pieces from the world's most coveted fashion houses.</p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:20, marginBottom:48 }}>
        {DESIGNERS.map(d=>(
          <Link key={d.name} href={`/products?search=${encodeURIComponent(d.name)}`}
            style={{ border:'1px solid #c4c7c7', padding:24, textDecoration:'none', background:'#fff', display:'block' }}>
            <p style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:600, color:'#1c1b1b', marginBottom:6 }}>{d.name}</p>
            <p style={{ fontSize:12, color:'#9E896A', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:2 }}>{d.cat}</p>
            <p style={{ fontSize:12, color:'#5e5e5b' }}>{d.country}</p>
          </Link>
        ))}
      </div>
      <div style={{ textAlign:'center', padding:'32px 0', borderTop:'1px solid #f1edec' }}>
        <p style={{ color:'#5e5e5b', fontSize:14, marginBottom:16 }}>Browse the full collection.</p>
        <Link href="/products" style={{ background:'#1c1b1b', color:'#fff', padding:'12px 24px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', textDecoration:'none' }}>
          Browse All Pieces
        </Link>
      </div>
    </div>
  )
}
