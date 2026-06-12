'use client'
import { useLangStore } from '@/store/lang.store'
import { useState } from 'react'
import Link from 'next/link'
import { authApi } from '@/lib/api'

export default function ForgotPasswordPage() {
  const { t } = useLangStore()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await authApi.forgotPassword(email) } catch {}
    setSent(true)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: '#fdf8f8' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Link href="/" style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: '#1c1b1b', textDecoration: 'none' }}>
            My Dressa
          </Link>
          <p style={{ color: '#5e5e5b', fontSize: 14, marginTop: 8 }}>Reset your password</p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #c4c7c7', padding: 32 }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#9E896A', display: 'block', marginBottom: 16 }}>mail</span>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, marginBottom: 8 }}>Check your inbox</h3>
              <p style={{ fontSize: 14, color: '#5e5e5b', lineHeight: 1.6 }}>
                If the email exists, a reset link was sent. Check your spam folder too.
              </p>
              <Link href="/auth/login" style={{ display: 'inline-block', marginTop: 24, fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1c1b1b', textDecoration: 'none', borderBottom: '1px solid #1c1b1b', paddingBottom: 2 }}>
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 14, color: '#5e5e5b', lineHeight: 1.6, marginBottom: 8 }}>
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#5e5e5b', display: 'block', marginBottom: 6 }}>
                  Email Address
                </label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required
                  style={{ width: '100%', padding: '12px 14px', fontSize: 14, border: '1px solid #c4c7c7', outline: 'none', background: '#fdf8f8', boxSizing: 'border-box' as const }} />
              </div>
              <button type="submit" disabled={loading}
                style={{ background: '#1c1b1b', color: '#fff', border: 'none', padding: 16, fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <Link href="/auth/login" style={{ textAlign: 'center', fontSize: 13, color: '#5e5e5b', textDecoration: 'none' }}>
                ← Back to Sign In
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
