'use client'
import { Icon } from '@/components/ui/Icon'
import { useLangStore } from '@/store/lang.store'

export default function RentalPolicyPage() {
  const { t } = useLangStore()
  return (
    <div style={{ maxWidth:860, margin:'0 auto', width:'100%', padding:'clamp(32px,4vw,64px) clamp(16px,4vw,40px)' }}>
      <p style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#9E896A', marginBottom:12 }}>{t('Information','Information')}</p>
      <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:'clamp(24px,3vw,40px)', fontWeight:700, marginBottom:8 }}>{t('Mietbedingungen','Rental Policy')}</h1>
      <p style={{ color:'#5e5e5b', fontSize:14, marginBottom:48 }}>{t('Alles, was du über das Mieten bei My Dressa wissen musst.','Everything you need to know about renting on My Dressa.')}</p>

      {[
        { icon:'calendar_month', title:t('Mietdauer','Rental Duration'), desc:t('Die Mietdauer legt der Händler pro Artikel fest. Du kannst bis zu 3 aktive Mieten gleichzeitig haben.','The rental duration is set by the merchant per item. You may have up to 3 active rentals simultaneously.') },
        { icon:'local_shipping', title:t('Versand','Shipping'), desc:t('Die Versandkosten trägt die Kundin bzw. der Kunde. Für die Rücksendung erhältst du die nötigen Hinweise.','Shipping costs are paid by the customer. You receive the instructions needed for the return.') },
        { icon:'security', title:t('Kaution','Security Deposit'), desc:t('Während der Mietdauer wird eine Kaution auf deiner Karte reserviert (nicht abgebucht). Sie wird nach erfolgreicher Rückgabe automatisch wieder freigegeben.','A deposit is reserved on your card during the rental period (not charged). It is released automatically after a successful return.') },
        { icon:'dry_cleaning', title:t('Reinigung','Cleaning'), desc:t('Alle Artikel werden vor und nach jeder Miete professionell gereinigt.','All items are professionally cleaned before and after each rental.') },
        { icon:'assignment_return', title:t('Rückgabe','Returns'), desc:t('Artikel müssen bis zum vereinbarten Enddatum zurückgesendet werden. Verspätete Rückgaben können eine Gebühr nach sich ziehen. Der Händler bestätigt den Zustand bei Rückgabe.','Items must be returned by the agreed end date. Late returns may incur a fee. The merchant confirms the condition upon return.') },
        { icon:'report_problem', title:t('Schadensregelung','Damage Policy'), desc:t('Kundinnen und Kunden haften für Schäden über die normale Abnutzung hinaus. Bei Schaden oder Verlust kann die Kaution teilweise oder vollständig einbehalten werden. Händler melden Schäden über ihr Portal.','Customers are liable for damage beyond normal wear. In case of damage or loss, the security deposit may be partially or fully retained. Merchants report damages through their dashboard.') },
      ].map(({icon,title,desc})=>(
        <div key={title} style={{ display:'flex', gap:20, padding:'24px 0', borderBottom:'1px solid #f1edec' }}>
          <div style={{ width:48, height:48, background:'#f1edec', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name={icon} style={{ fontSize:24, color:'#9E896A' }} />
          </div>
          <div>
            <h3 style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:600, marginBottom:6 }}>{title}</h3>
            <p style={{ fontSize:14, color:'#5e5e5b', lineHeight:1.7 }}>{desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
