'use client'
import { useState } from 'react'
import { useLangStore } from '@/store/lang.store'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'

export default function RegisterPage() {
  const router = useRouter()
  const { t } = useLangStore()
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const up = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 8) { setError('Passwort muss mindestens 8 Zeichen haben'); return }
    setLoading(true); setError('')
    try {
      await authApi.register(form)
      setSuccess(true)
      setTimeout(() => router.push('/auth/login'), 2000)
    } catch (err: any) {
      const msg = err.response?.data?.message
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Registrierung fehlgeschlagen')
    } finally { setLoading(false) }
  }

  if (success) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fdf8f8' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, background: '#064E3B', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 32 }}>check</span>
        </div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, marginBottom: 8 }}>Account erstellt!</h2>
        <p style={{ color: '#5e5e5b', fontSize: 14 }}>Du wirst zum Login weitergeleitet...</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: '#fdf8f8' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Link href="/" style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: '#1c1b1b', textDecoration: 'none' }}>
            My Dressa
          </Link>
          <p style={{ color: '#5e5e5b', fontSize: 14, marginTop: 8 }}>Create your account</p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #c4c7c7', padding: 32 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap: 12 }}>
              {[['firstName',t(t('Vorname', 'First Name'), 'First Name'),'Maria'],['lastName',t(t('Nachname', 'Last Name'), 'Last Name'),'Müller']].map(([k,label,ph]) => (
                <div key={k}>
                  <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#5e5e5b', display: 'block', marginBottom: 6 }}>{label}</label>
                  <input value={form[k as keyof typeof form]} onChange={up(k)} placeholder={ph} required
                    style={{ width: '100%', padding: '12px 14px', fontSize: 14, border: '1px solid #c4c7c7', outline: 'none', background: '#fdf8f8', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>

            {[
              ['email','Email Address','email','you@example.com',true],
              ['password',t(t('Passwort', 'Password'), 'Password'),'password','Min. 8 characters',true],
              ['phone','Phone (optional)','tel','+49 151 ...',false],
            ].map(([k,label,type,ph,req]) => (
              <div key={k as string}>
                <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#5e5e5b', display: 'block', marginBottom: 6 }}>{label as string}</label>
                <input
                  type={type as string}
                  value={form[k as keyof typeof form]}
                  onChange={up(k as string)}
                  placeholder={ph as string}
                  required={req as boolean}
                  style={{ width: '100%', padding: '12px 14px', fontSize: 14, border: '1px solid #c4c7c7', outline: 'none', background: '#fdf8f8', boxSizing: 'border-box' }}
                />
              </div>
            ))}

            {error && (
              <div style={{ padding: '12px 14px', background: '#ffdad6', color: '#ba1a1a', fontSize: 13 }}>
                {error}
              </div>
            )}

            <p style={{ fontSize: 12, color: '#5e5e5b' }}>
              By creating an account you agree to our{' '}
              <Link href="/terms" style={{ color: '#1c1b1b', fontWeight: 600 }}>Terms of Service</Link>.
            </p>

            <button type="submit" disabled={loading}
              style={{ background: '#1c1b1b', color: '#fff', border: 'none', padding: '16px', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Creating account...' : t(t('Konto erstellen', 'Create Account'), t('Konto erstellen', 'Create Account'))}
            </button>
          </form>

          <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #c4c7c7', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#5e5e5b' }}>
              Already have an account?{' '}
              <Link href="/auth/login" style={{ color: '#1c1b1b', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
