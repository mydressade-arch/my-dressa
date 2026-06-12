'use client'
import { useLangStore } from '@/store/lang.store'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import Link from 'next/link'

function ResetPasswordInner() {
  const { t } = useLangStore()
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { setError(t('Mindestens 8 Zeichen', 'At least 8 characters')); return }
    if (password !== confirm) { setError('Passwörter stimmen nicht überein'); return }
    setLoading(true); setError('')
    try {
      await api.post('/auth/reset-password', { token, password })
      setDone(true)
      setTimeout(() => router.push('/auth/login'), 3000)
    } catch (e: any) {
      setError(e.response?.data?.message || 'Token ungültig oder abgelaufen')
    } finally { setLoading(false) }
  }

  if (!token) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#fdf8f8' }}>
      <div style={{ background:'#fff', border:'1px solid #c4c7c7', padding:40, maxWidth:400, width:'90%', textAlign:'center' }}>
        <p style={{ color:'#ba1a1a', fontSize:14 }}>Ungültiger Link — kein Token gefunden.</p>
        <Link href="/auth/login" style={{ fontSize:13, color:'#9E896A' }}>Zurück zum Login</Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#fdf8f8' }}>
      <div style={{ background:'#fff', border:'1px solid #c4c7c7', padding:40, maxWidth:400, width:'90%' }}>
        <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:26, fontWeight:700, marginBottom:8, textAlign:'center' }}>
          Neues Passwort
        </h1>
        <p style={{ fontSize:13, color:'#5e5e5b', textAlign:'center', marginBottom:28 }}>
          My Dressa
        </p>

        {done ? (
          <div style={{ textAlign:'center' }}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:'#EAF3DE', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
              <span className="material-symbols-outlined" style={{ fontSize:28, color:'#27500A' }}>check_circle</span>
            </div>
            <p style={{ fontSize:14, color:'#27500A', fontWeight:600, marginBottom:8 }}>Passwort geändert ✓</p>
            <p style={{ fontSize:13, color:'#5e5e5b' }}>Du wirst automatisch weitergeleitet...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b', display:'block', marginBottom:6 }}>
                Neues Passwort
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Mindestens 8 Zeichen" required minLength={8}
                style={{ width:'100%', padding:'12px 14px', fontSize:14, border:'1px solid #c4c7c7', outline:'none', boxSizing:'border-box' as const }} />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b', display:'block', marginBottom:6 }}>
                Passwort bestätigen
              </label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Passwort wiederholen" required
                style={{ width:'100%', padding:'12px 14px', fontSize:14, border:'1px solid #c4c7c7', outline:'none', boxSizing:'border-box' as const }} />
            </div>

            {error && (
              <div style={{ background:'#FCEBEB', padding:'10px 14px', fontSize:13, color:'#791F1F' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ background:'#1c1b1b', color:'#fff', border:'none', padding:14, fontSize:13, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', cursor:'pointer', opacity:loading?0.5:1 }}>
              {loading ? t('Speichern...', 'Saving...') : t('Passwort speichern', 'Save Password')}
            </button>

            <Link href="/auth/login" style={{ textAlign:'center', fontSize:13, color:'#9e9e9b', textDecoration:'none' }}>
              Zurück zum Login
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}

import { Suspense } from 'react'
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ padding:80, textAlign:'center', color:'#9e9e9b' }}>Laden...</div>}>
      <ResetPasswordInner />
    </Suspense>
  )
}