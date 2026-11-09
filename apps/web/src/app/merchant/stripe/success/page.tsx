'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { useLangStore } from '@/store/lang.store'

export default function StripeSuccessPage() {
  const router = useRouter()
  const { t } = useLangStore()
  useEffect(() => {
    const timer = setTimeout(() => router.push('/merchant/dashboard'), 4000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ width: 64, height: 64, background: '#EAF3DE', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Icon name="check_circle" style={{ fontSize: 32, color: '#27500A' }} />
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, marginBottom: 10 }}>
          {t('Stripe verbunden!','Stripe connected!')}
        </h1>
        <p style={{ color: '#5e5e5b', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          {t('Dein Stripe-Konto wurde erfolgreich verknüpft. Du kannst jetzt Zahlungen für deine Produkte empfangen.','Your Stripe account was linked successfully. You can now receive payments for your products.')}
        </p>
        <p style={{ fontSize: 12, color: '#9e9e9b', marginBottom: 20 }}>{t('Weiterleitung in 4 Sekunden...','Redirecting in 4 seconds...')}</p>
        <Link href="/merchant/dashboard"
          style={{ background: '#1c1b1b', color: '#fff', padding: '12px 24px', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textDecoration: 'none', display: 'inline-block' }}>
          {t('Zum Dashboard →','To dashboard →')}
        </Link>
      </div>
    </div>
  )
}
