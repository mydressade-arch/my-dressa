'use client'

import { useState } from 'react'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { useLangStore } from '@/store/lang.store'
import { Icon } from '@/components/ui/Icon'

/**
 * Banner für eingeloggte, aber noch NICHT verifizierte Nutzer.
 * Zeigt einen Hinweis + Button "Bestätigungs-E-Mail erneut senden".
 *
 * Einbauen z.B. oben auf Konto-Seite, Checkout, oder global.
 * Rendert nichts, wenn der Nutzer verifiziert oder nicht eingeloggt ist.
 */
export function VerificationBanner() {
  const { user } = useAuthStore()
  const { t } = useLangStore()
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')

  // Nichts anzeigen, wenn nicht eingeloggt oder bereits verifiziert
  if (!user || user.isVerified) return null

  async function resend() {
    setStatus('loading'); setMessage('')
    try {
      const { data } = await authApi.resendVerification() as any
      if (data.alreadyVerified) {
        setStatus('sent')
        setMessage(t('Du bist bereits verifiziert.', 'You are already verified.'))
      } else {
        setStatus('sent')
        setMessage(t('Bestätigungs-E-Mail wurde gesendet. Bitte prüfe dein Postfach.', 'Confirmation email sent. Please check your inbox.'))
      }
    } catch (e: any) {
      setStatus('error')
      setMessage(e?.response?.data?.message || t('Etwas ist schiefgelaufen.', 'Something went wrong.'))
    }
  }

  return (
    <div style={{ background: '#FCF4E6', border: '1px solid #E5C687', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <Icon name="mail" style={{ fontSize: 20, color: '#9E6A00', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 200 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#1c1b1b', marginBottom: 2 }}>
          {t('Bitte bestätige deine E-Mail-Adresse', 'Please confirm your email address')}
        </p>
        <p style={{ fontSize: 12, color: '#5e5e5b' }}>
          {status === 'idle'
            ? t('Zum Kaufen, Mieten oder Verkaufen musst du deine E-Mail bestätigen.', 'To buy, rent or sell you need to confirm your email.')
            : message}
        </p>
      </div>
      {status !== 'sent' && (
        <button
          onClick={resend}
          disabled={status === 'loading'}
          style={{ padding: '9px 16px', background: '#1c1b1b', color: '#fff', border: 'none', cursor: status === 'loading' ? 'wait' : 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}
        >
          {status === 'loading' ? t('Senden...', 'Sending...') : t('E-Mail erneut senden', 'Resend email')}
        </button>
      )}
    </div>
  )
}
