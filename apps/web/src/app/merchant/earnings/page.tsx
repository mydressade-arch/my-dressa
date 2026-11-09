'use client'
import { useState, useEffect } from 'react'
import { commissionsApi, api } from '@/lib/api'
import { useLangStore } from '@/store/lang.store'
import { useAuthStore } from '@/store/auth.store'
import { Icon } from '@/components/ui/Icon'

const STATUS_STYLE: Record<string, {bg:string,color:string}> = {
  pending:    { bg:'#FAEEDA', color:'#633806' },
  processing: { bg:'#E6F1FB', color:'#0C447C' },
  paid:       { bg:'#EAF3DE', color:'#27500A' },
  failed:     { bg:'#FCEBEB', color:'#ba1a1a' },
  rejected:   { bg:'#FCEBEB', color:'#ba1a1a' },
}

export default function MerchantEarningsPage() {
  const { t } = useLangStore()
  const { user } = useAuthStore()
  const [stats, setStats]     = useState<any>(null)
  const [payouts, setPayouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [note, setNote]       = useState('')
  const [showForm, setShowForm] = useState(false)
  const [msg, setMsg]         = useState('')
  const [transfers, setTransfers] = useState<any[]>([])
  const [msgType, setMsgType] = useState<'ok'|'err'>('ok')
  const [history, setHistory] = useState<any[]>([])
  const [stripeStatus, setStripeStatus] = useState<any>(null)
  const [bankStatus, setBankStatus] = useState<any>(null)

  const load = () => {
    Promise.all([
      commissionsApi.merchantStats(),
      commissionsApi.merchantPayouts(),
      api.get('/payments/merchant/transfers').catch(() => ({ data: [] })),
      commissionsApi.merchantHistory().catch(() => ({ data: [] })),
      api.get('/payments/merchant/stripe-status').catch(() => ({ data: null })),
      api.get('/bank/account').catch(() => ({ data: null })),
    ]).then(([s, p, tr, h, ss, bk]: any) => {
      setStats(s.data)
      setPayouts(p.data || [])
      setTransfers(tr.data || [])
      setHistory(h.data || [])
      setStripeStatus(ss.data || null)
      setBankStatus(bk.data || null)
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const notify = (text: string, type: 'ok'|'err' = 'ok') => {
    setMsg(text); setMsgType(type)
    setTimeout(() => setMsg(''), 4000)
  }

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault()
    setRequesting(true)
    try {
      const { data } = await api.post('/commissions/request-payout', { note: note || undefined }) as any
      notify(data.message)
      setShowForm(false)
      setNote('')
      load()
    } catch (e: any) {
      notify(e.response?.data?.message || 'Fehler', 'err')
    } finally { setRequesting(false) }
  }

  const badge = (status: string) => {
    const s = STATUS_STYLE[status] || { bg:'#f1edec', color:'#5e5e5b' }
    return (
      <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.08em', padding:'3px 8px', background:s.bg, color:s.color }}>
        {status}
      </span>
    )
  }

  // ── Export-Helfer ──────────────────────────────────────────────────────────
  const fmtEur  = (n: number) => Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtDate = (d: any) => new Date(d).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' })
  const artLabel    = (type: string) => type === 'rental' ? 'Miete' : 'Kauf'
  const statusLabel = (s: string) => s === 'paid' ? 'Ausgezahlt' : 'Ausstehend'
  const merchantName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Händler'
  const escapeHtml = (s: any) => String(s ?? '').replace(/[&<>"]/g, c => (({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'} as any)[c]))

  const sumBy = (arr: any[], key: string, filterFn?: (h:any)=>boolean) =>
    arr.filter(h => filterFn ? filterFn(h) : true).reduce((a, h) => a + Number(h[key] || 0), 0)

  // CSV-Export — Excel-kompatibel (Semikolon-Trenner + UTF-8 BOM + dt. Zahlen)
  const exportCSV = () => {
    const esc = (v: any) => {
      const s = String(v ?? '')
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const header = ['Datum','Artikel','Größe','Art','Brutto (EUR)','Gebühr (EUR)','Dein Netto (EUR)','Status']
    const lines = history.map(h => [
      fmtDate(h.date), h.productTitle, h.size || '', artLabel(h.type),
      fmtEur(h.gross), fmtEur(h.fee), fmtEur(h.net), statusLabel(h.status),
    ].map(esc).join(';'))
    const sumLine = ['','','','SUMME', fmtEur(sumBy(history,'gross')), fmtEur(sumBy(history,'fee')), fmtEur(sumBy(history,'net')), ''].map(esc).join(';')
    const csv = '﻿' + [header.join(';'), ...lines, '', sumLine].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `MyDressa_Einnahmen_${new Date().toISOString().slice(0,10)}.csv`
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
  }

  // PDF-Export — gestyltes Abrechnungs-Template, Druck-Dialog → "Als PDF speichern"
  const exportPDF = () => {
    const totGross = sumBy(history,'gross'), totFee = sumBy(history,'fee'), totNet = sumBy(history,'net')
    const paidNet  = sumBy(history,'net', h => h.status==='paid')
    const pendNet  = sumBy(history,'net', h => h.status!=='paid')
    const rowsHtml = history.map(h => `
      <tr>
        <td>${fmtDate(h.date)}</td>
        <td class="item">${escapeHtml(h.productTitle)}${h.size ? ` · ${escapeHtml(h.size)}` : ''}</td>
        <td><span class="tag ${h.type==='rental'?'rent':'sale'}">${artLabel(h.type)}</span></td>
        <td class="num">€${fmtEur(h.gross)}</td>
        <td class="num fee">−€${fmtEur(h.fee)}</td>
        <td class="num net">+€${fmtEur(h.net)}</td>
        <td><span class="st ${h.status==='paid'?'paid':'pend'}">${statusLabel(h.status)}</span></td>
      </tr>`).join('')
    const today = new Date().toLocaleDateString(t('de-DE','en-GB'), { day:'2-digit', month:'long', year:'numeric' })
    const html = `<!doctype html><html lang="${t('de','en')}"><head><meta charset="utf-8">
<title>${t('My Dressa — Einnahmen-Abrechnung','My Dressa — Earnings Statement')}</title>
<style>
* { box-sizing:border-box; }
body { font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif; color:#1c1b1b; margin:0; padding:40px; }
.head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #1c1b1b; padding-bottom:20px; margin-bottom:24px; }
.brand { font-family:Georgia,'Times New Roman',serif; font-size:26px; font-weight:700; }
.brand small { display:block; font-size:10px; font-weight:400; letter-spacing:0.25em; text-transform:uppercase; color:#9E896A; margin-top:3px; }
.doc { text-align:right; font-size:12px; color:#5e5e5b; line-height:1.7; }
.doc b { color:#1c1b1b; font-size:14px; }
.meta { display:flex; justify-content:space-between; font-size:12px; color:#5e5e5b; margin-bottom:22px; }
.meta b { color:#1c1b1b; }
.cards { display:flex; gap:12px; margin-bottom:26px; }
.card { flex:1; border:1px solid #e3dedd; padding:14px 16px; }
.card .l { font-size:9px; text-transform:uppercase; letter-spacing:0.12em; color:#9e9e9b; margin-bottom:6px; }
.card .v { font-size:19px; font-weight:700; font-family:Georgia,serif; }
table { width:100%; border-collapse:collapse; font-size:11.5px; }
thead th { text-align:left; font-size:9px; text-transform:uppercase; letter-spacing:0.1em; color:#9e9e9b; border-bottom:1.5px solid #1c1b1b; padding:8px 10px; }
tbody td { padding:8px 10px; border-bottom:1px solid #f1edec; }
.num { text-align:right; white-space:nowrap; } .fee { color:#9e5a5a; } .net { color:#064E3B; font-weight:700; } .item { font-weight:600; }
.tag,.st { font-size:9px; font-weight:700; text-transform:uppercase; padding:2px 7px; }
.tag.rent { background:#E6F1FB; color:#0C447C; } .tag.sale { background:#EAF3DE; color:#27500A; }
.st.paid { background:#EAF3DE; color:#27500A; } .st.pend { background:#FAEEDA; color:#633806; }
tfoot td { padding:12px 10px; border-top:2px solid #1c1b1b; font-weight:700; }
.foot { margin-top:28px; padding-top:14px; border-top:1px solid #e3dedd; font-size:10px; color:#9e9e9b; line-height:1.7; }
@page { margin:14mm; } @media print { body { padding:0; } }
</style></head><body>
<div class="head">
  <div class="brand">My Dressa<small>${t('Mode-Verleih','Fashion Rental')}</small></div>
  <div class="doc"><b>${t('Einnahmen-Abrechnung','Earnings Statement')}</b><br>${t('Erstellt am','Created on')} ${today}</div>
</div>
<div class="meta">
  <div><b>${escapeHtml(merchantName)}</b><br>${escapeHtml(user?.email || '')}</div>
  <div style="text-align:right">${history.length} ${t('Transaktionen','transactions')}</div>
</div>
<div class="cards">
  <div class="card"><div class="l">${t('Gesamt verdient','Total earned')}</div><div class="v">€${fmtEur(totNet)}</div></div>
  <div class="card"><div class="l">${t('Ausgezahlt','Paid out')}</div><div class="v">€${fmtEur(paidNet)}</div></div>
  <div class="card"><div class="l">${t('Ausstehend','Pending')}</div><div class="v">€${fmtEur(pendNet)}</div></div>
</div>
<table>
  <thead><tr>
    <th>${t('Datum','Date')}</th><th>${t('Artikel','Item')}</th><th>${t('Art','Type')}</th>
    <th style="text-align:right">${t('Brutto','Gross')}</th><th style="text-align:right">${t('Gebühr','Fee')}</th>
    <th style="text-align:right">${t('Dein Netto','Your net')}</th><th>${t('Status','Status')}</th>
  </tr></thead>
  <tbody>${rowsHtml}</tbody>
  <tfoot><tr>
    <td colspan="3">${t('SUMME','TOTAL')}</td>
    <td class="num">€${fmtEur(totGross)}</td>
    <td class="num">−€${fmtEur(totFee)}</td>
    <td class="num net">+€${fmtEur(totNet)}</td>
    <td></td>
  </tr></tfoot>
</table>
<div class="foot">
  ${t('My Dressa berechnet 15 % Provision auf Verkäufe und 10 % auf Mieten. Versandkosten gehen vollständig an den Händler.','My Dressa charges 15% commission on sales and 10% on rentals. Shipping costs go entirely to the merchant.')}<br>
  ${t('Diese Abrechnung wurde automatisch erstellt und dient zur Übersicht. My Dressa · Made in Germany.','This statement was generated automatically for your overview. My Dressa · Made in Germany.')}
</div>
<script>window.onload=function(){setTimeout(function(){window.print()},350)}<\/script>
</body></html>`
    const w = window.open('', '_blank')
    if (!w) { notify(t('Bitte Pop-ups erlauben, um das PDF zu erstellen','Please allow pop-ups to generate the PDF'), 'err'); return }
    w.document.open(); w.document.write(html); w.document.close()
  }

  const pendingAmount = Number(stats?.pendingPayout || 0)
  const upcomingAmount = Number(stats?.upcomingPayout || 0)
  const hasOpenRequest = Number(stats?.openRequests || 0) > 0
  const webhookNote = stats?.webhookNote

  return (
    <div>
      <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:30, fontWeight:700, marginBottom:4 }}>{t('Einnahmen','Earnings')}</h1>
      <p style={{ color:'#5e5e5b', fontSize:14, marginBottom:32 }}>{t('Deine Einnahmen und Auszahlungen','Your revenue and payout history')}</p>

      {msg && (
        <div style={{ padding:'12px 16px', background:msgType==='ok'?'#EAF3DE':'#FCEBEB', color:msgType==='ok'?'#27500A':'#791F1F', fontSize:13, marginBottom:20 }}>
          {msg}
        </div>
      )}

      {/* Auszahlungsmethode — der Händler WÄHLT: entweder Stripe (automatische
          Auszahlung) ODER Bankverbindung (wir überweisen manuell). Stripe ist
          NICHT verpflichtend. Verkaufen geht immer; eine Methode wird nur für
          die Auszahlung des Guthabens benötigt. */}
      {(() => {
        const stripeReady = stripeStatus?.connected && stripeStatus?.onboardingComplete
        const bankReady   = !!bankStatus?.hasBank

        // Eine Methode ist aktiv → kurze Bestätigung.
        if (stripeReady) return (
          <div style={{ background:'#EAF3DE', border:'1px solid #c5dda8', padding:'12px 20px', marginBottom:24, display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            <Icon name="verified" style={{ fontSize:20, color:'#27500A' }} />
            <span style={{ fontSize:13, color:'#27500A', fontWeight:600, flex:1, minWidth:180 }}>
              {t('Stripe aktiv — Auszahlungen laufen automatisch', 'Stripe active — payouts run automatically')}
            </span>
            <a href="/merchant/bank" style={{ fontSize:12, color:'#27500A', textDecoration:'underline' }}>
              {t('stattdessen Bankverbindung nutzen', 'use a bank account instead')}
            </a>
          </div>
        )
        if (bankReady) return (
          <div style={{ background:'#EAF3DE', border:'1px solid #c5dda8', padding:'12px 20px', marginBottom:24, display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            <Icon name="account_balance" style={{ fontSize:20, color:'#27500A' }} />
            <span style={{ fontSize:13, color:'#27500A', fontWeight:600, flex:1, minWidth:180 }}>
              {t('Bankverbindung hinterlegt — Auszahlung per Überweisung', 'Bank account on file — payout via bank transfer')}
            </span>
            <a href="/merchant/stripe" style={{ fontSize:12, color:'#27500A', textDecoration:'underline' }}>
              {t('stattdessen Stripe nutzen', 'use Stripe instead')}
            </a>
          </div>
        )

        // Noch keine Methode → Auswahl anbieten (zwei gleichwertige Optionen).
        return (
          <div style={{ background:'#FAEEDA', border:'1px solid #f0cd92', padding:'20px 24px', marginBottom:24 }}>
            <p style={{ fontSize:15, fontWeight:700, color:'#633806', marginBottom:4 }}>
              {t('So wirst du ausgezahlt', 'How you get paid')}
            </p>
            <p style={{ fontSize:13, color:'#633806', lineHeight:1.6, marginBottom:16 }}>
              {t('Deine Einnahmen sammeln sich und werden ausgezahlt. Wähle einfach eine Methode — du kannst sie jederzeit ändern. Ein Stripe-Konto ist nicht verpflichtend.',
                 'Your earnings accumulate and get paid out. Just pick one method — you can change it anytime. A Stripe account is not required.')}
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:12 }}>
              <a href="/merchant/stripe" style={{ display:'flex', gap:12, alignItems:'center', background:'#fff', border:'1px solid #e8e3e1', padding:'14px 16px', textDecoration:'none' }}>
                <Icon name="bolt" style={{ fontSize:22, color:'#635BFF', flexShrink:0 }} />
                <span style={{ minWidth:0 }}>
                  <span style={{ display:'block', fontSize:13, fontWeight:700, color:'#1c1b1b' }}>{t('Stripe verbinden', 'Connect Stripe')}</span>
                  <span style={{ display:'block', fontSize:12, color:'#5e5e5b', overflowWrap:'break-word' }}>{t('Automatische Auszahlung', 'Automatic payouts')}</span>
                </span>
              </a>
              <a href="/merchant/bank" style={{ display:'flex', gap:12, alignItems:'center', background:'#fff', border:'1px solid #e8e3e1', padding:'14px 16px', textDecoration:'none' }}>
                <Icon name="account_balance" style={{ fontSize:22, color:'#27500A', flexShrink:0 }} />
                <span style={{ minWidth:0 }}>
                  <span style={{ display:'block', fontSize:13, fontWeight:700, color:'#1c1b1b' }}>{t('Bankverbindung hinterlegen', 'Add bank account')}</span>
                  <span style={{ display:'block', fontSize:12, color:'#5e5e5b', overflowWrap:'break-word' }}>{t('Wir überweisen manuell (IBAN)', 'We transfer manually (IBAN)')}</span>
                </span>
              </a>
            </div>
          </div>
        )
      })()}

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16, marginBottom:32 }}>
        {[
          { label:t('Gesamt verdient','Total Earned'),   value:`€${Number(stats?.totalEarned||0).toFixed(2)}`,   icon:'payments',      color:'#064E3B' },
          { label:t('Auszahlbar','Pending Payout'), value:`€${pendingAmount.toFixed(2)}`,                    icon:'hourglass_empty', color:'#9E896A' },
          { label:t('Bestellungen gesamt','Total Orders'),   value:stats?.orderCount||0,                              icon:'package_2',     color:'#185FA5' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={{ background:'#fff', border:'1px solid #c4c7c7', padding:24 }}>
            <div style={{ width:40, height:40, background:'#f1edec', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
              <Icon name={icon} style={{ fontSize:20, color }} />
            </div>
            <p style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b', marginBottom:6 }}>{label}</p>
            <p style={{ fontFamily:"'Playfair Display', serif", fontSize:28, fontWeight:700 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Detaillierter Einnahmen-Verlauf — pro Verkauf/Miete */}
      <div style={{ background:'#fff', border:'1px solid #c4c7c7', marginBottom:32 }}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #c4c7c7', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
          <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:600 }}>
            {t('Einnahmen-Verlauf', 'Earnings history')}
          </h2>
          {history.length > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <span style={{ fontSize:12, color:'#5e5e5b' }}>
                {history.length} {t('Transaktionen', 'transactions')}
              </span>
              <button onClick={exportCSV}
                style={{ display:'flex', alignItems:'center', gap:6, background:'#fff', color:'#1c1b1b', border:'1px solid #c4c7c7', padding:'7px 12px', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', cursor:'pointer' }}>
                <Icon name="table_view" style={{ fontSize:16, color:'#27500A' }} /> CSV
              </button>
              <button onClick={exportPDF}
                style={{ display:'flex', alignItems:'center', gap:6, background:'#fff', color:'#1c1b1b', border:'1px solid #c4c7c7', padding:'7px 12px', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', cursor:'pointer' }}>
                <Icon name="picture_as_pdf" style={{ fontSize:16, color:'#ba1a1a' }} /> PDF
              </button>
            </div>
          )}
        </div>
        {loading ? (
          <div style={{ padding:24 }}>{[1,2,3].map(i => <div key={i} style={{ height:44, background:'#f1edec', marginBottom:8 }} />)}</div>
        ) : history.length === 0 ? (
          <div style={{ padding:48, textAlign:'center', color:'#5e5e5b', fontSize:14 }}>
            {t('Noch keine Einnahmen — sobald du etwas verkaufst oder vermietest, erscheint es hier.',
               'No earnings yet — once you sell or rent something, it appears here.')}
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse', minWidth:640 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid #c4c7c7', background:'#fdf8f8' }}>
                  {[t('Datum','Date'), t('Artikel','Item'), t('Art','Type'), t('Brutto','Gross'), t('Gebühr','Fee'), t('Dein Netto','Your net'), t('Status','Status')].map(h => (
                    <th key={h} style={{ padding:'12px 20px', textAlign:'left', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((h: any) => {
                  const isRental = h.type === 'rental'
                  return (
                    <tr key={h.id} style={{ borderBottom:'1px solid #f1edec' }}>
                      <td style={{ padding:'14px 20px', color:'#5e5e5b', whiteSpace:'nowrap' }}>
                        {new Date(h.date).toLocaleDateString('de-DE', { day:'2-digit', month:'short', year:'numeric' })}
                      </td>
                      <td style={{ padding:'14px 20px', fontWeight:600, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {h.productTitle}{h.size ? <span style={{ color:'#9e9e9b', fontWeight:400 }}> · {h.size}</span> : null}
                      </td>
                      <td style={{ padding:'14px 20px' }}>
                        <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', padding:'3px 8px', background:isRental?'#E6F1FB':'#EAF3DE', color:isRental?'#0C447C':'#27500A', whiteSpace:'nowrap' }}>
                          {isRental ? t('Miete','Rental') : t('Kauf','Sale')}
                        </span>
                      </td>
                      <td style={{ padding:'14px 20px', color:'#5e5e5b', whiteSpace:'nowrap' }}>€{h.gross.toFixed(2)}</td>
                      <td style={{ padding:'14px 20px', color:'#9e5a5a', whiteSpace:'nowrap' }}>−€{h.fee.toFixed(2)}</td>
                      <td style={{ padding:'14px 20px', fontWeight:700, color:'#064E3B', whiteSpace:'nowrap' }}>+€{h.net.toFixed(2)}</td>
                      <td style={{ padding:'14px 20px' }}>
                        {(() => {
                          const st = h.status === 'paid'
                            ? { bg:'#EAF3DE', c:'#27500A', label:t('Ausgezahlt','Paid out') }
                            : h.status === 'available'
                              ? { bg:'#E6F1FB', c:'#0C447C', label:t('Auszahlbar','Available') }
                              : { bg:'#FAEEDA', c:'#633806', label:t('In Arbeit','In progress') }
                          return (
                            <span title={h.status==='upcoming' ? t('Wird nach Rückgabe auszahlbar','Becomes available after return') : ''}
                              style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', padding:'3px 8px', whiteSpace:'nowrap', background:st.bg, color:st.c }}>
                              {st.label}
                            </span>
                          )
                        })()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Webhook Warning */}
      {webhookNote && (
        <div style={{ background:'#FAEEDA', border:'1px solid #f8dfbb', padding:'14px 20px', marginBottom:20, display:'flex', gap:10, alignItems:'flex-start' }}>
          <Icon name="warning" style={{ fontSize:20, color:'#633806', flexShrink:0 }} />
          <div>
            <p style={{ fontSize:13, fontWeight:600, color:'#633806', marginBottom:3 }}>{t('Einnahmen werden noch nicht angezeigt','Earnings not showing yet')}</p>
            <p style={{ fontSize:12, color:'#633806', lineHeight:1.6 }}>
              Die Einnahmen werden erst nach dem Stripe Webhook-Event aktualisiert.<br />
              Stelle sicher dass <code style={{ background:'rgba(0,0,0,0.08)', padding:'1px 4px' }}>stripe listen</code> läuft oder der Webhook im Stripe Dashboard registriert ist.
            </p>
          </div>
        </div>
      )}

      {/* Payout Request Box */}
      <div style={{ background:'#fff', border:'1px solid #c4c7c7', padding:24, marginBottom:32 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16, flexWrap:'wrap' }}>
          <div>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:600, marginBottom:6 }}>
              {t('Auszahlung anfragen','Request payout')}
            </h2>
            <p style={{ fontSize:13, color:'#5e5e5b', lineHeight:1.6 }}>
              {hasOpenRequest
                ? 'Du hast eine offene Auszahlungsanfrage — ein Admin wird sie bald bearbeiten.'
                : pendingAmount > 0
                  ? `€${pendingAmount.toFixed(2)} ${t('sind jetzt auszahlbar.','are available for payout now.')}`
                  : t('Aktuell kein auszahlbarer Betrag.','No amount available for payout right now.')}
            </p>
            {upcomingAmount > 0 && (
              <p style={{ fontSize:12, color:'#8a6d3b', lineHeight:1.6, marginTop:6, display:'flex', gap:6, alignItems:'center' }}>
                <Icon name="schedule" style={{ fontSize:15, color:'#9E896A' }} />
                {t(`€${upcomingAmount.toFixed(2)} aus laufenden Mieten werden nach der Rückgabe auszahlbar.`,
                   `€${upcomingAmount.toFixed(2)} from active rentals will become available after return.`)}
              </p>
            )}
          </div>

          {!hasOpenRequest && pendingAmount > 0 && !showForm && (
            <button onClick={() => setShowForm(true)}
              style={{ background:'#1c1b1b', color:'#fff', border:'none', padding:'12px 24px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', cursor:'pointer', flexShrink:0 }}>
              {t('Anfragen','Request')} €{pendingAmount.toFixed(2)}
            </button>
          )}

          {hasOpenRequest && (
            <span style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', padding:'6px 12px', background:'#FAEEDA', color:'#633806' }}>
              ⏳ Pending Review
            </span>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleRequestPayout} style={{ marginTop:20, paddingTop:20, borderTop:'1px solid #f1edec' }}>
            <label style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b', display:'block', marginBottom:6 }}>
              Note for Admin (optional)
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={t('z.B. Bitte auf mein Stripe-Konto überweisen...','e.g. Please transfer to my Stripe account...')}
              rows={3}
              style={{ width:'100%', padding:'12px 14px', fontSize:13, border:'1px solid #c4c7c7', outline:'none', resize:'vertical', boxSizing:'border-box' as const, marginBottom:12 }}
            />
            <div style={{ display:'flex', gap:10 }}>
              <button type="submit" disabled={requesting}
                style={{ background:'#1c1b1b', color:'#fff', border:'none', padding:'12px 24px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', cursor:'pointer', opacity:requesting?0.6:1 }}>
                {requesting ? t('Senden…','Sending…') : `${t('Anfragen','Request')} €${pendingAmount.toFixed(2)}`}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setNote('') }}
                style={{ background:'none', border:'1px solid #c4c7c7', padding:'12px 20px', fontSize:12, cursor:'pointer', color:'#5e5e5b' }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Commission Info */}
      <div style={{ background:'#f7f3f2', border:'1px solid #c4c7c7', padding:20, marginBottom:32, display:'flex', gap:12, alignItems:'flex-start' }}>
        <Icon name="info" style={{ fontSize:20, color:'#9E896A', flexShrink:0 }} />
        <div style={{ fontSize:13, color:'#5e5e5b', lineHeight:1.6 }}>
          <strong style={{ color:'#1c1b1b' }}>{t('Provision:','Commission:')}</strong> {t('My Dressa berechnet 15% auf Verkäufe und 10% auf Mieten. Versandkosten gehen vollständig an dich.','My Dressa charges 15% on sales and 10% on rentals. Shipping costs go entirely to you.')}
        </div>
      </div>

      {/* Payout History */}
      <div style={{ background:'#fff', border:'1px solid #c4c7c7' }}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #c4c7c7' }}>
          <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:600 }}>{t('Auszahlungs-Verlauf','Payout history')}</h2>
        </div>
        {loading ? (
          <div style={{ padding:24 }}>{[1,2,3].map(i => <div key={i} style={{ height:44, background:'#f1edec', marginBottom:8 }} />)}</div>
        ) : payouts.length === 0 ? (
          <div style={{ padding:48, textAlign:'center', color:'#5e5e5b', fontSize:14 }}>{t('Noch keine Auszahlungen','No payouts yet')}</div>
        ) : (
          <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid #c4c7c7', background:'#fdf8f8' }}>
                {['Amount','Status','Note','Transfer ID','Date'].map(h => (
                  <th key={h} style={{ padding:'12px 20px', textAlign:'left', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payouts.map((p: any) => (
                <tr key={p.id} style={{ borderBottom:'1px solid #f1edec' }}>
                  <td style={{ padding:'14px 20px', fontWeight:700, color: p.status==='failed'||p.status==='rejected' ? '#ba1a1a' : '#064E3B' }}>€{Number(p.amount).toFixed(2)}</td>
                  <td style={{ padding:'14px 20px' }}>{badge(p.status === 'rejected' ? 'failed' : p.status)}</td>
                  <td style={{ padding:'14px 20px', color:'#5e5e5b', fontSize:12, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {p.note || '—'}
                  </td>
                  <td style={{ padding:'14px 20px', color:'#5e5e5b', fontFamily:'monospace', fontSize:11 }}>
                    {p.stripeTransferId || '—'}
                  </td>
                  <td style={{ padding:'14px 20px', color:'#5e5e5b' }}>
                    {p.paidAt ? new Date(p.paidAt).toLocaleDateString('de-DE') : new Date(p.createdAt).toLocaleDateString('de-DE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Schadensentschädigungen */}
      {transfers.length > 0 && (
        <div style={{ marginTop:32 }}>
          <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:600, marginBottom:16 }}>
            Schadensentschädigungen
          </h2>
          <div style={{ background:'#fff', border:'1px solid #c4c7c7', overflow:'hidden' }}>
            <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid #c4c7c7', background:'#fdf8f8' }}>
                  {[t('Betrag', 'Amount'),t('Beschreibung', 'Description'),t('Datum', 'Date')].map(h => (
                    <th key={h} style={{ padding:'12px 20px', textAlign:'left', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transfers.map((tr: any) => (
                  <tr key={tr.id} style={{ borderBottom:'1px solid #f1edec' }}>
                    <td style={{ padding:'14px 20px', fontWeight:700, color:'#064E3B' }}>
                      +€{Number(tr.amount).toFixed(2)}
                    </td>
                    <td style={{ padding:'14px 20px', color:'#5e5e5b', fontSize:12 }}>
                      {tr.description || 'Schadensentschädigung'}
                    </td>
                    <td style={{ padding:'14px 20px', color:'#5e5e5b', fontSize:12 }}>
                      {new Date(tr.created).toLocaleDateString('de-DE')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
