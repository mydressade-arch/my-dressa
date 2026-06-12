'use client'
import { useLangStore } from '@/store/lang.store'
import { company } from '@/lib/company'
import Link from 'next/link'

export default function PrivacyPage() {
  const { t } = useLangStore()

  const sections = [
    {
      title: t('1. Verantwortlicher', '1. Controller'),
      content: t(
        `Verantwortlicher im Sinne der DSGVO ist: ${company.name}, ${company.street}, ${company.city}. E-Mail: ${company.email}`,
        `Controller within the meaning of the GDPR: ${company.name}, ${company.street}, ${company.city}. Email: ${company.email}`
      )
    },
    {
      title: t('2. Erhobene Daten', '2. Data Collected'),
      content: t(
        'Wir erheben: (a) Registrierungsdaten: Vorname, Nachname, E-Mail, verschlüsseltes Passwort. (b) Bestelldaten: Lieferadresse, Bestellhistorie. (c) Zahlungsdaten: werden ausschließlich über Stripe verarbeitet und nicht auf unseren Servern gespeichert. (d) Nutzungsdaten: IP-Adresse, Browser-Typ (technisch notwendig). Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).',
        'We collect: (a) Registration data: first name, last name, email, encrypted password. (b) Order data: delivery address, order history. (c) Payment data: processed exclusively via Stripe, not stored on our servers. (d) Usage data: IP address, browser type (technically necessary). Legal basis: Art. 6 para. 1 lit. b GDPR.'
      )
    },
    {
      title: t('3. Zahlungsverarbeitung (Stripe)', '3. Payment Processing (Stripe)'),
      content: t(
        'Zahlungen werden über Stripe Payments Europe Ltd., Dublin, Irland abgewickelt. Stripe ist nach dem EU-US Data Privacy Framework zertifiziert. Ihre Kartendaten werden direkt an Stripe übermittelt und nicht auf unseren Servern gespeichert. Datenschutzerklärung: https://stripe.com/de/privacy',
        'Payments are processed via Stripe Payments Europe Ltd., Dublin, Ireland, certified under the EU-US Data Privacy Framework. Your card data is transmitted directly to Stripe. Privacy policy: https://stripe.com/privacy'
      )
    },
    {
      title: t('4. E-Mail-Versand (Brevo)', '4. Email Service (Brevo)'),
      content: t(
        'Für Transaktions-E-Mails nutzen wir Brevo (ehemals Sendinblue), Berlin. Ihre E-Mail-Adresse wird ausschließlich für transaktionale Kommunikation genutzt — keine Werbemails ohne Einwilligung.',
        'For transactional emails we use Brevo (formerly Sendinblue), Berlin. Your email address is used exclusively for transactional communication — no marketing emails without consent.'
      )
    },
    {
      title: t('5. Datenspeicherung & Sicherheit', '5. Data Storage & Security'),
      content: t(
        'Daten werden auf EU-Servern (Railway.app) gespeichert. Bilder via Cloudflare R2. Alle Verbindungen sind SSL/TLS-verschlüsselt. Passwörter werden mit bcrypt gehasht. Bankdaten werden mit AES-256-GCM verschlüsselt.',
        'Data is stored on EU servers (Railway.app). Images via Cloudflare R2. All connections are SSL/TLS encrypted. Passwords are hashed with bcrypt. Bank details are AES-256-GCM encrypted.'
      )
    },
    {
      title: t('6. Ihre Rechte (DSGVO)', '6. Your Rights (GDPR)'),
      content: t(
        'Sie haben das Recht auf: Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18), Widerspruch (Art. 21) und Beschwerde bei der zuständigen Aufsichtsbehörde. Kontakt: info@mydressa.de',
        'You have the right to: access (Art. 15), rectification (Art. 16), erasure (Art. 17), restriction (Art. 18), objection (Art. 21) and to lodge a complaint with a supervisory authority. Contact: info@mydressa.de'
      )
    },
    {
      title: t('7. Cookies', '7. Cookies'),
      content: t(
        'Wir verwenden ausschließlich technisch notwendige Cookies (Sitzungsverwaltung, Authentifizierung). Keine Tracking- oder Werbe-Cookies.',
        'We use only technically necessary cookies (session management, authentication). No tracking or advertising cookies.'
      )
    },
    {
      title: t('8. Aufbewahrungsfristen', '8. Retention Periods'),
      content: t(
        'Accountdaten: bis zur Kontolöschung. Bestelldaten: 10 Jahre (§ 147 AO). Log-Daten: 30 Tage.',
        'Account data: until account deletion. Order data: 10 years (§ 147 AO). Log data: 30 days.'
      )
    },
  ]

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '60px 40px' }}>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#9E896A', marginBottom: 12 }}>My Dressa</p>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(28px,4vw,40px)', fontWeight: 700, color: '#1c1b1b', marginBottom: 8 }}>
        {t('Datenschutzerklärung', 'Privacy Policy')}
      </h1>
      <p style={{ fontSize: 13, color: '#9e9e9b', marginBottom: 48 }}>
        {t('Gemäß DSGVO (EU) 2016/679 · Stand: Juni 2026', 'According to GDPR (EU) 2016/679 · Updated: June 2026')}
      </p>

      {sections.map((section, i) => (
        <div key={i} style={{ marginBottom: 36, paddingBottom: 36, borderBottom: i < sections.length - 1 ? '1px solid #f1edec' : 'none' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, color: '#1c1b1b', marginBottom: 12 }}>
            {section.title}
          </h2>
          <p style={{ fontSize: 14, color: '#5e5e5b', lineHeight: 1.85 }}>{section.content}</p>
        </div>
      ))}

      <div style={{ background: '#fdf8f8', border: '1px solid #e8e3e1', padding: '20px 24px', marginTop: 16, marginBottom: 32 }}>
        <p style={{ fontSize: 13, color: '#5e5e5b', lineHeight: 1.7, margin: 0 }}>
          {t('Datenschutzanfragen an:', 'Privacy inquiries to:')}
          {' '}<a href="mailto:info@mydressa.de" style={{ color: '#9E896A' }}>info@mydressa.de</a>
        </p>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <Link href="/impressum" style={{ fontSize: 12, color: '#9e9e9b', textDecoration: 'none' }}>{t('Impressum', 'Legal Notice')}</Link>
        <Link href="/terms" style={{ fontSize: 12, color: '#9e9e9b', textDecoration: 'none' }}>{t('AGB', 'Terms')}</Link>
        <Link href="/" style={{ fontSize: 12, color: '#9E896A', textDecoration: 'none' }}>← {t('Startseite', 'Home')}</Link>
      </div>
    </div>
  )
}
