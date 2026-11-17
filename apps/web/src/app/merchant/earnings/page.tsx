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
  const [tab, setTab] = useState<'history'|'payouts'|'compensation'>('history')

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
      <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase' as const, letterSpacing:'0.08em', padding:'3px 8px', borderRadius:4, background:s.bg, color:s.color }}>
        {status}
      </span>
    )
  }

  // ── Export-Helfer ──────────────────────────────────────────────────────────
  const fmtEur  = (n: number) => Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtDate = (d: any) => new Date(d).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' })
  const artLabel    = (type: string) => type === 'rental' ? 'Miete' : 'Kauf'
  const statusLabel = (s: string) => s === 'paid' ? 'Ausgezahlt' : s === 'reversed' ? 'Storniert/Erstattet' : 'Ausstehend'
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
      fmtDate(h.date), h.productTitle, h.size || '',
      h.kind === 'damage_compensation' ? 'Schadensersatz' : artLabel(h.type),
      fmtEur(h.gross), fmtEur(h.fee),
      fmtEur(h.status === 'reversed' ? 0 : h.net), // storniert/erstattet → Netto 0
      statusLabel(h.status),
    ].map(esc).join(';'))
    const notRev = (h:any) => h.status !== 'reversed'
    const sumLine = ['','','','SUMME', fmtEur(sumBy(history,'gross',notRev)), fmtEur(sumBy(history,'fee',notRev)), fmtEur(sumBy(history,'net',notRev)), ''].map(esc).join(';')
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
    const notRev   = (h:any) => h.status !== 'reversed'
    const totGross = sumBy(history,'gross',notRev), totFee = sumBy(history,'fee',notRev), totNet = sumBy(history,'net',notRev)
    const paidNet  = sumBy(history,'net', h => h.status==='paid')
    const pendNet  = sumBy(history,'net', h => h.status!=='paid' && h.status!=='reversed')
    const rowsHtml = history.map(h => `
      <tr>
        <td>${fmtDate(h.date)}</td>
        <td class="item">${escapeHtml(h.productTitle)}${h.size ? ` · ${escapeHtml(h.size)}` : ''}</td>
        <td><span class="tag ${h.type==='rental'?'rent':'sale'}">${h.kind === 'damage_compensation' ? 'Schadensersatz' : artLabel(h.type)}</span></td>
        <td class="num"${h.status==='reversed'?' style="color:#bbb;text-decoration:line-through"':''}>€${fmtEur(h.gross)}</td>
        <td class="num fee"${h.status==='reversed'?' style="color:#bbb;text-decoration:line-through"':''}>−€${fmtEur(h.fee)}</td>
        <td class="num net">${h.status==='reversed' ? '<span style="color:#999">€0,00</span>' : '+€'+fmtEur(h.net)}</td>
        <td><span class="st ${h.status==='paid'?'paid':h.status==='reversed'?'rev':'pend'}">${statusLabel(h.status)}</span></td>
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
.st.paid { background:#EAF3DE; color:#27500A; } .st.pend { background:#FAEEDA; color:#633806; } .st.rev { background:#ffdad6; color:#ba1a1a; }
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

  // Tabs (Entschädigungen nur, wenn vorhanden)
  const TABS: { id: 'history'|'payouts'|'compensation'; label: string; count: number }[] = [
    { id:'history',  label:t('Einnahmen-Verlauf','Earnings'),  count: history.length },
    { id:'payouts',  label:t('Auszahlungen','Payouts'),        count: payouts.length },
    ...(transfers.length > 0 ? [{ id:'compensation' as const, label:t('Entschädigungen','Compensation'), count: transfers.length }] : []),
  ]
  const activeTab = TABS.some(x => x.id === tab) ? tab : 'history'

  const cardBox: React.CSSProperties = { background:'#fff', border:'1px solid #c4c7c7', borderRadius:'0 12px 12px 12px' }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12, marginBottom:20 }}>
        <div>
          <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:30, fontWeight:700, marginBottom:4 }}>{t('Einnahmen','Earnings')}</h1>
          <p style={{ color:'#5e5e5b', fontSize:14 }}>{t('Deine Einnahmen und Auszahlungen','Your revenue and payout history')}</p>
        </div>
      </div>

      {msg && (
        <div style={{ padding:'12px 16px', borderRadius:8, background:msgType==='ok'?'#EAF3DE':'#FCEBEB', color:msgType==='ok'?'#27500A':'#791F1F', fontSize:13, marginBottom:16 }}>
          {msg}
        </div>
      )}

      {/* Auszahlungsmethode — kompakter Status-Streifen bzw. Auswahl */}
      {(() => {
        const stripeReady = stripeStatus?.connected && stripeStatus?.onboardingComplete
        const bankReady   = !!bankStatus?.hasBank

        if (stripeReady || bankReady) return (
          <div style={{ background:'#EAF3DE', border:'1px solid #c5dda8', borderRadius:8, padding:'10px 16px', marginBottom:16, display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            <Icon name={stripeReady ? 'verified' : 'account_balance'} style={{ fontSize:18, color:'#27500A' }} />
            <span style={{ fontSize:13, color:'#27500A', fontWeight:600, flex:1, minWidth:180 }}>
              {stripeReady
                ? t('Stripe aktiv — Auszahlungen laufen automatisch','Stripe active — payouts run automatically')
                : t('Bankverbindung hinterlegt — Auszahlung per Überweisung','Bank account on file — payout via bank transfer')}
            </span>
            <a href={stripeReady ? '/merchant/bank' : '/merchant/stripe'} style={{ fontSize:12, color:'#27500A', textDecoration:'underline' }}>
              {stripeReady ? t('Methode ändern','Change method') : t('stattdessen Stripe','use Stripe instead')}
            </a>
          </div>
        )

        return (
          <div style={{ background:'#FAEEDA', border:'1px solid #f0cd92', borderRadius:10, padding:'18px 22px', marginBottom:16 }}>
            <p style={{ fontSize:15, fontWeight:700, color:'#633806', marginBottom:4 }}>{t('So wirst du ausgezahlt','How you get paid')}</p>
            <p style={{ fontSize:13, color:'#633806', lineHeight:1.6, marginBottom:14 }}>
              {t('Wähle eine Methode — jederzeit änderbar. Ein Stripe-Konto ist nicht verpflichtend.',
                 'Pick one method — changeable anytime. A Stripe account is not required.')}
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:12 }}>
              <a href="/merchant/stripe" style={{ display:'flex', gap:12, alignItems:'center', background:'#fff', border:'1px solid #e8e3e1', borderRadius:8, padding:'14px 16px', textDecoration:'none' }}>
                <Icon name="bolt" style={{ fontSize:22, color:'#635BFF', flexShrink:0 }} />
                <span style={{ minWidth:0 }}>
                  <span style={{ display:'block', fontSize:13, fontWeight:700, color:'#1c1b1b' }}>{t('Stripe verbinden','Connect Stripe')}</span>
                  <span style={{ display:'block', fontSize:12, color:'#5e5e5b' }}>{t('Automatische Auszahlung','Automatic payouts')}</span>
                </span>
              </a>
              <a href="/merchant/bank" style={{ display:'flex', gap:12, alignItems:'center', background:'#fff', border:'1px solid #e8e3e1', borderRadius:8, padding:'14px 16px', textDecoration:'none' }}>
                <Icon name="account_balance" style={{ fontSize:22, color:'#27500A', flexShrink:0 }} />
                <span style={{ minWidth:0 }}>
                  <span style={{ display:'block', fontSize:13, fontWeight:700, color:'#1c1b1b' }}>{t('Bankverbindung hinterlegen','Add bank account')}</span>
                  <span style={{ display:'block', fontSize:12, color:'#5e5e5b' }}>{t('Wir überweisen manuell (IBAN)','We transfer manually (IBAN)')}</span>
                </span>
              </a>
            </div>
          </div>
        )
      })()}

      {/* ── Kommandozentrale: auszahlbar + Aktion + Kennzahlen ── */}
      <div style={{ background:'#fff', border:'1px solid #c4c7c7', borderRadius:12, overflow:'hidden', marginBottom:12 }}>
        {/* Oben: auszahlbar + Aktion */}
        <div style={{ padding:'22px 24px' }}>
          <p style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b', marginBottom:6 }}>{t('Jetzt auszahlbar','Available now')}</p>
          <p style={{ fontFamily:"'Playfair Display', serif", fontSize:'clamp(30px,6vw,42px)', fontWeight:700, lineHeight:1, margin:0 }}>€{pendingAmount.toFixed(2)}</p>
          <div style={{ marginTop:16 }}>
            {hasOpenRequest ? (
              <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, padding:'8px 14px', background:'#FAEEDA', color:'#633806', borderRadius:8 }}>
                <Icon name="hourglass_top" style={{ fontSize:16 }} />
                {t('Anfrage in Prüfung','Request under review')}
              </span>
            ) : pendingAmount > 0 ? (
              !showForm ? (
                <button onClick={() => setShowForm(true)}
                  style={{ background:'#1c1b1b', color:'#fff', border:'none', borderRadius:8, padding:'12px 22px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', cursor:'pointer' }}>
                  {t('Auszahlung anfragen','Request payout')} — €{pendingAmount.toFixed(2)}
                </button>
              ) : (
                <form onSubmit={handleRequestPayout}>
                  <textarea value={note} onChange={e => setNote(e.target.value)}
                    placeholder={t('Notiz für den Admin (optional)','Note for admin (optional)')}
                    rows={2}
                    style={{ width:'100%', maxWidth:440, padding:'10px 12px', fontSize:13, border:'1px solid #c4c7c7', borderRadius:8, outline:'none', resize:'vertical', boxSizing:'border-box', marginBottom:10 }} />
                  <div style={{ display:'flex', gap:10 }}>
                    <button type="submit" disabled={requesting}
                      style={{ background:'#1c1b1b', color:'#fff', border:'none', borderRadius:8, padding:'11px 20px', fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', cursor:'pointer', opacity:requesting?0.6:1 }}>
                      {requesting ? t('Senden…','Sending…') : `${t('Anfragen','Request')} €${pendingAmount.toFixed(2)}`}
                    </button>
                    <button type="button" onClick={() => { setShowForm(false); setNote('') }}
                      style={{ background:'none', border:'1px solid #c4c7c7', borderRadius:8, padding:'11px 18px', fontSize:12, cursor:'pointer', color:'#5e5e5b' }}>
                      {t('Abbrechen','Cancel')}
                    </button>
                  </div>
                </form>
              )
            ) : (
              <p style={{ fontSize:13, color:'#5e5e5b' }}>{t('Aktuell kein auszahlbarer Betrag.','No amount available for payout right now.')}</p>
            )}
          </div>
        </div>

        {/* Unten: drei Kennzahlen */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', borderTop:'1px solid #f1edec' }}>
          {[
            { label:t('Gesamt verdient','Total earned'), value:`€${Number(stats?.totalEarned||0).toFixed(2)}`, icon:'payments',  color:'#064E3B', hint:'' },
            { label:t('Ausstehend','Pending'),           value:`€${upcomingAmount.toFixed(2)}`,                   icon:'schedule',  color:'#9E896A', hint:t('aus laufenden Mieten — auszahlbar nach der Rückgabe','from active rentals — available after return') },
            { label:t('Bestellungen','Orders'),          value:stats?.orderCount||0,                            icon:'package_2', color:'#185FA5', hint:'' },
          ].map(({ label, value, icon, color, hint }, i) => (
            <div key={label} title={hint || undefined} style={{ padding:'18px 20px', borderLeft: i>0 ? '1px solid #f1edec' : 'none' }}>
              <Icon name={icon} style={{ fontSize:18, color, marginBottom:8 }} />
              <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:'#8a8580', marginBottom:4 }}>{label}</p>
              <p style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700, lineHeight:1 }}>{value}</p>
              {hint && <p style={{ fontSize:10.5, color:'#a39b93', marginTop:5, lineHeight:1.4 }}>{hint}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Provisions-Hinweis (schmal) */}
      <p style={{ fontSize:12, color:'#8a8580', margin:'0 2px 16px', display:'flex', gap:6, alignItems:'center' }}>
        <Icon name="info" style={{ fontSize:14, color:'#9E896A', flexShrink:0 }} />
        {t('Provision: 15 % auf Verkäufe, 10 % auf Mieten. Versand geht komplett an dich.',
           'Commission: 15% on sales, 10% on rentals. Shipping goes entirely to you.')}
      </p>

      {/* Webhook-Hinweis (nur wenn relevant) */}
      {webhookNote && (
        <div style={{ background:'#FAEEDA', border:'1px solid #f8dfbb', borderRadius:8, padding:'12px 16px', marginBottom:16, display:'flex', gap:10, alignItems:'flex-start' }}>
          <Icon name="warning" style={{ fontSize:18, color:'#633806', flexShrink:0 }} />
          <p style={{ fontSize:12, color:'#633806', lineHeight:1.6, margin:0 }}>
            {t('Einnahmen werden erst nach dem Stripe-Webhook-Event aktualisiert. Stelle sicher, dass der Webhook im Stripe-Dashboard registriert ist (bzw. lokal stripe listen läuft).',
               'Earnings update only after the Stripe webhook event. Make sure the webhook is registered in the Stripe dashboard (or stripe listen is running locally).')}
          </p>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
        {TABS.map(tb => {
          const on = activeTab === tb.id
          return (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              style={{
                display:'flex', alignItems:'center', gap:7, padding:'10px 16px', fontSize:13, fontWeight:600, cursor:'pointer',
                border:'1px solid #c4c7c7', borderBottom: on ? '1px solid #fff' : '1px solid #c4c7c7',
                borderRadius:'10px 10px 0 0', marginBottom:-1,
                background: on ? '#fff' : '#f3efec', color: on ? '#1c1b1b' : '#5e5e5b',
              }}>
              {tb.label}
              <span style={{ fontSize:10, fontWeight:700, background: on ? '#1c1b1b' : '#d9d2cc', color: on ? '#fff' : '#5e5e5b', padding:'1px 7px', borderRadius:10, minWidth:18, textAlign:'center' }}>
                {tb.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Tab-Inhalt ── */}
      <div style={cardBox}>
        {/* Einnahmen-Verlauf */}
        {activeTab === 'history' && (
          <>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #f1edec', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
              <span style={{ fontSize:12, color:'#5e5e5b' }}>{history.length} {t('Transaktionen','transactions')}</span>
              {history.length > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <button onClick={exportCSV}
                    style={{ display:'flex', alignItems:'center', gap:6, background:'#fff', color:'#1c1b1b', border:'1px solid #c4c7c7', borderRadius:6, padding:'7px 12px', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', cursor:'pointer' }}>
                    <Icon name="table_view" style={{ fontSize:16, color:'#27500A' }} /> CSV
                  </button>
                  <button onClick={exportPDF}
                    style={{ display:'flex', alignItems:'center', gap:6, background:'#fff', color:'#1c1b1b', border:'1px solid #c4c7c7', borderRadius:6, padding:'7px 12px', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', cursor:'pointer' }}>
                    <Icon name="picture_as_pdf" style={{ fontSize:16, color:'#ba1a1a' }} /> PDF
                  </button>
                </div>
              )}
            </div>
            {loading ? (
              <div style={{ padding:24 }}>{[1,2,3].map(i => <div key={i} style={{ height:44, background:'#f1edec', marginBottom:8, borderRadius:6 }} />)}</div>
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
                      const reversed = h.status === 'reversed'
                      const isComp = h.kind === 'damage_compensation'
                      return (
                        <tr key={h.id} style={{ borderBottom:'1px solid #f1edec', background: reversed ? '#fdf0ef' : (isComp ? '#fff7ec' : undefined) }}>
                          <td style={{ padding:'14px 20px', color:'#5e5e5b', whiteSpace:'nowrap' }}>
                            {new Date(h.date).toLocaleDateString('de-DE', { day:'2-digit', month:'short', year:'numeric' })}
                          </td>
                          <td style={{ padding:'14px 20px', fontWeight:600, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {h.productTitle}{h.size ? <span style={{ color:'#9e9e9b', fontWeight:400 }}> · {h.size}</span> : null}
                            {isComp && (
                              <div style={{ fontWeight:400, fontSize:11, color:'#9a6a1a', marginTop:2, whiteSpace:'normal' }}>
                                {t('Schadensersatz für beschädigtes Produkt','Compensation for damaged item')}
                              </div>
                            )}
                          </td>
                          <td style={{ padding:'14px 20px' }}>
                            {isComp ? (
                              <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', padding:'3px 8px', borderRadius:4, background:'#FAEEDA', color:'#8a5a0a', whiteSpace:'nowrap' }}>
                                ⚠ {t('Schadensersatz','Compensation')}
                              </span>
                            ) : (
                              <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', padding:'3px 8px', borderRadius:4, background:isRental?'#E6F1FB':'#EAF3DE', color:isRental?'#0C447C':'#27500A', whiteSpace:'nowrap' }}>
                                {isRental ? t('Miete','Rental') : t('Kauf','Sale')}
                              </span>
                            )}
                          </td>
                          <td style={{ padding:'14px 20px', whiteSpace:'nowrap', color: reversed ? '#bbb' : '#5e5e5b', textDecoration: reversed ? 'line-through' : 'none' }}>€{h.gross.toFixed(2)}</td>
                          <td style={{ padding:'14px 20px', whiteSpace:'nowrap', color: reversed ? '#bbb' : '#9e5a5a', textDecoration: reversed ? 'line-through' : 'none' }}>−€{h.fee.toFixed(2)}</td>
                          <td style={{ padding:'14px 20px', fontWeight:700, whiteSpace:'nowrap', color: reversed ? '#9e9e9b' : '#064E3B' }}>
                            {reversed ? (
                              <span>
                                <span style={{ textDecoration:'line-through', color:'#bbb', fontWeight:400, marginRight:6 }}>+€{h.net.toFixed(2)}</span>
                                €0,00
                              </span>
                            ) : (
                              <>+€{h.net.toFixed(2)}</>
                            )}
                          </td>
                          <td style={{ padding:'14px 20px' }}>
                            {(() => {
                              const st = h.status === 'paid'
                                ? { bg:'#EAF3DE', c:'#27500A', label:t('Ausgezahlt','Paid out') }
                                : h.status === 'available'
                                  ? { bg:'#E6F1FB', c:'#0C447C', label:t('Auszahlbar','Available') }
                                  : h.status === 'reversed'
                                    ? { bg:'#ffdad6', c:'#ba1a1a', label:t('Storniert/Erstattet','Cancelled/Refunded') }
                                    : { bg:'#FAEEDA', c:'#633806', label:t('In Arbeit','In progress') }
                              return (
                                <span title={h.status==='upcoming' ? t('Wird nach Rückgabe auszahlbar','Becomes available after return') : h.status==='reversed' ? t('Bestellung storniert oder erstattet — nicht auszahlbar','Order cancelled or refunded — not payable') : ''}
                                  style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', padding:'3px 8px', borderRadius:4, whiteSpace:'nowrap', background:st.bg, color:st.c }}>
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
          </>
        )}

        {/* Auszahlungs-Verlauf */}
        {activeTab === 'payouts' && (
          loading ? (
            <div style={{ padding:24 }}>{[1,2,3].map(i => <div key={i} style={{ height:44, background:'#f1edec', marginBottom:8, borderRadius:6 }} />)}</div>
          ) : payouts.length === 0 ? (
            <div style={{ padding:48, textAlign:'center', color:'#5e5e5b', fontSize:14 }}>{t('Noch keine Auszahlungen','No payouts yet')}</div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse', minWidth:560 }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid #c4c7c7', background:'#fdf8f8' }}>
                    {[t('Betrag','Amount'), t('Status','Status'), t('Notiz','Note'), 'Transfer ID', t('Datum','Date')].map(h => (
                      <th key={h} style={{ padding:'12px 20px', textAlign:'left', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p: any) => (
                    <tr key={p.id} style={{ borderBottom:'1px solid #f1edec' }}>
                      <td style={{ padding:'14px 20px', fontWeight:700, color: p.status==='failed'||p.status==='rejected' ? '#ba1a1a' : '#064E3B' }}>€{Number(p.amount).toFixed(2)}</td>
                      <td style={{ padding:'14px 20px' }}>{badge(p.status === 'rejected' ? 'failed' : p.status)}</td>
                      <td style={{ padding:'14px 20px', color:'#5e5e5b', fontSize:12, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.note || '—'}</td>
                      <td style={{ padding:'14px 20px', color:'#5e5e5b', fontFamily:'monospace', fontSize:11 }}>{p.stripeTransferId || '—'}</td>
                      <td style={{ padding:'14px 20px', color:'#5e5e5b', whiteSpace:'nowrap' }}>
                        {p.paidAt ? new Date(p.paidAt).toLocaleDateString('de-DE') : new Date(p.createdAt).toLocaleDateString('de-DE')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Schadensentschädigungen */}
        {activeTab === 'compensation' && (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse', minWidth:420 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid #c4c7c7', background:'#fdf8f8' }}>
                  {[t('Betrag','Amount'), t('Beschreibung','Description'), t('Datum','Date')].map(h => (
                    <th key={h} style={{ padding:'12px 20px', textAlign:'left', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'#5e5e5b' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transfers.map((tr: any) => (
                  <tr key={tr.id} style={{ borderBottom:'1px solid #f1edec' }}>
                    <td style={{ padding:'14px 20px', fontWeight:700, color:'#064E3B' }}>+€{Number(tr.amount).toFixed(2)}</td>
                    <td style={{ padding:'14px 20px', color:'#5e5e5b', fontSize:12 }}>{tr.description || t('Schadensentschädigung','Damage compensation')}</td>
                    <td style={{ padding:'14px 20px', color:'#5e5e5b', fontSize:12, whiteSpace:'nowrap' }}>{new Date(tr.created).toLocaleDateString('de-DE')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
