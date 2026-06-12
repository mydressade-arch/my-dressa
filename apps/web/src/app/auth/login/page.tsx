'use client'
import { useState, useEffect } from 'react'
import { useLangStore } from '@/store/lang.store'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading, user } = useAuthStore()
  const { t } = useLangStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const role = user.role
      if (role === 'admin') router.replace('/admin')
      else if (role === 'merchant') router.replace('/merchant/dashboard')
      else router.replace('/')
    }
  }, [user, router])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]             = useState('')
  const [requires2FA, setRequires2FA] = useState(false)
  const [twoFaCode, setTwoFaCode]     = useState('')

  // Show loading while checking auth
  if (!mounted) return null
  if (user) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#fdf8f8' }}>
      <div style={{ textAlign:'center', padding:40 }}>
        <div style={{ width:56, height:56, borderRadius:'50%', background:'#EAF3DE', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
          <span className="material-symbols-outlined" style={{ fontSize:28, color:'#27500A' }}>check_circle</span>
        </div>
        <p style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:600, marginBottom:8 }}>
          {t('Du bist bereits angemeldet', 'You are already signed in')}
        </p>
        <p style={{ fontSize:13, color:'#5e5e5b', marginBottom:24 }}>
          {user.firstName} {user.lastName} · {user.email}
        </p>
        <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
          <button onClick={() => {
            if (user.role === 'admin') router.push('/admin')
            else if (user.role === 'merchant') router.push('/merchant/dashboard')
            else router.push('/')
          }} style={{ padding:'10px 24px', background:'#1c1b1b', color:'#fff', border:'none', fontSize:12, fontWeight:600, textTransform:'uppercase', cursor:'pointer' }}>
            {t('Weiter zum Dashboard', 'Go to Dashboard')}
          </button>
          <button onClick={async () => { await useAuthStore.getState().logout(); router.push('/auth/login') }}
            style={{ padding:'10px 24px', background:'none', border:'1px solid #c4c7c7', fontSize:12, fontWeight:600, textTransform:'uppercase', cursor:'pointer', color:'#5e5e5b' }}>
            {t('Abmelden', 'Sign Out')}
          </button>
        </div>
      </div>
    </div>
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const r = await login(email, password, requires2FA ? twoFaCode : undefined)
      if ((r as any)?.requiresTwoFa) {
        setRequires2FA(true)
        setTwoFaCode('')   // Code leeren für neue Eingabe
        return
      }
      router.push('/')
    } catch (err: any) {
      const msg = err.response?.data?.message
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Login fehlgeschlagen')
      // Bei 2FA Fehler: Code leeren aber requires2FA beibehalten
      if (requires2FA) {
        setTwoFaCode('')   // Alten Code löschen → Nutzer tippt neu
      }
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: '#fdf8f8' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Link href="/" style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: '#1c1b1b', textDecoration: 'none' }}>
            My Dressa
          </Link>
          <p style={{ color: '#5e5e5b', fontSize: 14, marginTop: 8 }}>Sign in to your account</p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #c4c7c7', padding: 32 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#5e5e5b', display: 'block', marginBottom: 6 }}>
                Email Address
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required
                style={{ width: '100%', padding: '12px 14px', fontSize: 14, border: '1px solid #c4c7c7', outline: 'none', background: '#fdf8f8', boxSizing: 'border-box' as const, backgroundImage: 'none' }} />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#5e5e5b', display: 'block', marginBottom: 6 }}>
                Password
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                style={{ width: '100%', padding: '12px 14px', fontSize: 14, border: '1px solid #c4c7c7', outline: 'none', background: '#fdf8f8', boxSizing: 'border-box' as const }} />
            </div>

            {error && !requires2FA && (
              <div style={{ padding: '12px 14px', background: '#ffdad6', color: '#ba1a1a', fontSize: 13 }}>
                {error}
              </div>
            )}

            <div style={{ textAlign: 'right' }}>
              <Link href="/auth/forgot-password" style={{ fontSize: 12, color: '#5e5e5b', textDecoration: 'none' }}>
                Forgot password?
              </Link>
            </div>

            {requires2FA && (
              <div style={{ background:'#f7f3f2', border:'1px solid #e8e3e1', padding:'16px', textAlign:'center' }}>
                <p style={{ fontSize:13, fontWeight:600, color:'#1c1b1b', marginBottom:4 }}>
                  🔐 Zwei-Faktor-Authentifizierung
                </p>
                <p style={{ fontSize:12, color:'#5e5e5b', marginBottom:12 }}>
                  Gib den 6-stelligen Code aus deiner Authenticator App ein:
                </p>
                <input
                  key="2fa-input"
                  value={twoFaCode}
                  onChange={e => setTwoFaCode(e.target.value.replace(/[^0-9]/g,'').slice(0,6))}
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  style={{ width:'140px', padding:'12px', fontSize:28, border:'2px solid #9E896A', outline:'none', fontFamily:'monospace', letterSpacing:'0.3em', textAlign:'center', boxSizing:'border-box' as const }}
                />
                {error && (
                  <p style={{ fontSize:12, color:'#ba1a1a', marginTop:8 }}>
                    ✗ {error} — bitte neuen Code eingeben
                  </p>
                )}
              </div>
            )}
            <button type="submit" disabled={isLoading}
              style={{ background: '#1c1b1b', color: '#fff', border: 'none', padding: 16, fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1, marginTop: 8 }}>
              {isLoading ? 'Signing in...' : t(t('Anmelden', 'Sign In'), t('Anmelden', 'Sign In'))}
            </button>
          </form>

          <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #c4c7c7', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#5e5e5b' }}>
              New to My Dressa?{' '}
              <Link href="/auth/register" style={{ color: '#1c1b1b', fontWeight: 600, textDecoration: 'none' }}>Create account</Link>
            </p>
          </div>
        </div>

        {/* Demo accounts */}
        
      </div>
    </div>
  )
}
