'use client'
import { useEffect, useState, Suspense } from 'react'
import { useLangStore } from '@/store/lang.store'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function SuccessInner() {
  const params  = useSearchParams()
  const router  = useRouter()
  const orderId = params.get('orderId') || ''
  const { t } = useLangStore()
  const [countdown, setCountdown] = useState(8)

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(interval); router.push('/account?tab=0'); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [router])

  return (
    <div style={{ minHeight:'70vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'48px 24px' }}>
      <div style={{ textAlign:'center', maxWidth:480 }}>
        {/* Success Icon */}
        <div style={{ width:72, height:72, background:'#EAF3DE', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px' }}>
          <span className="material-symbols-outlined" style={{ fontSize:36, color:'#27500A' }}>check_circle</span>
        </div>

        <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:32, fontWeight:700, marginBottom:12, color:'#1c1b1b' }}>
          Payment Successful!
        </h1>

        <p style={{ fontSize:14, color:'#5e5e5b', lineHeight:1.7, marginBottom:8 }}>
          Your order has been confirmed. You will receive a confirmation email shortly.
        </p>

        {orderId && (
          <p style={{ fontSize:12, color:'#9e9e9b', marginBottom:32, fontFamily:'monospace' }}>
            Order #{orderId.slice(0, 8).toUpperCase()}
          </p>
        )}

        <div style={{ background:'#fdf8f8', border:'1px solid #e8e3e1', padding:20, marginBottom:32, textAlign:'left' }}>
          <p style={{ fontSize:13, color:'#1c1b1b', fontWeight:600, marginBottom:8 }}>What happens next?</p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[
              ['email', 'Confirmation email sent to your inbox'],
              ['local_shipping', 'Merchant will prepare and ship your order'],
              ['package_2', 'Track your order status in My Account'],
            ].map(([icon, text]) => (
              <div key={icon} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span className="material-symbols-outlined" style={{ fontSize:16, color:'#9E896A' }}>{icon}</span>
                <span style={{ fontSize:13, color:'#5e5e5b' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
          <Link href="/account"
            style={{ background:'#1c1b1b', color:'#fff', padding:'12px 24px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', textDecoration:'none' }}>
            View My Orders
          </Link>
          <Link href="/products"
            style={{ background:'none', border:'1px solid #c4c7c7', color:'#1c1b1b', padding:'12px 24px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', textDecoration:'none' }}>
            Continue Shopping
          </Link>
        </div>

        <p style={{ fontSize:11, color:'#c4c7c7', marginTop:20 }}>
          Redirecting to your account in {countdown}s...
        </p>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div style={{ padding:80, textAlign:'center' }}>Loading...</div>}>
      <SuccessInner />
    </Suspense>
  )
}
