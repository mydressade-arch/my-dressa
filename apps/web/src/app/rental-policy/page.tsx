export default function RentalPolicyPage() {
  return (
    <div style={{ maxWidth:860, margin:'0 auto', padding:'64px 40px' }}>
      <p style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#9E896A', marginBottom:12 }}>Information</p>
      <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:40, fontWeight:700, marginBottom:8 }}>Rental Policy</h1>
      <p style={{ color:'#5e5e5b', fontSize:14, marginBottom:48 }}>Everything you need to know about renting on My Dressa.</p>

      {[
        { icon:'calendar_month', title:'Rental Duration', desc:'Minimum 1 day, maximum 7 days per rental. You may have up to 3 active rentals simultaneously.' },
        { icon:'local_shipping', title:'Shipping', desc:'Shipping costs are paid by the customer. We provide pre-paid return labels for convenient drop-off at any partner location.' },
        { icon:'security', title:'Security Deposit', desc:'A €50 deposit is held on your card during the rental period. It is released automatically within 3-5 business days after successful return.' },
        { icon:'dry_cleaning', title:'Cleaning', desc:'All items are professionally cleaned before and after each rental. A €15 cleaning fee is included in your rental total.' },
        { icon:'assignment_return', title:'Returns', desc:'Items must be returned by the agreed end date. Late returns incur a fee of the daily rental rate per day. The merchant is responsible for confirming condition upon return.' },
        { icon:'report_problem', title:'Damage Policy', desc:'Customers are liable for damage beyond normal wear. In case of damage or loss, the security deposit may be partially or fully retained. Merchants report damages through the dashboard.' },
      ].map(({icon,title,desc})=>(
        <div key={title} style={{ display:'flex', gap:20, padding:'24px 0', borderBottom:'1px solid #f1edec' }}>
          <div style={{ width:48, height:48, background:'#f1edec', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span className="material-symbols-outlined" style={{ fontSize:24, color:'#9E896A' }}>{icon}</span>
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
