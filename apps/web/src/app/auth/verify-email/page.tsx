'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useLangStore } from '@/store/lang.store'
import Link from 'next/link'

function VerifyEmailInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t } = useLangStore()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setMessage(t('Kein Token gefunden', 'No token found'))
      return
    }

    api.get(`/auth/verify-email/${token}`)
      .then(() => {
        setStatus('success')
        // Nach 3 Sekunden zum Login weiterleiten
        setTimeout(() => router.push('/auth/login'), 3000)
      })
      .catch((e: any) => {
        setStatus('error')
        setMessage(e.response?.data?.message || t('Ungültiger oder abgelaufener Link', 'Invalid or expired link'))
      })
  }, [])

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#fdf8f8', padding:'24px 16px' }}>
      <div style={{ maxWidth:440, width:'100%', background:'#fff', border:'1px solid #e8e3e1', padding:'40px 36px', textAlign:'center' }}>

        {status === 'loading' && (
          <>
            <div style={{ width:56, height:56, border:'3px solid #f1edec', borderTop:'3px solid #9E896A', borderRadius:'50%', margin:'0 auto 20px', animation:'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            <p style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:600, color:'#1c1b1b', marginBottom:8 }}>
              {t('E-Mail wird bestätigt...', 'Verifying email...')}
            </p>
            <p style={{ fontSize:14, color:'#9e9e9b' }}>
              {t('Bitte warte einen Moment', 'Please wait a moment')}
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ width:64, height:64, borderRadius:'50%', background:'#EAF3DE', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
              <span className="material-symbols-outlined" style={{ fontSize:32, color:'#27500A' }}>check_circle</span>
            </div>
            <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:24, fontWeight:700, color:'#1c1b1b', marginBottom:12 }}>
              {t('E-Mail bestätigt ✓', 'Email verified ✓')}
            </h1>
            <p style={{ fontSize:14, color:'#5e5e5b', lineHeight:1.7, marginBottom:24 }}>
              {t('Dein Account ist jetzt aktiv. Du wirst automatisch weitergeleitet...', 'Your account is now active. You will be redirected automatically...')}
            </p>
            <Link href="/auth/login"
              style={{ display:'inline-block', padding:'12px 32px', background:'#1c1b1b', color:'#fff', textDecoration:'none', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>
              {t('Jetzt anmelden', 'Sign In Now')}
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ width:64, height:64, borderRadius:'50%', background:'#FCEBEB', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
              <span className="material-symbols-outlined" style={{ fontSize:32, color:'#ba1a1a' }}>error</span>
            </div>
            <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:24, fontWeight:700, color:'#1c1b1b', marginBottom:12 }}>
              {t('Bestätigung fehlgeschlagen', 'Verification failed')}
            </h1>
            <p style={{ fontSize:14, color:'#5e5e5b', lineHeight:1.7, marginBottom:24 }}>
              {message}
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <Link href="/auth/login"
                style={{ display:'block', padding:'12px 32px', background:'#1c1b1b', color:'#fff', textDecoration:'none', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'center' }}>
                {t('Zum Login', 'Go to Login')}
              </Link>
              <Link href="/"
                style={{ display:'block', padding:'12px 32px', background:'none', border:'1px solid #c4c7c7', color:'#5e5e5b', textDecoration:'none', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'center' }}>
                {t('Startseite', 'Home')}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>Laden...</div>}>
      <VerifyEmailInner />
    </Suspense>
  )
}
