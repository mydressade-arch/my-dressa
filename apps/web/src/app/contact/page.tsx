'use client'
import { useState } from 'react'
import { api } from '@/lib/api'
import { useLangStore } from '@/store/lang.store'
import { useUI } from '@/components/ui/UIProvider'

export default function ContactPage() {
  const { t } = useLangStore()
  const { toast } = useUI()
  const [form, setForm]     = useState({ name:'', email:'', subject:'', message:'' })
  const [sent, setSent]     = useState(false)
  const [sending, setSending] = useState(false)
  const up = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) return
    setSending(true)
    try {
      await api.post('/notifications/contact', form)
      setSent(true)
    } catch (err: any) {
      toast(err.response?.data?.message || t('Fehler beim Senden', 'Error sending message'), 'error')
    } finally {
      setSending(false)
    }
  }

  const SUBJECTS = [
    t('Frage zur Miete', 'Rental Question'),
    t('Kaufanfrage', 'Purchase Inquiry'),
    t('Händler-Partnerschaft', 'Merchant Partnership'),
    t('Technischer Support', 'Technical Support'),
    t('Sonstiges', 'Other'),
  ]

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 40px' }}>
      <div style={{ maxWidth: 840, margin: '0 auto' }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9E896A', marginBottom: 12 }}>
          My Dressa
        </p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(28px,4vw,44px)', fontWeight: 700, marginBottom: 8 }}>
          {t('Kontakt', 'Contact Us')}
        </h1>
        <p style={{ color: '#5e5e5b', fontSize: 15, marginBottom: 48, lineHeight: 1.7 }}>
          {t(
            'Unser Team hilft dir gerne bei Fragen zu Miete, Kauf oder Händler-Partnerschaften.',
            'Our team is happy to help with questions about rentals, purchases, or merchant partnerships.'
          )}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 48 }}>
          {/* Form */}
          {sent ? (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#27500A' }}>check_circle</span>
              </div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
                {t('Nachricht gesendet ✓', 'Message Sent ✓')}
              </h3>
              <p style={{ color: '#5e5e5b', fontSize: 14, lineHeight: 1.7 }}>
                {t(
                  'Wir haben deine Nachricht erhalten und du bekommst eine Bestätigung per E-Mail. Wir antworten innerhalb von 24 Stunden.',
                  'We received your message and you\'ll get a confirmation email. We\'ll respond within 24 hours.'
                )}
              </p>
              <button
                onClick={() => { setForm({ name:'', email:'', subject:'', message:'' }); setSent(false) }}
                style={{ marginTop: 24, padding: '10px 24px', background: 'none', border: '1px solid #c4c7c7', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', cursor: 'pointer', color: '#5e5e5b' }}>
                {t('Neue Nachricht', 'New Message')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Name + Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#5e5e5b', display: 'block', marginBottom: 8 }}>
                    {t('Name', 'Name')} *
                  </label>
                  <input type="text" value={form.name} onChange={up('name')} required
                    placeholder={t('Dein Name', 'Your name')}
                    style={{ width: '100%', padding: '12px 14px', fontSize: 14, border: '1px solid #c4c7c7', outline: 'none', background: '#fdf8f8', boxSizing: 'border-box' as const }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#5e5e5b', display: 'block', marginBottom: 8 }}>
                    {t('E-Mail', 'Email')} *
                  </label>
                  <input type="email" value={form.email} onChange={up('email')} required
                    placeholder="deine@email.de"
                    style={{ width: '100%', padding: '12px 14px', fontSize: 14, border: '1px solid #c4c7c7', outline: 'none', background: '#fdf8f8', boxSizing: 'border-box' as const }} />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#5e5e5b', display: 'block', marginBottom: 8 }}>
                  {t('Betreff', 'Subject')} *
                </label>
                <select value={form.subject} onChange={up('subject')} required
                  style={{ width: '100%', padding: '12px 14px', fontSize: 14, border: '1px solid #c4c7c7', outline: 'none', background: '#fdf8f8' }}>
                  <option value="">{t('Thema wählen...', 'Select a topic...')}</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Message */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#5e5e5b', display: 'block', marginBottom: 8 }}>
                  {t('Nachricht', 'Message')} *
                </label>
                <textarea value={form.message} onChange={up('message')} required rows={6}
                  placeholder={t('Wie können wir dir helfen?', 'How can we help you?')}
                  style={{ width: '100%', padding: '12px 14px', fontSize: 14, border: '1px solid #c4c7c7', outline: 'none', background: '#fdf8f8', resize: 'vertical', boxSizing: 'border-box' as const, fontFamily: 'inherit' }} />
              </div>

              <button type="submit" disabled={sending}
                style={{ background: '#1c1b1b', color: '#fff', border: 'none', padding: '14px 32px', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1, alignSelf: 'flex-start' }}>
                {sending ? t('Wird gesendet...', 'Sending...') : t('Nachricht senden', 'Send Message')}
              </button>
            </form>
          )}

          {/* Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {[
              { icon: 'mail', label: t('E-Mail', 'Email'), val: 'support@mydressa.de', href: 'mailto:support@mydressa.de' },
              { icon: 'schedule', label: t('Antwortzeit', 'Response Time'), val: t('Innerhalb von 24 Stunden', 'Within 24 hours'), href: null },
              { icon: 'location_on', label: t('Standort', 'Based in'), val: 'Deutschland 🇩🇪', href: null },
              { icon: 'language', label: t('Sprachen', 'Languages'), val: 'Deutsch / English', href: null },
            ].map(({ icon, label, val, href }) => (
              <div key={label} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 44, height: 44, background: '#fdf8f8', border: '1px solid #e8e3e1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#9E896A' }}>{icon}</span>
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9e9e9b', marginBottom: 3 }}>{label}</p>
                  {href
                    ? <a href={href} style={{ fontSize: 14, fontWeight: 500, color: '#9E896A', textDecoration: 'none' }}>{val}</a>
                    : <p style={{ fontSize: 14, fontWeight: 500, color: '#1c1b1b' }}>{val}</p>
                  }
                </div>
              </div>
            ))}

            {/* Divider */}
            <div style={{ borderTop: '1px solid #f1edec', paddingTop: 24 }}>
              <p style={{ fontSize: 12, color: '#9e9e9b', lineHeight: 1.7 }}>
                {t(
                  'Du bist Händler und möchtest deinen Shop auf My Dressa eröffnen?',
                  'Are you a merchant and want to open your shop on My Dressa?'
                )}
              </p>
              <a href="/merchant/onboarding"
                style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9E896A', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
                {t('Händler werden →', 'Become a Merchant →')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
