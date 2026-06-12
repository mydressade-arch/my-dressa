'use client'
import { useLangStore } from '@/store/lang.store'
import { company } from '@/lib/company'
import Link from 'next/link'

export default function ImpressumPage() {
  const { t } = useLangStore()

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '60px 40px' }}>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#9E896A', marginBottom: 12 }}>My Dressa</p>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(28px,4vw,40px)', fontWeight: 700, color: '#1c1b1b', marginBottom: 8 }}>
        {t('Impressum', 'Legal Notice')}
      </h1>
      <p style={{ fontSize: 13, color: '#9e9e9b', marginBottom: 48 }}>
        {t('Angaben gemäß § 5 TMG', 'Information according to § 5 TMG')}
      </p>

      {[
        {
          title: t('Anbieter', 'Provider'),
          lines: [company.name, company.street, company.city, company.country]
        },
        {
          title: t('Kontakt', 'Contact'),
          lines: [`E-Mail: ${company.email}`, `Web: ${company.website}`]
        },
        {
          title: t('Geschäftsführung', 'Management'),
          lines: [company.owner]
        },
        {
          title: t('Handelsregister', 'Commercial Register'),
          lines: [
            `${t('Registergericht', 'Register Court')}: ${company.registerCourt}`,
            `${t('Registernummer', 'Registration Number')}: ${company.registerNr}`,
          ]
        },
        {
          title: t('Umsatzsteuer-ID', 'VAT ID'),
          lines: [`${t('USt-ID gemäß § 27a UStG', 'VAT ID acc. § 27a UStG')}: ${company.vatId}`]
        },
        {
          title: t('EU-Streitschlichtung', 'EU Dispute Resolution'),
          lines: [
            t(
              'Die EU-Kommission stellt eine Plattform zur Online-Streitbeilegung bereit: https://ec.europa.eu/consumers/odr',
              'The EU Commission provides a platform for online dispute resolution: https://ec.europa.eu/consumers/odr'
            ),
          ]
        },
        {
          title: t('Haftung für Inhalte', 'Liability for Content'),
          lines: [
            t(
              'Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte verantwortlich. Nach §§ 8–10 TMG sind wir nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen.',
              'As a service provider we are responsible for our own content under § 7 para. 1 TMG. Under §§ 8–10 TMG we are not obliged to monitor transmitted or stored third-party information.'
            ),
          ]
        },
        {
          title: t('Urheberrecht', 'Copyright'),
          lines: [
            t(
              'Die durch die Seitenbetreiber erstellten Inhalte unterliegen dem deutschen Urheberrecht. Vervielfältigung und Verbreitung bedürfen der schriftlichen Zustimmung.',
              'The content created by the site operators is subject to German copyright law. Reproduction and distribution require written consent.'
            ),
          ]
        },
      ].map((section, i) => (
        <div key={i} style={{ marginBottom: 32, paddingBottom: 32, borderBottom: '1px solid #f1edec' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600, color: '#1c1b1b', marginBottom: 12 }}>
            {section.title}
          </h2>
          {section.lines.map((line, j) => (
            <p key={j} style={{ fontSize: 14, color: '#5e5e5b', lineHeight: 1.8, margin: '0 0 4px' }}>{line}</p>
          ))}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
        <Link href="/privacy" style={{ fontSize: 12, color: '#9e9e9b', textDecoration: 'none' }}>{t('Datenschutz', 'Privacy Policy')}</Link>
        <Link href="/terms" style={{ fontSize: 12, color: '#9e9e9b', textDecoration: 'none' }}>{t('AGB', 'Terms')}</Link>
        <Link href="/" style={{ fontSize: 12, color: '#9E896A', textDecoration: 'none' }}>← {t('Startseite', 'Home')}</Link>
      </div>
    </div>
  )
}
