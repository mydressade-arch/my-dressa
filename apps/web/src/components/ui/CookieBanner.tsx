'use client'
import { useState, useEffect } from 'react'
import { useLangStore } from '@/store/lang.store'
import Link from 'next/link'

export function CookieBanner() {
  const { t } = useLangStore()
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const accepted = localStorage.getItem('cookie_consent')
    if (!accepted) setVisible(true)
  }, [])

  const accept = () => {
    localStorage.setItem('cookie_consent', 'accepted')
    setVisible(false)
  }

  const decline = () => {
    localStorage.setItem('cookie_consent', 'declined')
    setVisible(false)
  }

  if (!mounted || !visible) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      background: '#1c1b1b',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      padding:'clamp(16px,1vw,20px) clamp(16px,4vw,40px)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        {/* Icon */}
        <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#9E896A', flexShrink: 0 }}>
          cookie
        </span>

        {/* Text */}
        <p style={{ flex: 1, fontSize: 13, color: 'rgba(253,248,248,0.75)', lineHeight: 1.6, margin: 0, minWidth: 200 }}>
          {t(
            'Wir verwenden nur technisch notwendige Cookies für den Betrieb der Plattform. Keine Tracking- oder Werbe-Cookies.',
            'We use only technically necessary cookies for platform operation. No tracking or advertising cookies.'
          )}
          {' '}
          <Link href="/privacy" style={{ color: '#9E896A', textDecoration: 'none', fontWeight: 600 }}>
            {t('Mehr erfahren', 'Learn more')}
          </Link>
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <button
            onClick={decline}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'rgba(253,248,248,0.6)',
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              cursor: 'pointer',
            }}
          >
            {t('Ablehnen', 'Decline')}
          </button>
          <button
            onClick={accept}
            style={{
              padding: '10px 24px',
              background: '#9E896A',
              border: 'none',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              cursor: 'pointer',
            }}
          >
            {t('Akzeptieren', 'Accept')}
          </button>
        </div>
      </div>
    </div>
  )
}
