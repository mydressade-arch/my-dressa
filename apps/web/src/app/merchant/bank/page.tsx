'use client'
import { useLangStore } from '@/store/lang.store'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useUI } from '@/components/ui/UIProvider'

export default function MerchantBankPage() {
  const { t } = useLangStore()
  const { toast } = useUI()
  const [bankData, setBankData]   = useState<any>(null)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm] = useState({ accountName: '', iban: '', bic: '', bankName: '' })

  useEffect(() => {
    api.get('/bank/account')
      .then(({ data }: any) => { setBankData(data); if (!data.hasBank) setShowForm(true) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await api.post('/bank/account', form) as any
      setBankData({ hasBank: true, ibanMasked: data.ibanMasked, accountName: form.accountName, bic: form.bic, bankName: form.bankName })
      setShowForm(false)
      toast('Bankdaten gespeichert ✓', 'success')
    } catch (e: any) {
      toast(e.response?.data?.message || 'Fehler', 'error')
    } finally { setSaving(false) }
  }

  if (loading) return <div style={{ padding:64, textAlign:'center' }}>Laden...</div>

  return (
    <div style={{ maxWidth:600 }}>
      <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:28, fontWeight:700, marginBottom:8 }}>Bankverbindung</h1>
      <p style={{ color:'#5e5e5b', fontSize:14, marginBottom:32 }}>Für Auszahlungen ohne Stripe. Wird mit AES-256 verschlüsselt gespeichert.</p>

      {bankData?.hasBank && !showForm && (
        <div style={{ background:'#fff', border:'1px solid #c4c7c7', padding:24, marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:40, height:40, borderRadius:'50%', background:'#EAF3DE', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize:20, color:'#27500A' }}>account_balance</span>
              </div>
              <div>
                <p style={{ fontWeight:600, fontSize:15 }}>{bankData.accountName}</p>
                <p style={{ fontSize:12, color:'#5e5e5b' }}>{bankData.bankName || 'Bank'}</p>
              </div>
            </div>
            <button onClick={() => setShowForm(true)} style={{ fontSize:12, fontWeight:600, textTransform:'uppercase', padding:'8px 16px', background:'none', border:'1px solid #c4c7c7', cursor:'pointer' }}>Ändern</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div style={{ background:'#fdf8f8', padding:'12px 16px' }}>
              <p style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', color:'#9e9e9b', marginBottom:4 }}>IBAN</p>
              <p style={{ fontSize:14, fontFamily:'monospace' }}>{bankData.ibanMasked}</p>
            </div>
            {bankData.bic && (
              <div style={{ background:'#fdf8f8', padding:'12px 16px' }}>
                <p style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', color:'#9e9e9b', marginBottom:4 }}>BIC</p>
                <p style={{ fontSize:14, fontFamily:'monospace' }}>{bankData.bic}</p>
              </div>
            )}
          </div>
          <div style={{ background:'#E6F1FB', padding:'10px 14px', marginTop:16, fontSize:12, color:'#0C447C', display:'flex', gap:8 }}>
            <span className="material-symbols-outlined" style={{ fontSize:16 }}>lock</span>
            IBAN ist AES-256 verschlüsselt. Nur Admins sehen die vollständige IBAN.
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={save} style={{ background:'#fff', border:'1px solid #c4c7c7', padding:24 }}>
          <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:600, marginBottom:20 }}>Bankdaten eingeben</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {[
              { key:'accountName', label:'Kontoinhaber *', placeholder:t('Max Mustermann', 'John Doe'), mono:false },
              { key:'iban', label:'IBAN *', placeholder:'DE89 3704 0044 0532 0130 00', mono:true },
              { key:'bic', label:'BIC / SWIFT', placeholder:'COBADEFFXXX', mono:true },
              { key:'bankName', label:'Bank Name', placeholder:'Commerzbank', mono:false },
            ].map(({ key, label, placeholder, mono }) => (
              <div key={key}>
                <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b', display:'block', marginBottom:6 }}>{label}</label>
                <input value={(form as any)[key]}
                  onChange={e => setForm(f => ({...f, [key]: key==='iban'||key==='bic' ? e.target.value.toUpperCase() : e.target.value}))}
                  placeholder={placeholder}
                  style={{ width:'100%', padding:'10px 14px', fontSize:14, border:'1px solid #c4c7c7', outline:'none', fontFamily: mono ? 'monospace' : 'inherit', boxSizing:'border-box' as const }} />
              </div>
            ))}
          </div>
          <div style={{ background:'#FAEEDA', padding:'10px 14px', marginTop:16, fontSize:12, color:'#633806', display:'flex', gap:8 }}>
            <span className="material-symbols-outlined" style={{ fontSize:16 }}>security</span>
            Deine IBAN wird verschlüsselt. My Dressa sieht nur die letzten 4 Stellen.
          </div>
          <div style={{ display:'flex', gap:10, marginTop:20 }}>
            <button type="submit" disabled={saving || !form.accountName || !form.iban}
              style={{ flex:1, background:'#1c1b1b', color:'#fff', border:'none', padding:14, fontSize:12, fontWeight:600, textTransform:'uppercase', cursor:'pointer', opacity:(saving||!form.accountName||!form.iban)?0.5:1 }}>
              {saving ? t('Speichern...', 'Saving...') : '🔒 Sicher speichern'}
            </button>
            {bankData?.hasBank && (
              <button type="button" onClick={() => setShowForm(false)}
                style={{ padding:'14px 20px', background:'none', border:'1px solid #c4c7c7', fontSize:12, cursor:'pointer' }}>Abbrechen</button>
            )}
          </div>
        </form>
      )}
    </div>
  )
}
