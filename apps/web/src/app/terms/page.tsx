'use client'
import { useLangStore } from '@/store/lang.store'
import Link from 'next/link'

export default function TermsPage() {
  const { t } = useLangStore()

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 'clamp(32px,5vw,60px) clamp(16px,4vw,40px)' }}>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#9E896A', marginBottom: 12 }}>
        My Dressa
      </p>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(28px,4vw,44px)', fontWeight: 700, color: '#1c1b1b', marginBottom: 8 }}>
        {t('Allgemeine Geschäftsbedingungen', 'Terms & Conditions')}
      </h1>
      <p style={{ fontSize: 13, color: '#9e9e9b', marginBottom: 48 }}>
        {t('Stand: Juni 2026', 'Last updated: June 2026')}
      </p>

      {[
        {
          title: t('1. Geltungsbereich', '1. Scope'),
          content: t(
            'Diese Allgemeinen Geschäftsbedingungen gelten für alle Käufe und Mietverträge, die über die Plattform My Dressa (mydressa.de) zwischen Kunden und registrierten Händlern abgeschlossen werden. My Dressa fungiert als Vermittlungsplattform und ist nicht selbst Vertragspartner des Kauf- oder Mietvertrages.',
            'These Terms & Conditions apply to all purchases and rental agreements concluded through the My Dressa platform (mydressa.de) between customers and registered merchants. My Dressa acts as an intermediary platform and is not itself a party to the purchase or rental agreement.'
          )
        },
        {
          title: t('2. Vertragsschluss', '2. Contract Formation'),
          content: t(
            'Ein Kaufvertrag kommt zustande, wenn der Kunde den Bestellvorgang abschließt und die Zahlung erfolgreich verarbeitet wird. Mit Absenden der Bestellung gibt der Kunde ein verbindliches Angebot ab. Die Annahme erfolgt durch die Bestellbestätigung per E-Mail.',
            'A purchase contract is concluded when the customer completes the order process and payment is successfully processed. By submitting the order, the customer makes a binding offer. Acceptance occurs through the order confirmation by email.'
          )
        },
        {
          title: t('3. Preise und Zahlung', '3. Prices and Payment'),
          content: t(
            'Alle Preise sind Endpreise in Euro (€) und verstehen sich inklusive der gesetzlichen Mehrwertsteuer. Die Zahlung erfolgt über Stripe und ist mit gängigen Kredit- und Debitkarten möglich. Die Belastung erfolgt zum Zeitpunkt der Bestellung.',
            'All prices are final prices in euros (€) and include the applicable statutory VAT. Payment is processed via Stripe and is possible with common credit and debit cards. The charge occurs at the time of the order.'
          )
        },
        {
          title: t('4. Versand und Lieferung', '4. Shipping and Delivery'),
          content: t(
            'Die Lieferung erfolgt per DHL innerhalb Deutschlands. Die Versandkosten werden im Bestellvorgang angezeigt. Die Lieferzeit beträgt in der Regel 2–5 Werktage nach Zahlungseingang. Bei Verzögerungen durch den Händler wird der Kunde umgehend informiert.',
            'Delivery is by DHL within Germany. Shipping costs are displayed during the ordering process. Delivery time is usually 2–5 business days after receipt of payment. The customer will be informed promptly in case of delays by the merchant.'
          )
        },
        {
          title: t('5. Widerrufsrecht (Kauf)', '5. Right of Withdrawal (Purchase)'),
          content: t(
            'Der Kunde hat das Recht, binnen 14 Tagen ohne Angabe von Gründen den Kaufvertrag zu widerrufen. Die Widerrufsfrist beginnt mit dem Tag, an dem der Kunde die Ware erhalten hat. Um das Widerrufsrecht auszuüben, muss der Kunde den Händler über die Plattform kontaktieren. Die Rücksendekosten trägt der Käufer, sofern nicht anders vereinbart. Bereits getragene oder beschädigte Artikel sind vom Widerruf ausgeschlossen.',
            'The customer has the right to withdraw from the purchase contract within 14 days without stating reasons. The withdrawal period begins on the day the customer received the goods. To exercise the right of withdrawal, the customer must contact the merchant through the platform. Return shipping costs are borne by the buyer unless otherwise agreed. Worn or damaged items are excluded from withdrawal.'
          )
        },
        {
          title: t('6. Mietbedingungen', '6. Rental Terms'),
          content: t(
            'Bei Mietbestellungen gelten zusätzlich die Mietbedingungen. Die maximale Mietdauer beträgt 7 Tage. Eine Kaution wird bei der Bestellung autorisiert (Hold) und nach erfolgreicher Rückgabe freigegeben. Bei Beschädigungen oder Verlust wird die Kaution ganz oder teilweise einbehalten. Der Mieter ist verpflichtet, das Kleidungsstück in gepflegtem Zustand zurückzusenden.',
            'For rental orders, the rental terms apply additionally. The maximum rental period is 7 days. A deposit is authorized (held) upon ordering and released after successful return. In case of damage or loss, the deposit will be retained in full or in part. The renter is obligated to return the garment in well-maintained condition.'
          )
        },
        {
          title: t('7. Haftung', '7. Liability'),
          content: t(
            'My Dressa haftet nicht für die Qualität, Echtheit oder den Zustand der von Händlern angebotenen Waren. Die Haftung von My Dressa ist auf Vorsatz und grobe Fahrlässigkeit beschränkt. Bei leichter Fahrlässigkeit haftet My Dressa nur bei Verletzung wesentlicher Vertragspflichten.',
            'My Dressa is not liable for the quality, authenticity, or condition of goods offered by merchants. My Dressa\'s liability is limited to intent and gross negligence. In case of slight negligence, My Dressa is only liable for breach of essential contractual obligations.'
          )
        },
        {
          title: t('8. Datenschutz', '8. Data Protection'),
          content: t(
            'Die Verarbeitung personenbezogener Daten erfolgt gemäß unserer Datenschutzerklärung und der DSGVO. Zahlungsdaten werden ausschließlich über Stripe verarbeitet und nicht auf unseren Servern gespeichert.',
            'The processing of personal data is carried out in accordance with our privacy policy and the GDPR. Payment data is processed exclusively via Stripe and is not stored on our servers.'
          )
        },
        {
          title: t('9. Streitbeilegung', '9. Dispute Resolution'),
          content: t(
            'Die EU-Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: https://ec.europa.eu/consumers/odr. My Dressa ist bereit, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.',
            'The EU Commission provides a platform for online dispute resolution (ODR): https://ec.europa.eu/consumers/odr. My Dressa is willing to participate in a dispute resolution procedure before a consumer arbitration board.'
          )
        },
        {
          title: t('10. Anwendbares Recht', '10. Applicable Law'),
          content: t(
            'Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Gerichtsstand ist, soweit gesetzlich zulässig, der Sitz von My Dressa.',
            'The law of the Federal Republic of Germany applies, excluding the UN Convention on Contracts for the International Sale of Goods. The place of jurisdiction, to the extent permitted by law, is the registered office of My Dressa.'
          )
        },
      ].map((section, i) => (
        <div key={i} style={{ marginBottom: 36, paddingBottom: 36, borderBottom: i < 9 ? '1px solid #f1edec' : 'none' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, color: '#1c1b1b', marginBottom: 12 }}>
            {section.title}
          </h2>
          <p style={{ fontSize: 14, color: '#5e5e5b', lineHeight: 1.8 }}>
            {section.content}
          </p>
        </div>
      ))}

      <div style={{ background: '#fdf8f8', border: '1px solid #e8e3e1', padding: '24px 28px', marginTop: 16 }}>
        <p style={{ fontSize: 13, color: '#5e5e5b', lineHeight: 1.7, margin: 0 }}>
          {t(
            'Bei Fragen zu diesen AGB wenden Sie sich bitte an uns:',
            'For questions about these Terms, please contact us:'
          )}{' '}
          <a href="mailto:info@mydressa.de" style={{ color: '#9E896A' }}>info@mydressa.de</a>
        </p>
      </div>

      <div style={{ marginTop: 32, display: 'flex', gap: 16 }}>
        <Link href="/privacy" style={{ fontSize: 12, color: '#9e9e9b', textDecoration: 'none' }}>
          {t('Datenschutz', 'Privacy Policy')}
        </Link>
        <Link href="/" style={{ fontSize: 12, color: '#9E896A', textDecoration: 'none' }}>
          ← {t('Zurück zur Startseite', 'Back to Home')}
        </Link>
      </div>
    </div>
  )
}
