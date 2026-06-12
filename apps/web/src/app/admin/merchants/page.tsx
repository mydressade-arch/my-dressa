'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import Link from 'next/link'
import { useLangStore } from '@/store/lang.store'

export default function AdminMerchantsPage() {
  const { t } = useLangStore()
  const [merchants, setMerchants] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [bankModal, setBankModal] = useState<any>(null)
  const [bankLoading, setBankLoading] = useState(false)

  const showBank = async (merchantId: string, shopName: string) => {
    setBankLoading(true)
    setBankModal({ merchantId, shopName, data: null })
    try {
      const { data } = await api.get(`/bank/admin/${merchantId}`) as any
      setBankModal({ merchantId, shopName, data })
    } catch { setBankModal({ merchantId, shopName, data: { hasBank: false } }) }
    finally { setBankLoading(false) }
  }

  useEffect(() => {
    api.get('/admin/merchants')
      .then(({ data }: any) => setMerchants(data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = merchants.filter(m =>
    !search ||
    m.shopName?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:32 }}>
        <div>
          <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:28, fontWeight:700, marginBottom:4 }}>Händler</h1>
          <p style={{ color:'#5e5e5b', fontSize:14 }}>{merchants.length} registrierte Shops</p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Shop oder E-Mail suchen..."
          style={{ padding:'10px 14px', fontSize:13, border:'1px solid #c4c7c7', outline:'none', width:240 }}
        />
      </div>

      <div style={{ background:'#fff', border:'1px solid #c4c7c7', overflow:'auto' }}>
        <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse', minWidth:900 }}>
          <thead>
            <tr style={{ borderBottom:'1px solid #c4c7c7', background:'#fdf8f8' }}>
              {['Shop Name',t('Inhaber', 'Owner'),'E-Mail',t('Produkte', 'Products'),'Stripe',t(t('Verifiziert', 'Verified'), 'Verified'),t(t('Ausstehend', 'Pending'), 'Pending'),t(t('Ausgezahlt', 'Paid Out'), 'Paid Out'),t('Seit', 'Since'),'Bank'].map(h => (
                <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3].map(i => <tr key={i}><td colSpan={9} style={{ padding:'12px 16px' }}><div style={{ height:16, background:'#f1edec', borderRadius:4 }} /></td></tr>)
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ padding:'48px', textAlign:'center', color:'#5e5e5b' }}>Keine Händler gefunden</td></tr>
            ) : filtered.map((m: any) => (
              <tr key={m.id} style={{ borderBottom:'1px solid #f9f6f5' }}>
                <td style={{ padding:'14px 16px', fontWeight:700 }}>
                  <Link href={`/admin/merchants/${m.id}`} style={{ color:'#9E896A', textDecoration:'none', fontWeight:700 }}>
                    {m.shopName || '—'}
                  </Link>
                </td>
                <td style={{ padding:'14px 16px' }}>
                  {m.firstName} {m.lastName}
                </td>
                <td style={{ padding:'14px 16px', color:'#5e5e5b', fontSize:12 }}>
                  {m.email}
                </td>
                <td style={{ padding:'14px 16px', textAlign:'center' }}>
                  <span style={{ fontSize:11, fontWeight:700, background:'#f1edec', padding:'2px 8px', borderRadius:10 }}>
                    {m.productCount}
                  </span>
                </td>
                <td style={{ padding:'14px 16px' }}>
                  {m.stripeConnected ? (
                    <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', padding:'3px 8px', background:'#EAF3DE', color:'#27500A' }}>✓ Verbunden</span>
                  ) : (
                    <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', padding:'3px 8px', background:'#FCEBEB', color:'#791F1F' }}>✗ Fehlt</span>
                  )}
                </td>
                <td style={{ padding:'14px 16px' }}>
                  {m.isVerified ? (
                    <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', padding:'3px 8px', background:'#EAF3DE', color:'#27500A' }}>✓ Ja</span>
                  ) : (
                    <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', padding:'3px 8px', background:'#FAEEDA', color:'#633806' }}>⏳ Nein</span>
                  )}
                </td>
                <td style={{ padding:'14px 16px', color:'#633806', fontWeight:600 }}>
                  €{Number(m.balancePending||0).toFixed(2)}
                </td>
                <td style={{ padding:'14px 16px', color:'#27500A', fontWeight:600 }}>
                  €{Number(m.balancePaid||0).toFixed(2)}
                </td>
                <td style={{ padding:'14px 16px', color:'#9e9e9b', fontSize:12 }}>
                  {new Date(m.createdAt).toLocaleDateString('de-DE')}
                </td>
                <td style={{ padding:'14px 16px' }}>
                  <button onClick={() => showBank(m.id, m.shopName)}
                    style={{ fontSize:11, fontWeight:600, padding:'5px 10px', background:'none', border:'1px solid #c4c7c7', cursor:'pointer', color:'#5e5e5b', display:'flex', alignItems:'center', gap:4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize:13 }}>account_balance</span>
                    IBAN
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {bankModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#fff', padding:28, maxWidth:440, width:'90%' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:700 }}>
                {bankModal.shopName} — Bankverbindung
              </h2>
              <button onClick={() => setBankModal(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20 }}>×</button>
            </div>
            {bankLoading ? (
              <p style={{ color:'#5e5e5b', fontSize:13, padding:'20px 0', textAlign:'center' }}>Laden...</p>
            ) : bankModal.data?.hasBank ? (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ background:'#FAEEDA', padding:'8px 12px', fontSize:12, color:'#633806', display:'flex', gap:6, alignItems:'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize:14 }}>lock</span>
                  Vertraulich — nur für interne Nutzung
                </div>
                {[
                  ['Kontoinhaber', bankModal.data.accountName, false],
                  [t('IBAN', 'IBAN'), bankModal.data.iban, true],
                  ['BIC', bankModal.data.bic, true],
                  ['Bank', bankModal.data.bankName, false],
                ].filter(([,v]) => v).map(([label, value, mono]) => (
                  <div key={label as string} style={{ background:'#fdf8f8', padding:'10px 14px' }}>
                    <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#9e9e9b', marginBottom:4 }}>{label as string}</p>
                    <p style={{ fontSize:14, fontFamily: mono ? 'monospace' : 'inherit', userSelect:'all' as const }}>{value as string}</p>
                  </div>
                ))}
                <button onClick={() => navigator.clipboard.writeText(bankModal.data.iban)}
                  style={{ padding:'10px', background:'#1c1b1b', color:'#fff', border:'none', fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6, justifyContent:'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize:14 }}>content_copy</span>
                  IBAN kopieren
                </button>
              </div>
            ) : (
              <div style={{ textAlign:'center', padding:'32px 0', color:'#5e5e5b' }}>
                <span className="material-symbols-outlined" style={{ fontSize:36, display:'block', marginBottom:8, color:'#c4c7c7' }}>account_balance</span>
                <p style={{ fontSize:13 }}>Keine Bankverbindung hinterlegt</p>
                <p style={{ fontSize:12, color:'#9e9e9b', marginTop:4 }}>Händler muss IBAN unter Merchant → Bankverbindung eingeben</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
