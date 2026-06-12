'use client'
import Link from 'next/link'

export default function StripeRefreshPage() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ width: 64, height: 64, background: '#FAEEDA', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#633806' }}>refresh</span>
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, marginBottom: 10 }}>
          Link abgelaufen
        </h1>
        <p style={{ color: '#5e5e5b', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          Der Stripe-Onboarding-Link ist abgelaufen. Bitte starte den Prozess erneut.
        </p>
        <Link href="/merchant/stripe"
          style={{ background: '#635BFF', color: '#fff', padding: '12px 24px', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textDecoration: 'none', display: 'inline-block' }}>
          Erneut verbinden
        </Link>
      </div>
    </div>
  )
}
