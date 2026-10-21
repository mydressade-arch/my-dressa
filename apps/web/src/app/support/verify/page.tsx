'use client'
import { useState } from 'react'
import { supportApi } from '@/lib/api'
import { useLangStore } from '@/store/lang.store'

/**
 * Support/Admin-Werkzeug: E-Mail-Verifizierung manuell handhaben,
 * wenn die Verifizierungs-Mail beim Kunden nicht ankommt.
 */
export default function SupportVerifyPage() {
  const { t } = useLangStore()
  const [email, setEmail] = useState('')
  const [result, setResult] = useState<any>(null)
  const [link, setLink] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmVerify, setConfirmVerify] = useState(false)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  async function lookup(keepMessages = false) {
    if (!email.trim()) return
    setLoading(true)
    if (!keepMessages) { setMsg(''); setLink('') }
    setResult(null)
    try {
      const { data } = await supportApi.lookupUser(email) as any
      setResult(data)
    } catch (e: any) {
      setMsg(e?.response?.data?.message || t('Nutzer nicht gefunden', 'User not found'))
    } finally { setLoading(false) }
  }

  async function resend() {
    setLoading(true); setMsg(''); setLink('')
    try {
      const { data } = await supportApi.resendVerification(email) as any
      if (data.alreadyVerified) {
        setMsg(t('Dieser Nutzer ist bereits verifiziert — kein Link nötig.', 'This user is already verified — no link needed.'))
      } else if (data.verificationPath) {
        setLink(`${origin}${data.verificationPath}`)
        setMsg(t('✓ Neuer Link erstellt — kopiere ihn und gib ihn dem Kunden:', '✓ New link created — copy it and give it to the customer:'))
      } else {
        // Unerwartete Antwort — trotzdem eine Rückmeldung geben
        setMsg(t('Antwort erhalten, aber kein Link. Bitte erneut versuchen.', 'Response received but no link. Please try again.'))
      }
      lookup(true)
    } catch (e: any) {
      setMsg(e?.response?.data?.message || t('Fehler beim Erstellen des Links', 'Error creating link'))
    } finally { setLoading(false) }
  }

  async function verifyNow() {
    setLoading(true); setMsg(''); setLink(''); setConfirmVerify(false)
    try {
      const { data } = await supportApi.verifyManually(email) as any
      setMsg(data.message || t('Verifiziert.', 'Verified.'))
      lookup(true)
    } catch (e: any) {
      setMsg(e?.response?.data?.message || t('Fehler', 'Error'))
    } finally { setLoading(false) }
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
        {t('E-Mail-Verifizierung', 'Email Verification')}
      </h1>
      <p style={{ color: '#5e5e5b', fontSize: 14, marginBottom: 24 }}>
        {t('Hilf Kunden, deren Bestätigungs-Mail nicht angekommen ist.', 'Help customers whose confirmation email did not arrive.')}
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') lookup() }}
          placeholder={t('kunde@email.de', 'customer@email.com')}
          style={{ flex: 1, padding: '12px 14px', fontSize: 14, border: '1px solid #c4c7c7', outline: 'none' }}
        />
        <button onClick={() => lookup()} disabled={loading}
          style={{ padding: '12px 20px', background: '#1A1A1A', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          {t('Suchen', 'Search')}
        </button>
      </div>

      {result && (
        <div style={{ border: '1px solid #c4c7c7', padding: 20, marginBottom: 16, background: '#fff' }}>
          <p style={{ fontSize: 14, marginBottom: 6 }}><b>{result.email}</b></p>
          <p style={{ fontSize: 13, color: '#5e5e5b', marginBottom: 14 }}>
            {t('Status', 'Status')}: {result.isVerified
              ? <span style={{ color: '#064E3B', fontWeight: 600 }}>✓ {t('verifiziert', 'verified')}</span>
              : <span style={{ color: '#BA1A1A', fontWeight: 600 }}>✗ {t('nicht verifiziert', 'not verified')}</span>}
          </p>

          {!result.isVerified && (
            <div>
              {!confirmVerify ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={resend} disabled={loading}
                    style={{ padding: '10px 16px', background: '#9E896A', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    {t('Neuen Link erstellen', 'Create new link')}
                  </button>
                  <button onClick={() => setConfirmVerify(true)} disabled={loading}
                    style={{ padding: '10px 16px', background: 'none', border: '1px solid #064E3B', color: '#064E3B', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    {t('Direkt verifizieren', 'Verify directly')}
                  </button>
                </div>
              ) : (
                <div style={{ border: '1px solid #064E3B', background: '#f2f7f4', padding: 16 }}>
                  <p style={{ fontSize: 13, color: '#1c1b1b', marginBottom: 4, fontWeight: 600 }}>
                    {t('Manuelle Verifizierung bestätigen', 'Confirm manual verification')}
                  </p>
                  <p style={{ fontSize: 13, color: '#5e5e5b', marginBottom: 14, lineHeight: 1.5 }}>
                    {t(`Der Nutzer ${result.email} wird ohne E-Mail-Bestätigung freigeschaltet. Nur nutzen, wenn du sicher bist, dass die Adresse dem Nutzer gehört.`,
                       `User ${result.email} will be activated without email confirmation. Only use this if you are sure the address belongs to the user.`)}
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={verifyNow} disabled={loading}
                      style={{ padding: '10px 18px', background: '#064E3B', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                      {loading ? t('...', '...') : t('Ja, verifizieren', 'Yes, verify')}
                    </button>
                    <button onClick={() => setConfirmVerify(false)} disabled={loading}
                      style={{ padding: '10px 18px', background: 'none', border: '1px solid #c4c7c7', color: '#5e5e5b', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                      {t('Abbrechen', 'Cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {msg && <p style={{ fontSize: 14, color: '#1c1b1b', marginBottom: 8 }}>{msg}</p>}

      {link && (
        <div style={{ background: '#f1edec', padding: 14, wordBreak: 'break-all', fontSize: 13 }}>
          <a href={link} style={{ color: '#0C447C' }}>{link}</a>
          <button
            onClick={() => { navigator.clipboard?.writeText(link); setMsg(t('Link kopiert!', 'Link copied!')) }}
            style={{ marginLeft: 10, padding: '4px 10px', fontSize: 12, background: '#1A1A1A', color: '#fff', border: 'none', cursor: 'pointer' }}>
            {t('Kopieren', 'Copy')}
          </button>
        </div>
      )}
    </div>
  )
}
