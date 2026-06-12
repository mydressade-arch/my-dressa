'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function StripeSuccessPage() {
  const router = useRouter()
  useEffect(() => {
    const t = setTimeout(() => router.push('/merchant/dashboard'), 4000)
    return () => clearTimeout(t)
  }, [router])

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ width: 64, height: 64, background: '#EAF3DE', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#27500A' }}>check_circle</span>
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, marginBottom: 10 }}>
          Stripe verbunden!
        </h1>
        <p style={{ color: '#5e5e5b', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          Dein Stripe-Konto wurde erfolgreich verknüpft. Du kannst jetzt Zahlungen für deine Produkte empfangen.
        </p>
        <p style={{ fontSize: 12, color: '#9e9e9b', marginBottom: 20 }}>Weiterleitung in 4 Sekunden...</p>
        <Link href="/merchant/dashboard"
          style={{ background: '#1c1b1b', color: '#fff', padding: '12px 24px', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textDecoration: 'none', display: 'inline-block' }}>
          Zum Dashboard →
        </Link>
      </div>
    </div>
  )
}
