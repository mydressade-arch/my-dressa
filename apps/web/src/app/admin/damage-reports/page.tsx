'use client'
import { useLangStore } from '@/store/lang.store'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useUI } from '@/components/ui/UIProvider'
import { Icon } from '@/components/ui/Icon'

const SEV_LABEL: Record<string, string> = {
  minor:    'Leicht',
  moderate: 'Mittel',
  severe:   'Schwer',
  lost:     'Verloren',
  late:     'Verspätet',
}
const SEV_LABEL_EN: Record<string, string> = {
  minor:    'Minor',
  moderate: 'Moderate',
  severe:   'Severe',
  lost:     'Lost',
  late:     'Late',
}
const SEV_STYLE: Record<string, {bg:string,color:string}> = {
  minor:    { bg:'#FAEEDA', color:'#633806' },
  moderate: { bg:'#FCEBEB', color:'#791F1F' },
  severe:   { bg:'#FCEBEB', color:'#ba1a1a' },
  lost:     { bg:'#f1edec', color:'#1c1b1b' },
  late:     { bg:'#FAEEDA', color:'#8a5a00' },
}

export default function AdminDamageReportsPage() {
  const { t } = useLangStore()
  const [reports, setReports]       = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState<'open'|'all'>('open')
  const [processing, setProcessing] = useState<string|null>(null)
  const { toast, confirm }          = useUI()

  const fmtD = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString(t('de-DE','en-GB'), { day:'2-digit', month:'short', year:'numeric' }) : '—'

  // Notiz-Modal
  const [noteModal, setNoteModal]   = useState<{id:string, action:'release'|'retain'|'dismiss'}|null>(null)
  const [noteText, setNoteText]     = useState('')
  const [merchantAmt, setMerchantAmt] = useState('')

  const load = () => {
    setLoading(true)
    api.get(tab === 'open' ? '/damage-reports' : '/damage-reports/all')
      .then(({ data }: any) => setReports(data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [tab])

  const openNoteModal = (id: string, action: 'release'|'retain'|'dismiss') => {
    setNoteText('')
    setNoteModal({ id, action })
  }

  const submitAction = async () => {
    if (!noteModal) return
    setProcessing(noteModal.id)
    try {
      const endpoint =
        noteModal.action === 'release' ? `/damage-reports/${noteModal.id}/release-deposit`
        : noteModal.action === 'retain' ? `/damage-reports/${noteModal.id}/retain-deposit`
        : `/damage-reports/${noteModal.id}/dismiss`
      const body: any = { note: noteText.trim() || undefined }
      if (noteModal.action === 'retain' && merchantAmt) body.merchantAmount = parseFloat(merchantAmt)
      await api.patch(endpoint, body)
      toast(
        noteModal.action === 'release'
          ? t('✓ Kaution komplett an Kunde zurückerstattet (Stripe Refund)','✓ Deposit fully refunded to the customer (Stripe refund)')
          : noteModal.action === 'retain'
            ? t('✗ Kautions-Entscheidung ausgeführt — Restbetrag geht an den Kunden zurück','✗ Deposit decision executed — remaining amount returned to the customer')
            : t('Meldung geschlossen','Report closed'),
        noteModal.action === 'retain' ? 'info' : 'success'
      )
      setNoteModal(null)
      load()
    } catch (e: any) {
      toast(e.response?.data?.message || t('Fehler','Error'), 'error')
    } finally { setProcessing(null) }
  }

  return (
    <div>
      <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:28, fontWeight:700, marginBottom:4 }}>
        {t('Schadensmeldungen','Damage reports')}
      </h1>
      <p style={{ color:'#5e5e5b', fontSize:14, marginBottom:24 }}>
        {t('Schadensmeldungen prüfen und Kaution entscheiden','Review damage reports and decide on the deposit')}
      </p>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid #c4c7c7', marginBottom:24 }}>
        {([['open',t('Offen', 'Open')], ['all',t('Alle','All')]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding:'10px 20px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', background:'none', border:'none', cursor:'pointer', borderBottom:`2px solid ${tab===id?'#1c1b1b':'transparent'}`, color:tab===id?'#1c1b1b':'#5e5e5b', marginBottom:-1 }}>
            {label}
            <span style={{ marginLeft:6, fontSize:10, background:'#f1edec', padding:'1px 6px', borderRadius:8 }}>
              {reports.filter(r => id === 'open' ? r.status !== 'resolved' : true).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[1,2].map(i => <div key={i} style={{ height:120, background:'#f1edec' }} />)}
        </div>
      ) : reports.length === 0 ? (
        <div style={{ textAlign:'center', padding:'64px 0', border:'1px solid #c4c7c7', color:'#5e5e5b' }}>
          <Icon name="check_circle" style={{ fontSize:'clamp(24px,3vw,40px)', display:'inline-block', marginBottom:12, color:'#c4c7c7' }} />
          {t('Keine Schadensmeldungen vorhanden','No damage reports')}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {reports.map((r: any) => {
            const s = SEV_STYLE[r.severity] || { bg:'#f1edec', color:'#5e5e5b' }
            const isOpen = r.status !== 'resolved'
            return (
              <div key={r.id} style={{ background:'#fff', border:'1px solid #e4ddd7', borderRadius:12, overflow:'hidden', boxShadow:'0 1px 2px rgba(28,27,27,.05)' }}>
                {/* Kopf: Produktbild + Infos + Aktionen */}
                <div style={{ display:'flex', flexWrap:'wrap' }}>
                  {/* Produktbild */}
                  <div style={{ flex:'0 0 128px', width:128, minHeight:128, background:'#f3ece2', alignSelf:'stretch' }}>
                    {r.product?.image ? (
                      <img src={r.product.image} alt={r.product?.title || ''}
                        style={{ width:'100%', height:'100%', minHeight:128, objectFit:'cover', display:'block' }} />
                    ) : (
                      <div style={{ width:'100%', height:'100%', minHeight:128, display:'grid', placeItems:'center', color:'#c4b79e' }}>
                        <Icon name="checkroom" style={{ fontSize:34 }} />
                      </div>
                    )}
                  </div>

                  {/* Infos */}
                  <div style={{ flex:'1 1 300px', minWidth:0, padding:'16px 20px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, flexWrap:'wrap' }}>
                      <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', padding:'3px 10px', borderRadius:4, background:s.bg, color:s.color }}>
                        {t(SEV_LABEL[r.severity] || r.severity, SEV_LABEL_EN[r.severity] || r.severity)}
                      </span>
                      <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', padding:'3px 10px', borderRadius:4, background:isOpen?'#FAEEDA':'#EAF3DE', color:isOpen?'#633806':'#27500A' }}>
                        {isOpen ? t('Offen','Open') : t('Erledigt','Resolved')}
                      </span>
                    </div>

                    <h3 style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:700, margin:'0 0 10px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {r.product?.title || t('Produkt','Product')}
                      {r.product?.size ? <span style={{ fontSize:13, fontWeight:400, color:'#9e9e9b' }}> · {t('Größe','Size')} {r.product.size}</span> : null}
                    </h3>

                    <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 20px', fontSize:13, color:'#5e5e5b' }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:5, minWidth:0 }}>
                        <Icon name="person" style={{ fontSize:16, color:'#9e9e9b' }} />
                        <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.customer?.name || '—'}</span>
                      </span>
                      {r.rental?.startDate && (
                        <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
                          <Icon name="event" style={{ fontSize:16, color:'#9e9e9b' }} />
                          {fmtD(r.rental.startDate)} – {fmtD(r.rental.endDate)}
                        </span>
                      )}
                      {r.deposit?.amount != null && (
                        <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
                          <Icon name="payments" style={{ fontSize:16, color:'#9e9e9b' }} />
                          {t('Kaution','Deposit')}: <strong style={{ color:'#1c1b1b' }}>€{r.deposit.amount.toFixed(2)}</strong>
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize:11, color:'#b8b2ad', marginTop:10 }}>
                      {new Date(r.createdAt).toLocaleDateString(t('de-DE','en-GB'), { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })}{t(' Uhr','')} · {t('Miete','Rental')} {r.rentalId?.slice(0,8)}…
                    </p>
                  </div>

                  {/* Aktionen */}
                  {isOpen && (
                    <div style={{ flex:'0 0 auto', padding:16, display:'flex', flexDirection:'column', gap:8, borderLeft:'1px solid #f1edec' }}>
                      <button onClick={() => openNoteModal(r.id, 'release')} disabled={processing === r.id}
                        style={{ padding:'9px 16px', background:'#27500A', color:'#fff', border:'none', borderRadius:6, fontSize:11.5, fontWeight:600, textTransform:'uppercase', cursor:'pointer', display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap', opacity:processing===r.id?0.5:1 }}>
                        <Icon name="undo" style={{ fontSize:16 }} />
                        {t('Kaution zurück','Refund deposit')}
                      </button>
                      <button onClick={() => openNoteModal(r.id, 'retain')} disabled={processing === r.id}
                        style={{ padding:'9px 16px', background:'#ba1a1a', color:'#fff', border:'none', borderRadius:6, fontSize:11.5, fontWeight:600, textTransform:'uppercase', cursor:'pointer', display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap', opacity:processing===r.id?0.5:1 }}>
                        <Icon name="money_off" style={{ fontSize:16 }} />
                        {t('Einbehalten','Retain')}
                      </button>
                      <button onClick={() => openNoteModal(r.id, 'dismiss')} disabled={processing === r.id}
                        style={{ padding:'9px 16px', background:'none', color:'#5e5e5b', border:'1px solid #c4c7c7', borderRadius:6, fontSize:11.5, fontWeight:600, textTransform:'uppercase', cursor:'pointer', display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap', opacity:processing===r.id?0.5:1 }}>
                        <Icon name="close" style={{ fontSize:16 }} />
                        {t('Schließen','Close')}
                      </button>
                    </div>
                  )}
                </div>

                {/* Beschreibung / Fotos / Ergebnis */}
                <div style={{ padding:'14px 20px 18px', borderTop:'1px solid #f4efec' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom: (r.photoUrls?.length || r.resolution) ? 14 : 0 }}>
                    <Icon name="description" style={{ fontSize:16, color:'#c4b79e', marginTop:2 }} />
                    <p style={{ fontSize:13.5, color:'#1c1b1b', lineHeight:1.6, margin:0 }}>
                      {r.description || t('Keine Beschreibung','No description')}
                    </p>
                  </div>

                  {/* Fotos */}
                  {r.photoUrls?.length > 0 && (
                    <div style={{ marginBottom: r.resolution ? 14 : 0 }}>
                      <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:'#9e9e9b', marginBottom:6 }}>
                        {t('Beweisfotos','Proof photos')} ({r.photoUrls.length})
                      </p>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        {r.photoUrls.map((url: string, i: number) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" title={t('Foto vergrößern','Enlarge photo')}>
                            <img src={url} alt={`${t('Beweisfoto','Proof photo')} ${i+1}`}
                              style={{ width:92, height:92, objectFit:'cover', borderRadius:8, border:'1px solid #e8e3e1', cursor:'pointer' }} />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ergebnis */}
                  {r.resolution && (
                    <div style={{
                      background: r.resolution.startsWith('✓') ? '#EAF3DE' : '#FCEBEB',
                      padding:'10px 14px', fontSize:13, borderRadius:8,
                      color: r.resolution.startsWith('✓') ? '#27500A' : '#791F1F',
                      display:'flex', alignItems:'center', gap:8,
                    }}>
                      <Icon name={r.resolution?.startsWith('✓') ? 'check_circle' : r.resolution?.startsWith('↩') ? 'undo' : 'cancel'} style={{ fontSize:16 }} />
                      {r.resolution}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Notiz-Modal */}
      {noteModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#fff', padding:28, maxWidth:440, width:'90%' }}>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700, marginBottom:8 }}>
              {noteModal.action === 'release' ? t('↩ Kaution an Kunde zurückgeben','↩ Return deposit to customer')
                : noteModal.action === 'dismiss' ? t('Meldung schließen','Close report')
                : t('✗ Kaution einbehalten', '✗ Retain deposit')}
            </h2>

            {noteModal.action === 'release' ? (
              <div style={{ background:'#EAF3DE', padding:'10px 14px', fontSize:13, color:'#27500A', marginBottom:16 }}>
                {t('Der Stripe-Hold wird storniert. Die reservierte Kaution wird auf der Karte des Kunden freigegeben.','The Stripe hold is cancelled. The reserved deposit is released on the customer\'s card.')}
              </div>
            ) : noteModal.action === 'dismiss' ? (
              <div style={{ background:'#f7f3f2', border:'1px solid #e8e3e1', padding:'10px 14px', fontSize:13, color:'#5e5e5b', marginBottom:16, lineHeight:1.5 }}>
                {t('Schließt diese Meldung OHNE Kautions-Aktion. Nutze das für Duplikate oder wenn die Kaution dieser Miete bereits über eine andere Meldung entschieden wurde.','Closes this report WITHOUT any deposit action. Use it for duplicates or when this rental\'s deposit was already decided via another report.')}
              </div>
            ) : (
              <>
                <div style={{ background:'#FCEBEB', padding:'10px 14px', fontSize:13, color:'#791F1F', marginBottom:12 }}>
                  {t('Kaution wird abgebucht (Stripe Capture). Kunde erhält nichts zurück.','The deposit is captured (Stripe Capture). The customer receives nothing back.')}
                </div>
                <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.1em', color:'#5e5e5b', display:'block', marginBottom:6 }}>
                  {t('Betrag, der einbehalten wird (€)','Amount to retain (€)')}
                </label>
                <input type="number" step="0.01" min="0"
                  value={merchantAmt} onChange={e => setMerchantAmt(e.target.value)}
                  placeholder={t('z.B. 30.00 — leer = komplette Kaution einbehalten','e.g. 30.00 — empty = retain full deposit')}
                  style={{ width:'100%', padding:'10px 14px', fontSize:13, border:'1px solid #c4c7c7', outline:'none', boxSizing:'border-box' as const, marginBottom: merchantAmt ? 8 : 16 }} />
                {merchantAmt && (
                  <div style={{ background:'#E6F1FB', padding:'8px 12px', fontSize:12, color:'#0C447C', marginBottom:12 }}>
                    💡 {t(`€${merchantAmt} werden einbehalten und an den Händler überwiesen. Der Rest der Kaution geht automatisch an den Kunden zurück.`,`€${merchantAmt} will be retained and transferred to the merchant. The rest of the deposit is returned to the customer automatically.`)}
                  </div>
                )}
              </>
            )}

            <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b', display:'block', marginBottom:6 }}>
              {t('Begründung (optional)','Reason (optional)')}
            </label>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder={noteModal.action === 'release'
                ? t('z.B. Kleiner Schaden akzeptiert, Kleid noch tragbar','e.g. Minor damage accepted, dress still wearable')
                : t('z.B. Großer Fleck auf dem Kleid, nicht mehr tragbar','e.g. Large stain on the dress, no longer wearable')}
              rows={3}
              style={{ width:'100%', padding:'10px 14px', fontSize:13, border:'1px solid #c4c7c7', outline:'none', resize:'vertical', boxSizing:'border-box' as const, marginBottom:20 }}
            />

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={submitAction} disabled={!!processing}
                style={{
                  flex:1, border:'none', padding:'12px', fontSize:12, fontWeight:600,
                  textTransform:'uppercase' as const, cursor:'pointer',
                  background: noteModal.action === 'release' ? '#27500A' : noteModal.action === 'dismiss' ? '#5e5e5b' : '#ba1a1a',
                  color:'#fff', opacity: processing ? 0.5 : 1,
                }}>
                {processing ? t('Verarbeite...','Processing...') : noteModal.action === 'release' ? t('✓ Freigeben','✓ Release') : noteModal.action === 'dismiss' ? t('Schließen','Close') : t('✗ Einbehalten', '✗ Retain')}
              </button>
              <button onClick={() => setNoteModal(null)}
                style={{ background:'none', border:'1px solid #c4c7c7', padding:'12px 20px', fontSize:12, cursor:'pointer', color:'#5e5e5b' }}>
                {t('Abbrechen','Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
