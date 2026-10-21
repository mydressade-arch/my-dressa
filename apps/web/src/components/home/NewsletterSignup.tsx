'use client'

import { useState } from 'react'
import { newsletterApi } from '@/lib/api'
import { useLangStore } from '@/store/lang.store'

/**
 * Funktionierender Newsletter-Anmeldeblock für die Startseite.
 * Speichert die E-Mail in der DB (newsletter_subscribers) über das Backend.
 */
export function NewsletterSignup() {
  const { t } = useLangStore()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())

  async function submit() {
    if (!isValidEmail(email)) {
      setStatus('error')
      setMessage(t('Bitte eine gültige E-Mail-Adresse eingeben.', 'Please enter a valid email address.'))
      return
    }
    setStatus('loading')
    setMessage('')
    try {
      await newsletterApi.subscribe(email.trim())
      setStatus('done')
      setMessage(t('Danke! Du bist angemeldet.', 'Thanks! You are subscribed.'))
      setEmail('')
    } catch (err: any) {
      setStatus('error')
      setMessage(
        err?.response?.data?.message ||
          t('Etwas ist schiefgelaufen. Bitte später erneut versuchen.', 'Something went wrong. Please try again later.'),
      )
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', width: '100%' }}>
      <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9E896A', marginBottom: 12 }}>
        {t('Exklusiver Zugang', 'Exclusive Access')}
      </p>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: '#fdf8f8', marginBottom: 12 }}>
        {t('Werde Teil des Inner Circle', 'Join the Inner Circle')}
      </h2>
      <p style={{ color: 'rgba(244,240,239,0.5)', fontSize: 14, lineHeight: 1.7, marginBottom: 36 }}>
        {t('Neue Kollektionen, private Sales und Fashion Insights direkt in dein Postfach.', 'New collections, private sales and fashion insights directly to your inbox.')}
      </p>

      {status === 'done' ? (
        <p style={{ color: '#9E896A', fontSize: 15, fontWeight: 600 }}>
          {message}
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', border: '1px solid rgba(244,240,239,0.15)' }}>
            <input
              type="email"
              placeholder={t('deine@email.de', 'your@email.com')}
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle') }}
              onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
              suppressHydrationWarning
              style={{ flex: 1, padding: '16px 20px', fontSize: 14, background: 'transparent', border: 'none', outline: 'none', color: '#fdf8f8', borderRight: '1px solid rgba(244,240,239,0.15)' }}
            />
            <button
              onClick={submit}
              disabled={status === 'loading'}
              style={{ padding: '16px 24px', background: '#9E896A', color: '#fff', border: 'none', cursor: status === 'loading' ? 'wait' : 'pointer', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0, opacity: status === 'loading' ? 0.7 : 1 }}
            >
              {status === 'loading' ? t('...', '...') : t('Anmelden', 'Subscribe')}
            </button>
          </div>
          {status === 'error' && (
            <p style={{ color: '#e88', fontSize: 13, marginTop: 10, textAlign: 'left' }}>
              {message}
            </p>
          )}
        </>
      )}
    </div>
  )
}
